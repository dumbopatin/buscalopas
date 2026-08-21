// Buscalopas — abre el juego en una ventana de Chromium con viewport de móvil
// (390x844 + táctil). Lo usa dev/preview-mobile.sh. NO se sube a Netlify.
const { chromium } = require('playwright');

(async () => {
    const url = process.argv[2] || 'http://localhost:3000/';
    const browser = await chromium.launch({ headless: false });
    browser.on('disconnected', () => process.exit(0));
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    // Mantener el proceso vivo hasta que se cierre la ventana del navegador.
    await new Promise(() => {});
})().catch(e => {
    console.error('No se pudo abrir la vista móvil: ' + e.message);
    process.exit(1);
});
