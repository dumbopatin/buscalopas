# BUSCALOPAS 2.0 — EXPORT DE TEXTOS DEL JUEGO (para revisar con una IA)
Última actualización: 19/08/2026 (6ª sesión).

## ⭐ DESDE LA 6ª SESIÓN: los textos editables viven en `textos.js` (raíz del proyecto)
Ese archivo contiene window.TEXTOS con: heroes, lucifer, dificultades, modos, cantidades,
amuletos (los 12), tienda (frase del dragón + objetos), títulos de resultado,
nombres (los 100 de nombres.txt — ya no hace falta subir ese archivo a Netlify) y
ui (texto del banner de registro + confirmación de cuenta).
Para refinar textos: edita SOLO textos.js y sube a Netlify (junto con game.js/index.html
si también cambian). game.js lee de TEXTOS con fallbacks por si no existe.
Lo que sigue es el detalle de cada texto (algunos siguen inline en game.js: toasts y
mensajes dinámicos — la lista de abajo indica dónde buscar cada uno).

## 1) LOPAMULETOS (textos.js → window.TEXTOS.amuletos)
- Rizao 🕶️ — "+10% dinero al ganar"
- Subidón ⏱️ — "+10s al entrar en modo Lucifer (1 vez por partida)"
- Imán 🧲 — "El primer turulo de cada partida es gratis"
- Vidente 👁️ — "Muestra dónde está el Spiz al empezar. Se recarga cada {VIDENTE_RECHARGE_EVERY} victorias."
- Papu 🤑 — "+15s de tiempo inicial"
- Rastreador 🎯 — "Cada {RASTREADOR_EVERY} bolsas correctas, revela la zona de alrededor"
- Milagro 🛡️ — "Sobrevive a pisar una bolsa. Se recarga al ganar." (carga)
- Último Baile ⏳ — "Prórroga de +5s cuando el tiempo llega a 0. Se recarga al llegar a Lucifer." (carga)
- Mala Pipa 🥴 — "-10s de tiempo inicial. Maldición por perder 5 veces." (negativo)
- Sombra 🌑 — "-10% de dinero al ganar. Maldición por perder 15 veces." (negativo)
- Gafe 🍀 — "El Spiz restaura un 10% menos de tiempo. Maldición por perder 30 veces." (negativo)
- Carta del Dragon Narco 🐉 — "Reliquia que el Dragon Narco de Ojos Azules te regaló por ser un cliente de confianza. Sin efecto, solo pa presumir." (reliquia)
NOTA: los placeholders {VIDENTE_RECHARGE_EVERY} y {RASTREADOR_EVERY} se sustituyen por
los números reales (5 victorias y 50 bolsas) al cargar el juego.
Los toasts de desbloqueo dicen "🔮 LopAmuleto desbloqueado: X" / "😈 Maldición desbloqueada: X" (game.js).

## 2) TIENDA DEL DRAGON NARCO (textos.js → window.TEXTOS.tienda.items + game.js SHOP_LOGIC)
- Tablero Rayina 15×15 🔲 — "Un tablero más grande para loperas más finas." — 150€
- Tablero Pollo 20×20 🟥 — "Requiere Rayina 15×15. La lopa definitiva." — 500€ (requiere 3 victorias)
- Dificultad Chami CC 🔥 — "Modo difícil. Menos tiempo y más bolsas." — 300€
- Milagro 🛡️ — "Sobrevive a pisar una bolsa (1 carga). Se recarga al ganar." — 200€ (requiere llegar a Lucifer)
- Último Baile ⏳ — "Prórroga de +5s cuando el tiempo llega a 0 (1 carga). Se recarga al llegar a Lucifer." — 250€ (requiere Lucifer)
- Mejora de Spiz ⚡ — "+10% de tiempo de Spiz por nivel (máx. 5)." — 150€ (requiere 1 Spiz guardado)
- Mejora de Dinero 💰 — "+10% de dinero al ganar por nivel (máx. 5)." — 150€ (requiere 2 victorias)
Frases de la tienda:
- "🐉 Tienda del Dragon Narco" (título, index.html)
- "Ojos azules, cartera llena. ¿Qué quieres probar hoy, compa?" (textos.js → tienda.dragonTalk)
- "🛒 Stock de hoy — <fecha>" (index.html)
- Notificación desbloqueo (game.js): "🐉 ¡TIENDA DESBLOQUEADA!" / "El Dragon Narco de Ojos Azules, el dealer de los dealers, pone su tienda a tu disposición." / "Stock rotativo diario, mejoras y desbloqueos. Ojos azules, cartera llena." / botón "🛒 ¡A la tienda!"
- Toasts: "🛒 Comprado: X" / "Te falta dinero 💸" / "Eso ya no se puede comprar" (game.js)

