const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = __dirname;
const ROOT = path.join(__dirname, '..');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');
const CHAT_FILE = path.join(DATA_DIR, 'chat.json');

// Cuenta de pruebas "Lucifer": oculta del ranking, jugadores y búsquedas.
const HIDDEN_USER = 'Lucifer';

// Límites de chat: tamaño máximo y mínimo tiempo entre envíos por usuario.
const CHAT_MAX_LEN = 500;
const CHAT_MIN_INTERVAL_MS = 1200;
const lastChatPost = {};
function chatRateLimited(user) {
    const now = Date.now();
    const last = lastChatPost[user] || 0;
    if (now - last < CHAT_MIN_INTERVAL_MS) return true;
    lastChatPost[user] = now;
    return false;
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ico': 'image/x-icon'
};

function loadScores() {
    try {
        const raw = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
        const scores = {};
        for (const [name, val] of Object.entries(raw)) {
            if (typeof val === 'number') {
                scores[name] = { score: val, total: val };
            } else if (val && typeof val === 'object') {
                scores[name] = {
                    score: typeof val.score === 'number' ? val.score : 0,
                    total: typeof val.total === 'number' ? val.total : (typeof val.score === 'number' ? val.score : 0)
                };
                if (typeof val.pass === 'string') scores[name].pass = val.pass;
                if (val.stats && typeof val.stats === 'object') scores[name].stats = val.stats;
            }
        }
        return scores;
    } catch (e) {
        return {};
    }
}

function saveScores(scores) {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve(null);
            }
        });
    });
}

function loadJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normalizeName(s) {
    return (s || '').trim().slice(0, 30);
}

function loadFriendsDB() {
    const raw = loadJSON(FRIENDS_FILE);
    const db = {};
    for (const [user, val] of Object.entries(raw)) {
        if (Array.isArray(val)) {
            db[user] = { friends: val, incoming: [] };
        } else if (val && typeof val === 'object') {
            db[user] = {
                friends: Array.isArray(val.friends) ? val.friends : [],
                incoming: Array.isArray(val.incoming) ? val.incoming : []
            };
        }
    }
    return db;
}

