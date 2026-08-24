// ============================================================================
// TEXTOS DEL JUEGO (centralizados desde el 19/08, 6ª sesión)
// Edita aquí nombres, descripciones y frases SIN tocar la lógica de game.js.
// Placeholders en las descripciones: {VIDENTE_RECHARGE_EVERY}, {RASTREADOR_EVERY}
// se reemplazan automáticamente por los números reales del juego.
// ============================================================================
window.TEXTOS = {

    // Héroes / misiones (modos de juego)
    heroes: {
        classic: {
            name: '⚡ Farlopín',
            goal: 'Misión: Limpia todas las casillas seguras destapándolas (clic izquierdo). Puedes marcar con turulos (clic derecho) dónde crees que están las bolsas; no hace falta para ganar, pero ayuda.',
            goalMobile: 'Misión: Toca las casillas para destaparlas y gana. Mantén pulsada una casilla para poner un turulo donde creas que hay bolsa.'
        },
        turulos: { name: '🍺 Borrachín', goal: 'Misión: Encuentra y marca todas las bolsas con turulos (clic derecho).' },
        hybrid: { name: '🌀 Politoxiquín', goal: 'Misión: ¡Todo vale! Puedes ganar despejando casillas O marcando todas las bolsas.' }
    },

    // Mensajes de Lucifer
    lucifer: [
        '¡¡¡¡¡LUCIFER LUCIFER!!!!!',
        'LA PIEEDRRAAAAAA',
        'JODER LUCIFER OFICIAL',
        'LOPAAAAAA!!!!!!!!',
        'POOORRR LA NAREZZZZZZ',
        'TÚ SABRÁS',
        'LA PRÓXIMA INVITO YO TE LO JURO POR FAVOR'
    ],

    // Dificultades (label = etiqueta corta; option = texto del selector)
    dificultades: {
        '0.06-180': { label: 'Fácil', option: 'Pure Peruvian (Fácil)' },
        '0.10-120': { label: 'Media', option: 'Javi Taxi (Media)' },
        '0.14-60': { label: 'Difícil', option: 'Chami CC (Difícil)' }
    },

    // Opciones del selector de modos
    modos: {
        classic: '⚡ Farlopín (Limpiar terreno)',
        turulos: '🍺 Borrachín (Guardar turulos)',
        hybrid: '🌀 Politoxiquín (Todo vale)'
    },

    // Opciones del selector de tamaño
    cantidades: {
        '9': 'Llaverazo (9x9)',
        '14': 'Rayina (14x14)',
        '18': 'Pollo (18x18)'
    },

    // LopAmuletos (el orden de adquisición está en AMULET_ORDER en game.js)
    amuletos: {
        rizao: { name: 'Rizao', icon: '🕶️', img: 'img/amulets/rizao.png', desc: '+10% dinero al ganar' },
        subidon: { name: 'Subidón', icon: '⏱️', img: 'img/amulets/subidon.png', desc: '+10s al entrar en modo Lucifer (cuesta 1 carga · recarga cada 3 victorias)' },
        iman: { name: 'Imán', icon: '🧲', img: 'img/amulets/iman.png', desc: 'El primer turulo de cada partida es gratis' },
        vidente: { name: 'Vidente', icon: '👁️', img: 'img/amulets/vidente.png', desc: 'Muestra dónde está el Spiz al empezar. Se recarga cada {VIDENTE_RECHARGE_EVERY} victorias.' },
        papu: { name: 'Papu', icon: '🤑', img: 'img/amulets/papu.png', desc: '+15s de tiempo inicial' },
        rastreador: { name: 'Rastreador', icon: '🎯', img: 'img/amulets/rastreador.png', desc: 'Cada {RASTREADOR_EVERY} bolsas correctas, revela la zona de alrededor' },
        milagro: { name: 'Milagro', icon: '🛡️', img: 'img/amulets/milagro.png', desc: 'Sobrevive a pisar una bolsa. Se recarga al ganar.' },
        ultimobaile: { name: 'Último Baile', icon: '⏳', img: 'img/amulets/ultimobaile.png', desc: 'Prórroga de +5s cuando el tiempo llega a 0. Se recarga al llegar a Lucifer.' },
        mala: { name: 'Mala Pipa', icon: '🥴', img: 'img/amulets/mala.png', desc: '-10s de tiempo inicial. Maldición por perder 5 veces.' },
        sombra: { name: 'Sombra', icon: '🌑', img: 'img/amulets/sombra.png', desc: '-10% de dinero al ganar. Maldición por perder 15 veces.' },
        gafe: { name: 'Gafe', icon: '🍀', img: 'img/amulets/gafe.png', desc: 'El Spiz restaura un 10% menos de tiempo. Maldición por perder 30 veces.' },
        dragon: { name: 'Carta del Dragon Narco', icon: '🐉', img: 'img/amulets/dragon.jpg', desc: 'Reliquia que el Dragon Narco de Ojos Azules te regaló por ser un cliente de confianza. Sin efecto, solo pa presumir.' },
        syntek: { name: 'Syntek', icon: '🎤', img: 'img/amulets/syntek.jpg', desc: 'Reliquia que da "Duele el Amor" al iPod. Si la tienes activa y suena esa canción, aparece un botón especial con 3 segundos de inmunidad.' },
        nword: { name: 'N Word', icon: 'N', img: 'img/amulets/N.jpg', desc: 'Reliquia que da "Hypnotize" de The Notorious B.I.G. al iPod.' },
        charlie: { name: 'We Are Charlie Kirk', icon: '🗣️', img: 'img/amulets/kirk.jpg', desc: 'Reliquia que da "We Are Charlie Kirk" de Spalexma al iPod.' }
    },

    // Tienda del Dragon Narco (la lógica de requisitos/precios está en SHOP_LOGIC de game.js)
    tienda: {
        items: {
            board15: { name: 'Tablero Rayina 14×14', desc: 'Un tablero más grande para loperas más finas.', price: 150, icon: '🔲' },
            board20: { name: 'Tablero Pollo 18×18', desc: 'Requiere Rayina 14×14. La lopa definitiva.', price: 500, icon: '🟥' },
            chami: { name: 'Dificultad Chami CC', desc: 'Modo difícil. Menos tiempo y más bolsas.', price: 300, icon: '🔥' },
            milagro: { name: 'Milagro', desc: 'Sobrevive a pisar una bolsa (1 carga). Se recarga al ganar.', price: 200, icon: '🛡️' },
            ultimobaile: { name: 'Último Baile', desc: 'Prórroga de +5s cuando el tiempo llega a 0 (1 carga). Se recarga al llegar a Lucifer.', price: 250, icon: '⏳' },
            spizUpgrade: { name: 'Mejora de Spiz', desc: '+10% de tiempo de Spiz por nivel (máx. 5).', price: 150, icon: '⚡' },
            dineroUpgrade: { name: 'Mejora de Dinero', desc: '+10% de dinero al ganar por nivel (máx. 5).', price: 150, icon: '💰' },
            luciferUpgrade: { name: 'Mejora de Lucifer', desc: '+50% de pasta por turulos en modo Lucifer por nivel (máx. 5). Requiere haber llegado a Lucifer.', price: 300, icon: '🔥' },
            syntek: { name: 'Reliquia Syntek', desc: 'Da "Duele el Amor" de Alek Syntek al iPod y un botón especial de inmunidad (3s) si suena esa canción. Requiere el iPod.', price: 400, icon: '🎤' },
            nword: { name: 'Reliquia N Word', desc: 'Da "Hypnotize" de The Notorious B.I.G. al iPod. Requiere el iPod.', price: 300, icon: 'N' },
            charlie: { name: 'We Are Charlie Kirk', desc: 'Da la canción de Spalexma al iPod. Gratis para el dealer entre el 10 y el 16 de septiembre; si no lo compras en esas fechas, solo se consigue hablando con Lucifer. Requiere el iPod.', price: 250, icon: '🗣️' }
        }
    },

    // iPod (gestiona la música de fondo del juego)
    ipod: {
        shopName: 'iPod de Farlopín',
        shopDesc: 'Gestiona tu música: la canción que elijas sonará de fondo en el juego.',
        price: 666,
        bought: '✓ En tu hueco',
        modalTitle: 'Música',
        nowPlaying: 'Sonando:',
        menuLabel: 'MENÚ',
        tracks: {
            cyber: { name: 'Cyber-Lopera Radio', desc: 'La radio que enciende a Farlopín. Siempre disponible.' },
            luciferbeats: { name: 'Lucifer Beats', desc: 'Se desbloquea al llegar a Lucifer por primera vez.' },
            spizamarillo: { name: 'Spiz Amarillo', desc: 'Manolo Kabezabolo · Se desbloquea tras guardar el Spiz 10 veces.' },
            nhh: { name: 'NHH', desc: 'Ye · Se desbloquea tras perder 25 veces.' },
            cousins: { name: 'Cousins', desc: 'Ye · Se desbloquea tras perder 25 veces (con NHH desbloqueado).' },
            dueleamor: { name: 'Duele el Amor', desc: 'Alek Syntek · Se obtiene con la reliquia Syntek.' },
            biggie: { name: 'Hypnotize', desc: 'The Notorious B.I.G. · Se obtiene con la reliquia N Word.' },
            charlie: { name: 'We Are Charlie Kirk', desc: 'Spalexma · Se obtiene con la reliquia de Charlie Kirk.' }
        }
    },

    // Popup de información (Spiz / Lucifer)
    spizInfo: {
        title: '⚡ El Spiz',
        desc: 'El Spiz es tu salvavidas: al tocarlo te da un <b>+20% de tiempo</b> (y <b>+40%</b> en modo Lucifer). Si terminas la partida <b>sin gastarlo</b>, cobras un bonus extra de pasta. Mejóralo en la tienda para que dé más tiempo y revele zona.'
    },
    luciferInfo: {
        title: '🔥 Modo Lucifer',
        desc: 'Cuando el tiempo baja de 30s entras en <b>modo Lucifer</b>: la música cambia y los <b>turulos correctos valen el doble de pasta</b>. Compra la Mejora de Lucifer para subir aún más ese bonus.'
    },

    // Lore (se lee desde el desplegable del usuario, 📜)
    lore: {
        farlopin: {
            name: '⚡ Farlopín',
            desc: 'Farlopín tiene jaleo este finde y quiere montarse una buena juerguecilia. Su objetivo es recopilar la mayor cantidad de bolsas para forzar la máquina al máximo. Pero cuidado, que si tropieza "accidentalmente" con ellas antes de tiempo, la habrá vuelto a liar entresemana.<br><br>Piénsate bien cuánto te la quieres pegar y dale gas a la lopa.'
        },
        spiz: {
            name: '⚡ El Spiz',
            desc: 'El Spiz es tu salvavidas: al tocarlo te da un <b>+20% de tiempo</b> (y <b>+40%</b> en modo Lucifer). Si terminas la partida <b>sin gastarlo</b>, cobras un bonus extra de pasta. Mejóralo en la tienda para que dé más tiempo y revele zona.',
            img: 'img/spiz.jpg'
        }
    },

    // Pantalla de resultado
    resultado: {
        victoria: '🏆 ¡Victoria!',
        spizGuardado: '⚡ ¡Spiz guardado!',
        boom: '💥 ¡BOOM!',
        tiempo: '⏰ ¡TIEMPO AGOTADO!'
    },

    // Nombres de lopero sugeridos (antes en nombres.txt; ya no hace falta subir ese archivo a Netlify)
    nombres: [
        "xX_Kaiba_ElPollo_Xx",
        "Ojama_Verde_Keta",
        "Hiigara_3000",
        "Sombras_De_Kharak",
        "_xX_Farlopin_69_Xx_",
        "xX_L0pA_mAStiCAdA_Xx",
        "LpA_0f1c1aL_",
        "~*ThE_LoPeR0_3000*~",
        "xX_LaPiedra_Lucifer_Xx",
        "~_RaiYaZo_N30N_~",
        "0f1c1aL_Spiz_Boy",
        "-_Lopa_King_69_-",
        "xX_Lop3r0_M4dM4x_Xx",
        "_xX_RaiYa_De_Sp1z_Xx_",
        "x_Farlop0_Vip_x",
        "_~p0ll0_d3_100~_",
        "xX_K3t4_S3ss10n_Xx",
        "~*El_Turulo_M4g1c0*~",
        "xX_N30n_Lopa_Xx",
        "_ChAm1_cC_88_",
        "xX_C4rr3r4_d3_p0ll0s_Xx",
        "-_L0p3r0_S1n_Fren0s_-",
        "x_Tocho_De_Lopa_x",
        "~*ThE_Sp1z_MaSt3r*~",
        "xX_Javi_Taxi_69_Xx",
        "_xX_Club_Lucifer_Xx_",
        "xX_Farlopita_2000_Xx",
        "~_M3d10_P0ll0_~",
        "xX_Sp1z_N1ght_Xx",
        "_xX_Lopa_Overlord_Xx_",
        "xX_Er_KaNi_FuMaDoR_Xx",
        "_xX_Porrito_Smok3_Xx_",
        "~*ThE_MaRy_J4n3_2000*~",
        "xX_M4r1hu4n0_S4m4_Xx",
        "-_Er_Piti_420_-",
        "xX_Kallejero_Smok3_Xx",
        "_~El_Verde_M4g1c0~_",
        "xX_Choco_Bong_Xx",
        "~*Er_MaFiA_FuMaO*~",
        "xX_Weed_Boy_69_Xx",
        "_xX_L4_Pl4nt4_N30n_Xx_",
        "xX_Smok3_W33d_Ev3ryd4y_Xx",
        "-_Er_Polliyo_420_-",
        "xX_ThE_K4nn4b1s_Xx",
        "~*Piti_Club_2000*~",
        "xX_Hash_Master_99_Xx",
        "_xX_Kani_Resinoso_Xx_",
        "xX_El_Verde_S3rr4n0_Xx",
        "~_K3f1r_S4m4_~",
        "xX_Puff_Puff_Pass_Xx",
        "xX_P0l1t0x1k0_V1p_Xx",
        "~*ThE_P0ll0_L0k0*~",
        "_xX_Fiestuka_2000_Xx_",
        "xX_Noche_De_Lopa_Xx",
        "-_Er_MeCh3r0_L0k0_-",
        "xX_S4ll_D3_F13st4_Xx",
        "~_ThE_R4yA_M4st3r_~",
        "xX_Lopa_And_Weed_Xx",
        "_xX_Resaka_M4x1m4_Xx_",
        "xX_Ketan30n_Xx",
        "~*Er_Kani_De_L4_Escalera*~",
        "xX_Farlopron_69_Xx",
        "_xX_Pollo_Master_3000_Xx_",
        "xX_L3y3nd4_D3_L4_N0ch3_Xx",
        "-_Er_Juerga_L0k0_-",
        "xX_Turulo_Vip_Xx",
        "~*ThE_Sp1z_K1ng*~",
        "xX_C4rr3r0_N30n_Xx",
        "_xX_M4st3r_K3t4_Xx_",
        "xX_La_Piedra_Sama_Xx",
        "[-_xX_FArL0P1N_Xx_-]",
        "~*~[ThE_L0PA_G0D]~*~",
        "..::Sp1z_M4st3r_2000::..",
        "[xX_Er_FuM4d0r_99_Xx]",
        "(-_-)_Lopa_Lucifer_(-_-)",
        "*~*ThE_P0LL0_K1NG*~*",
        "xX_[K4n1_P0l1t0x1k0]_Xx",
        "_..::RaiYa_De_Sp1z::.._",
        "[-_L0p3r0_B0y_-]",
        "~*~[xX_K3t4_B0ng_Xx]~*~",
        "..::Er_Piti_Resinoso::..",
        "[xX_Farlopero_Vip_Xx]",
        "(-_-)_Spiz_Session_(-_-)",
        "*~*ThE_W33D_M4ST3R*~*",
        "xX_[LaPiedra_3000]_Xx",
        "_..::Turulo_N30n::.._",
        "[-_Er_Polliyo_69_-]",
        "~*~[Lopa_And_Roll]~*~",
        "..::xX_Choco_Master_Xx::..",
        "[xX_Lucifer_Official_Xx]",
        "xX_Rayon_Express_Xx",
        "_xX_El_De_La_Lopa_Xx_",
        "~*ThE_FuM4u_L0k0*~",
        "xX_Piti_Y_Pollo_Xx",
        "-_Er_Keta_2000_-",
        "xX_Lopa_Cyber_Vip_Xx",
        "_~ThE_S3ss10n_M4st3r~_",
        "xX_Spiz_And_Furious_Xx",
        "~*Er_Puerro_M4g1c0*~",
        "xX_L0p3r0_F1n4l_Xx"
    ],

    // UI: textos de la interfaz
    ui: {
        registrate: '¡Regístrate! Guarda tus progresos, juega con tus amigos y analiza tus estadísticas.',
        confirmarCuenta: '¿Confirmas que este será tu usuario y contraseña? Todo tu progreso (dinero, LopAmuletos, estadísticas, amigos y chat) quedará vinculado a esta cuenta.',
        contrasenaDe: 'Contraseña de {NAME}',
        contrasenaIncorrecta: 'Contraseña incorrecta',
        eligeNombre: 'Elige un nombre de usuario',
        escribeContrasena: 'Escribe una contraseña',
        minimo4: 'Mínimo 4 caracteres',
        noCoinciden: 'Las contraseñas no coinciden',
        yaTieneContrasena: 'Este lopero ya tiene contraseña',
        nombreEnUso: 'Ese lopero ya está en uso',
        sinConexion: 'No se pudo comprobar el nombre. ¿Hay conexión?',
        cuentaCreada: 'Contraseña creada. ¡Sesión iniciada!',
        cerrarSesion: '¿Cerrar sesión de {NAME}? Se limpiará la sesión y podrás entrar con otro usuario.',
        bloqueoRegistro: {
            info: '🔒 Regístrate con contraseña para ver tu info',
            agregar: '🔒 Regístrate con contraseña para agregar amigos',
            amigos: '🔒 Regístrate con contraseña para usar Amigos',
            agregarRanking: '🔒 Regístrate con contraseña para agregar',
            chat: '🔒 Regístrate con contraseña para usar el chat'
        }
    }
};
