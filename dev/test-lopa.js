// test-lopa.js — Suite de pruebas automáticas de Buscalopas con Playwright.
// Arranca el servidor del juego, lanza Chromium y comprueba mecánicas,
// tienda, ranking y todos los LopAmuletos buscando bugs.
//
// Uso:  npm run test-lopa
//       HEADED=1 npm run test-lopa   (ver el navegador)
//       BASE_URL=http://localhost:3000 npm run test-lopa  (usar servidor ya levantado)

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');

let BASE = process.env.BASE_URL || null;
const PLAYER = 'LopataTest';
const SEED_WALLET = '5000';
const SEED_TOTAL = '5000';

const SEED_ORDER = ['papu', 'rizao', 'iman', 'subidon', 'vidente', 'rastreador', 'milagro', 'ultimobaile', 'mala', 'sombra', 'gafe'];

const SEED_STATS = {
    games: 12, wins: 5, losses: 7, bestEarning: 600, spizSaved: 3, timePlayed: 900,
    luciferReached: 2, turulosWins: 1, correctTurulos: 49,
    lopa: {
        shopUnlocked: true,
        owned: {
            rizao: true, subidon: true, iman: true, vidente: true, papu: true, rastreador: true,
            milagro: true, ultimobaile: true, mala: true, sombra: true, gafe: true,
            board15: true, board20: true, chami: true
        },
        active: { papu: false, vidente: false, iman: false, rastreador: false, rizao: false },
        charges: { milagro: 1, ultimobaile: 1, vidente: 1, subidon: 1 },
        levels: { spiz: 3, dinero: 3 },
        uses: { subidon: 0 },
        order: SEED_ORDER.slice()
    },
    by: {}
};

const FAKE_LB = [
    { name: 'TopUno', total: 9000 }, { name: 'TopDos', total: 8000 }, { name: 'TopTres', total: 7000 },
    { name: 'TopCuatro', total: 6000 }, { name: 'TopCinco', total: 5000 },
    { name: 'SeisLopero', total: 4000 }, { name: PLAYER, total: 3000 }
];

const KNOWN_USERS = ['TopUno', 'TopDos', 'TopTres', 'TopCuatro', 'TopCinco', 'SeisLopero', 'OtroAmigo', PLAYER];
let mockOutgoing = [];

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion fallida');
}

async function check(name, fn) {
    const t = Date.now();
    try {
        await fn();
        passed++;
        console.log(`  ✅ ${name} (${Date.now() - t}ms)`);
    } catch (e) {
        failed++;
        failures.push({ name, msg: e.message });
        console.log(`  ❌ ${name} — ${e.message}`);
    }
}

function apiHandler(route) {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const qs = url.searchParams;
    if (p === '/api/leaderboard') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ players: FAKE_LB }) });
    if (p === '/api/player') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: PLAYER, score: null, total: null, pass: null, stats: null }) });
    if (p === '/api/players') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ names: KNOWN_USERS }) });
    if (p === '/api/score') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    if (p === '/api/suggestions') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ list: [] }) });
    if (p === '/api/user') {
        const name = qs.get('name') || '';
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: KNOWN_USERS.includes(name) }) });
    }
    if (p === '/api/search') {
        const term = (qs.get('q') || '').toLowerCase();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ names: KNOWN_USERS.filter(n => n.toLowerCase().includes(term)) }) });
    }
    if (p === '/api/friends') {
        if (route.request().method() === 'GET') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: ['TopUno'], incoming: ['OtroAmigo'], outgoing: mockOutgoing }) });
        }
        try {
            const j = JSON.parse(route.request().postData());
            if (j.action === 'request' && !mockOutgoing.includes(j.friend)) mockOutgoing.push(j.friend);
        } catch (e) {}
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, friends: [] }) });
    }
    if (p === '/api/chat') {
        if (route.request().method() === 'GET') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
}

async function newContext(browser, volume) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await ctx.route('**cdn.jsdelivr.net**', r => r.abort());
    await ctx.route('**supabase.co**', r => r.abort());
    await ctx.route('**/api/**', apiHandler);
    await ctx.addInitScript(({ name, statsJson, wallet, total, vol }) => {
        localStorage.setItem('buscalopas_username', name);
        localStorage.setItem('buscalopas_loggedin', '1');
        localStorage.setItem('buscalopas_wallet', wallet);
        localStorage.setItem('buscalopas_total', total);
        localStorage.setItem('buscalopas_stats_' + name, statsJson);
        localStorage.setItem('buscalopas_volume', vol);
    }, { name: PLAYER, statsJson: JSON.stringify(SEED_STATS), wallet: SEED_WALLET, total: SEED_TOTAL, vol: volume });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
    return { ctx, page };
}

async function openMenu(page) {
    await page.goto(BASE);
    await page.waitForSelector('#menu-screen:not(.hidden)');
    await page.waitForSelector('#hud-amulets .amu', { timeout: 5000 });
    await page.waitForTimeout(200);
}

async function startGame(page, mode, quantity) {
    if (mode) {
        await page.evaluate((m) => {
            const opt = document.querySelector(`#game-mode option[value="${m}"]`);
            if (opt) opt.disabled = false;
        }, mode);
        await page.selectOption('#game-mode', mode);
    }
    if (quantity) await page.selectOption('#quantity', quantity);
    await page.locator('#start-btn').click();
    await page.waitForSelector('#game-screen:not(.hidden)');
    await page.waitForSelector('#board .cell');
}

function cellLocator(page, r, c) {
    return page.evaluate(([rr, cc]) => rr * size + cc, [r, c]).then(idx =>
        page.locator('#board .cell').nth(idx));
}

async function clickCell(page, r, c, right = false) {
    const loc = await cellLocator(page, r, c);
    if (right) await loc.click({ button: 'right' });
    else await loc.click();
}

async function firstSafeCell(page) {
    return page.evaluate(() => {
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
            if (revealed[r][c] || turulos[r][c]) continue;
            if (spizCell && spizCell.r === r && spizCell.c === c) continue;
            if (mines.some(m => m.r === r && m.c === c)) continue;
            return { r, c };
        }
        return null;
    });
}

async function firstMineCell(page) {
    return page.evaluate(() => mines.length ? { r: mines[0].r, c: mines[0].c } : null);
}

async function setAmuletActive(page, id, active) {
    await page.evaluate(([i, a]) => { statsData.lopa.active[i] = a; }, [id, active]);
}

function waitServer(port, tries = 60) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            http.get(`http://localhost:${port}/api/leaderboard`, (res) => {
                res.resume();
                if (res.statusCode === 200) return resolve();
                retry(n);
            }).on('error', () => retry(n));
        };
        const retry = (n) => {
            if (n <= 0) return reject(new Error('El servidor no arrancó a tiempo'));
            setTimeout(() => attempt(n - 1), 250);
        };
        attempt(tries);
    });
}

