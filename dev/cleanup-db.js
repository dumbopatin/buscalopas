#!/usr/bin/env node
// cleanup-db.js — Limpia la tabla 'scores' de Supabase dejando solo los usuarios
// permitidos (por defecto: amego, colego, ed, fff, lopo y Lucifer).
//
// La clave anónima de config.js normalmente NO puede BORRAR filas (RLS solo
// permite SELECT/INSERT/UPDATE). Si al terminar quedan filas, el script imprime
// el SQL para ejecutarlo en Supabase → SQL Editor → New query → Run.
//
// Uso:  node dev/cleanup-db.js
//       KEEP="amego,colego" node dev/cleanup-db.js   (otra lista permitida)

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfgSrc = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
const SUPABASE_URL = (cfgSrc.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
const SUPABASE_ANON_KEY = (cfgSrc.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ config.js no tiene SUPABASE_URL / SUPABASE_ANON_KEY');
    process.exit(1);
}

// IMPORTANTE (20/08): los nombres "predefinidos" de nombres.txt (xX_*, ~*_*~, -_-,
// leet speak...) NO son cuentas de prueba: es gente REAL que probó el juego. Aquí
// se listan TODOS los usuarios reales/conocidos para que nunca se marquen a borrar.
const KEEP = (process.env.KEEP || 'amego,colego,ed,Ed,fff,lopo,Lucifer,' +
        'xX_Farlopron_69_Xx,xX_L0p3r0_F1n4l_Xx,xX_[LaPiedra_3000]_Xx,' +
        'xX_[K4n1_P0l1t0x1k0]_Xx,~*ThE_P0ll0_L0k0*~,~*Er_MaFiA_FuMaO*~,' +
        '[xX_Er_FuM4d0r_99_Xx]Big201787,perry,paul666,pedro1')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const keepLower = new Set(KEEP.map(n => n.toLowerCase()));

const H = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
const API = `${SUPABASE_URL}/rest/v1/scores`;

async function main() {
    const res = await fetch(`${API}?select=name`, { headers: H });
    if (!res.ok) {
        console.error(`❌ No se pudo leer la tabla scores (${res.status})`);
        process.exit(1);
    }
    const rows = await res.json();
    const toDelete = rows.map(r => r.name).filter(n => !keepLower.has((n || '').toLowerCase()));

    console.log(`🔍 ${rows.length} filas en supabase · Se conservan: ${KEEP.join(', ')}`);
    console.log(`🗑️  A borrar (${toDelete.length}): ${toDelete.length ? toDelete.join(', ') : 'ninguna'}`);

    if (!toDelete.length) {
        console.log('✅ Nada que borrar.');
        return;
    }

    let deleted = 0;
    for (const name of toDelete) {
        const r = await fetch(`${API}?name=eq.${encodeURIComponent(name)}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=representation' } });
        if (r.ok && (await r.json()).length) deleted++;
        else console.log(`  ⚠️  No se pudo borrar "${name}" (RLS) — requiere SQL`);
    }

    const remaining = (await (await fetch(`${API}?select=name`, { headers: H })).json())
        .map(r => r.name)
        .filter(n => !keepLower.has((n || '').toLowerCase()));

    console.log(`🧹 Borradas por API: ${deleted}. Quedan fuera de la lista: ${remaining.length}`);

    if (remaining.length) {
        const quoted = remaining.map(n => `'${n.replace(/'/g, "''")}'`).join(', ');
        console.log('');
        console.log('▶ EJECUTA ESTE SQL EN SUPABASE → SQL Editor → New query → Run:');
        console.log('');
        console.log(`DELETE FROM scores WHERE lower(name) IN (${quoted});`);
        console.log('');
        console.log(`Se borrarán ${remaining.length} filas (${remaining.join(', ')}).`);
        console.log('NOTA: "Lucifer" y los demás de la lista permitida nunca se borran.');
    } else {
        console.log('✅ Base de datos limpia.');
    }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