## 3) HÉROES / MISIONES (textos.js → window.TEXTOS.heroes)
- Farlopín ⚡ — "Misión: Limpia todas las casillas seguras destapándolas (clic izquierdo). Puedes marcar con turulos (clic derecho) dónde crees que están las bolsas; no hace falta para ganar, pero ayuda." (modo classic)
  - Móvil (goalMobile): "Misión: Toca las casillas para destaparlas y gana. Mantén pulsada una casilla para poner un turulo donde creas que hay bolsa."
- Borrachín 🍺 — "Misión: Encuentra y marca todas las bolsas con turulos (clic derecho)." (modo turulos)
- Politoxiquín 🌀 — "Misión: ¡Todo vale! Puedes ganar despejando casillas O marcando todas las bolsas." (modo hybrid)

## 4) MENSAJES DE LUCIFER (textos.js → window.TEXTOS.lucifer)
"¡¡¡¡¡LUCIFER LUCIFER!!!!!", "LA PIEEDRRAAAAAA", "JODER LUCIFER OFICIAL", "LOPAAAAAA!!!!!!!!",
"POOORRR LA NAREZZZZZZ", "TÚ SABRÁS", "LA PRÓXIMA INVITO YO TE LO JURO POR FAVOR"

## 5) DIFICULTADES Y TAMAÑOS (textos.js → modos / cantidades / dificultades; index.html)
- Actitud de la noche: "⚡ Farlopín (Limpiar terreno)" / "🍺 Borrachín (Guardar turulos)" / "🌀 Politoxiquín (Todo vale)"
- Cantidubi: "Llaverazo (9x9)" / "Rayina (14x14)" / "Pollo (18x18)"
- Calité: "Pure Peruvian (Fácil)" (0.06-180) / "Javi Taxi (Media)" (0.10-120) / "Chami CC (Difícil)" (0.14-60)
  (con candado 🔒 si están bloqueadas; labels cortos en DIFF_LABELS desde TEXTOS.dificultades)
- Botones: "¡DALE GAS!" (iniciar) / "🛒 Tienda Lopera" / "Reiniciar" / "Menú Principal"

## 6) PANTALLA DE RESULTADO (títulos en textos.js → resultado; desglose en game.js)
- Victoria: "🏆 ¡Victoria!" (sub 1: "Te sobraron Xs de Ys · Tamaño · Dificultad")
- Spiz guardado: "⚡ ¡Spiz guardado!"
- BOOM: "💥 ¡BOOM!" / "X ha pisado una bolsa. Juego terminado." + "Quedaban Xs"
- Tiempo agotado: "⏰ ¡TIEMPO AGOTADO!" / "A X se le ha acabado el tiempo." + "⏱️ 0s restantes · Recuerda: con el Spiz habrías tenido más aire."
- Desglose: "💰 Desglose de ganancias", filas: "Tiempo restante (Xs × mult)", "LopAmuleto Rizao (+10%)",
  "Mejora de dinero (+N%)", "LopAmuleto Sombra (-10%)", "Spiz guardado (+50)", "Turulos correctos (N × M)", "Total"

## 7) TOASTS / NOTIFICACIONES DE JUEGO (game.js)
- Desbloqueos: "🔮 LopAmuleto desbloqueado: X" / "😈 Maldición desbloqueada: X" (912)
- Toggle amuleto: "X: desactivado ⛔" / "X: activado ✅" (932)
- Subidón: "⏱️ ¡Amuleto del Subidón! +10s" (2597)
- Último Baile: "⏳ ¡Último Baile!" / "Prórroga de +5 segundos." / "Te quedan N cargas" (2663)
- Milagro: "🛡️ ¡El Milagro te ha salvado!" (2802)
- Imán: "🧲 ¡Turulo gratis por el Amuleto Imán!" (2914)
- Rastreador: "🎯 ¡Amuleto del Rastreador!" / "Has revelado la zona alrededor de la bolsa." / "N bolsas marcadas en total" (1967)
- Spiz Revelador: "🔭 ¡Spiz Revelador nivel N! El Spiz revela N×N al activarse." (3077)
- Primera victoria: "🏆 ¡Primera victoria!" / "Dificultad Media desbloqueada (Javi Taxi)." / "La tienda se abre con 5 victorias o 10 min de juego." (3080)
- Reliquia: "🐉 ¡El Dragon Narco te echa un cable! +50€" (1465)

