-- Buscalopas: tabla de puntuaciones para Supabase
-- Ejecuta esto en: SQL Editor > New query > Run
-- (es idempotente: se puede re-ejecutar sin romper nada)

create table if not exists scores (
    name text primary key,
    score integer not null default 0,
    total integer not null default 0,
    updated_at timestamptz not null default now()
);

-- Migración: añade la columna total si la tabla se creó sin ella
alter table scores add column if not exists total integer not null default 0;

-- Contraseña (hash) y estadísticas del usuario
alter table scores add column if not exists pass text;
alter table scores add column if not exists stats text;

-- Migración 19/08 (4ª sesión): LAS ESTADÍSTICAS Y LOPAMULETOS se guardan como JSONB.
-- Antes stats era text y el juego NO podía guardarlas/leerlas bien (por eso no se
-- veían los amuletos entre dispositivos). Convierte la columna a jsonb; si hay
-- alguna fila con datos corruptos, los resetea a {} para que el cambio no falle.
do $$
declare
    r record;
begin
    for r in select name from scores
        where stats is not null and stats::text <> ''
    loop
        begin
            perform stats::jsonb from scores where name = r.name;
        exception when others then
            update scores set stats = '{}'::jsonb where name = r.name;
        end;
    end loop;
    alter table scores alter column stats type jsonb
        using case when stats is null or stats::text = '' then '{}'::jsonb else stats::jsonb end;
end $$;

-- Los jugadores existentes conservan su posición en el ranking de totales
update scores set total = score where total = 0 and score > 0;

alter table scores enable row level security;

drop policy if exists "read_scores" on scores;
drop policy if exists "insert_scores" on scores;
drop policy if exists "update_scores" on scores;

create policy "read_scores" on scores for select using (true);
create policy "insert_scores" on scores for insert with check (true);
create policy "update_scores" on scores for update using (true) with check (true);

-- ============================================================================
-- AMIGOS / CHAT / NOTAS EN SUPABASE (19/08, sesión amigos)
-- Con estas tablas, amigos/chat/notas funcionan en Netlify SOLO con Supabase,
-- sin necesidad de tener server.js corriendo.
-- ============================================================================

-- Amistades aceptadas (par ordenado, user_a < user_b para evitar duplicados)
create table if not exists friendships (
    user_a text not null,
    user_b text not null,
    created_at timestamptz not null default now(),
    primary key (user_a, user_b),
    check (user_a < user_b)
);

-- Solicitudes de amistad PENDIENTES
create table if not exists friend_requests (
    from_name text not null,
    to_name text not null,
    created_at timestamptz not null default now(),
    primary key (from_name, to_name),
    check (from_name <> to_name)
);

-- Mensajes de chat (par de usuarios)
create table if not exists chat_messages (
    id bigint generated always as identity primary key,
    user_from text not null,
    user_to text not null,
    text text not null,
    created_at bigint not null default (floor(extract(epoch from now()) * 1000))::bigint
);
create index if not exists chat_messages_pair_idx on chat_messages (user_from, user_to, created_at);

-- Notas e ideas POR USUARIO
create table if not exists notes (
    username text primary key,
    note text,
    updated_at timestamptz not null default now()
);

-- Sugerencias de los jugadores (buzón compartido: el jefe las lee)
create table if not exists suggestions (
    id bigint generated always as identity primary key,
    username text not null default 'anónimo',
    note text not null,
    created_at bigint not null default (floor(extract(epoch from now()) * 1000))::bigint
);

-- Permisos anónimos (igual que scores: abierto para la anon key)
alter table friendships enable row level security;
drop policy if exists "all_friendships" on friendships;
create policy "all_friendships" on friendships for all using (true) with check (true);

alter table friend_requests enable row level security;
drop policy if exists "all_friend_requests" on friend_requests;
create policy "all_friend_requests" on friend_requests for all using (true) with check (true);

alter table chat_messages enable row level security;
drop policy if exists "all_chat_messages" on chat_messages;
create policy "all_chat_messages" on chat_messages for all using (true) with check (true);

alter table notes enable row level security;
drop policy if exists "all_notes" on notes;
create policy "all_notes" on notes for all using (true) with check (true);

alter table suggestions enable row level security;
drop policy if exists "all_suggestions" on suggestions;
create policy "all_suggestions" on suggestions for all using (true) with check (true);

-- ============================================================================
-- TIEMPO REAL (notificaciones en vivo de chat y solicitudes)
-- Necesario para que el navegador reciba los INSERT al instante (postgres_changes).
-- Si no se ejecuta, el juego hace polling como respaldo (10s), que también funciona.
-- Es idempotente: se puede re-ejecutar.
-- ============================================================================
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
        alter publication supabase_realtime add table chat_messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_requests') then
        alter publication supabase_realtime add table friend_requests;
    end if;
end $$;

alter table chat_messages replica identity full;
alter table friend_requests replica identity full;
