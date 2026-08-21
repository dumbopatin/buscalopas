#!/usr/bin/env node
// setup-lucifer.js — Crea/actualiza el usuario de pruebas "Lucifer" en Supabase.
// Útil cuando el juego está desplegado (sin servidor local): Lucifer debe existir
// en la tabla 'scores' con su contraseña para poder entrar.
//
// Uso:  node dev/setup-lucifer.js
//       LUCIFER_PASS=otra node dev/setup-lucifer.js   (contraseña distinta)
//
// Usa la clave anónima de config.js (la misma que el juego), así que solo
// necesita los permisos que el propio juego ya tiene sobre 'scores'.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const cfgSrc = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
const SUPABASE_URL = (cfgSrc.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
const SUPABASE_ANON_KEY = (cfgSrc.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ config.js no tiene SUPABASE_URL / SUPABASE_ANON_KEY');
    process.exit(1);
}

const NAME = 'Lucifer';
const PASS = process.env.LUCIFER_PASS || 'lucifer';
const HASH = crypto.createHash('sha256').update(`buscalopas::${NAME}::${PASS}`).digest('hex');

const ALL = ['rizao', 'subidon', 'iman', 'vidente', 'papu', 'rastreador', 'milagro', 'ultimobaile', 'mala', 'sombra', 'gafe', 'dragon'];
const owned = {};
const active = {};
for (const id of ALL) { owned[id] = true; active[id] = true; }

const stats = {
    games: 0, wins: 0, losses: 0, bestEarning: 0, spizSaved: 0,
    timePlayed: 0, luciferReached: 0, turulosWins: 0, correctTurulos: 0,
    lopa: {
        shopUnlocked: true,
        owned,
        active,
        charges: { milagro: 3, ultimobaile: 3, vidente: 3 },
        levels: { spiz: 5, dinero: 5 },
        uses: {},
        order: [],
        relicGames: 0,
        acquired: {}
    },
    by: {}
};

async function main() {
    const url = `${SUPABASE_URL}/rest/v1/scores?on_conflict=name`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({ name: NAME, score: 0, total: 0, pass: HASH, stats })
    });
    if (!res.ok) {
        const txt = await res.text();
        console.error(`❌ Error ${res.status} creando Lucifer en Supabase:`);
        console.error(txt.slice(0, 500));
        process.exit(1);
    }
    const row = await res.json();
    console.log(`✅ Lucifer creado/actualizado en Supabase (id=${row[0] ? row[0].id : '?'}).`);
    console.log(`   Usuario: ${NAME} · Contraseña: ${PASS}`);
    console.log('   Todos los LopAmuletos + 3 cargas + niveles 5. La cartera de 1.000.000€ se da desde el cliente.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