## 8) USUARIO / CONTRASEÑA (game.js:628-816 + index.html:128-141)
- "¿Quién eres?" / "Elige tu lopero para el ranking."
- Errores: "No se pudieron cargar los nombres" / "Escribe un nombre o genera uno" / "«X» ya tiene contraseña. Introdúcela para entrar." / "Contraseña incorrecta" / "Ese lopero ya está en uso"
- Contraseña: "Escribe una contraseña" / "Mínimo 4 caracteres" / "Las contraseñas no coinciden" / "Este lopero ya tiene contraseña" / "No se pudo guardar. ¿Hay servidor?" / "Contraseña creada. ¡Sesión iniciada!"
- Botones desplegable (index.html:24-30): "👤 Nombre de usuario" / "🔒 Crear contraseña" / "🤝 Amigos" / "ℹ️ Info" / "🚪 Cerrar sesión" / "📜 Lore" (toast: "Lore próximamente 📜") / "📝 Notas e ideas"

## 9) AMIGOS / CHAT (game.js:1283-1490, index.html:243-301)
- Botones flotantes: "🤝 Amigos" / "💬 Chat" (+badges con nº de solicitudes/mensajes)
- Toasts de amigos: "🔔 ¡Solicitud de amistad!" / "Tienes una nueva solicitud entrante." / "Ábrela desde el chat o el menú de Amigos."
  "Escribe un nombre primero" / "🔒 Regístrate con contraseña para agregar amigos" / "Ese eres tú 😅" /
  "No existe ningún lopero llamado «X» 😕" / "X ya es tu amigo" / "Ya enviaste solicitud a X (pendiente)" /
  "⚠️ No se pudo enviar la solicitud (¿hay servidor?)" / "🤝 Solicitud enviada a X" / "✅ X ahora es tu amigo" /
  "X rechazado" / "Solicitud a X cancelada" / "X ya no es tu amigo"
- Pestañas modal Amigos: "Lista" / "Solicitudes" / "Agregar" / "Buscar"
- Frases: "Añade amigos primero 🤝" / "Aún no tienes amigos 🤷" / "Sin resultados" / "✓ Amigo" / "⏳ Pendiente" / "📥 Te ha invitado"
- Chat: "💬 Chat", lista de conversaciones con nombre + badge de no leídos, botón ‹ para volver,
  "Selecciona un amigo para hablar 💬" / "Sin mensajes con X todavía"

## 10) NOTAS E IDEAS (index.html:303-311)
- "📝 Notas e ideas" / "Apuntes que persisten entre sesiones. Guarda aquí tus proyectos futuros." / botón "💾 Guardar notas"
- Status: "Notas cargadas de Supabase" / "Sin notas en Supabase" / "💾 Notas guardadas" / "Guardado solo en local (...)" / "Modo local (Supabase no disponible)"

## 11) OTROS TEXTOS DE LA UI
- Título del HUD: "⚡ Buscalopas 2.0" (index.html:15)
- "🏆 Ranking Lopero" (index.html:38) / filas "Cargando..." / "Sin loperos todavía" / "claramente fuera de los primeros puestos" (lb-below)
- "💰 Total: X€" / "🎮 Partidas: N" / "🏆 Victorias: N" / "Sin datos guardados todavía" (perfil jugador, game.js:1593-1597)
- Botones perfil: "➕ Agregar como amigo" / "✅ Aceptar solicitud" / "⏳ Solicitud pendiente" / "✓ Ya es tu amigo" / "🔒 Regístrate con contraseña para agregar"
- Info modal: "Partidas jugadas" / "Victorias" / "Derrotas" / "% Victorias" / "Mejor partida" / "Spiz guardados" / "Bolsas marcadas" / "Más estadísticas ▾"
- Menú principal: story box (Farlopín... "Piénsate bien cuánto te la quieres pegar y dale gas a la lopa.") (index.html:49-51)
- "👤 <nombre>" / "💰 Cartera: X€"

## CÓMO APLICAR CAMBIOS DESPUÉS
- Los textos editables (amuletos, tienda, héroes, Lucifer, dificultades, modos,
  cantidades, resultado) viven en **textos.js** → edita ese archivo y listo.
- Los textos dinámicos/sueltos (toasts, errores, chat) siguen en game.js (líneas
  580-3300) y en index.html; se buscan con grep por la cadena exacta.
- Si la IA te propone textos nuevos, pásamelos y los aplico en textos.js / game.js.