function userExistsInDB(name) {
    const lower = (name || '').toLowerCase();
    const scores = loadScores();
    if (Object.keys(scores).some(k => k.toLowerCase() === lower)) return true;
    const db = loadFriendsDB();
    if (Object.keys(db).some(k => k.toLowerCase() === lower)) return true;
    for (const entry of Object.values(db)) {
        if (entry.friends.some(n => n.toLowerCase() === lower) || entry.incoming.some(n => n.toLowerCase() === lower)) return true;
    }
    return false;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // --- Log de diagnóstico (se ve en la terminal de jugar.sh) ---
    const remote = req.socket.remoteAddress || '';
    console.log(`[req] ${req.method} ${url.pathname} desde ${remote} UA=${(req.headers['user-agent'] || '').slice(0, 60)}`);

    // --- Página de diagnóstico para probar desde el móvil ---
    if (url.pathname === '/diag') {
        const ua = (req.headers['user-agent'] || '').replace(/</g, '&lt;');
        const host = req.headers.host || '';
        const diagHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Buscalopas — Diagnóstico</title>
<style>
body{font-family:monospace;background:#111;color:#0f0;padding:16px;font-size:14px}
h1{font-size:18px;color:#fff}
.ok{color:#0f0}.bad{color:#f44}.warn{color:#fa0}
li{margin:4px 0}button{background:#333;color:#fff;border:1px solid #666;padding:8px 12px;margin-top:10px}
</style>
</head>
<body>
<h1>🛠️ Buscalopas — Diagnóstico de red</h1>
<p class="ok">✅ Has llegado al servidor. Si ves esta página, la conexión PC↔móvil funciona.</p>
<ul>
<li>Tu IP (según el servidor): <b id="cip">${remote}</b></li>
<li>URL que has usado (Host): <b>${host}</b></li>
<li>Tu navegador: <b>${ua}</b></li>
</ul>
<p>Prueba de carga de los recursos del juego:</p>
<ul id="tests"></ul>
<button onclick="run()">🔁 Repetir pruebas</button>
<script>
async function t(name, url, method){
    const li=document.createElement('li');
    li.textContent=name+' …';
    document.getElementById('tests').appendChild(li);
    const t0=performance.now();
    try{
        const r=await fetch(url,{method:method||'GET',cache:'no-store'});
        const ms=Math.round(performance.now()-t0);
        const size=r.headers.get('content-length');
        li.innerHTML='<span class="ok">✅</span> '+name+' → HTTP '+r.status+(size?' ('+Math.round(size/1024)+'KB)':'')+' en '+ms+'ms';
    }catch(e){
        const ms=Math.round(performance.now()-t0);
        li.innerHTML='<span class="bad">❌</span> '+name+' → ERROR en '+ms+'ms: '+String(e).slice(0,60);
    }
}
async function run(){
    const el=document.getElementById('tests'); el.innerHTML='';
    await t('index.html','/');
    await t('style.css','style.css');
    await t('config.js','config.js');
    await t('textos.js','textos.js');
    await t('game.js','game.js');
    await t('supabase local','vendor/supabase.min.js');
    await t('imagen turulo','img/turulo.jpg');
    await t('audio música','audio/musica_normal.mp3','HEAD');
    await t('API leaderboard','/api/leaderboard');
}
run();
</script>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(diagHtml);
        return;
    }

    // --- API ---
    if (url.pathname === '/api/leaderboard') {
        const scores = loadScores();
        const list = Object.entries(scores)
            .filter(([name]) => name !== HIDDEN_USER)
            .map(([name, p]) => ({ name, score: p.score, total: p.total }))
            .sort((a, b) => b.total - a.total || b.score - a.score);
        sendJSON(res, 200, { players: list });
        return;
    }

    if (url.pathname === '/api/players') {
        sendJSON(res, 200, { names: Object.keys(loadScores()).filter(n => n !== HIDDEN_USER) });
        return;
    }

    if (url.pathname === '/api/player') {
        const typed = (url.searchParams.get('name') || '').trim();
        const lower = typed.toLowerCase();
        const scores = loadScores();
        const key = Object.keys(scores).find(k => k.toLowerCase() === lower);
        const p = key ? scores[key] : null;
        sendJSON(res, 200, {
            name: key || typed,
            score: p ? p.score : null,
            total: p ? p.total : null,
            pass: p ? (p.pass || null) : null,
            stats: p ? (p.stats || null) : null
        });
        return;
    }

    // Buzón de sugerencias (todos envían, cualquiera lee: el jefe las ve)
    if (url.pathname === '/api/suggestions' && req.method === 'GET') {
        let list = [];
        try { list = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8')); } catch (e) {}
        if (!Array.isArray(list)) list = [];
        sendJSON(res, 200, { list: list.slice(-200).reverse() });
        return;
    }

    if (url.pathname === '/api/suggestions' && req.method === 'POST') {
        const body = await readBody(req);
        const note = (body && typeof body.note === 'string') ? body.note.trim().slice(0, 8000) : '';
        if (!note) {
            sendJSON(res, 400, { error: 'Sugerencia vacía' });
            return;
        }
        const username = (body && typeof body.username === 'string' && body.username.trim())
            ? body.username.trim().slice(0, 30)
            : 'anónimo';
        let list = [];
        try { list = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8')); } catch (e) {}
        if (!Array.isArray(list)) list = [];
        list.push({ username, note, created_at: Date.now() });
        if (list.length > 500) list = list.slice(-500);
        try {
            fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(list));
            sendJSON(res, 200, { ok: true });
        } catch (e) {
            sendJSON(res, 500, { error: 'No se pudo guardar' });
        }
        return;
    }

    if (url.pathname === '/api/score' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body || typeof body.name !== 'string') {
            sendJSON(res, 400, { error: 'Datos inválidos' });
            return;
        }
        const name = body.name.trim().slice(0, 30);
        if (!name) {
            sendJSON(res, 400, { error: 'Nombre vacío' });
            return;
        }
        const scores = loadScores();
        const cur = scores[name] || { score: 0, total: 0 };
        const entry = { score: cur.score || 0, total: cur.total || 0 };
        if (cur.pass !== undefined) entry.pass = cur.pass;
        if (cur.stats !== undefined) entry.stats = cur.stats;

        if (typeof body.score === 'number') {
            entry.score = body.exact ? Math.max(0, Math.floor(body.score)) : Math.max(entry.score, Math.floor(body.score));
        }
        if (typeof body.total === 'number') entry.total = Math.max(entry.total, Math.floor(body.total));
        if (typeof body.pass === 'string' && body.pass) entry.pass = body.pass;
        if (body.stats && typeof body.stats === 'object') entry.stats = body.stats;

        scores[name] = entry;
        saveScores(scores);
        sendJSON(res, 200, { name, score: entry.score, total: entry.total });
        return;
    }

    if (url.pathname === '/api/friends' && req.method === 'GET') {
        const user = normalizeName(url.searchParams.get('user'));
        const db = loadFriendsDB();
        const entry = db[user] || { friends: [], incoming: [] };
        const outgoing = [];
        for (const [recipient, e] of Object.entries(db)) {
            if (recipient !== user && e.incoming.includes(user)) outgoing.push(recipient);
        }
        sendJSON(res, 200, { friends: entry.friends, incoming: entry.incoming, outgoing });
        return;
    }

    if (url.pathname === '/api/friends' && req.method === 'POST') {
        const body = await readBody(req);
        const user = normalizeName(body && body.user);
        const friend = normalizeName(body && body.friend);
        if (!user || !friend || user === friend) {
            sendJSON(res, 400, { error: 'Datos inválidos' });
            return;
        }
        const db = loadFriendsDB();
        const u = db[user] || (db[user] = { friends: [], incoming: [] });
        const f = db[friend] || (db[friend] = { friends: [], incoming: [] });
        const action = body.action;

        if (action === 'request') {
            if (!u.friends.includes(friend) && !f.incoming.includes(user) && !u.incoming.includes(friend)) {
                f.incoming.push(user);
            }
        } else if (action === 'accept') {
            const i = u.incoming.indexOf(friend);
            if (i >= 0) u.incoming.splice(i, 1);
            if (!u.friends.includes(friend)) u.friends.push(friend);
            if (!f.friends.includes(user)) f.friends.push(user);
        } else if (action === 'decline') {
            const i = u.incoming.indexOf(friend);
            if (i >= 0) u.incoming.splice(i, 1);
        } else if (action === 'cancel') {
            const i = f.incoming.indexOf(user);
            if (i >= 0) f.incoming.splice(i, 1);
        } else if (action === 'remove') {
            const i = u.friends.indexOf(friend);
            if (i >= 0) u.friends.splice(i, 1);
            const j = f.friends.indexOf(user);
            if (j >= 0) f.friends.splice(j, 1);
        }

        saveJSON(FRIENDS_FILE, db);
        sendJSON(res, 200, { ok: true, friends: u.friends, incoming: u.incoming });
        return;
    }

    if (url.pathname === '/api/user') {
        const name = normalizeName(url.searchParams.get('name'));
        sendJSON(res, 200, { exists: name ? (name !== HIDDEN_USER && userExistsInDB(name)) : false });
        return;
    }

    if (url.pathname === '/api/search') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const names = new Set(Object.keys(loadScores()));
        const db = loadFriendsDB();
        for (const [n, e] of Object.entries(db)) {
            names.add(n);
            for (const fn of e.friends) names.add(fn);
            for (const inN of e.incoming) names.add(inN);
        }
        const result = [...names]
            .filter(n => n && n !== HIDDEN_USER && (!q || n.toLowerCase().includes(q)))
            .sort()
            .slice(0, 50);
        sendJSON(res, 200, { names: result });
        return;
    }

    if (url.pathname === '/api/chat' && req.method === 'GET') {
        const a = normalizeName(url.searchParams.get('user'));
        const b = normalizeName(url.searchParams.get('with'));
        if (!a || !b) {
            sendJSON(res, 400, { error: 'Faltan usuarios' });
            return;
        }
        const key = [a, b].sort().join('|');
        const messages = loadJSON(CHAT_FILE)[key] || [];
        sendJSON(res, 200, { messages });
        return;
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
        const body = await readBody(req);
        const from = normalizeName(body && body.user);
        const to = normalizeName(body && body.with);
        const text = (body && typeof body.text === 'string') ? body.text.trim().slice(0, CHAT_MAX_LEN) : '';
        if (!from || !to || !text) {
            sendJSON(res, 400, { error: 'Datos inválidos' });
            return;
        }
        if (chatRateLimited(from)) {
            sendJSON(res, 429, { error: 'Demasiados mensajes' });
            return;
        }
        const key = [from, to].sort().join('|');
        const db = loadJSON(CHAT_FILE);
        const messages = db[key] || (db[key] = []);
        messages.push({ from, text, ts: Date.now() });
        if (messages.length > 200) messages.splice(0, messages.length - 200);
        saveJSON(CHAT_FILE, db);
        sendJSON(res, 200, { ok: true, messages });
        return;
    }

    if (url.pathname === '/api/chat/broadcast' && req.method === 'GET') {
        const messages = loadJSON(CHAT_FILE)['broadcast'] || [];
        sendJSON(res, 200, { messages });
        return;
    }

    if (url.pathname === '/api/chat/broadcast' && req.method === 'POST') {
        const body = await readBody(req);
        const user = normalizeName(body && body.user);
        const text = (body && typeof body.text === 'string') ? body.text.trim().slice(0, CHAT_MAX_LEN) : '';
        const pass = (body && typeof body.pass === 'string') ? body.pass : '';
        if (user !== HIDDEN_USER || !text || !pass) {
            sendJSON(res, 403, { error: 'No autorizado' });
            return;
        }
        if (chatRateLimited(user)) {
            sendJSON(res, 429, { error: 'Demasiados mensajes' });
            return;
        }
        const scores = loadScores();
        const stored = scores[user] && scores[user].pass;
        if (!stored || pass !== stored) {
            sendJSON(res, 403, { error: 'No autorizado' });
            return;
        }
        const db = loadJSON(CHAT_FILE);
        const messages = db['broadcast'] || (db['broadcast'] = []);
        messages.push({ from: user, text, ts: Date.now() });
        if (messages.length > 200) messages.splice(0, messages.length - 200);
        saveJSON(CHAT_FILE, db);
        sendJSON(res, 200, { ok: true, messages });
        return;
    }

    // --- Archivos estáticos ---
    let filePath;
    if (url.pathname === '/') {
        filePath = path.join(ROOT, 'index.html');
    } else {
        filePath = path.join(ROOT, url.pathname);
    }
    filePath = path.normalize(filePath);

    const isInside = filePath === path.join(ROOT, 'index.html') || filePath.startsWith(ROOT + path.sep);
    if (!isInside) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Buscalopas corriendo en http://localhost:${PORT}`);
});
