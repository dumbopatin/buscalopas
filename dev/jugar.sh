#!/usr/bin/env bash
# Buscalopas — abre el juego en local con un doble clic / un comando.
# Levanta el servidor si no está corriendo y abre el navegador en http://localhost:3000
# (vive en dev/: el servidor server.js, sus datos y este script están todos aquí).

cd "$(dirname "$0")"

PORT=3000
URL="http://localhost:$PORT/"

if ! command -v node >/dev/null 2>&1; then
    echo "❌ No encuentro Node.js. Instálalo desde https://nodejs.org y vuelve a abrirme."
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

echo "▶️  Abriendo Buscalopas en $URL ..."
echo "   (cierra esta ventana o pulsa Ctrl+C para apagar el servidor)"

# IP local para probar desde el móvil (misma red Wi-Fi)
# Prefiere la IP de la interfaz de red real (eth/wifi), no la de docker/VPN
LAN_IP=$(ip -4 -o addr show scope global 2>/dev/null | grep -E ' (eth|enp|ens|eno|wlan|wl|wlp)[0-9]' | awk '{print $4}' | cut -d/ -f1 | head -1)
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -n "$LAN_IP" ]; then
    echo "   📱 Desde tu móvil (misma red Wi-Fi) abre: http://$LAN_IP:$PORT/"
fi

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1
elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1
fi

if [ -n "$SERVER_PID" ]; then
    wait "$SERVER_PID"
else
    read -r -p "Servidor ya en marcha. Pulsa Enter para cerrar..." _
fi
