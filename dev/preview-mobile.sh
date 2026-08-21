#!/usr/bin/env bash
# Buscalopas — previsualiza el juego en formato MÓVIL desde el PC.
# Abre Chromium (vía Playwright) con un viewport de móvil (390x844, tipo
# iPhone 12/13/14) y emulación táctil, para ver/arreglar la UI móvil sin
# necesidad de un teléfono ni un emulador de Android.
# Vive en dev/ (no se sube a Netlify). Uso: bash dev/preview-mobile.sh

cd "$(dirname "$0")"

PORT=3999
URL="http://localhost:$PORT/"

if ! command -v node >/dev/null 2>&1; then
    echo "❌ No encuentro Node.js. Instálalo desde https://nodejs.org"
    read -r -p "Pulsa Enter para salir..." _
    exit 1
fi

SERVER_PID=""
LOG_FILE="$PWD/server.log"
if ! curl -s -o /dev/null --max-time 1 "$URL"; then
    node "$PWD/server.js" >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    trap 'kill $SERVER_PID 2>/dev/null' EXIT
    sleep 1
fi

echo "▶️  Abriendo vista MÓVIL de Buscalopas (390x844) ..."
echo "   Cierra la ventana del navegador o pulsa Ctrl+C para volver."
echo "   (si no sale la ventana: cd dev && npx playwright install chromium)"

node "$PWD/preview-mobile.js" "$URL"

echo "👋 Navegador cerrado."
exit 0