async function runTests(browser) {
    const { ctx, page } = await newContext(browser, '0.5');
    const music = await newContext(browser, '0');

    console.log('— LOPAMULETOS / HUD —');

    await check('Orden de amuletos por adquisición en el HUD', async () => {
        await openMenu(page);
        const ids = await page.locator('#hud-amulets .amu').evaluateAll(els => els.map(e => e.dataset.amuletId));
        assert(JSON.stringify(ids.slice(0, SEED_ORDER.length)) === JSON.stringify(SEED_ORDER),
            `orden esperado ${SEED_ORDER.join(',')}, obtenido ${ids.slice(0, SEED_ORDER.length).join(',')}`);
        assert(ids.length >= SEED_ORDER.length, 'faltan amuletos en el HUD');
    });

    await check('El HUD respeta el orden de obtención (incluidas mejoras compradas)', async () => {
        await openMenu(page);
        await page.evaluate(() => {
            statsData.lopa.order = ['rizao', 'level-dinero', 'subidon'];
            statsData.lopa.levels.dinero = 2;
            renderHudAmulets();
        });
        const ids = await page.locator('#hud-amulets .amu').evaluateAll(els => els.map(e => e.dataset.amuletId));
        const filtered = ids.filter(id => id === 'rizao' || id === 'level-dinero' || id === 'subidon');
        assert(JSON.stringify(filtered) === JSON.stringify(['rizao', 'level-dinero', 'subidon']),
            `orden real de obtención: ${filtered.join(',')}`);
    });

    await check('Los amuletos NO parpadean (sin animación CSS)', async () => {
        await openMenu(page);
        const anims = await page.locator('#hud-amulets .amu').evaluateAll(els => els.map(e => getComputedStyle(e).animationName));
        const blinky = anims.filter(a => a !== 'none' && a !== '');
        assert(blinky.length === 0, `amuletos con animación activa: ${blinky.join(',')}`);
    });

    await check('El visor muestra el nombre sin prefijo "Amuleto de"', async () => {
        await openMenu(page);
        await page.locator('#hud-amulets .amu').first().click();
        await page.waitForSelector('#amulet-modal:not(.hidden)');
        const name = (await page.locator('#amulet-modal-name').innerText()).trim();
        assert(name.length > 0 && !/^Amuleto\b/i.test(name), `nombre mostrado: "${name}"`);
        await page.locator('#amulet-ok-btn').click();
    });

    console.log('— PARTIDA / TABLERO —');

    await check('Iniciar partida 9x9 y destapar celda segura', async () => {
        await openMenu(page);
        await startGame(page);
        assert(await page.locator('#board .cell').count() === 81, 'debe haber 81 celdas');
        const safe = await firstSafeCell(page);
        assert(safe, 'no hay celda segura');
        await clickCell(page, safe.r, safe.c);
        const cls = await page.locator('#board .cell').nth(safe.r * 9 + safe.c).getAttribute('class');
        assert(/revealed/.test(cls), 'la celda segura no se destapó');
    });

    await check('Iniciar partida 14x14 (tablero comprado)', async () => {
        await openMenu(page);
        await startGame(page, null, '14');
        assert(await page.locator('#board .cell').count() === 196, 'debe haber 196 celdas');
    });

    await check('Colocar y quitar turulo (clic derecho)', async () => {
        await openMenu(page);
        await startGame(page);
        const c = await page.evaluate(() => {
            for (let r = 0; r < size; r++) for (let cc = 0; cc < size; cc++) {
                if (mines.some(m => m.r === r && m.c === cc)) continue;
                if (spizCell && spizCell.r === r && spizCell.c === cc) continue;
                return { r, c: cc };
            }
            return null;
        });
        assert(c, 'no hay celda para bandera');
        await clickCell(page, c.r, c.c, true);
        let cls = await page.locator('#board .cell').nth(c.r * 9 + c.c).getAttribute('class');
        assert(/turulo/.test(cls), 'la bandera no se colocó');
        await clickCell(page, c.r, c.c, true);
        cls = await page.locator('#board .cell').nth(c.r * 9 + c.c).getAttribute('class');
        assert(!/turulo/.test(cls), 'la bandera no se quitó');
    });

    await check('Quitar turulo de una mina descuenta el contador de la partida', async () => {
        await openMenu(page);
        await startGame(page);
        const before = await page.evaluate(() => statsData.correctTurulos);
        const m = await firstMineCell(page);
        await clickCell(page, m.r, m.c, true);
        let state = await page.evaluate(() => ({ game: gameCorrectTurulos, lifetime: statsData.correctTurulos }));
        assert(state.game === 1, `turulos de la partida = ${state.game}, esperado 1`);
        assert(state.lifetime === before + 1, `turulos de por vida = ${state.lifetime}, esperado ${before + 1}`);
        await clickCell(page, m.r, m.c, true);
        state = await page.evaluate(() => ({ game: gameCorrectTurulos, lifetime: statsData.correctTurulos }));
        assert(state.game === 0, `al quitar la bandera quedaron ${state.game} turulos de partida`);
        assert(state.lifetime === before, `al quitar la bandera el contador de por vida quedó en ${state.lifetime}`);
    });

    console.log('— LOPAMULETOS (efectos) —');

    await check('Vidente muestra el Spiz al empezar y gasta 1 carga', async () => {
        await openMenu(page);
        await setAmuletActive(page, 'vidente', true);
        await page.evaluate(() => { statsData.lopa.charges.vidente = 1; });
        await startGame(page);
        const has = await page.evaluate(() => document.querySelector('#board .cell.vidente-spiz') !== null);
        const charges = await page.evaluate(() => statsData.lopa.charges.vidente);
        assert(has, 'no se resaltó la celda del Spiz');
        assert(charges === 0, `la carga del Vidente no se consumió (${charges})`);
    });

    await check('Vidente sin carga no muestra el Spiz', async () => {
        await openMenu(page);
        await setAmuletActive(page, 'vidente', true);
        await page.evaluate(() => { statsData.lopa.charges.vidente = 0; });
        await startGame(page);
        const has = await page.evaluate(() => document.querySelector('#board .cell.vidente-spiz') !== null);
        assert(has === false, 'el Spiz se mostró sin carga del Vidente');
    });

    await check('Imán: primer turulo gratis y marca la mina', async () => {
        await openMenu(page);
        await setAmuletActive(page, 'iman', true);
        await startGame(page);
        const m = await firstMineCell(page);
        await clickCell(page, m.r, m.c, true);
        const used = await page.evaluate(() => imanUsedThisGame);
        const ok = await page.evaluate(() => statsData.correctTurulos === 50);
        assert(used === true, 'imanUsedThisGame no se activó');
        assert(ok, 'no contó el turulo correcto');
    });

    await check('Subidón: +10s una sola vez por partida y contador', async () => {
        await openMenu(page);
        await startGame(page);
        const t0 = await page.evaluate(() => timeRemaining);
        await page.evaluate(() => enterLuciferState());
        const u1 = await page.evaluate(() => statsData.lopa.uses.subidon);
        const t1 = await page.evaluate(() => timeRemaining);
        assert(u1 === 1, `contador de usos = ${u1}, esperado 1`);
        assert(t1 === t0 + 10, `tiempo tras subidón = ${t1}, esperado ${t0 + 10}`);
        await page.evaluate(() => { exitLuciferState(); enterLuciferState(); });
        const u2 = await page.evaluate(() => statsData.lopa.uses.subidon);
        const t2 = await page.evaluate(() => timeRemaining);
        assert(u2 === 1, `el subidón se reaplicó (usos=${u2})`);
        assert(t2 === t1, `el subidón volvió a sumar tiempo (${t1}->${t2})`);
    });

    await check('Subidón: sin bucle infinito al reentrar en Lucifer', async () => {
        await openMenu(page);
        await startGame(page);
        await page.evaluate(() => enterLuciferState());
        const t1 = await page.evaluate(() => timeRemaining);
        for (let i = 0; i < 6; i++) await page.evaluate(() => { exitLuciferState(); enterLuciferState(); });
        const tEnd = await page.evaluate(() => timeRemaining);
        const uses = await page.evaluate(() => statsData.lopa.uses.subidon);
        assert(tEnd === t1, `el tiempo siguió creciendo (${t1}->${tEnd})`);
        assert(uses === 1, `usos acumulados = ${uses}, esperado 1`);
    });

    await check('Milagro: sobrevive y la bolsa queda visible en el terreno', async () => {
        await openMenu(page);
        await startGame(page);
        const m = await firstMineCell(page);
        const lenBefore = await page.evaluate(() => mines.length);
        const safeBefore = await page.evaluate(() => safeCellsRemaining);
        await clickCell(page, m.r, m.c);
        const state = await page.evaluate(([mm]) => ({
            over: gameOver,
            chg: statsData.lopa.charges.milagro,
            mines: mines.length,
            revealed: revealed[mm.r][mm.c],
            disarmed: !!milagroDisarmed[mm.r + '-' + mm.c],
            safeLeft: safeCellsRemaining
        }), [m]);
        assert(state.over === false, 'la partida terminó pese al Milagro');
        assert(state.chg === 0, `cargas de Milagro = ${state.chg}`);
        assert(state.mines === lenBefore, `la bolsa debería seguir en el tablero (minas=${state.mines})`);
        assert(state.revealed === true, 'la celda no se destapó tras el milagro');
        assert(state.disarmed === true, 'la bolsa no quedó marcada como desactivada');
        assert(state.safeLeft === safeBefore, 'el Milagro alteró las casillas seguras (condición de victoria)');
    });

    await check('Último Baile: prórroga +5s al llegar a 0', async () => {
        await openMenu(page);
        await setAmuletActive(page, 'subidon', false);
        await startGame(page);
        const safe = await firstSafeCell(page);
        await clickCell(page, safe.r, safe.c);
        await page.evaluate(() => { timeRemaining = 1; updateTimerDisplay(); });
        await page.waitForFunction(() => timeRemaining === 5 && gameOver === false, null, { timeout: 5000 });
        assert(true, 'prórroga aplicada');
    });

    await check('Gafe: el Spiz restaura un 10% menos', async () => {
        await openMenu(page);
        await startGame(page);
        const t0 = await page.evaluate(() => timeRemaining);
        const sp = await page.evaluate(() => ({ r: spizCell.r, c: spizCell.c }));
        await clickCell(page, sp.r, sp.c);
        const t1 = await page.evaluate(() => timeRemaining);
        const expected = t0 + Math.round(Math.round(180 * 0.20 * (1 + 0.10 * 3)) * 0.9);
        assert(t1 === expected, `ganancia de Spiz = ${t1 - t0}s, esperado ${expected - t0}s`);
    });

    await check('Mala Pipa: -10s al inicio', async () => {
        await openMenu(page);
        await startGame(page);
        const t = await page.evaluate(() => timeRemaining);
        assert(t === 170, `tiempo inicial = ${t}, esperado 170`);
    });

    await check('Rastreador: revela la zona cada 50 bolsas correctas', async () => {
        await openMenu(page);
        await setAmuletActive(page, 'rastreador', true);
        await startGame(page);
        const before = await page.evaluate(() => revealed.flat().filter(Boolean).length);
        const m = await firstMineCell(page);
        await clickCell(page, m.r, m.c, true);
        await page.waitForTimeout(100);
        const after = await page.evaluate(() => revealed.flat().filter(Boolean).length);
        assert(after > before, `no se reveló zona (${before}->${after})`);
        const ct = await page.evaluate(() => statsData.correctTurulos);
        assert(ct === 50, `turulos correctos = ${ct}, esperado 50`);
    });

    await check('Victoria por turulos en modo Borrachín', async () => {
        await openMenu(page);
        await startGame(page, 'turulos');
        const winsBefore = await page.evaluate(() => statsData.wins);
        const walletBefore = await page.evaluate(() => wallet);
        const mines = await page.evaluate(() => mines.slice());
        for (const m of mines) await clickCell(page, m.r, m.c, true);
        await page.waitForTimeout(150);
        const res = await page.evaluate(() => ({ over: gameOver, wins: statsData.wins, wallet }));
        assert(res.over === true, 'no se terminó la partida al ganar');
        assert(res.wins === winsBefore + 1, `victorias = ${res.wins}, esperado ${winsBefore + 1}`);
        assert(res.wallet > walletBefore, `no se sumó dinero (${walletBefore}->${res.wallet})`);
    });

    console.log('— TIENDA DEL DRAGON NARCO —');

    await check('La tienda abre con el dragón a la derecha y stock de hoy', async () => {
        await openMenu(page);
        const vis = await page.locator('#hud-shop-btn').isVisible();
        assert(vis, 'botón de tienda no visible (shopUnlocked)');
        await page.locator('#hud-shop-btn').click();
        await page.waitForSelector('#shop-modal:not(.hidden)');
        const dragon = await page.locator('#shop-modal .shop-dragon img').getAttribute('src');
        assert(dragon && /dragon\.jpg/.test(dragon), `sprite del dragón: ${dragon}`);
        const date = (await page.locator('#shop-date').innerText()).trim();
        assert(date.length > 0, 'falta la fecha del stock de hoy');
        const items = await page.locator('.shop-item').count();
        assert(items > 0, 'la tienda salió vacía');
    });

    await check('El Dragon Narco regala la Carta (reliquia) la primera vez', async () => {
        await openMenu(page);
        await page.locator('#hud-shop-btn').click();
        await page.waitForSelector('#amulet-modal:not(.hidden)', { timeout: 3000 });
        const title = (await page.locator('#amulet-modal-title').innerText()).trim();
        assert(/Dragon Narco/i.test(title), `título del regalo: "${title}"`);
        await page.locator('#amulet-ok-btn').click();
        const owned = await page.evaluate(() => statsData.lopa.owned.dragon === true);
        const hud = await page.locator('#hud-amulets .amu[data-amulet-id="dragon"]').count();
        const row = await page.locator('.shop-gift').count();
        assert(owned, 'la reliquia no se guardó como obtenida');
        assert(hud === 1, 'la reliquia no aparece en el HUD');
        assert(row === 1, 'no aparece la fila de regalo en la tienda');
        await page.locator('#shop-close-btn').click();
    });

    await check('Comprar un objeto del stock de hoy descuenta la cartera', async () => {
        await openMenu(page);
        await page.locator('#hud-shop-btn').click();
        await page.waitForSelector('#shop-modal:not(.hidden)');
        await page.waitForTimeout(700);
        const giftOpen = await page.locator('#amulet-modal').evaluate(el => !el.classList.contains('hidden'));
        if (giftOpen) await page.locator('#amulet-ok-btn').click();
        const buy = page.locator('.shop-buy').first();
        const price = parseInt((await buy.innerText()).replace(/[^\d]/g, ''), 10);
        const before = await page.evaluate(() => wallet);
        await buy.click();
        await page.waitForTimeout(200);
        const after = await page.evaluate(() => wallet);
        assert(before - after === price, `wallet ${before}->${after}, esperado -${price}`);
        await page.locator('#shop-close-btn').click();
    });

    console.log('— RANKING / NAVEGACIÓN —');

    await check('Ranking muestra tu puesto por debajo del top 5', async () => {
        await openMenu(page);
        await page.waitForSelector('.ranking-panel .lb-below', { timeout: 5000 });
        const rank = (await page.locator('.lb-below .lb-rank').innerText()).trim();
        const name = (await page.locator('.lb-below .lb-name').innerText()).trim();
        assert(rank === '7', `puesto mostrado = ${rank}, esperado 7`);
        assert(name === PLAYER, `nombre mostrado = ${name}`);
        assert(await page.locator('.ranking-panel .lb-row').count() === 6, 'deben verse 5 filas + la tuya');
    });

    await check('El título del HUD lleva al menú principal', async () => {
        await openMenu(page);
        await startGame(page);
        await page.locator('.hud-title').click();
        await page.waitForSelector('#menu-screen:not(.hidden)');
        assert(await page.locator('#game-screen').evaluate(el => el.classList.contains('hidden')), 'la partida sigue visible');
    });

    await check('Botones Reiniciar y Menú Principal funcionan', async () => {
        await openMenu(page);
        await startGame(page);
        await page.locator('#reset-btn').click();
        await page.waitForSelector('#board .cell');
        assert(await page.locator('#board .cell').count() === 81, 'el reinicio no re-renderizó');
        await page.locator('#back-menu-btn').click();
        await page.waitForSelector('#menu-screen:not(.hidden)');
    });

    console.log('— PANTALLA DE RESULTADO / HUD —');

    await check('Pantalla de resultado: desglose de ganancias tras victoria', async () => {
        await openMenu(page);
        await startGame(page, 'turulos');
        const mines = await page.evaluate(() => mines.slice());
        for (const m of mines) await clickCell(page, m.r, m.c, true);
        await page.waitForSelector('#result-modal:not(.hidden)', { timeout: 3000 });
        const rows = await page.locator('#result-earnings .result-earn-row').count();
        assert(rows >= 1, 'no hay filas en el desglose de ganancias');
        const total = (await page.locator('#result-earnings .result-earn-total .result-earn-amount').innerText()).trim();
        assert(/^\+?\d+€$/.test(total), `total mostrado: "${total}"`);
        const extra = (await page.locator('#result-extra').innerText()).trim();
        assert(extra.length > 0, 'falta la info extra (segundos sobrantes) del resultado');
        await page.locator('#reset-btn').click();
        await page.waitForFunction(() => document.getElementById('result-modal').classList.contains('hidden'));
    });

    await check('Turulos: se cobran SOLO los de esta partida, no los de por vida', async () => {
        await openMenu(page);
        await startGame(page);
        const lifetime = await page.evaluate(() => statsData.correctTurulos);
        assert(lifetime >= 1, `el seed debería tener turulos de por vida (${lifetime})`);
        await page.evaluate(() => {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (!mines.some(m => m.r === r && m.c === c)) revealed[r][c] = true;
            }
            safeCellsRemaining = 0;
            winGame(false);
        });
        await page.waitForSelector('#result-modal:not(.hidden)', { timeout: 3000 });
        const rows = await page.locator('#result-earnings .result-earn-row').allInnerTexts();
        const turuloRow = rows.find(r => /Turulos correctos/.test(r));
        assert(!turuloRow, `se cobró turulos sin marcar ninguno: ${rows.join(' | ')}`);
        await page.locator('#reset-btn').click();
    });

    await check('Resultado: flota sin bloquear, X para cerrar y círculo para reabrir', async () => {
        await openMenu(page);
        await startGame(page, 'turulos');
        const mines = await page.evaluate(() => mines.slice());
        for (const m of mines) await clickCell(page, m.r, m.c, true);
        await page.waitForSelector('#result-modal:not(.hidden)', { timeout: 3000 });
        const total = (await page.locator('#result-earnings .result-earn-total .result-earn-amount').innerText()).trim();
        assert(total.length > 0, 'el desglose está vacío');
        const pe = await page.evaluate(() => getComputedStyle(document.getElementById('result-modal')).pointerEvents);
        assert(pe === 'none', `el resultado bloquea los clics (pointer-events=${pe})`);
        await page.locator('#result-close-x').click();
        await page.waitForFunction(() => document.getElementById('result-modal').classList.contains('hidden'));
        assert(await page.locator('#result-reopen-btn').evaluate(el => !el.classList.contains('hidden')), 'el círculo para reabrir no aparece');
        await page.locator('#result-reopen-btn').click();
        await page.waitForSelector('#result-modal:not(.hidden)');
        assert(await page.locator('#result-reopen-btn').evaluate(el => el.classList.contains('hidden')), 'el círculo no se oculta al reabrir');
        await page.locator('#result-close-x').click();
        await page.waitForFunction(() => document.getElementById('result-modal').classList.contains('hidden'));
        await page.locator('#reset-btn').click();
        await page.waitForFunction(() => document.getElementById('result-modal').classList.contains('hidden'));
        assert(await page.locator('#result-reopen-btn').evaluate(el => el.classList.contains('hidden')), 'el círculo no se limpia al reiniciar');
    });

    console.log('— RELIQUIA / TIENDA —');

    await check('Reliquia del dragón: botón a las 10 partidas y da +50€', async () => {
        await openMenu(page);
        await page.evaluate(() => {
            statsData.lopa.owned.dragon = true;
            statsData.lopa.relicGames = 9;
        });
        await startGame(page);
        const btn = page.locator('#relic-dragon-btn');
        assert(await btn.evaluate(el => !el.classList.contains('hidden')), 'el botón del dragón no aparece a las 10 partidas');
        const wallet0 = await page.evaluate(() => wallet);
        await btn.click();
        await page.waitForTimeout(150);
        const res = await page.evaluate(() => ({ wallet, games: statsData.lopa.relicGames, uses: statsData.lopa.uses.dragon }));
        assert(res.wallet === wallet0 + 50, `wallet ${wallet0}->${res.wallet}, esperado +50`);
        assert(res.games === 0, `relicGames = ${res.games}, esperado 0`);
        assert(res.uses === 1, `usos del dragón = ${res.uses}`);
        assert(await btn.evaluate(el => el.classList.contains('hidden')), 'el botón no se oculta tras usarlo');
    });

    await check('Reliquia del dragón: sin 10 partidas el botón no aparece', async () => {
        await openMenu(page);
        await page.evaluate(() => {
            statsData.lopa.owned.dragon = true;
            statsData.lopa.relicGames = 3;
        });
        await startGame(page);
        const btn = page.locator('#relic-dragon-btn');
        assert(await btn.evaluate(el => el.classList.contains('hidden')), 'el botón aparece sin haber acumulado 10 partidas');
    });

    await check('Tienda desbloqueada: notificación con botón que abre la tienda', async () => {
        await openMenu(page);
        await page.evaluate(() => {
            statsData.lopa.shopUnlocked = false;
            statsData.wins = 4;
        });
        await startGame(page);
        await page.evaluate(() => {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (!mines.some(m => m.r === r && m.c === c)) revealed[r][c] = true;
            }
            safeCellsRemaining = 0;
            winGame(false);
        });
        await page.waitForFunction(() => /TIENDA DESBLOQUEADA/i.test(document.getElementById('toast-title').textContent), null, { timeout: 3000 });
        const actionBtn = page.locator('#toast-action');
        assert(await actionBtn.evaluate(el => !el.classList.contains('hidden')), 'falta el botón de acción en la notificación de la tienda');
        assert(/tienda/i.test(await actionBtn.innerText()), `el botón no menciona la tienda: "${await actionBtn.innerText()}"`);
        await actionBtn.click();
        await page.waitForSelector('#shop-modal:not(.hidden)');
        await page.waitForSelector('#amulet-modal:not(.hidden)', { timeout: 3000 });
        await page.locator('#amulet-ok-btn').click();
        await page.locator('#shop-close-btn').click();
    });

    console.log('— AMIGOS / CHAT —');

    await check('Amigos: NO agrega a un lopero inexistente', async () => {
        await openMenu(page);
        await page.locator('#hud-user-btn').click();
        await page.locator('#dd-friends').click();
        await page.waitForSelector('#friends-modal:not(.hidden)');
        await page.locator('.friends-tab[data-tab="add"]').click();
        await page.fill('#friends-add-input', 'GhostUser');
        await page.locator('#friends-add-btn').click();
        await page.waitForFunction(() => /no existe/i.test(document.getElementById('toast-msg').textContent), null, { timeout: 3000 });
        await page.locator('.friends-tab[data-tab="requests"]').click();
        const ghost = await page.locator('#friends-requests .friend-outgoing').filter({ hasText: 'GhostUser' }).count();
        assert(ghost === 0, 'se envió solicitud a un usuario que no existe');
        await page.locator('#friends-close-btn').click();
    });

    await check('Amigos: envía solicitud a un usuario existente', async () => {
        await openMenu(page);
        await page.locator('#hud-user-btn').click();
        await page.locator('#dd-friends').click();
        await page.waitForSelector('#friends-modal:not(.hidden)');
        await page.locator('.friends-tab[data-tab="add"]').click();
        await page.fill('#friends-add-input', 'TopDos');
        await page.locator('#friends-add-btn').click();
        await page.waitForFunction(() => /Solicitud enviada/i.test(document.getElementById('toast-msg').textContent), null, { timeout: 3000 });
        await page.locator('.friends-tab[data-tab="requests"]').click();
        const sent = await page.locator('#friends-requests .friend-outgoing').filter({ hasText: 'TopDos' }).count();
        assert(sent === 1, 'la solicitud enviada no aparece en pendientes');
        await page.locator('#friends-close-btn').click();
    });

    await check('Amigos: solicitud entrante se acepta y pasa a la lista', async () => {
        await openMenu(page);
        await page.locator('#hud-user-btn').click();
        await page.locator('#dd-friends').click();
        await page.waitForSelector('#friends-modal:not(.hidden)');
        await page.locator('.friends-tab[data-tab="requests"]').click();
        const inc = await page.locator('#friends-requests .friend-incoming').filter({ hasText: 'OtroAmigo' }).count();
        assert(inc === 1, 'no aparece la solicitud entrante de OtroAmigo');
        await page.locator('#friends-requests .friend-accept').first().click();
        await page.waitForFunction(() => /ahora es tu amigo/i.test(document.getElementById('toast-msg').textContent), null, { timeout: 3000 });
        await page.locator('.friends-tab[data-tab="list"]').click();
        const added = await page.locator('#friends-list .friend-name').filter({ hasText: 'OtroAmigo' }).count();
        assert(added === 1, 'OtroAmigo no pasó a la lista de amigos');
        await page.locator('#friends-close-btn').click();
    });

    await check('Botón Solicitudes sobre el chat: desplegable con las recibidas', async () => {
        await openMenu(page);
        const rb = page.locator('#requests-open-btn');
        assert(await rb.count() === 1, 'falta el botón de solicitudes');
        assert((await rb.locator('#requests-badge').innerText()).trim() === '1', 'el badge del botón de solicitudes no muestra 1');
        await rb.click();
        await page.waitForSelector('#requests-dropdown:not(.hidden)');
        const inc = await page.locator('#requests-list .friend-incoming').filter({ hasText: 'OtroAmigo' }).count();
        assert(inc === 1, 'la solicitud recibida no aparece en el desplegable');
        await page.locator('#requests-list .friend-accept').first().click();
        await page.waitForFunction(() => /ahora es tu amigo/i.test(document.getElementById('toast-msg').textContent), null, { timeout: 3000 });
        const chatTxt = (await page.locator('#chat-open-btn').innerText()).trim();
        assert(/Chat/.test(chatTxt), `el botón de abajo no pone Chat: "${chatTxt}"`);
    });

    await check('Chat: badge de solicitudes + contestar y conversar', async () => {
        await openMenu(page);
        const reqBadge = page.locator('#requests-open-btn #requests-badge');
        assert(await reqBadge.count() === 1, 'el badge de solicitudes no aparece');
        assert((await reqBadge.innerText()).trim() === '1', `badge solicitudes = ${await reqBadge.innerText().catch(() => '?')}, esperado 1`);
        const chatBadge = page.locator('#chat-open-btn .chat-badge');
        assert(await chatBadge.isHidden(), 'el badge de mensajes del chat debería estar oculto sin mensajes sin leer');
        await page.locator('#chat-open-btn').click();
        await page.waitForSelector('#chat-panel:not(.hidden)');
        const strip = await page.locator('#chat-requests .friend-incoming').filter({ hasText: 'OtroAmigo' }).count();
        assert(strip === 1, 'no aparece la solicitud dentro del chat');
        await page.locator('#chat-requests .friend-accept').first().click();
        await page.waitForTimeout(250);
        const asFriend = await page.locator('.chat-friend').filter({ hasText: 'OtroAmigo' }).count();
        assert(asFriend === 1, 'OtroAmigo no pasó a la lista del chat');
        await page.locator('.chat-friend').filter({ hasText: 'TopUno' }).click();
        await page.fill('#chat-input', 'hola lopera');
        await page.locator('#chat-send-btn').click();
        await page.waitForTimeout(250);
        const mine = await page.locator('.chat-msg-me').count();
        assert(mine >= 1, 'el mensaje enviado no aparece en el chat');
        await page.locator('#chat-close-btn').click();
    });

    await check('Desplegable de solicitudes: muestra entrantes y enviadas con botones', async () => {
        await openMenu(page);
        await page.locator('#requests-open-btn').click();
        await page.waitForSelector('#requests-dropdown:not(.hidden)');
        const inc = await page.locator('#requests-list .friend-incoming').filter({ hasText: 'OtroAmigo' }).count();
        const out = await page.locator('#requests-list .friend-outgoing').filter({ hasText: 'TopDos' }).count();
        const cancel = await page.locator('#requests-list .friend-cancel').count();
        assert(inc === 1, 'no aparece la solicitud entrante en el desplegable');
        assert(out === 1, 'no aparece la solicitud enviada en el desplegable');
        assert(cancel === 1, 'falta el botón de cancelar en las enviadas del desplegable');
        await page.locator('#requests-open-btn').click();
    });

    await check('Sin contraseña: no se puede agregar, ver info ni usar chat', async () => {
        const c2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
        await c2.route('**cdn.jsdelivr.net**', r => r.abort());
        await c2.route('**supabase.co**', r => r.abort());
        await c2.route('**/api/**', apiHandler);
        const p2 = await c2.newPage();
        p2.on('dialog', d => d.accept().catch(() => {}));
        await p2.goto(BASE);
        await p2.waitForSelector('#user-modal:not(.hidden)');
        await p2.fill('#user-input', 'SinPassTest');
        await p2.locator('#user-confirm-btn').click();
        await p2.waitForFunction(() => document.getElementById('user-modal').classList.contains('hidden'), null, { timeout: 4000 });
        await p2.waitForTimeout(300);
        assert(await p2.locator('#chat-open-btn').evaluate(el => el.classList.contains('hidden')), 'el botón de chat debería estar oculto sin contraseña');
        assert(await p2.locator('#requests-open-btn').evaluate(el => el.classList.contains('hidden')), 'el botón de solicitudes debería estar oculto sin contraseña');
        await p2.locator('#hud-user-btn').click();
        assert(await p2.locator('#dd-friends').evaluate(el => el.classList.contains('hidden')), 'Amigos no debería estar disponible sin contraseña');
        assert(await p2.locator('#dd-info').evaluate(el => el.classList.contains('hidden')), 'Info no debería estar disponible sin contraseña');
        const refused = await p2.evaluate(async () => {
            const before = myOutgoing.length;
            const ok = await addFriend('TopUno');
            return { ok, same: myOutgoing.length === before };
        });
        assert(refused.ok === false && refused.same, 'addFriend debería rechazarse sin contraseña');
        await p2.locator('.ranking-panel .lb-row').first().click();
        await p2.waitForSelector('#player-modal:not(.hidden)');
        const btnTxt = await p2.locator('#player-add-friend').innerText();
        const btnDisabled = await p2.locator('#player-add-friend').evaluate(el => el.disabled);
        assert(/Regístrate/i.test(btnTxt) && btnDisabled, `el botón del ranking debería estar bloqueado: "${btnTxt}"`);
        const infoBlocked = await p2.evaluate(() => { openInfoModal(); return document.getElementById('info-modal').classList.contains('hidden'); });
        assert(infoBlocked, 'el modal de info no debería abrirse sin contraseña');
        await c2.close();
    });

    await check('LopAmuletos conseguidos: botones que desaparecen al verlos', async () => {
        await openMenu(page);
        await page.evaluate(() => {
            statsData.lopa.owned.mala = false;
            statsData.losses = 4;
            statsData.lopa.charges.milagro = 0;
        });
        await startGame(page);
        const m = await firstMineCell(page);
        await clickCell(page, m.r, m.c);
        await page.waitForSelector('#result-modal:not(.hidden)', { timeout: 3000 });
        const amuOpen = await page.locator('#amulet-modal').evaluate(el => !el.classList.contains('hidden'));
        if (amuOpen) await page.locator('#amulet-ok-btn').click();
        const btn = page.locator('#result-amulets .result-amulet-btn[data-amulet-id="mala"]');
        assert(await btn.count() === 1, 'no aparece el botón del amuleto conseguido');
        await btn.click();
        await page.waitForSelector('#amulet-modal:not(.hidden)');
        const name = (await page.locator('#amulet-modal-name').innerText()).trim();
        assert(/Mala Pipa/.test(name), `el visor muestra: "${name}"`);
        await page.locator('#amulet-ok-btn').click();
        await page.waitForFunction(() => document.getElementById('amulet-modal').classList.contains('hidden'));
        assert(await page.locator('#result-amulets .result-amulet-btn[data-amulet-id="mala"]').count() === 0, 'el botón no desapareció al verlo');
        await page.locator('#reset-btn').click();
    });

    await check('El dinero del HUD abre la tienda si está desbloqueada', async () => {
        await openMenu(page);
        assert(await page.evaluate(() => statsData.lopa.shopUnlocked) === true, 'seed sin tienda desbloqueada');
        await page.locator('#hud-money-btn').click();
        await page.waitForSelector('#shop-modal:not(.hidden)');
        await page.waitForSelector('#amulet-modal:not(.hidden)', { timeout: 3000 });
        await page.locator('#amulet-ok-btn').click();
        await page.locator('#shop-close-btn').click();
    });

    await check('El dinero ya no está en la barra de partida y el reloj es independiente', async () => {
        await openMenu(page);
        await startGame(page);
        assert(await page.locator('#stats-bar #wallet').count() === 0, 'todavía hay #wallet en la barra de partida');
        assert(await page.locator('.timer-big').count() === 1, 'no hay reloj independiente');
        assert(await page.locator('#hud-money-btn #hud-wallet').count() === 1, 'el HUD no muestra el dinero');
        assert(await page.locator('.hero-info-card').count() === 1, 'falta la tarjeta del héroe');
    });

    console.log('— LUCIFER (DEIDAD) —');

    await check('Lucifer: login con contraseña, todos los LopAmuletos y cartera de pruebas', async () => {
        const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await dctx.route('**supabase.co**', r => r.abort());
        await dctx.route('**cdn.jsdelivr.net**', r => r.abort());
        await dctx.route('**fonts.googleapis.com**', r => r.abort());
        await dctx.route('**fonts.gstatic.com**', r => r.abort());
        await dctx.route('**/api/**', r => {
            const u = new URL(r.request().url());
            if (u.pathname === '/api/player' || u.pathname === '/api/chat/broadcast') { r.continue(); return; }
            r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        });
        const dp = await dctx.newPage();
        dp.on('dialog', d => d.accept().catch(() => {}));
        await dp.goto(BASE, { waitUntil: 'domcontentloaded' });
        await dp.waitForSelector('#user-modal:not(.hidden)', { timeout: 8000 });
        await dp.fill('#user-input', 'Lucifer');
        await dp.click('#user-confirm-btn');
        await dp.waitForSelector('#name-pass-input:not(.hidden)', { timeout: 5000 });
        await dp.fill('#name-pass-input', 'mala');
        await dp.click('#user-confirm-btn');
        await dp.waitForTimeout(400);
        const err = await dp.evaluate(() => document.getElementById('user-error').textContent.trim());
        assert(err.includes('incorrecta'), `error esperado "incorrecta", recibido: ${err}`);
        await dp.fill('#name-pass-input', 'lucifer');
        await dp.click('#user-confirm-btn');
        await dp.waitForSelector('#menu-screen:not(.hidden)', { timeout: 8000 });
        await dp.waitForSelector('#hud-amulets .amu', { timeout: 8000 });
        const st = await dp.evaluate(() => ({
            user: getUsername(),
            wallet,
            amulets: Object.keys(statsData.lopa.owned).length,
            videnteCharges: statsData.lopa.charges.vidente,
            spizLevel: statsData.lopa.levels.spiz,
            shop: statsData.lopa.shopUnlocked
        }));
        assert(st.user === 'Lucifer' && st.wallet === 1000000, `estado Lucifer: ${JSON.stringify(st)}`);
        assert(st.amulets === 12, `amuletos ${st.amulets}, esperado 12`);
        assert(st.videnteCharges === 3 && st.spizLevel === 5, `cargas/niveles: ${JSON.stringify(st)}`);
        assert(st.shop === true, 'tienda no desbloqueada');

        await dp.click('#chat-open-btn');
        await dp.waitForSelector('#chat-panel:not(.hidden)', { timeout: 5000 });
        await dp.click('#chat-friends .chat-friend[data-name="__avisos_lucifer__"]');
        await dp.waitForSelector('#chat-view:not(.hidden)', { timeout: 5000 });
        await dp.fill('#chat-input', '¡Hola a todos! Prueba de Lucifer 🔥');
        await dp.click('#chat-send-btn');
        await dp.waitForTimeout(700);
        const sent = await dp.evaluate(() => [...document.querySelectorAll('#chat-messages .chat-msg-text')].map(e => e.textContent));
        assert(sent.some(t => t.includes('Prueba de Lucifer')), `mensaje nuevo no visible: ${JSON.stringify(sent)}`);
        const bc = await dp.evaluate(() => fetch('/api/chat/broadcast').then(r => r.json()));
        assert(Array.isArray(bc.messages) && bc.messages.some(m => m.from === 'Lucifer'), 'broadcast no guardado en el servidor');
        const forbidden = await dp.evaluate(() => fetch('/api/chat/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: 'fff', text: 'hack', pass: 'x' }) }).then(r => r.status));
        assert(forbidden === 403, `POST broadcast como "fff" devolvió ${forbidden}`);
        await dctx.close();
    });

    await check('Lucifer: oculto del ranking y de búsquedas', async () => {
        const lb = await (await fetch(`${BASE}/api/leaderboard`)).json();
        assert(!lb.players.some(p => p.name === 'Lucifer'), 'Lucifer aparece en el leaderboard');
        const ur = await fetch(`${BASE}/api/user?name=Lucifer`).then(r => r.json());
        assert(ur.exists === false, `/api/user Lucifer = ${ur.exists}`);
        const sr = await fetch(`${BASE}/api/search?q=Luc`).then(r => r.json());
        assert(!sr.names.includes('Lucifer'), 'Lucifer aparece en búsquedas');
    });

    await check('Lucifer: re-login con el mismo nombre sin sesión pide contraseña (fix bloqueo)', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await ctx.route('**supabase.co**', r => r.abort());
        await ctx.route('**cdn.jsdelivr.net**', r => r.abort());
        await ctx.route('**fonts.googleapis.com**', r => r.abort());
        await ctx.route('**fonts.gstatic.com**', r => r.abort());
        await ctx.route('**/api/**', r => {
            const u = new URL(r.request().url());
            if (u.pathname === '/api/player' || u.pathname === '/api/chat/broadcast') { r.continue(); return; }
            r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        });
        await ctx.addInitScript(() => {
            localStorage.setItem('buscalopas_username', 'Lucifer');
            localStorage.setItem('buscalopas_wallet', '5000');
            localStorage.setItem('buscalopas_total', '5000');
        });
        const p = await ctx.newPage();
        await p.goto(BASE, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(1200);
        await p.click('#hud-user-btn');
        await p.waitForTimeout(200);
        await p.click('#dd-name');
        await p.waitForTimeout(300);
        await p.fill('#user-input', 'Lucifer');
        await p.click('#user-confirm-btn');
        await p.waitForTimeout(500);
        const asksPass = await p.evaluate(() => !document.getElementById('name-pass-input').classList.contains('hidden'));
        assert(asksPass, 'no pidió la contraseña al re-login con el mismo nombre sin sesión');
        await p.fill('#name-pass-input', 'lucifer');
        await p.click('#user-confirm-btn');
        await p.waitForFunction(() => isLoggedIn(), null, { timeout: 8000 });
        assert(await p.evaluate(() => isLoggedIn() && getUsername() === 'Lucifer'), 'no re-logueó como Lucifer');
        await ctx.close();
    });

    await check('Lucifer: login escribiendo "lucifer" en minúsculas también funciona', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await ctx.route('**supabase.co**', r => r.abort());
        await ctx.route('**cdn.jsdelivr.net**', r => r.abort());
        await ctx.route('**fonts.googleapis.com**', r => r.abort());
        await ctx.route('**fonts.gstatic.com**', r => r.abort());
        await ctx.route('**/api/**', r => {
            const u = new URL(r.request().url());
            if (u.pathname === '/api/player' || u.pathname === '/api/chat/broadcast') { r.continue(); return; }
            r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        });
        const p = await ctx.newPage();
        await p.goto(BASE, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(1200);
        await p.waitForSelector('#user-modal:not(.hidden)');
        await p.fill('#user-input', 'lucifer');
        await p.click('#user-confirm-btn');
        await p.waitForSelector('#name-pass-input:not(.hidden)', { timeout: 5000 });
        await p.fill('#name-pass-input', 'lucifer');
        await p.click('#user-confirm-btn');
        await p.waitForFunction(() => isLoggedIn(), null, { timeout: 8000 });
        const res = await p.evaluate(() => ({ name: getUsername(), logged: isLoggedIn(), err: document.getElementById('user-error').textContent }));
        assert(res.logged && res.name === 'Lucifer', `minúsculas no entró como Lucifer: ${JSON.stringify(res)}`);
        await ctx.close();
    });

    await check('Logout: visible sin contraseña, pide confirmación, limpia y permite re-login', async () => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await ctx.route('**supabase.co**', r => r.abort());
        await ctx.route('**cdn.jsdelivr.net**', r => r.abort());
        await ctx.route('**/api/**', apiHandler);
        const p = await ctx.newPage();
        await p.goto(BASE, { waitUntil: 'domcontentloaded' });
        await p.waitForSelector('#user-modal:not(.hidden)');
        await p.fill('#user-input', 'LogoutTest');
        await p.locator('#user-confirm-btn').click();
        await p.waitForFunction(() => document.getElementById('user-modal').classList.contains('hidden'), null, { timeout: 4000 });
        await p.waitForTimeout(300);
        await p.locator('#hud-user-btn').click();
        await p.waitForTimeout(200);
        const logoutVisible = await p.locator('#dd-logout').evaluate(el => !el.classList.contains('hidden'));
        assert(logoutVisible, 'Cerrar sesión debería estar visible aunque no haya contraseña');
        await p.locator('#dd-logout').click();
        await p.waitForSelector('#confirm-bubble:not(.hidden)', { timeout: 4000 });
        const msg = await p.locator('#confirm-bubble-msg').innerText();
        assert(/LogoutTest/i.test(msg), `el globo de confirmación no menciona al usuario: "${msg}"`);
        await p.locator('#confirm-bubble-yes').click();
        await p.waitForSelector('#user-modal:not(.hidden)', { timeout: 4000 });
        await p.waitForTimeout(300);
        const cleared = await p.evaluate(() => ({
            name: getUsername(),
            logged: isLoggedIn(),
            wallet: localStorage.getItem('buscalopas_wallet')
        }));
        assert(cleared.name === '' && !cleared.logged, `no se limpió la sesión: ${JSON.stringify(cleared)}`);
        assert(cleared.wallet === null, 'la cartera local debería limpiarse al cerrar sesión');
        await p.fill('#user-input', 'LogoutTest2');
        await p.locator('#user-confirm-btn').click();
        await p.waitForFunction(() => document.getElementById('user-modal').classList.contains('hidden'), null, { timeout: 4000 });
        assert(await p.evaluate(() => getUsername() === 'LogoutTest2'), 'no se pudo entrar con otro usuario tras el logout');
        await ctx.close();
    });

    await check('Lucifer: un usuario con contraseña ve "😈 Lucifer" en el chat y puede responder', async () => {
        const hash = require('crypto').createHash('sha256').update('buscalopas::PruebaChat::prueba').digest('hex');
        await fetch(`${BASE}/api/score`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'PruebaChat', total: 120, pass: hash })
        });
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await ctx.route('**supabase.co**', r => r.abort());
        await ctx.route('**cdn.jsdelivr.net**', r => r.abort());
        await ctx.route('**fonts.googleapis.com**', r => r.abort());
        await ctx.route('**fonts.gstatic.com**', r => r.abort());
        await ctx.route('**/api/chat**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));
        const p = await ctx.newPage();
        await p.goto(BASE, { waitUntil: 'domcontentloaded' });
        await p.waitForSelector('#user-modal:not(.hidden)', { timeout: 8000 });
        await p.fill('#user-input', 'PruebaChat');
        await p.click('#user-confirm-btn');
        await p.waitForSelector('#name-pass-input:not(.hidden)', { timeout: 5000 });
        await p.fill('#name-pass-input', 'prueba');
        await p.click('#user-confirm-btn');
        await p.waitForFunction(() => isLoggedIn(), null, { timeout: 8000 });
        await p.click('#chat-open-btn');
        await p.waitForSelector('#chat-panel:not(.hidden)', { timeout: 5000 });
        await p.waitForTimeout(800);
        const names = await p.evaluate(() => [...document.querySelectorAll('#chat-friends .chat-friend-name')].map(e => e.textContent.trim()));
        assert(names.some(n => n.includes('Lucifer')), `PruebaChat no ve "😈 Lucifer": ${JSON.stringify(names)}`);
        await p.click('#chat-friends .chat-friend[data-name="Lucifer"]');
        await p.waitForSelector('#chat-view:not(.hidden)', { timeout: 5000 });
        const canReply = await p.evaluate(() => !document.querySelector('.chat-input-row').classList.contains('hidden'));
        assert(canReply, 'no puede responder a Lucifer');
        await ctx.close();
    });

    console.log('— MÚSICA —');

    await check('La música suena aunque el volumen esté a 0', async () => {
        const { ctx: mctx, page: mp } = music;
        await openMenu(mp);
        await mp.waitForFunction(() => document.getElementById('bg-music').paused === false, null, { timeout: 5000 })
            .catch(() => {});
        const paused = await mp.evaluate(() => document.getElementById('bg-music').paused);
        const vol = await mp.evaluate(() => document.getElementById('bg-music').volume);
        assert(paused === false, `bg-music sigue pausado (volumen ${vol})`);
        assert(vol === 0, `volumen = ${vol}, esperado 0`);
        await mctx.close();
    });

    await ctx.close();
}

async function main() {
    let server = null;
    let port = 0;
    if (!BASE) {
        port = 3977;
        server = spawn(process.execPath, ['server.js'], {
            env: { ...process.env, PORT: String(port) },
            stdio: 'ignore'
        });
        await waitServer(port);
        BASE = `http://localhost:${port}`;
    }

    const browser = await chromium.launch({
        headless: !process.env.HEADED,
        args: ['--autoplay-policy=no-user-gesture-required']
    });

    try {
        await runTests(browser);
    } finally {
        await browser.close();
        if (server) server.kill();
    }

    console.log(`\n=== ${passed} aprobados, ${failed} fallidos ===`);
    if (failures.length) {
        console.log('\nFallos:');
        for (const f of failures) console.log(`  - ${f.name}: ${f.msg}`);
        process.exit(1);
    }
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
