#!/usr/bin/env bash
# Buscalopas — abre el juego en local (doble clic / un comando).
#
# Levanta server.js si no está corriendo, abre el navegador en localhost:3000
# y te da las direcciones para probar desde el MÓVIL:
#   1) red Wi-Fi de casa      -> http://<IP-del-PC>:3000/
#   2) túnel Cloudflare       -> https://<palabras-aleatorias>.trycloudflare.com/
#      Sirve aunque el móvil no llegue al PC por red local (router que aísla
#      el WiFi del cable, etc.). La URL del túnel CAMBIA en cada arranque;
#      este script la imprime cada vez.
#
# Para el túnel hace falta cloudflared: ~/.local/bin/cloudflared
# (descarga: https://github.com/cloudflare/cloudflared/releases)
# Para el QR en la terminal hace falta el módulo python3 'qrcode':
#   pip3 install --user --break-system-packages qrcode
# (vive en dev/: el servidor server.js, sus datos y este script están aquí).

cd "$(dirname "$0")"

# Imprime un QR en la terminal para escanear con la cámara del móvil
# (sin copiar ni fotografiar la URL).
print_qr() {
    local url="$1"
    if command -v python3 >/dev/null 2>&1 && python3 -c "import qrcode" 2>/dev/null; then
        echo "   📷 Escanea este código con la cámara del móvil:"
        python3 - "$url" << 'PYEOF'
import sys, qrcode
qr = qrcode.QRCode(border=1)
qr.add_data(sys.argv[1])
qr.make()
qr.print_ascii(invert=True)
PYEOF
    else
        echo "   ℹ️  Para que salga el QR: instala 'qrcode' (pip3 install --user --break-system-packages qrcode)"
    fi
}

PORT=3000
URL="http://localhost:$PORT/"
CF_LOG="/tmp/buscalopas-cloudflared.log"
CF_BIN="${CLOUDFLARED_BIN:-$HOME/.local/bin/cloudflared}"
if ! [ -x "$CF_BIN" ]; then
    CF_BIN=$(command -v cloudflared 2>/dev/null || true)
fi

if ! command -v node >/dev/null 2>&1; then
    echo "❌ No encuentro Node.js. Instálalo desde https://nodejs.org y vuelve a abrirme."
    read -r -p "Pulsa Enter para salir..." _
    exit 1
fi

CLEANUP=""
if ! curl -s -o /dev/null --max-time 1 "$URL"; then
    node "$PWD/server.js" >> "$PWD/server.log" 2>&1 &
    SERVER_PID=$!
    CLEANUP="$CLEANUP kill $SERVER_PID"
    sleep 1
fi

echo "▶️  Abriendo Buscalopas en $URL ..."
echo "   (cierra esta ventana o pulsa Ctrl+C para apagar el servidor)"

# 1) Dirección local para el móvil en la misma red Wi-Fi.
#    Prefiere la IP de la interfaz de red real (eth/wifi), no la de docker/VPN.
LAN_IP=$(ip -4 -o addr show scope global 2>/dev/null | grep -E ' (eth|enp|ens|eno|wlan|wl|wlp)[0-9]' | awk '{print $4}' | cut -d/ -f1 | head -1)
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -n "$LAN_IP" ]; then
    echo "   📱 Desde el móvil (misma red Wi-Fi): http://$LAN_IP:$PORT/"
fi

# 2) Túnel Cloudflare: URL pública para el móvil desde CUALQUIER red
#    (imprescindible si el router no deja entrar al PC por la LAN).
if [ -n "$CF_BIN" ]; then
    if pgrep -f "[c]loudflared.*--url ${URL%/}" >/dev/null 2>&1; then
        CF_URL=$(grep -hoE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | tail -1)
        if [ -n "$CF_URL" ]; then
            echo "   📡 Túnel ya activo: $CF_URL"
        else
            echo "   📡 Túnel ya activo (busca la URL en la ventana de cloudflared)"
        fi
    else
        "$CF_BIN" tunnel --url "$URL" --no-autoupdate > "$CF_LOG" 2>&1 &
        CF_PID=$!
        CLEANUP="$CLEANUP kill $CF_PID"
        CF_URL=""
        for i in $(seq 1 25); do
            CF_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | head -1)
            [ -n "$CF_URL" ] && break
            sleep 1
        done
        if [ -n "$CF_URL" ]; then
            echo "   📡 Desde el móvil (túnel, cualquier red): $CF_URL"
            echo "      (la URL cambia en cada arranque; esta ventana la recuerda)"
        else
            echo "   ⚠️  El túnel no ha dado URL aún: revisa $CF_LOG"
        fi
    fi
else
    echo "   📡 Para la URL de túnel (móvil en cualquier red): instala cloudflared en ~/.local/bin/cloudflared"
fi

# QR del túnel (o de la LAN si no hay túnel): escanear con el móvil y listo.
if [ -n "$CF_URL" ]; then
    print_qr "$CF_URL"
elif [ -n "$LAN_IP" ]; then
    print_qr "http://$LAN_IP:$PORT/"
fi

if [ -n "$CLEANUP" ]; then
    trap "$CLEANUP 2>/dev/null" EXIT
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
