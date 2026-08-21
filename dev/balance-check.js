// balance-check.js — Análisis de equilibrio económico de Buscalopas.
// Simula ganancias esperadas por victoria en cada dificultad/tamaño y las
// compara con los precios de la tienda del Dragon Narco para detectar si
// precios y dificultades tienen sentido.
//
// Uso:  npm run balance   (o:  node balance-check.js)

const DIFFS = [
    { key: '0.06-180', label: 'Fácil', ratio: 0.06, time: 180, mult: 1, turuloFlag: 1, spizBonus: 20 },
    { key: '0.10-120', label: 'Media', ratio: 0.10, time: 120, mult: 5, turuloFlag: 2, spizBonus: 60 },
    { key: '0.14-60', label: 'Difícil', ratio: 0.14, time: 60, mult: 20, turuloFlag: 3, spizBonus: 120 }
];

const SIZES = [9, 14, 18];

const SHOP = [
    { id: 'board15', name: 'Tablero Rayina 14×14', price: 150 },
    { id: 'board20', name: 'Tablero Pollo 18×18', price: 500 },
    { id: 'chami', name: 'Dificultad Chami CC', price: 300 },
    { id: 'milagro', name: 'Milagro (carga)', price: 200 },
    { id: 'ultimobaile', name: 'Último Baile (carga)', price: 250 },
    { id: 'spizUpgrade', name: 'Mejora de Spiz', price: 150, max: 5 },
    { id: 'dineroUpgrade', name: 'Mejora de Dinero', price: 150, max: 5 }
];

const SPIZ_SAVED_BONUS = 50; // placeholder, se usa diff.spizBonus
const WIN_SCENARIOS = [0.25, 0.5, 0.75];

function winEarnings(diff, size, timeLeftPct, { rizao = false, dineroLevel = 0, sombra = false, spizSaved = false, turulosPct = 1 } = {}) {
    const numMines = Math.floor(size * size * diff.ratio);
    const timeLeft = Math.round(diff.time * timeLeftPct);
    const base = Math.floor(timeLeft * diff.mult * 0.1);
    let subtotal = base;
    if (rizao) subtotal += Math.floor(base * 0.1);
    if (dineroLevel > 0) subtotal += Math.floor(base * 0.1 * dineroLevel);
    if (sombra) subtotal -= Math.round(subtotal * 0.1);
    let total = subtotal;
    if (spizSaved) total += diff.spizBonus;
    total += Math.round(numMines * turulosPct) * diff.turuloFlag;
    return { base, total, numMines };
}

function avgPerWin(diff, size, opts = {}) {
    let sum = 0;
    for (const pct of WIN_SCENARIOS) sum += winEarnings(diff, size, pct, opts).total;
    return Math.round(sum / WIN_SCENARIOS.length);
}

function winsToBuy(price, perWin) {
    return Math.ceil(price / perWin);
}

const report = [];
const alerts = [];
const warn = (msg) => alerts.push(msg);

console.log('=== BALANCE BUSCALOPAS ===');
console.log('');

console.log('GANANCIA ESTIMADA POR VICTORIA (tiempo restante 25%/50%/75%, marcando todas las minas):');
const avg = {};
for (const diff of DIFFS) {
    avg[diff.key] = {};
    let row = `  ${diff.label.padEnd(8)} | `;
    for (const size of SIZES) {
        const e25 = winEarnings(diff, size, 0.25).total;
        const e50 = winEarnings(diff, size, 0.5).total;
        const e75 = winEarnings(diff, size, 0.75).total;
        const perWin = avgPerWin(diff, size);
        avg[diff.key][size] = perWin;
        row += `${size}x${size}: ${e25}€/${e50}€/${e75}€ (avg ${perWin}€)   `;
    }
    console.log(row);
}

console.log('');
console.log('SUBTOTAL DE TIEMPO vs BONUS POR TURULOS (la parte de turulos nunca debería dominar):');
for (const diff of DIFFS) {
    const size = 9;
    const e = winEarnings(diff, size, 0.5);
    const timePart = e.base;
    const turuloPart = e.total - e.base;
    const pct = turuloPart / Math.max(1, e.total);
    console.log(`  ${diff.label.padEnd(8)} ${size}x${size}: tiempo ${timePart}€ | turulos ${turuloPart}€ (${Math.round(pct * 100)}% del total)`);
    if (pct > 0.5) warn(`En ${diff.label} 9x9 el bonus por turulos es ${Math.round(pct * 100)}% de la ganancia; las banderas dominan sobre el tiempo.`);
}

console.log('');
console.log('VICTORIAS NECESARIAS PARA COMPRAR CADA OBJETO (media de ganancia por dificultad):');
for (const item of SHOP) {
    let row = `  ${item.name.padEnd(28)} ${item.price}€ |`;
    for (const diff of DIFFS) {
        const perWin = avg[diff.key][9];
        row += ` ${diff.label} ~${winsToBuy(item.price, perWin)}`;
    }
    console.log(row);
}

console.log('');
console.log('COMPARATIVA DE GANANCIA ENTRE DIFICULTADES (9x9, 50% tiempo):');
const d = DIFFS.map(x => ({ ...x, earn: winEarnings(x, 9, 0.5).total }));
for (let i = 1; i < d.length; i++) {
    const prev = d[i - 1];
    const cur = d[i];
    if (cur.earn <= prev.earn) {
        warn(`${cur.label} paga (${cur.earn}€) igual o menos que ${prev.label} (${prev.earn}€); la progresión de dificultad no recompensa.`);
    }
    console.log(`  ${cur.label}: ${cur.earn}€/victoria (x${(cur.earn / Math.max(1, prev.earn)).toFixed(1)} vs ${prev.label})`);
}

console.log('');
console.log('CASO "SPIZ GUARDADO" (+bonus por dificultad) frente a ganancia base (9x9, 50% tiempo):');
for (const diff of DIFFS) {
    const normal = winEarnings(diff, 9, 0.5).base;
    const bonus = diff.spizBonus / Math.max(1, normal);
    console.log(`  ${diff.label}: base ${normal}€ | +${diff.spizBonus}€ por guardar spiz = x${bonus.toFixed(1)}`);
    if (bonus > 2.5) warn(`En ${diff.label} el bono por guardar el Spiz (${diff.spizBonus}€) es x${bonus.toFixed(1)} el tiempo base (${normal}€); puede trivializar la dificultad.`);
}

console.log('');
console.log('== ALERTAS ==');
if (alerts.length === 0) {
    console.log('  Sin alertas: precios y dificultades parecen coherentes.');
} else {
    for (const a of alerts) console.log(`  ⚠️ ${a}`);
}
console.log('');
