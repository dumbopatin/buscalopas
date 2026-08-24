let size = 9;
let numMines = 6;
let board = [];
let revealed = [];
let turulos = [];
let mines = [];
let spizCell = null;
// Bolsas desactivadas por el Milagro: se quedan visibles en el tablero.
let milagroDisarmed = {};
let syntekDisarmed = {};
// La inmunidad de Syntek solo se puede usar UNA vez por partida.
let syntekUsedThisGame = false;
let spizTriggered = false;
// La primera vez que se toca el Spiz se encola una notificación al final.
let spizFirstTouch = false;
let gameOver = false;
let gameStarted = false;
let timerInterval = null;
let luciferInterval = null;
let timeRemaining = 180;
let initialTime = 180;
let safeCellsRemaining = 0;
let isLuciferState = false;
let gameMode = 'classic';
let popupTimeout = null;
let imanUsedThisGame = false;
let gameElapsed = 0;
let subidonGraceTicks = 0;
let hudCorrectTurulos = 0;
let gameStartCorrectTurulos = 0;
let gameCorrectTurulos = 0;
let gameStartWins = 0;
let gameCorrectTurulosLucifer = 0;
let luciferElapsed = 0;
let videnteUsedThisGame = false;
let gameEarnedAmulets = [];
let resultAmuletIds = [];

// Dinero local
let wallet = parseInt(localStorage.getItem('buscalopas_wallet')) || 0;
let totalEarned = parseInt(localStorage.getItem('buscalopas_total')) || 0;

function spizSavedBonus() {
    if (initialTime === 60) return 120;
    if (initialTime === 120) return 60;
    return 20;
}

// --- Progresión: tienda y LopAmuletos ---
const SHOP_WINS_REQ = 3;
const SHOP_TIME_REQ = 300; // 5 minutos de juego efectivo
const MAX_UPGRADE_LEVEL = 5;
const MAX_CHARGES = 3;
const MAX_PINNED = 4;
const PAPU_TIME = 15;
const MALA_TIME = 10;
const SUBIDON_TIME = 10;
const PRORROGA_TIME = 5;
const SPIZ_LEVEL_PCT = 0.10;
const DINERO_LEVEL_PCT = 0.10;
const RIZAO_PCT = 0.10;

// Bolsas marcadas correctamente
const RASTREADOR_EVERY = 50;
const RASTREADOR_UNLOCK = 50;
const MILAGRO_RECHARGE_EVERY = 30;
const ULTIMOBAILE_RECHARGE_EVERY = 40;
const VIDENTE_RECHARGE_EVERY = 5;
const SUBIDON_RECHARGE_EVERY = 3;
const SUBIDON_MAX_CHARGES = 1;
const SPIZ_REVEAL_THRESHOLDS = [3, 7, 12];

const RELIC_DRAGON_EVERY = 10;
const RELIC_DRAGON_BONUS = 50;
const SYNTEK_IMMUNITY_MS = 3000;
const CHARLIE_FREE_START = { month: 9, day: 10 };
const CHARLIE_FREE_END = { month: 9, day: 16 };

// --- Cuenta de pruebas "Lucifer" (deidad): oculta del ranking y de los demás ---
const DEITY_NAME = 'Lucifer';
const BROADCAST_KEY = '__avisos_lucifer__';
const DEITY_WALLET = 1000000;
function isDeity(name) {
    return (name || '').toLowerCase() === DEITY_NAME.toLowerCase();
}

// --- Textos: viven en textos.js (window.TEXTOS). Aquí solo se ensamblan con la lógica. ---
const TX = window.TEXTOS || {};
const UI = TX.ui || {};

function buildAmulet(id) {
    const a = (TX.amuletos || {})[id] || { name: id, icon: '🔮', img: '', desc: '' };
    const vars = { VIDENTE_RECHARGE_EVERY, RASTREADOR_EVERY };
    return {
        id,
        name: a.name,
        icon: a.icon,
        img: a.img,
        desc: (a.desc || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m))
    };
}

const LOPAMULETOS = {};
const CHARGE_AMULETS = {};
const NEGATIVE_AMULETS = {};
for (const id of ['rizao', 'subidon', 'iman', 'vidente', 'papu', 'rastreador']) LOPAMULETOS[id] = buildAmulet(id);
for (const id of ['milagro', 'ultimobaile']) CHARGE_AMULETS[id] = buildAmulet(id);
for (const id of ['mala', 'sombra', 'gafe']) NEGATIVE_AMULETS[id] = Object.assign(buildAmulet(id), { negative: true });
const RELIC_DRAGON = Object.assign(buildAmulet('dragon'), { relic: true });

const ALL_AMULETS = Object.assign({}, LOPAMULETOS, CHARGE_AMULETS, NEGATIVE_AMULETS, {
    dragon: RELIC_DRAGON,
    syntek: Object.assign(buildAmulet('syntek'), { relic: true }),
    nword: Object.assign(buildAmulet('nword'), { relic: true }),
    charlie: Object.assign(buildAmulet('charlie'), { relic: true })
});
const UNLOCKABLE_AMULETS = Object.assign({}, LOPAMULETOS, NEGATIVE_AMULETS);

const AMULET_ORDER = ['rizao', 'subidon', 'iman', 'vidente', 'papu', 'rastreador', 'milagro', 'ultimobaile', 'mala', 'sombra', 'gafe', 'dragon', 'syntek', 'nword', 'charlie'];

// --- iPod: pistas de música (la seleccionada es la música de fondo del juego) ---
const IPOD_TRACKS = [
    { id: 'cyber', src: 'audio/musica_normal.mp3' },
    { id: 'luciferbeats', src: 'audio/musica_lucifer.mp3', unlock: s => (s.luciferReached || 0) >= 1 },
    { id: 'spizamarillo', src: 'audio/spiz.mp3', unlock: s => s.ipod && (s.spizSaved || 0) >= 10 },
    { id: 'nhh', src: 'audio/nhh.mp3', unlock: s => s.ipod && (s.losses || 0) >= 25 },
    { id: 'cousins', src: 'audio/cousins.mp3', unlock: s => s.ipod && (s.losses || 0) >= 25 },
    { id: 'dueleamor', src: 'audio/dueleamor.mp3', unlock: s => !!(s.lopa && s.lopa.owned && s.lopa.owned.syntek) },
    { id: 'biggie', src: 'audio/biggie.mp3', unlock: s => !!(s.lopa && s.lopa.owned && s.lopa.owned.nword) },
    { id: 'charlie', src: 'audio/charlie.mp3', unlock: s => !!(s.lopa && s.lopa.owned && s.lopa.owned.charlie) }
];

const SHOP_LOGIC = {
    board15: { kind: 'board', essential: true },
    board20: { kind: 'board', essential: true, reqStats: s => (s.wins || 0) >= 3 },
    chami: { kind: 'quality', essential: true },
    milagro: { kind: 'charge', amulet: 'milagro', daily: true, reqStats: s => (s.luciferReached || 0) >= 1 },
    ultimobaile: { kind: 'charge', amulet: 'ultimobaile', daily: true, reqStats: s => (s.luciferReached || 0) >= 1 },
    spizUpgrade: { kind: 'level', level: 'spiz', daily: true, reqStats: s => (s.spizSaved || 0) >= 1 },
    dineroUpgrade: { kind: 'level', level: 'dinero', daily: true, reqStats: s => (s.wins || 0) >= 2 },
    luciferUpgrade: { kind: 'level', level: 'lucifer', daily: true, reqStats: s => (s.luciferReached || 0) >= 1 },
    syntek: { kind: 'relic', relic: 'syntek', essential: true, reqStats: s => !!s.ipod },
    nword: { kind: 'relic', relic: 'nword', essential: true, reqStats: s => !!s.ipod },
    charlie: { kind: 'relic', relic: 'charlie', essential: true, reqStats: s => !!s.ipod }
};

const SHOP_ITEMS = Object.entries((TX.tienda && TX.tienda.items) || {}).map(([id, t]) => ({
    id, name: t.name, desc: t.desc, price: t.price, icon: t.icon, ...(SHOP_LOGIC[id] || {})
}));

const luciferMessages = (TX.lucifer || []).length ? TX.lucifer : ['LUCIFER'];

const heroData = TX.heroes || {
    classic: { name: '⚡ Farlopín', goal: '', goalMobile: '' },
    turulos: { name: '🍺 Borrachín', goal: '', goalMobile: '' },
    hybrid: { name: '🌀 Politoxiquín', goal: '', goalMobile: '' }
};

const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const boardEl = document.getElementById('board');
const timerEl = document.getElementById('timer');
const turuloCountEl = document.getElementById('turulo-count');
const gameModeSelect = document.getElementById('game-mode');
const quantitySelect = document.getElementById('quantity');
const qualitySelect = document.getElementById('quality');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const backMenuBtn = document.getElementById('back-menu-btn');
const statsBarEl = document.getElementById('stats-bar');
const luciferLabelEl = document.getElementById('lucifer-label');
const heroDisplayNameEl = document.getElementById('hero-display-name');
const heroDisplayGoalEl = document.getElementById('hero-display-goal');
const spizPopupEl = document.getElementById('spiz-popup');
const spizPopupLeftEl = document.getElementById('spiz-popup-left');

// HUD, usuario y ranking
const hudUserBtn = document.getElementById('hud-user-btn');
const hudUserEl = document.getElementById('hud-user');
const hudWalletEl = document.getElementById('hud-wallet');
const menuUserEl = document.getElementById('menu-user');
const userModalEl = document.getElementById('user-modal');
const userInputEl = document.getElementById('user-input');
const userConfirmBtn = document.getElementById('user-confirm-btn');
const userRegisterBtn = document.getElementById('user-register-btn');
const userCloseBtn = document.getElementById('user-close-btn');
const userClearBtn = document.getElementById('user-clear-btn');
const userGenBtn = document.getElementById('user-gen-btn');
const userErrorEl = document.getElementById('user-error');
const namePassInputEl = document.getElementById('name-pass-input');
const registerBannerEl = document.getElementById('register-banner');
const registerBannerTextEl = document.getElementById('register-banner-text');
const registerBannerCloseBtn = document.getElementById('register-banner-close');
const rankingListEl = document.getElementById('ranking-list');
const rankingPanelEl = document.getElementById('ranking-panel');
const userDropdownEl = document.getElementById('user-dropdown');
const ddName = document.getElementById('dd-name');
const ddPassword = document.getElementById('dd-password');
const ddInfo = document.getElementById('dd-info');
const ddLogout = document.getElementById('dd-logout');
const ddLore = document.getElementById('dd-lore');
const ddSuggestions = document.getElementById('dd-suggestions');
const passModalEl = document.getElementById('pass-modal');
const passUserEl = document.getElementById('pass-user');
const passInputEl = document.getElementById('pass-input');
const passInput2El = document.getElementById('pass-input2');
const passErrorEl = document.getElementById('pass-error');
const passConfirmBtn = document.getElementById('pass-confirm-btn');
const passCloseBtn = document.getElementById('pass-close-btn');
const passModalNameEl = document.getElementById('pass-modal-name');
const infoModalEl = document.getElementById('info-modal');
const infoCloseBtn = document.getElementById('info-close-btn');
const infoUserEl = document.getElementById('info-user');
const infoGamesEl = document.getElementById('info-games');
const infoWinsEl = document.getElementById('info-wins');
const infoLossesEl = document.getElementById('info-losses');
const infoRateEl = document.getElementById('info-rate');
const infoBestEl = document.getElementById('info-best');
const infoSpizEl = document.getElementById('info-spiz');
const infoFlagsEl = document.getElementById('info-flags');
const infoMoreBtn = document.getElementById('info-more-btn');
const infoMoreEl = document.getElementById('info-more');
const infoTableEl = document.getElementById('info-table');
const toastEl = document.getElementById('toast');
const toastTitleEl = document.getElementById('toast-title');
const toastMsgEl = document.getElementById('toast-msg');
const toastDetailEl = document.getElementById('toast-detail');
const toastIconEl = document.getElementById('toast-icon');
const toastProgressEl = document.getElementById('toast-progress');
const toastCloseEl = document.getElementById('toast-close');
const toastActionEl = document.getElementById('toast-action');
const amuletTooltipEl = document.getElementById('amulet-tooltip');
const amuletModalEl = document.getElementById('amulet-modal');
const amuletModalTitleEl = document.getElementById('amulet-modal-title');
const amuletModalSpriteEl = document.getElementById('amulet-modal-sprite');
const amuletModalNameEl = document.getElementById('amulet-modal-name');
const amuletModalDescEl = document.getElementById('amulet-modal-desc');
const amuletModalStateEl = document.getElementById('amulet-modal-state');
const amuletCloseBtn = document.getElementById('amulet-close-btn');
const amuletOkBtn = document.getElementById('amulet-ok-btn');
const amuletToggleBtn = document.getElementById('amulet-toggle-btn');
const hudMoneyBtn = document.getElementById('hud-money-btn');
const hudShopBtn = document.getElementById('hud-shop-btn');
const resultModalEl = document.getElementById('result-modal');
const resultTitleEl = document.getElementById('result-title');
const resultSubtitleEl = document.getElementById('result-subtitle');
const resultExtraEl = document.getElementById('result-extra');
const resultEarningsEl = document.getElementById('result-earnings');
const resultAmuletsWrapEl = document.getElementById('result-amulets-wrap');
const resultAmuletsEl = document.getElementById('result-amulets');
const resultCloseXEl = document.getElementById('result-close-x');
const resultReopenBtnEl = document.getElementById('result-reopen-btn');
const suggestionsModalEl = document.getElementById('suggestions-modal');
const suggestionsCloseBtn = document.getElementById('suggestions-close-btn');
const suggestionsTextareaEl = document.getElementById('suggestions-textarea');
const suggestionsSaveBtn = document.getElementById('suggestions-save-btn');
const suggestionsStatusEl = document.getElementById('suggestions-status');
const suggestionsListEl = document.getElementById('suggestions-list');
const ddFriends = document.getElementById('dd-friends');
const friendsModalEl = document.getElementById('friends-modal');
const friendsCloseBtn = document.getElementById('friends-close-btn');
const friendsTabsEl = document.querySelectorAll('.friends-tab');
const friendsListEl = document.getElementById('friends-list');
const friendsNavEl = document.getElementById('friends-nav');
const friendsDetailEl = document.getElementById('friends-detail');
const friendsDetailNameEl = document.getElementById('friends-detail-name');
const friendsDetailChatBtn = document.getElementById('friends-detail-chat');
const friendsDetailInfoBtn = document.getElementById('friends-detail-info');
const friendsDetailRemoveBtn = document.getElementById('friends-detail-remove');
const confirmBubbleEl = document.getElementById('confirm-bubble');
const confirmBubbleMsgEl = document.getElementById('confirm-bubble-msg');
const confirmBubbleYesBtn = document.getElementById('confirm-bubble-yes');
const confirmBubbleNoBtn = document.getElementById('confirm-bubble-no');
const friendsRequestsEl = document.getElementById('friends-requests');
const friendsAddInputEl = document.getElementById('friends-add-input');
const friendsAddBtn = document.getElementById('friends-add-btn');
const friendsSearchInputEl = document.getElementById('friends-search-input');
const friendsSearchResultsEl = document.getElementById('friends-search-results');
const playerModalEl = document.getElementById('player-modal');
const playerCloseBtn = document.getElementById('player-close-btn');
const playerNameEl = document.getElementById('player-name');
const playerInfoEl = document.getElementById('player-info');
const playerAddFriendBtn = document.getElementById('player-add-friend');
const chatOpenBtn = document.getElementById('chat-open-btn');
const chatBadgeEl = document.getElementById('chat-badge');
const relicDragonBtnEl = document.getElementById('relic-dragon-btn');
const relicSyntekBtnEl = document.getElementById('relic-syntek-btn');
const rankingToggleBtn = document.getElementById('ranking-toggle-btn');
const rankingCloseBtn = document.getElementById('ranking-close-btn');
const requestsOpenBtn = document.getElementById('requests-open-btn');
const requestsBadgeEl = document.getElementById('requests-badge');
const requestsDropdownEl = document.getElementById('requests-dropdown');
const requestsListEl = document.getElementById('requests-list');
const requestsAddInputEl = document.getElementById('requests-add-input');
const requestsAddBtnEl = document.getElementById('requests-add-btn');
const chatPanelEl = document.getElementById('chat-panel');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatBackBtn = document.getElementById('chat-back-btn');
const chatTitleEl = document.getElementById('chat-title');
const chatRequestsEl = document.getElementById('chat-requests');
const chatFriendsEl = document.getElementById('chat-friends');
const chatViewEl = document.getElementById('chat-view');
const chatMessagesEl = document.getElementById('chat-messages');
const chatInputEl = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatInputRowEl = chatInputEl ? chatInputEl.parentElement : null;

const USERNAME_KEY = 'buscalopas_username';
const SESSION_KEY = 'buscalopas_loggedin';

// Controles de audio
const bgMusic = document.getElementById('bg-music');
const luciferMusic = document.getElementById('lucifer-music');
const toggleMuteBtn = document.getElementById('toggle-mute-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumeValueTxt = document.getElementById('volume-value');
const volumeControlFloating = document.getElementById('volume-control-floating');
const hudVolumeEl = document.getElementById('hud-volume');
const hudVolumeMuteBtn = document.getElementById('hud-volume-mute');
const hudVolumePanelEl = document.getElementById('hud-volume-panel');
const hudVolumePanelMuteBtn = document.getElementById('hud-volume-panel-mute');
const hudVolumeSlider = document.getElementById('hud-volume-slider');
const hudVolumeValueTxt = document.getElementById('hud-volume-value');
const settingsModalEl = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsMuteBtn = document.getElementById('settings-mute-btn');
const settingsVolumeSlider = document.getElementById('settings-volume-slider');
const settingsVolumeValueTxt = document.getElementById('settings-volume-value');
const ddSettings = document.getElementById('dd-settings');

let isMuted = false;
let previousVolume = 0.5;
let autoPlayStarted = false;

const SAVED_VOLUME_KEY = 'buscalopas_volume';

function loadSavedVolume() {
    const saved = parseFloat(localStorage.getItem(SAVED_VOLUME_KEY));
    return (saved !== null && !isNaN(saved) && saved >= 0 && saved <= 1) ? saved : 0.4;
}

applyVolume(loadSavedVolume());

function applyVolume(val) {
    const vol = parseFloat(val);
    if (bgMusic) bgMusic.volume = vol;
    if (luciferMusic) luciferMusic.volume = vol;
    if (volumeSlider) volumeSlider.value = vol;
    if (volumeValueTxt) volumeValueTxt.textContent = `${Math.round(vol * 100)}%`;
    if (settingsVolumeSlider) settingsVolumeSlider.value = vol;
    if (settingsVolumeValueTxt) settingsVolumeValueTxt.textContent = `${Math.round(vol * 100)}%`;
    if (hudVolumeSlider) hudVolumeSlider.value = vol;
    if (hudVolumeValueTxt) hudVolumeValueTxt.textContent = `${Math.round(vol * 100)}%`;

    const icon = (vol === 0 || isMuted) ? '🔇' : (vol < 0.5 ? '🔉' : '🔊');
    toggleMuteBtn.textContent = icon;
    if (settingsMuteBtn) settingsMuteBtn.textContent = icon;
    if (hudVolumeMuteBtn) hudVolumeMuteBtn.textContent = icon;
    if (hudVolumePanelMuteBtn) hudVolumePanelMuteBtn.textContent = icon;
}

// 1. Intentar arrancar la música desde que entras a la página
function startInitialMusic() {
    if (autoPlayStarted) return;

    bgMusic.play().then(() => {
        autoPlayStarted = true;
    }).catch(err => {
        console.log("El navegador requiere un primer clic del usuario para activar el audio.");
    });
}

// Intento automático al cargar la página
window.addEventListener('DOMContentLoaded', startInitialMusic);

// Si el navegador bloqueó el audio automático, arranca al primer clic en cualquier sitio
document.addEventListener('click', function initAudioOnFirstUserInteraction() {
    if (!autoPlayStarted) {
        startInitialMusic();
    }
    document.removeEventListener('click', initAudioOnFirstUserInteraction);
}, { once: true });

function setVolumeFromInput(val) {
    if (val > 0 && isMuted) isMuted = false;
    previousVolume = val;
    localStorage.setItem(SAVED_VOLUME_KEY, val);
    applyVolume(val);
}

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        previousVolume = parseFloat(volumeSlider ? volumeSlider.value : 0.5);
        localStorage.setItem(SAVED_VOLUME_KEY, '0');
        applyVolume(0);
    } else {
        const restoreVol = previousVolume > 0 ? previousVolume : 0.5;
        localStorage.setItem(SAVED_VOLUME_KEY, restoreVol);
        applyVolume(restoreVol);
    }
}

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => setVolumeFromInput(e.target.value));
}

let volumeExpanded = false;
function expandVolume(expand) {
    volumeExpanded = !!expand;
    if (volumeControlFloating) volumeControlFloating.classList.toggle('volume-expanded', volumeExpanded);
}

if (toggleMuteBtn) {
    toggleMuteBtn.addEventListener('click', () => {
        // En móvil el botón arranca PLEGADO: el primer toque lo despliega para
        // ajustar el volumen; los siguientes toques silencian/activan.
        if (isMobileView() && !volumeExpanded) {
            expandVolume(true);
            return;
        }
        toggleMute();
    });
}

// Volumen dentro de la barra de tareas (móvil): botón que despliega un menú
// VERTICAL debajo de él (silenciar + slider + %). Se cierra al tocar fuera, al
// salir del menú, al iniciar partida o al cerrar sesión (nunca se queda un
// resto roto del botón).
let hudVolumeExpanded = false;
function expandHeaderVolume(v) {
    hudVolumeExpanded = !!v;
    if (hudVolumePanelEl) {
        hudVolumePanelEl.classList.toggle('hidden', !hudVolumeExpanded);
        if (v && hudVolumeMuteBtn) {
            // El panel es un elemento fijo a nivel de body: se coloca justo
            // debajo del botón de la barra.
            const r = hudVolumeMuteBtn.getBoundingClientRect();
            const w = hudVolumePanelEl.offsetWidth || 150;
            let left = r.left;
            if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
            hudVolumePanelEl.style.left = left + 'px';
            hudVolumePanelEl.style.top = (r.bottom + 8) + 'px';
        }
    }
}

function collapseVolumeControls() {
    expandHeaderVolume(false);
    expandVolume(false);
}

if (hudVolumeMuteBtn) {
    hudVolumeMuteBtn.addEventListener('click', () => {
        expandHeaderVolume(!hudVolumeExpanded);
    });
}

if (hudVolumePanelMuteBtn) {
    hudVolumePanelMuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMute();
    });
}

if (hudVolumeSlider) {
    hudVolumeSlider.addEventListener('input', (e) => setVolumeFromInput(e.target.value));
}

// En móvil, tocar fuera de la píldora de volumen la cierra.
document.addEventListener('click', (e) => {
    if (!isMobileView()) return;
    if (volumeExpanded && volumeControlFloating && !volumeControlFloating.contains(e.target)) expandVolume(false);
    if (hudVolumeExpanded && hudVolumeEl && !hudVolumeEl.contains(e.target)) expandHeaderVolume(false);
});

if (settingsVolumeSlider) {
    settingsVolumeSlider.addEventListener('input', (e) => setVolumeFromInput(e.target.value));
}

if (settingsMuteBtn) {
    settingsMuteBtn.addEventListener('click', toggleMute);
}

function openSettingsModal() {
    if (settingsModalEl) settingsModalEl.classList.remove('hidden');
    closeDropdown();
}

function closeSettingsModal() {
    if (settingsModalEl) settingsModalEl.classList.add('hidden');
}

if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
}

function playNormalMusic() {
    if (luciferMusic) { luciferMusic.pause(); luciferMusic.currentTime = 0; }
    const t = getActiveTrack();
    if (bgMusic && t) {
        try {
            if (bgMusic.src && bgMusic.src.indexOf(t.src) === -1) {
                bgMusic.src = t.src;
                bgMusic.load();
            }
        } catch (e) {}
        if (bgMusic.paused) {
            bgMusic.play().then(() => { autoPlayStarted = true; }).catch(() => {});
        }
    }
}

function playLuciferMusic() {
    if (bgMusic) bgMusic.pause();
    if (luciferMusic) luciferMusic.play().catch(() => {});
}

function stopAllMusic() {
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    if (luciferMusic) { luciferMusic.pause(); luciferMusic.currentTime = 0; }
}

// --- Formateo de dinero: a partir de 1.000 se muestra en K y de 1.000.000 en M
//     para que los indicadores no cambien de tamaño con cantidades enormes. ---
function formatMoney(n) {
    n = Math.floor(n || 0);
    if (n >= 1000000) {
        const m = n / 1000000;
        return (Number.isInteger(m) ? m : m.toFixed(1).replace(/\.0$/, '')) + 'M';
    }
    if (n >= 1000) {
        const k = n / 1000;
        return (Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, '')) + 'K';
    }
    return String(n);
}

function updateWalletDisplay() {
    let wEl = document.getElementById('wallet');
    let mwEl = document.getElementById('menu-wallet');
    if (wEl) wEl.textContent = formatMoney(wallet);
    if (mwEl) mwEl.textContent = formatMoney(wallet);
    if (hudWalletEl) hudWalletEl.textContent = formatMoney(wallet);
}

function addMoney(amount) {
    wallet += amount;
    totalEarned += amount;
    localStorage.setItem('buscalopas_wallet', wallet);
    localStorage.setItem('buscalopas_total', totalEarned);
    updateWalletDisplay();
    syncWalletToServer();
}

// --- Usuario y sincronización con el servidor ---
function getUsername() {
    return localStorage.getItem(USERNAME_KEY) || '';
}

function isLoggedIn() {
    return localStorage.getItem(SESSION_KEY) === '1';
}

function setLoggedIn(v) {
    if (v) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function setUsername(name) {
    localStorage.setItem(USERNAME_KEY, name);
    if (hudUserEl) hudUserEl.textContent = '👤 ' + name;
    if (menuUserEl) menuUserEl.textContent = name;
    document.title = `Buscalopas ${window.APP_VERSION || '2.3'} — ${name}`;
    refreshClientForUser();
}

// --- Contraseña (hash) ---
async function hashPassword(name, pass) {
    const input = `buscalopas::${name}::${pass}`;
    if (window.crypto && window.crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'fnv:' + ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

// --- Estadísticas ---
const STATS_KEY_PREFIX = 'buscalopas_stats_';
let statsData = emptyStats();
let currentGameKey = '';

function emptyStats() {
    return {
        games: 0, wins: 0, losses: 0, bestEarning: 0, spizSaved: 0,
        timePlayed: 0, luciferReached: 0, luciferTime: 0, turulosWins: 0, correctTurulos: 0,
        ipod: false, ipodTrack: 'cyber', musicTime: {}, ipodNotified: [],
        lopa: { shopUnlocked: false, owned: {}, active: {}, charges: { milagro: 0, ultimobaile: 0, vidente: 0, subidon: 0 }, levels: { spiz: 0, dinero: 0, lucifer: 0 }, uses: { subidon: 0, dragon: 0 }, order: [], pinned: [], relicGames: 0, acquired: {} },
        by: {}
    };
}

function normalizeStats(s) {
    const l = (s.lopa && typeof s.lopa === 'object') ? s.lopa : {};
    const owned = (l.owned && typeof l.owned === 'object') ? l.owned : {};
    const active = (l.active && typeof l.active === 'object') ? l.active : {};
    const charges = (l.charges && typeof l.charges === 'object') ? l.charges : {};
    const levels = (l.levels && typeof l.levels === 'object') ? l.levels : {};
    const uses = (l.uses && typeof l.uses === 'object') ? l.uses : {};
    const order = (Array.isArray(l.order) ? l.order : []).filter(id => ALL_AMULETS[id] || UPGRADE_IDS.includes(id));
    const pinned = (Array.isArray(l.pinned) ? l.pinned : []).filter(id => ALL_AMULETS[id] || UPGRADE_IDS.includes(id)).slice(0, MAX_PINNED);
    const acquired = (l.acquired && typeof l.acquired === 'object') ? l.acquired : {};
    return {
        games: s.games || 0,
        wins: s.wins || 0,
        losses: s.losses || 0,
        bestEarning: s.bestEarning || 0,
        spizSaved: s.spizSaved || 0,
        timePlayed: s.timePlayed || 0,
        luciferReached: s.luciferReached || 0,
        luciferTime: s.luciferTime || 0,
        turulosWins: s.turulosWins || 0,
        correctTurulos: s.correctTurulos || 0,
        ipod: !!s.ipod,
        ipodTrack: (s.ipodTrack && IPOD_TRACKS.some(t => t.id === s.ipodTrack)) ? s.ipodTrack : 'cyber',
        musicTime: (s.musicTime && typeof s.musicTime === 'object') ? s.musicTime : {},
        ipodNotified: (Array.isArray(s.ipodNotified) ? s.ipodNotified : []).filter(id => IPOD_TRACKS.some(t => t.id === id)),
        lopa: {
            shopUnlocked: !!l.shopUnlocked,
            owned,
            active,
            charges: { milagro: charges.milagro || 0, ultimobaile: charges.ultimobaile || 0, vidente: charges.vidente || 0, subidon: charges.subidon || 0 },
            levels: { spiz: levels.spiz || 0, dinero: levels.dinero || 0, lucifer: levels.lucifer || 0 },
            uses: { subidon: uses.subidon || 0, dragon: uses.dragon || 0 },
            order,
            pinned,
            relicGames: Math.max(0, l.relicGames || 0),
            acquired
        },
        by: (s.by && typeof s.by === 'object') ? s.by : {}
    };
}

function readLocalStats(name) {
    try {
        const c = JSON.parse(localStorage.getItem(STATS_KEY_PREFIX + name));
        return c ? normalizeStats(c) : emptyStats();
    } catch (e) {
        return emptyStats();
    }
}

function hasStats(s) {
    return s.games > 0 || s.wins > 0 || s.losses > 0;
}

// La CONFIG del usuario (amuletos fijados/activos, orden, mejoras, cargas,
// canción del iPod...) es de este navegador y es lo último que tocó el jugador.
// El servidor puede ir por detrás (p. ej. al refrescar justo cuando una subida
// iba en camino y se canceló), así que al cargar se FUSIONA la config local
// sobre los datos del servidor para no perderla. Los contadores (partidas,
// récords...) se quedan con lo que diga el servidor.
function mergeConfigIntoServer(server, local) {
    const s = server.lopa;
    const l = (local && local.lopa) ? local.lopa : {};
    for (const k in (l.owned || {})) { s.owned[k] = s.owned[k] || l.owned[k]; }
    for (const k in (l.active || {})) { s.active[k] = l.active[k]; }
    for (const k in (l.charges || {})) { s.charges[k] = Math.max(s.charges[k] || 0, l.charges[k] || 0); }
    for (const k in (l.levels || {})) { s.levels[k] = Math.max(s.levels[k] || 0, l.levels[k] || 0); }
    for (const k in (l.uses || {})) { s.uses[k] = Math.max(s.uses[k] || 0, l.uses[k] || 0); }
    const order = [];
    for (const id of (l.order || [])) if (!order.includes(id)) order.push(id);
    for (const id of (s.order || [])) if (!order.includes(id)) order.push(id);
    s.order = order;
    const pinned = (l.pinned || []).filter(id => ALL_AMULETS[id] || UPGRADE_IDS.includes(id));
    for (const id of (s.pinned || [])) {
        if (pinned.length >= MAX_PINNED) break;
        if (!pinned.includes(id) && (ALL_AMULETS[id] || UPGRADE_IDS.includes(id))) pinned.push(id);
    }
    s.pinned = pinned.slice(0, MAX_PINNED);
    s.relicGames = Math.max(s.relicGames || 0, l.relicGames || 0);
    if (l.shopUnlocked) s.shopUnlocked = true;
    for (const k in (l.acquired || {})) { s.acquired[k] = l.acquired[k]; }
    if (local && local.ipod) server.ipod = true;
    if (local && local.ipodTrack && IPOD_TRACKS.some(t => t.id === local.ipodTrack)) server.ipodTrack = local.ipodTrack;
    for (const id of (local && Array.isArray(local.ipodNotified) ? local.ipodNotified : [])) {
        if (!server.ipodNotified.includes(id)) server.ipodNotified.push(id);
    }
    return server;
}

function loadStats(name, serverStats) {
    if (typeof serverStats === 'string') {
        try { serverStats = JSON.parse(serverStats); } catch (e) { serverStats = null; }
    }
    const local = readLocalStats(name);
    if (serverStats && typeof serverStats === 'object' && typeof serverStats.games === 'number') {
        statsData = normalizeStats(mergeConfigIntoServer(normalizeStats(serverStats), local));
        // La config local se devuelve al servidor para que se ponga al día.
        pushStats(name, statsData).catch(() => {});
    } else {
        statsData = local;
        if (hasStats(statsData)) {
            pushStats(name, statsData).catch(() => {});
        }
    }
    hudCorrectTurulos = statsData.correctTurulos || 0;
    if (isDeity(name)) applyDeityBoost();
    renderIpodPanel();
}

function applyDeityBoost() {
    const l = statsData.lopa;
    const core = Object.assign({}, LOPAMULETOS, CHARGE_AMULETS, NEGATIVE_AMULETS, { dragon: RELIC_DRAGON });
    for (const id in core) {
        l.owned[id] = true;
        l.active[id] = true;
    }
    l.charges = { milagro: MAX_CHARGES, ultimobaile: MAX_CHARGES, vidente: MAX_CHARGES, subidon: SUBIDON_MAX_CHARGES };
    l.levels = { spiz: MAX_UPGRADE_LEVEL, dinero: MAX_UPGRADE_LEVEL };
    l.shopUnlocked = true;
    for (const id of ['vidente', 'milagro', 'ultimobaile', 'rastreador', 'subidon']) setAmuletAcquired(id);
}

function saveStats() {
    const name = getUsername();
    if (!name) return;
    localStorage.setItem(STATS_KEY_PREFIX + name, JSON.stringify(statsData));
    // Snapshot: si justo después se resetea statsData (p. ej. al cerrar sesión
    // en mitad de partida) la subida al servidor conserva el estado real.
    pushStats(name, JSON.parse(JSON.stringify(statsData))).catch(() => {});
}

function recordGameResult(result, earnings = 0, spizSaved = false) {
    const s = statsData;
    s.games++;
    if (result === 'win') {
        s.wins++;
        if (gameMode === 'turulos') s.turulosWins++;
    } else s.losses++;
    if (earnings > s.bestEarning) s.bestEarning = earnings;
    if (spizSaved) s.spizSaved++;
    if (currentGameKey) {
        const b = s.by[currentGameKey] || (s.by[currentGameKey] = { g: 0, w: 0, l: 0 });
        b.g++;
        if (result === 'win') b.w++;
        else b.l++;
    }
    saveStats();
}

async function pushStats(name, stats) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('scores').upsert({ name, stats }, { onConflict: 'name' });
        if (error) throw error;
        return;
    }
    await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, stats })
    });
}

async function pushPass(name, pass) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('scores').upsert({ name, pass }, { onConflict: 'name' });
        if (error) throw error;
        return;
    }
    await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pass })
    });
}

let modalRequired = false;
let usedNamesCache = null;
let cachedNames = null;

async function loadNames() {
    if (cachedNames) return cachedNames;
    const fromTextos = (TX.nombres && Array.isArray(TX.nombres)) ? TX.nombres.filter(Boolean) : [];
    if (fromTextos.length) {
        cachedNames = fromTextos;
        return cachedNames;
    }
    try {
        const res = await fetch('nombres.txt');
        const text = await res.text();
        cachedNames = text.split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => /^\d+\.\s*`([^`]+)`$/.test(l))
            .map(l => l.match(/`([^`]+)`/)[1])
            .filter(Boolean);
    } catch (e) {
        cachedNames = [];
    }
    return cachedNames;
}

function pickRandomFrom(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

async function pickUnusedName(usedNames) {
    const names = await loadNames();
    const usedSet = new Set(usedNames.map(n => n.toLowerCase()));
    const available = names.filter(n => !usedSet.has(n.toLowerCase()));
    return pickRandomFrom(available.length ? available : names);
}

async function getUsedNames() {
    try {
        usedNamesCache = await fetchUsedNames();
    } catch (e) {
        usedNamesCache = usedNamesCache || [];
    }
    return usedNamesCache;
}

function showModalError(msg) {
    userErrorEl.textContent = msg;
    userErrorEl.classList.remove('hidden');
}

function clearModalError() {
    userErrorEl.textContent = '';
    userErrorEl.classList.add('hidden');
}

function openUserModal(required) {
    collapseVolumeControls();
    // Asegura que el icono de volumen quede en su estado real cada vez que se
    // abre la pantalla de login (primera vez o tras cerrar sesión): sin esto,
    // el circulito podía quedarse mostrando el estado anterior.
    applyVolume(volumeSlider ? volumeSlider.value : loadSavedVolume());
    modalRequired = required;
    clearModalError();
    resetNamePassword();
    userCloseBtn.classList.toggle('hidden', required);
    userInputEl.value = '';
    userModalEl.classList.remove('hidden');
    setTimeout(() => userInputEl.focus(), 50);
    getUsedNames().then(used => pickUnusedName(used)).then(name => {
        if (name && !userInputEl.value.trim()) userInputEl.value = name;
    });
}

function hideUserModal() {
    userModalEl.classList.add('hidden');
}

function resetNamePassword() {
    namePassInputEl.classList.add('hidden');
    namePassInputEl.value = '';
}

function showNamePasswordField(name) {
    namePassInputEl.classList.remove('hidden');
    namePassInputEl.placeholder = (UI.contrasenaDe || 'Contraseña de {NAME}').replace('{NAME}', name);
    namePassInputEl.value = '';
    namePassInputEl.focus();
}

async function generateLopero() {
    try {
        const used = await getUsedNames();
        const name = await pickUnusedName(used);
        userInputEl.value = name || '';
        resetNamePassword();
        clearModalError();
        // Sin focus() a propósito: si el input ya tenía el foco se queda y si
        // no, no se abre el teclado (evita el "flash" de abrir/cerrar).
    } catch (e) {
        showModalError('No se pudieron cargar los nombres');
    }
}

async function confirmUser() {
    const typed = userInputEl.value.trim();
    if (!typed) {
        showModalError('Escribe un nombre o genera uno');
        return;
    }
    const name = isDeity(typed) ? DEITY_NAME : typed;
    const currentName = getUsername();
    try {
        if (name.toLowerCase() === currentName.toLowerCase() && isLoggedIn()) {
            hideUserModal();
            return;
        }
        const data = await fetchPlayerData(name);
        if (data) {
            // fetchPlayerData no distingue mayúsculas: usamos SIEMPRE el nombre
            // canónico de la cuenta (data.name) para entrar y verificar la
            // contraseña (el hash se calcula con el nombre real de la cuenta).
            const canonical = data.name || name;
            if (data.pass) {
                if (!namePassInputEl.value) {
                    showNamePasswordField(canonical);
                    showModalError(`"${canonical}" ya tiene contraseña. Introdúcela para entrar.`);
                    return;
                }
                const hash = await hashPassword(canonical, namePassInputEl.value);
                if (hash !== data.pass) {
                    showModalError(UI.contrasenaIncorrecta || 'Contraseña incorrecta');
                    return;
                }
                const typedPass = namePassInputEl.value;
                rememberPassHash(canonical, hash);
                finishLogin(canonical);
                offerPasswordSave(canonical, typedPass, false);
            } else {
                if (canonical.toLowerCase() === currentName.toLowerCase()) {
                    hideUserModal();
                    return;
                }
                setUsername(canonical);
                setLoggedIn(false);
                onUserReady(true);
            }
        } else {
            if (isDeity(typed)) {
                showModalError('La cuenta "Lucifer" no está disponible. Ejecuta "node dev/setup-lucifer.js" o usa otra contraseña de pruebas.');
                return;
            }
            setUsername(name);
            setLoggedIn(false);
            onUserReady(true);
        }
    } catch (e) {
        if (name.toLowerCase() === currentName.toLowerCase() && isLoggedIn()) {
            hideUserModal();
            return;
        }
        if (isDeity(typed)) {
            showModalError('No se pudo verificar la cuenta "Lucifer". Revisa la conexión.');
            return;
        }
        setUsername(name);
        setLoggedIn(false);
        onUserReady(true);
    }
}

function finishLogin(name) {
    setUsername(name);
    setLoggedIn(true);
    updateDropdown();
    onUserReady(true);
}

// Botón "Registrarse" del formulario inicial: comprueba que el nombre esté libre
// y abre el modal de cuenta (usuario + contraseña) para crearla.
async function registerUser() {
    const name = userInputEl.value.trim();
    if (!name) {
        showModalError('Escribe un nombre o genera uno');
        return;
    }
    try {
        const data = await fetchPlayerData(name);
        if (data) {
            showModalError(data.pass ? `"${data.name || name}" ya tiene contraseña. Entra con ella.` : 'Ese lopero ya está en uso');
            return;
        }
        if (isDeity(name)) {
            showModalError('Ese nombre está reservado para la cuenta de pruebas.');
            return;
        }
    } catch (e) {
        showModalError('No se pudo comprobar el nombre. ¿Hay conexión?');
        return;
    }
    openPassModal(name);
}

// Banner fijo "Regístrate" (visible hasta que se cierre) si no hay cuenta con contraseña
function renderRegisterBanner() {
    if (!registerBannerEl || !registerBannerTextEl) return;
    const dismissed = localStorage.getItem('buscalopas_regbanner_hide') === '1';
    registerBannerTextEl.textContent = UI.registrate || '¡Regístrate! Guarda tus progresos.';
    registerBannerEl.classList.toggle('hidden', isLoggedIn() || dismissed);
}

// --- Desplegable del usuario ---
function updateDropdown() {
    const logged = isLoggedIn();
    const hasName = !!getUsername();
    // Sin nombre (pantalla de login) no tienen sentido: cambiar de usuario,
    // crear contraseña ni el lore. Con nombre (aunque sin contraseña) sí.
    ddName.classList.toggle('hidden', logged || !hasName);
    ddPassword.classList.toggle('hidden', logged || !hasName);
    ddFriends.classList.toggle('hidden', !logged);
    ddInfo.classList.toggle('hidden', !logged);
    ddLore.classList.toggle('hidden', !hasName);
    ddLogout.classList.toggle('hidden', !hasName);
    renderChatOpenButton();
    renderRegisterBanner();
}

function toggleDropdown() {
    userDropdownEl.classList.toggle('hidden');
}

function closeDropdown() {
    userDropdownEl.classList.add('hidden');
}

function logout() {
    const name = getUsername() || '';
    showConfirmBubble((UI.cerrarSesion || '¿Cerrar sesión de {NAME}?').replace('{NAME}', name), doLogout);
}

// Cierra TODOS los modales/globos/paneles que pueda haber abiertos (tienda,
// ajustes, visor de amuletos, vista del dragón, chat, amigos, ranking, toast,
// notificaciones, confirmación...). Se usa al cerrar sesión para que no quede
// NADA de la sesión anterior flotando sobre la pantalla de login.
function closeAllModals() {
    for (const closeFn of Object.values(CLICK_OUTSIDE_MODALS)) {
        try { closeFn(); } catch (e) {}
    }
    closeDragonView();
    if (noticeModalEl) noticeModalEl.classList.add('hidden');
    hideToast();
    hideConfirmBubble();
    closeMobilePanels();
    closeHudAmuletsPanel();
    renderIpodPanel();
}

function doLogout() {
    abandonGame();
    collapseVolumeControls();
    closeAllModals();
    stopChatPolling();
    stopFriendsPolling();
    stopRealtime();
    setLoggedIn(false);
    try { sessionStorage.removeItem('buscalopas_passhash_' + (getUsername() || '').toLowerCase()); } catch (e) {}
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem('buscalopas_wallet');
    localStorage.removeItem('buscalopas_total');
    if (hudUserEl) hudUserEl.textContent = '👤 —';
    if (menuUserEl) menuUserEl.textContent = '—';
    wallet = 0;
    totalEarned = 0;
    statsData = emptyStats();
    myFriends = [];
    myIncoming = [];
    myOutgoing = [];
    closeDropdown();
    hideConfirmBubble();
    closeHudAmuletsPanel();
    updateDropdown();
    updateWalletDisplay();
    renderHudAmulets();
    renderIpodPanel();
    renderShopButton();
    openUserModal(true);
}

// --- Toast / Notificación ---
let toastTimeout = null;
let toastDuration = 2500;

function resetToastTimer(duration = 2500) {
    toastDuration = duration;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.add('hidden'), duration);
    if (toastProgressEl) {
        toastProgressEl.style.animation = 'none';
        void toastProgressEl.offsetWidth;
        toastProgressEl.style.animation = `toastProgress ${duration}ms linear forwards`;
    }
}

function pullEmoji(text) {
    if (!text) return { icon: '', rest: text || '' };
    const m = text.match(/\p{Extended_Pictographic}\uFE0F?/u);
    if (!m) return { icon: '', rest: text };
    return { icon: m[0], rest: text.replace(m[0], '').trim() };
}

function renderToast({ title, msg, detail = '', icon = '', type = '', duration = 2500, action = null }) {
    if (!toastEl) return;
    const t = pullEmoji(title);
    const m = pullEmoji(msg);
    const bodyIcon = icon || t.icon || m.icon;
    if (toastTitleEl) toastTitleEl.textContent = t.rest || '';
    if (toastMsgEl) toastMsgEl.textContent = (t.icon ? msg : m.rest) || '';
    if (toastDetailEl) toastDetailEl.textContent = detail || '';
    if (toastIconEl) toastIconEl.textContent = bodyIcon || '💬';
    toastEl.dataset.type = type;
    toastEl.classList.remove('hidden');
    if (toastActionEl) {
        if (action && action.label) {
            toastActionEl.textContent = action.label;
            toastActionEl.classList.remove('hidden');
            toastActionEl.onclick = () => {
                if (action.fn) action.fn();
                toastEl.classList.add('hidden');
                if (toastTimeout) clearTimeout(toastTimeout);
            };
            resetToastTimer(60000);
            return;
        }
        toastActionEl.classList.add('hidden');
        toastActionEl.onclick = null;
    }
    resetToastTimer(duration);
}

function showToast(msg, type = '') {
    renderToast({ msg, type, duration: 2500 });
}

function showNotification(title, msg, detail = '', type = '', action = null) {
    renderToast({ title, msg, detail, type, duration: 5000, action });
}

function hideToast() {
    toastEl.classList.add('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
}

if (toastCloseEl) {
    toastCloseEl.addEventListener('click', hideToast);
}

// --- Deslizar la notificación a un lado para cerrarla (además de la X) ---
// Se arrastra el globo con el dedo/ratón: si pasa del umbral se cierra; si no,
// vuelve a su sitio. Los botones internos (X, acción) no inician el arrastre.
let toastDrag = null;
function initToastDrag() {
    const bubble = toastEl ? toastEl.querySelector('.toast-bubble') : null;
    if (!bubble || bubble.dataset.dragInit) return;
    bubble.dataset.dragInit = '1';
    bubble.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, a, input, textarea, select')) return;
        toastDrag = { x: e.clientX, dx: 0, id: e.pointerId };
        if (bubble.setPointerCapture) bubble.setPointerCapture(e.pointerId);
    });
    bubble.addEventListener('pointermove', (e) => {
        if (!toastDrag) return;
        toastDrag.dx += e.clientX - toastDrag.x;
        toastDrag.x = e.clientX;
        const dx = toastDrag.dx;
        toastEl.style.transform = `translateX(${dx}px)`;
        toastEl.style.transition = 'none';
        toastEl.style.opacity = String(Math.max(0, 1 - Math.min(1, Math.abs(dx) / 160)));
    });
    const endToastDrag = () => {
        if (!toastDrag) return;
        const dx = toastDrag.dx;
        toastDrag = null;
        toastEl.style.transform = '';
        toastEl.style.transition = '';
        toastEl.style.opacity = '';
        if (Math.abs(dx) > 70) hideToast();
    };
    bubble.addEventListener('pointerup', endToastDrag);
    bubble.addEventListener('pointercancel', endToastDrag);
}
initToastDrag();

// --- Modal de contraseña / crear cuenta ---
function openPassModal(name) {
    const n = (name || getUsername() || '').trim();
    if (passUserEl) passUserEl.value = n;
    passInputEl.value = '';
    passInput2El.value = '';
    passErrorEl.classList.add('hidden');
    passModalEl.classList.remove('hidden');
    setTimeout(() => passUserEl && passUserEl.focus(), 50);
}

function showPassError(msg) {
    passErrorEl.textContent = msg;
    passErrorEl.classList.remove('hidden');
}

async function confirmPassword() {
    const nameRaw = passUserEl ? passUserEl.value.trim().slice(0, 30) : getUsername();
    const oldName = getUsername();
    // Si escribes TU mismo nombre con distinta capitalización, se usa el nombre
    // canónico de la cuenta (los nombres no distinguen mayúsculas).
    const name = (oldName && nameRaw && nameRaw.toLowerCase() === oldName.toLowerCase()) ? oldName : nameRaw;
    const p1 = passInputEl.value;
    const p2 = passInput2El.value;
    if (!name) { showPassError(UI.eligeNombre || 'Elige un nombre de usuario'); return; }
    if (isDeity(name)) { showPassError('Ese nombre está reservado para la cuenta de pruebas.'); return; }
    if (!p1) { showPassError(UI.escribeContrasena || 'Escribe una contraseña'); return; }
    if (p1.length < 4) { showPassError(UI.minimo4 || 'Mínimo 4 caracteres'); return; }
    if (p1 !== p2) { showPassError(UI.noCoinciden || 'Las contraseñas no coinciden'); return; }
    try {
        const oldName = getUsername();
        if (name !== oldName) {
            const data = await fetchPlayerData(name);
            if (data) {
                showPassError(data.pass ? (UI.yaTieneContrasena || 'Este lopero ya tiene contraseña') : (UI.nombreEnUso || 'Ese lopero ya está en uso'));
                return;
            }
        }
    } catch (e) {
        showPassError(UI.sinConexion || 'No se pudo comprobar el nombre. ¿Hay conexión?');
        return;
    }
    doCreatePassword(name, p1);
}

async function doCreatePassword(name, p1) {
    const oldName = getUsername();
    const hash = await hashPassword(name, p1);
    if (oldName && oldName !== name) {
        try {
            const d = await fetchPlayerData(oldName);
            if (d) {
                if (d.score) wallet = Math.max(wallet, d.score || 0);
                if (d.total) totalEarned = Math.max(totalEarned, d.total || 0);
                localStorage.setItem('buscalopas_wallet', wallet);
                localStorage.setItem('buscalopas_total', totalEarned);
            }
            if (d && d.stats) {
                let st = d.stats;
                if (typeof st === 'string') { try { st = JSON.parse(st); } catch (e) { st = null; } }
                if (st && typeof st === 'object' && typeof st.games === 'number') statsData = normalizeStats(st);
            }
        } catch (e) {}
        await transferUserData(oldName, name);
    }
    setUsername(name);
    try { await pushPass(name, hash); } catch (e) {}
    rememberPassHash(name, hash);
    saveStats();
    pushPlayerData(name, wallet, totalEarned).catch(() => {});
    setLoggedIn(true);
    updateDropdown();
    renderRegisterBanner();
    syncRealtime();
    passModalEl.classList.add('hidden');
    userModalEl.classList.add('hidden');
    hideConfirmBubble();
    showToast(UI.cuentaCreada || 'Contraseña creada. ¡Sesión iniciada!');
    offerPasswordSave(name, p1, true);
    showMenu();
}

// Dispara el "guardar contraseña" del navegador SOLO en el momento correcto:
// tras un login con contraseña exitoso o tras crear la cuenta. El navegador
// solo pregunta si ve una "entrega" real de credenciales: se envía un formulario
// oculto a un iframe invisible con el mismo origen (pwsave.html, página en blanco),
// así la página principal no se recarga y Firefox/Chrome ofrecen guardar.
function offerPasswordSave(username, password, isNew) {
    try {
        if (!username || !password) return;
        const frameName = 'buscalopas_pwsave';
        let frame = document.getElementById(frameName);
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = frameName;
            frame.name = frameName;
            frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;visibility:hidden;';
            document.body.appendChild(frame);
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'pwsave.html';
        form.target = frameName;
        // OJO: el form va a document.body y sin estilos se veía como un recuadro
        // raro (con el usuario y la contraseña) durante ~3s bajo el botón del
        // DEALER tras entrar con contraseña. Se oculta igual que el iframe.
        form.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;padding:0;margin:0;visibility:hidden;';
        const u = document.createElement('input');
        u.type = 'text';
        u.name = 'username';
        u.autocomplete = 'username';
        u.value = username;
        const p = document.createElement('input');
        p.type = 'password';
        p.name = 'password';
        p.autocomplete = isNew ? 'new-password' : 'current-password';
        p.value = password;
        form.appendChild(u);
        form.appendChild(p);
        document.body.appendChild(form);
        form.submit();
        setTimeout(() => { if (form.parentNode) form.parentNode.removeChild(form); }, 3000);
    } catch (e) {}
}

async function transferUserData(oldName, newName) {
    if (!supabaseClient || oldName === newName) return;
    try {
        const [f1, f2] = await Promise.all([
            supabaseClient.from('friendships').select('user_a,user_b').eq('user_a', oldName),
            supabaseClient.from('friendships').select('user_a,user_b').eq('user_b', oldName)
        ]);
        for (const r of [...(f1.data || []), ...(f2.data || [])]) {
            const [x, y] = [r.user_a === oldName ? newName : r.user_a, r.user_b === oldName ? newName : r.user_b].sort();
            if (x === y) continue;
            await supabaseClient.from('friendships').upsert({ user_a: x, user_b: y }, { onConflict: 'user_a,user_b' });
        }
        const [q1, q2] = await Promise.all([
            supabaseClient.from('friend_requests').select('from_name,to_name').eq('from_name', oldName),
            supabaseClient.from('friend_requests').select('from_name,to_name').eq('to_name', oldName)
        ]);
        for (const r of [...(q1.data || []), ...(q2.data || [])]) {
            const fn = r.from_name === oldName ? newName : r.from_name;
            const tn = r.to_name === oldName ? newName : r.to_name;
            if (fn === tn) continue;
            await supabaseClient.from('friend_requests').upsert({ from_name: fn, to_name: tn }, { onConflict: 'from_name,to_name' });
        }
        const [c1, c2] = await Promise.all([
            supabaseClient.from('chat_messages').select('id,user_from,user_to').eq('user_from', oldName),
            supabaseClient.from('chat_messages').select('id,user_from,user_to').eq('user_to', oldName)
        ]);
        for (const m of [...(c1.data || []), ...(c2.data || [])]) {
            await supabaseClient.from('chat_messages').update({
                user_from: m.user_from === oldName ? newName : m.user_from,
                user_to: m.user_to === oldName ? newName : m.user_to
            }).eq('id', m.id);
        }
    } catch (e) {}
}

// --- Modal de Info ---
const DIFF_LABELS = Object.fromEntries(Object.entries((TX.dificultades || {})).map(([k, v]) => [k, v.label]));
const SIZES = [9, 14, 18];

function renderInfoTable() {
    const diffs = [['0.06-180', 'Fácil'], ['0.10-120', 'Media'], ['0.14-60', 'Difícil']];
    let html = '<thead><tr><th></th>' + SIZES.map(s => `<th>${s}×${s}</th>`).join('') + '</tr></thead><tbody>';
    for (const [dkey, dlabel] of diffs) {
        html += `<tr><td>${dlabel}</td>`;
        for (const sz of SIZES) {
            const key = `${dkey}_${sz}`;
            const b = statsData.by[key];
            html += `<td>${b ? `${b.w}/${b.l}` : '0/0'}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody>';
    infoTableEl.innerHTML = html;
}

function openInfoModal() {
    if (!isLoggedIn()) {
        showToast(UI.bloqueoRegistro && UI.bloqueoRegistro.info || '🔒 Regístrate con contraseña para ver tu info');
        return;
    }
    infoUserEl.textContent = getUsername();
    const infoVersionEl = document.getElementById('info-version');
    if (infoVersionEl) infoVersionEl.textContent = window.APP_VERSION || '2.5';
    const s = statsData;
    infoGamesEl.textContent = s.games || 0;
    infoWinsEl.textContent = s.wins || 0;
    infoLossesEl.textContent = s.losses || 0;
    infoRateEl.textContent = (s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0) + '%';
    infoBestEl.textContent = formatMoney(s.bestEarning || 0) + '€';
    infoSpizEl.textContent = s.spizSaved || 0;
    infoFlagsEl.textContent = hudCorrectTurulos || 0;
    if (infoLuciferEl) infoLuciferEl.textContent = s.luciferReached || 0;
    if (infoLuciferTimeEl) infoLuciferTimeEl.textContent = formatTimeShort(s.luciferTime || 0);
    infoMoreEl.classList.add('hidden');
    infoMoreBtn.textContent = 'Más estadísticas ▾';
    renderInfoTable();
    infoModalEl.classList.remove('hidden');
}

// --- Progresión: LopAmuletos y tienda ---
const shopModalEl = document.getElementById('shop-modal');
const shopCloseBtn = document.getElementById('shop-close-btn');
const shopListEl = document.getElementById('shop-list');

// --- iPod ---
const ipodPanelEl = document.getElementById('ipod-panel');
const ipodScreenEl = document.getElementById('ipod-screen');
const ipodTrackListEl = document.getElementById('ipod-track-list');
const ipodNowPlayingEl = document.getElementById('ipod-now-playing');
const ipodWheelMenuBtn = document.getElementById('ipod-wheel-menu');
const ipodWheelPlayBtn = document.getElementById('ipod-wheel-play');
const ipodWheelPrevBtn = document.getElementById('ipod-wheel-prev');
const ipodWheelNextBtn = document.getElementById('ipod-wheel-next');
const ipodMinimizeBtn = document.getElementById('ipod-minimize-btn');
const ipodShuffleEl = document.getElementById('ipod-shuffle');
const ipodShuffleTrackEl = document.getElementById('ipod-shuffle-track');
const ipodShufflePrevBtn = document.getElementById('ipod-shuffle-prev');
const ipodShufflePlayBtn = document.getElementById('ipod-shuffle-play');
const ipodShuffleNextBtn = document.getElementById('ipod-shuffle-next');

// --- Popup de info (Spiz / Lucifer) y cola de notificaciones ---
const infoPopupEl = document.getElementById('info-popup');
const infoPopupImgWrap = document.getElementById('info-popup-img-wrap');
const infoPopupTitleEl = document.getElementById('info-popup-title');
const infoPopupDescEl = document.getElementById('info-popup-desc');
const infoPopupOkBtn = document.getElementById('info-popup-ok');
const noticeModalEl = document.getElementById('notice-modal');
const noticeIconEl = document.getElementById('notice-icon');
const noticeTitleEl = document.getElementById('notice-title');
const noticeMsgEl = document.getElementById('notice-msg');
const noticeImgWrap = document.getElementById('notice-img-wrap');
const noticeNextBtn = document.getElementById('notice-next-btn');

const ipodInfoRows = document.querySelectorAll('#info-spiz-row, #info-lucifer-row, #info-lucifer-time-row');
const infoLuciferEl = document.getElementById('info-lucifer');
const infoLuciferTimeEl = document.getElementById('info-lucifer-time');

// --- Lore (📜) ---
const loreModalEl = document.getElementById('lore-modal');
const loreCloseBtn = document.getElementById('lore-close-btn');
const loreListEl = document.getElementById('lore-list');
const loreViewEl = document.getElementById('lore-view');
const loreBackBtn = document.getElementById('lore-back-btn');
const loreViewTitleEl = document.getElementById('lore-view-title');
const loreViewTextEl = document.getElementById('lore-view-text');
const loreViewImgEl = document.getElementById('lore-view-img');

function amuletUnlocked(id) {
    switch (id) {
        case 'rizao': return (statsData.wins || 0) >= 1;
        case 'subidon': return (statsData.luciferReached || 0) >= 1;
        case 'iman': return (statsData.turulosWins || 0) >= 1;
        case 'vidente': return (statsData.spizSaved || 0) >= 1;
        case 'papu': return totalEarned >= 1000;
        case 'rastreador': return (statsData.correctTurulos || 0) >= RASTREADOR_UNLOCK;
        case 'mala': return (statsData.losses || 0) >= 5;
        case 'sombra': return (statsData.losses || 0) >= 15;
        case 'gafe': return (statsData.losses || 0) >= 30;
    }
    return false;
}

const UPGRADE_IDS = ['level-spiz', 'level-dinero', 'level-lucifer', 'reveal-lvl'];

function isUpgradeId(id) {
    return UPGRADE_IDS.includes(id);
}

function upgradeLevel(id) {
    const lopa = statsData.lopa;
    if (id === 'level-spiz') return lopa.levels.spiz || 0;
    if (id === 'level-dinero') return lopa.levels.dinero || 0;
    if (id === 'level-lucifer') return lopa.levels.lucifer || 0;
    return spizRevealLevel();
}

function markAcquired(id) {
    if (!ALL_AMULETS[id] && !isUpgradeId(id)) return;
    const order = statsData.lopa.order || (statsData.lopa.order = []);
    if (!order.includes(id)) order.push(id);
}

function amuletBaseline(id) {
    const acq = statsData.lopa.acquired || (statsData.lopa.acquired = {});
    return acq[id] || 0;
}

function setAmuletAcquired(id) {
    statsData.lopa.active[id] = true;
    const acq = statsData.lopa.acquired || (statsData.lopa.acquired = {});
    acq[id] = (id === 'vidente' || id === 'subidon') ? (statsData.wins || 0) : (statsData.correctTurulos || 0);
}

function checkAmuletUnlocks() {
    const lopa = statsData.lopa;
    const newly = [];
    for (const id in UNLOCKABLE_AMULETS) {
        if (!lopa.owned[id] && amuletUnlocked(id)) {
            lopa.owned[id] = true;
            markAcquired(id);
            setAmuletAcquired(id);
            if (id === 'vidente') {
                statsData.lopa.charges.vidente = (statsData.lopa.charges.vidente || 0) + 1;
            }
            if (id === 'subidon') {
                statsData.lopa.charges.subidon = (statsData.lopa.charges.subidon || 0) + 1;
            }
            newly.push(id);
        }
    }
    if (newly.length) {
        saveStats();
        renderHudAmulets();
        playUiSound();
        for (const id of newly) {
            gameEarnedAmulets.push(id);
            const a = ALL_AMULETS[id];
            showToast(`${a && a.negative ? '😈 Maldición desbloqueada' : '🔮 LopAmuleto desbloqueado'}: ${a ? a.name : id}`, 'unlock');
        }
    }
    checkIpodTrackUnlocks();
}

function isAmuletActive(id) {
    return !!statsData.lopa.owned[id] && statsData.lopa.active[id] !== false;
}

function isAmuletToggleable(id) {
    if (id === 'syntek') return true;
    return !!LOPAMULETOS[id] && !NEGATIVE_AMULETS[id];
}

function toggleAmulet(id) {
    if (!isAmuletToggleable(id)) return;
    const active = isAmuletActive(id);
    statsData.lopa.active[id] = !active;
    saveStats();
    renderHudAmulets();
    const a = ALL_AMULETS[id];
    showToast(`${a.name}: ${active ? 'desactivado ⛔' : 'activado ✅'}`);
}

function amuletProgress(id) {
    const ct = hudCorrectTurulos;
    if (id === 'rastreador') return { cur: Math.max(0, ct - amuletBaseline('rastreador')) % RASTREADOR_EVERY, max: RASTREADOR_EVERY };
    if (id === 'milagro') return { cur: Math.max(0, ct - amuletBaseline('milagro')) % MILAGRO_RECHARGE_EVERY, max: MILAGRO_RECHARGE_EVERY };
    if (id === 'ultimobaile') return { cur: Math.max(0, ct - amuletBaseline('ultimobaile')) % ULTIMOBAILE_RECHARGE_EVERY, max: ULTIMOBAILE_RECHARGE_EVERY };
    if (id === 'vidente') return { cur: Math.max(0, (statsData.wins || 0) - amuletBaseline('vidente')) % VIDENTE_RECHARGE_EVERY, max: VIDENTE_RECHARGE_EVERY };
    if (id === 'subidon') return { cur: Math.max(0, (statsData.wins || 0) - amuletBaseline('subidon')) % SUBIDON_RECHARGE_EVERY, max: SUBIDON_RECHARGE_EVERY };
    if (id === 'dragon') return { cur: Math.min(statsData.lopa.relicGames || 0, RELIC_DRAGON_EVERY), max: RELIC_DRAGON_EVERY };
    return null;
}

function orderedAmuletIds() {
    const order = statsData.lopa.order || [];
    const ids = [];
    for (const id of order) if (!ids.includes(id)) ids.push(id);
    for (const id of AMULET_ORDER) if (!ids.includes(id)) ids.push(id);
    for (const id of UPGRADE_IDS) if (!ids.includes(id)) ids.push(id);
    return ids;
}

function renderHudAmulets() {
    const container = document.getElementById('hud-amulets');
    if (!container) return;
    const lopa = statsData.lopa;
    const mobile = isMobileView();
    let html = '';
    for (const id of orderedAmuletIds()) {
        if (isUpgradeId(id)) {
            const lvl = upgradeLevel(id);
            if (lvl <= 0) continue;
            // En móvil solo se muestran los fijados (máx 4); en PC todos.
            if (mobile && !isAmuletPinned(id)) continue;
            html += `<div class="amu amu-upgrade" data-amulet-id="${id}">${amuletVisual(id)}<span class="amu-lvl">${lvl}</span></div>`;
            continue;
        }
        const owned = lopa.owned[id];
        const charges = lopa.charges[id] || 0;
        if (!owned && charges === 0) continue;
        if (mobile && !isAmuletPinned(id)) continue;
        const a = ALL_AMULETS[id];
        const chargeBadge = charges > 0 ? `<span class="amu-charge">×${charges}</span>` : '';
        const neg = a && a.negative ? ' amu-negative' : '';
        const inact = (!a.negative && isAmuletActive(id) === false) ? ' amu-inactive' : '';
        const prog = amuletProgress(id);
        const progBadge = (prog && (id === 'rastreador' || id === 'vidente' || id === 'dragon' || id === 'subidon')) ? `<span class="amu-prog">${prog.cur >= prog.max ? '✓' : `${prog.cur}/${prog.max}`}</span>` : '';
        html += `<div class="amu${neg}${inact}" data-amulet-id="${id}">${amuletVisual(id)}${chargeBadge}${progBadge}</div>`;
    }
    // Botón "ver todos" (solo en móvil): la píldora "Lopamuletos" SIEMPRE que
    // haya amuletos, aunque no haya ninguno fijado (es la única vía al panel).
    const anyAmulets = hasAnyAmulets();
    const showAllBtn = mobile ? anyAmulets : !!html;
    if (showAllBtn) html = `<button id="hud-amulets-all" class="hud-amulets-all" type="button" title="Ver todos los LopAmuletos">🔮 Lopamuletos ▾</button>` + html;
    container.innerHTML = html;
    renderHudAmuletsPanel();
}

// --- Panel de TODOS los LopAmuletos (móvil): botón ▾ en el HUD ---
function renderHudAmuletsPanel() {
    const list = document.getElementById('hud-amulets-panel-list');
    const panel = document.getElementById('hud-amulets-panel');
    if (!list || !panel) return;
    const lopa = statsData.lopa;
    let html = '';
    for (const id of orderedAmuletIds()) {
        const pinned = isAmuletPinned(id);
        const pinBtn = `<button class="hap-pin ${pinned ? 'hap-pin-quitar' : 'hap-pin-fijar'}" data-pin-id="${id}" type="button">${pinned ? 'Quitar' : 'Fijar'}</button>`;
        if (isUpgradeId(id)) {
            const lvl = upgradeLevel(id);
            if (lvl <= 0) continue;
            html += `<div class="hap-item hap-upgrade${pinned ? ' hap-pinned' : ''}" data-amulet-id="${id}">${amuletVisual(id)}<span class="hap-lvl">${lvl}</span><span class="hap-name">${escapeHtml((amuletInfo(id) || {}).name || id)}</span><div class="hap-footer"><span class="hap-status">⬆️ Lv.${lvl}</span>${pinBtn}</div></div>`;
            continue;
        }
        const owned = lopa.owned[id];
        const charges = lopa.charges[id] || 0;
        if (!owned && charges === 0) continue;
        const a = ALL_AMULETS[id];
        const chargeBadge = charges > 0 ? `<span class="hap-charge">×${charges}</span>` : '';
        const neg = a && a.negative ? ' hap-negative' : '';
        const inact = (!a.negative && isAmuletActive(id) === false) ? ' hap-inactive' : '';
        const prog = amuletProgress(id);
        const progBadge = (prog && (id === 'rastreador' || id === 'vidente' || id === 'dragon' || id === 'subidon')) ? `<span class="hap-prog">${prog.cur >= prog.max ? '✓' : `${prog.cur}/${prog.max}`}</span>` : '';
        html += `<div class="hap-item${neg}${inact}${pinned ? ' hap-pinned' : ''}" data-amulet-id="${id}">${amuletVisual(id)}${chargeBadge}${progBadge}<span class="hap-name">${escapeHtml((a && a.name) || id)}</span><div class="hap-footer"><span class="hap-status">${amuletStatusText(id)}</span>${pinBtn}</div></div>`;
    }
    if (!html) {
        panel.classList.add('hidden');
        document.body.classList.remove('amulets-panel-open');
        list.innerHTML = '';
        return;
    }
    list.innerHTML = html;
}

// Fijado: en móvil solo se quedan a la vista en la barra los fijados (máx 4).
function getPinnedAmuletIds() {
    const p = statsData.lopa.pinned;
    return (Array.isArray(p) ? p : []).filter(id => ALL_AMULETS[id] || UPGRADE_IDS.includes(id));
}

function isAmuletPinned(id) {
    return getPinnedAmuletIds().includes(id);
}

function togglePinAmulet(id) {
    const pinned = getPinnedAmuletIds();
    const idx = pinned.indexOf(id);
    if (idx >= 0) {
        pinned.splice(idx, 1);
    } else {
        if (pinned.length >= MAX_PINNED) {
            showToast('🔒 Máximo 4 LopAmuletos fijados', 'info');
            return;
        }
        pinned.push(id);
    }
    statsData.lopa.pinned = pinned;
    saveStats();
    renderHudAmulets();
    playUiSound();
}

// Estado corto de cada LopAmuleto (fila inferior del panel, junto a Fijar).
function amuletStatusText(id) {
    if (isUpgradeId(id)) return `⬆️ Lv.${upgradeLevel(id)}`;
    const a = ALL_AMULETS[id];
    if (a && a.negative) return '⚠️ Maldición';
    if (id === 'dragon') {
        const prog = amuletProgress(id);
        return (prog && prog.cur >= prog.max) ? '✅ Lista' : '⏳ Recarga';
    }
    if (a && a.relic) return isAmuletActive(id) ? '🟢 Activa' : '⚫ Inactiva';
    if (id === 'subidon') return (statsData.lopa.charges.subidon || 0) > 0 ? '✅ Carga' : '⏳ Recarga';
    if (CHARGE_AMULETS[id]) return (statsData.lopa.charges[id] || 0) > 0 ? '✅ Disponible' : '⏳ Recarga';
    return isAmuletActive(id) ? '🟢 Activo' : '⚫ Inactivo';
}

function hasAnyAmulets() {
    for (const id of orderedAmuletIds()) {
        if (isUpgradeId(id)) {
            if (upgradeLevel(id) > 0) return true;
        } else if (statsData.lopa.owned[id] || (statsData.lopa.charges[id] || 0) > 0) {
            return true;
        }
    }
    return false;
}

function closeHudAmuletsPanel() {
    const panel = document.getElementById('hud-amulets-panel');
    if (panel) {
        panel.classList.add('hidden');
        document.body.classList.remove('amulets-panel-open');
    }
}

function toggleHudAmuletsPanel() {
    const panel = document.getElementById('hud-amulets-panel');
    if (!panel) return;
    const closing = panel.classList.toggle('hidden');
    if (!closing) closeMobilePanels('amulets');
    renderHudAmuletsPanel();
    // Mientras se inspeccionan los LopAmuletos el scroll queda limitado al panel.
    document.body.classList.toggle('amulets-panel-open', !closing);
}

function amuletInfo(id) {
    if (id === 'level-spiz') {
        const l = statsData.lopa.levels.spiz || 0;
        return { icon: '⚡', name: 'Mejora de Spiz', desc: `+${l * 10}% de tiempo al activar el Spiz.` };
    }
    if (id === 'level-dinero') {
        const l = statsData.lopa.levels.dinero || 0;
        return { icon: '💰', name: 'Mejora de Dinero', desc: `+${l * 10}% de dinero al ganar.` };
    }
    if (id === 'reveal-lvl') {
        const l = spizRevealLevel();
        return { icon: '🔭', name: 'Spiz Revelador', desc: `Al activarse, el Spiz revela ${l * 2 + 1}×${l * 2 + 1} casillas alrededor.` };
    }
    if (id === 'level-lucifer') {
        const l = statsData.lopa.levels.lucifer || 0;
        return { icon: '🔥', name: 'Mejora de Lucifer', desc: `Los turulos en modo Lucifer valen ×2 (base) +${l * 50}% por nivel.` };
    }
    return ALL_AMULETS[id] || null;
}

function amuletVisual(id) {
    const a = amuletInfo(id);
    if (!a) return '';
    if (a.img) {
        return `<img class="amu-img" data-amulet="${id}" src="${a.img}" alt="" onerror="amuletImgFallback(this)">`;
    }
    return `<span class="amu-emoji">${a.icon}</span>`;
}

function amuletImgFallback(el) {
    const a = amuletInfo(el.dataset.amulet);
    el.outerHTML = `<span class="amu-emoji">${a ? a.icon : '❓'}</span>`;
}

// --- Tooltip de amuletos ---
function showAmuletTooltip(id, e) {
    const a = amuletInfo(id);
    if (!a) return;
    let extra = '';
    const prog = amuletProgress(id);
    if (CHARGE_AMULETS[id]) {
        extra = `<div class="amulet-tip-desc amulet-tip-prog">Cargas: ${statsData.lopa.charges[id] || 0}/${MAX_CHARGES}${prog ? ` · Recarga ${prog.cur}/${prog.max}` : ''}</div>`;
    } else if (id === 'vidente') {
        extra = `<div class="amulet-tip-desc amulet-tip-prog">Cargas: ${statsData.lopa.charges.vidente || 0}/${MAX_CHARGES} · Recarga ${prog.cur}/${prog.max} victorias</div>` +
            `<div class="amulet-tip-desc amulet-tip-prog">${isAmuletActive(id) ? '🟢 Activo' : '⚫ Inactivo'} · Clic para activar/desactivar</div>`;
    } else if (id === 'dragon' && prog) {
        extra = `<div class="amulet-tip-desc amulet-tip-prog">${prog.cur >= prog.max ? '✅ Lista para usar esta partida' : `Se recarga en ${prog.max - prog.cur} partida(s)`} · Usada ${statsData.lopa.uses.dragon || 0} vez(es)</div>`;
    } else if (id === 'rastreador' && prog) {
        extra = `<div class="amulet-tip-desc amulet-tip-prog">Progreso: ${prog.cur}/${prog.max}</div>`;
    } else if (id === 'subidon') {
        extra = `<div class="amulet-tip-desc amulet-tip-prog">Cargas: ${statsData.lopa.charges.subidon || 0}/${SUBIDON_MAX_CHARGES} · Recarga cada ${SUBIDON_RECHARGE_EVERY} victorias</div>`;
    } else if (isAmuletToggleable(id)) {
        extra = `<div class="amulet-tip-desc amulet-tip-prog">${isAmuletActive(id) ? '🟢 Activo' : '⚫ Inactivo'} · Clic para activar/desactivar</div>`;
    }
    const imgHtml = a.img
        ? `<img class="amulet-tip-img" data-amulet="${id}" src="${a.img}" alt="" onerror="amuletImgFallback(this)">`
        : `<span class="amulet-tip-emoji">${a.icon}</span>`;
    amuletTooltipEl.innerHTML = imgHtml + `<div><div class="amulet-tip-name">${a.name}</div><div class="amulet-tip-desc">${a.desc}</div>${extra}</div>`;
    amuletTooltipEl.classList.remove('hidden');
    positionAmuletTooltip(e);
}

function positionAmuletTooltip(e) {
    const pad = 14;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const r = amuletTooltipEl.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    amuletTooltipEl.style.left = x + 'px';
    amuletTooltipEl.style.top = y + 'px';
}

function hideAmuletTooltip() {
    amuletTooltipEl.classList.add('hidden');
}

// --- Visor / desbloqueo de amuletos ---
function openAmuletModal(id, unlock = false) {
    const a = amuletInfo(id);
    if (!a) return;
    amuletModalEl.dataset.currentId = id;
    amuletModalTitleEl.textContent = unlock
        ? (id === 'dragon' ? '🐉 ¡El Dragon Narco te regala su Carta!' : (a.negative ? '😈 ¡LopAmuleto negativo desbloqueado!' : '✨ ¡LopAmuleto desbloqueado!'))
        : '🔮 LopAmuleto';
    amuletModalSpriteEl.innerHTML = a.img
        ? `<img class="amulet-modal-img" data-amulet="${id}" src="${a.img}" alt="" onerror="amuletImgFallback(this)">`
        : `<span class="amulet-modal-emoji">${a.icon}</span>`;
    amuletModalNameEl.textContent = a.name;
    amuletModalDescEl.textContent = a.desc;
    let state = '';
    const prog = amuletProgress(id);
    const pTxt = prog ? ` · Recarga: ${prog.cur}/${prog.max}` : '';
    if (id === 'dragon') {
        state = prog && prog.cur >= prog.max
            ? '🐉 ¡Lista para usar esta partida! Pulsa el botón del dragón.'
            : `🐉 Se recarga en ${RELIC_DRAGON_EVERY - (statsData.lopa.relicGames || 0)} partida(s) · Usada ${statsData.lopa.uses.dragon || 0} vez(es)`;
    } else if (id === 'vidente') {
        state = `Cargas: ${statsData.lopa.charges.vidente || 0}/${MAX_CHARGES} · Recarga ${prog.cur}/${prog.max} victorias`;
    } else if (CHARGE_AMULETS[id]) {
        state = `Cargas: ${statsData.lopa.charges[id] || 0}/${MAX_CHARGES}${pTxt}`;
    } else if (a.negative) {
        state = '⚠️ Maldición permanente';
    } else if (id === 'rastreador' && prog) {
        state = `Progreso: ${prog.cur}/${prog.max} turulos`;
    } else if (id === 'subidon') {
        state = `Cargas: ${statsData.lopa.charges.subidon || 0}/${SUBIDON_MAX_CHARGES} · Recarga ${prog.cur}/${prog.max} victorias`;
    } else if (id === 'syntek') {
        const song = (getActiveTrack() && getActiveTrack().id === 'dueleamor');
        state = isAmuletActive(id)
            ? (song ? '🛡️ Activa · ¡Suena "Duele el Amor"! El botón especial está disponible en la partida.' : '🛡️ Activa · Pon "Duele el Amor" en el iPod para usar su botón de inmunidad.')
            : '⛔ Desactivada · Actívala para usar su botón de inmunidad.';
    } else if (id === 'nword') {
        state = '🎵 Da "Hypnotize" al iPod';
    } else if (id === 'charlie') {
        state = '🎵 Da "We Are Charlie Kirk" al iPod';
    }
    amuletModalStateEl.textContent = state;
    if (amuletToggleBtn) {
        if (isAmuletToggleable(id) && !unlock) {
            amuletToggleBtn.classList.remove('hidden');
            amuletToggleBtn.textContent = isAmuletActive(id) ? '⛔ Desactivar' : '✅ Activar';
        } else {
            amuletToggleBtn.classList.add('hidden');
        }
    }
    amuletModalEl.classList.remove('hidden');
}

function closeAmuletModal() {
    amuletModalEl.classList.add('hidden');
    const id = amuletModalEl.dataset.currentId;
    if (id && resultAmuletIds.includes(id) && resultModalEl && !resultModalEl.classList.contains('hidden')) {
        resultAmuletIds = resultAmuletIds.filter(x => x !== id);
        renderResultAmulets();
    }
}

// --- Sugerencias: buzón compartido (llegan al jefe) ---
async function loadSuggestionsList() {
    if (!suggestionsListEl) return;
    let list = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('suggestions')
                .select('username,note,created_at')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            list = data || [];
        } catch (e) {}
    } else {
        try {
            const res = await fetch('/api/suggestions');
            if (res.ok) {
                const d = await res.json();
                list = Array.isArray(d.list) ? d.list : [];
            }
        } catch (e) {}
    }
    if (!list.length) {
        try { list = JSON.parse(localStorage.getItem('buscalopas_suggestions') || '[]'); } catch (e) {}
    }
    suggestionsListEl.innerHTML = list.length
        ? list.map(s => `<div class="sugg-item"><span class="sugg-who">${escapeHtml(s.username || 'anónimo')}</span><span class="sugg-text">${escapeHtml(s.note)}</span></div>`).join('')
        : '<div class="sugg-empty">Todavía no hay sugerencias.</div>';
}

function openSuggestionsModal() {
    closeDropdown();
    if (suggestionsTextareaEl) suggestionsTextareaEl.value = '';
    if (suggestionsListEl) suggestionsListEl.classList.add('hidden');
    // El jefe (Lucifer) ve el buzón completo; el resto solo escribe.
    if (isDeity(getUsername() || '')) {
        if (suggestionsListEl) suggestionsListEl.classList.remove('hidden');
        loadSuggestionsList();
    }
    suggestionsModalEl.classList.remove('hidden');
    setTimeout(() => { if (suggestionsTextareaEl) suggestionsTextareaEl.focus(); }, 50);
}

function setSuggestionsStatus(msg) {
    if (suggestionsStatusEl) {
        suggestionsStatusEl.textContent = msg;
        clearTimeout(suggestionsStatusEl._t);
        suggestionsStatusEl._t = setTimeout(() => { suggestionsStatusEl.textContent = ''; }, 3000);
    }
}

async function sendSuggestion() {
    const note = suggestionsTextareaEl ? suggestionsTextareaEl.value.trim() : '';
    if (!note) {
        setSuggestionsStatus('Escribe algo antes de enviar');
        return;
    }
    const username = getUsername() || 'anónimo';
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('suggestions').insert({ username, note });
            if (error) throw error;
            setSuggestionsStatus('💌 ¡Gracias! Tu sugerencia ha llegado al jefe');
            if (suggestionsTextareaEl) suggestionsTextareaEl.value = '';
            if (isDeity(username)) loadSuggestionsList();
            return;
        } catch (e) {
            setSuggestionsStatus('Sin Supabase: guardando en local');
        }
    }
    try {
        const res = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, note })
        });
        if (!res.ok) throw new Error('sin servidor');
        setSuggestionsStatus('💌 ¡Gracias! Tu sugerencia ha llegado al jefe');
        if (suggestionsTextareaEl) suggestionsTextareaEl.value = '';
    } catch (e) {
        try {
            const list = JSON.parse(localStorage.getItem('buscalopas_suggestions') || '[]');
            list.push({ username, note, created_at: Date.now() });
            localStorage.setItem('buscalopas_suggestions', JSON.stringify(list.slice(-200)));
            setSuggestionsStatus('Guardado solo en local (sin servidor)');
        } catch (e2) {}
    }
}

// --- Amigos y chat ---
let myFriends = [];
let myIncoming = [];
let myOutgoing = [];
let activeChatWith = null;
let chatInConv = false;
const CHAT_READ_KEY = 'buscalopas_chat_read';
let chatPollTimer = null;
let friendsPollTimer = null;
let lastIncomingCount = 0;
let friendsFirstLoad = true;

function apiFetch(url, options) {
    return fetch(url, options).then(async (res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }).catch(() => null);
}

function friendsLocalKey() {
    return 'buscalopas_friends_' + getUsername();
}

function chatLocalKey(a, b) {
    return 'buscalopas_chat_' + [a, b].sort().join('|');
}

function emptyFriendsLocal() {
    return { friends: [], incoming: [], outgoing: [] };
}

function persistFriendsLocal() {
    localStorage.setItem(friendsLocalKey(), JSON.stringify({ friends: myFriends, incoming: myIncoming, outgoing: myOutgoing }));
}

async function userExists(name) {
    const me = getUsername();
    if (!name || name === me) return false;
    if (isDeity(name)) return false;
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('scores').select('name').eq('name', name);
            if (!error && data && data.length) return true;
        } catch (e) {}
    }
    const data = await apiFetch(`/api/user?name=${encodeURIComponent(name)}`);
    return !!(data && data.exists);
}

async function deityAddAllFriends() {
    try {
        const names = await fetchUsedNames();
        for (const n of names) {
            if (n && n !== getUsername() && !isDeity(n) && !myFriends.includes(n)) myFriends.push(n);
        }
    } catch (e) {}
}

async function loadFriends() {
    const name = getUsername();
    if (!name) return;
    const local = JSON.parse(localStorage.getItem(friendsLocalKey()) || 'null') || emptyFriendsLocal();
    if (supabaseClient) {
        try {
            const [fa, fb, incoming, outgoing] = await Promise.all([
                supabaseClient.from('friendships').select('user_a,user_b').eq('user_a', name),
                supabaseClient.from('friendships').select('user_a,user_b').eq('user_b', name),
                supabaseClient.from('friend_requests').select('from_name').eq('to_name', name),
                supabaseClient.from('friend_requests').select('to_name').eq('from_name', name)
            ]);
            if (fa.error) throw fa.error;
            if (fb.error) throw fb.error;
            if (incoming.error) throw incoming.error;
            if (outgoing.error) throw outgoing.error;
            myFriends = [...(fa.data || []).map(r => r.user_b), ...(fb.data || []).map(r => r.user_a)];
            myIncoming = (incoming.data || []).map(r => r.from_name);
            myOutgoing = (outgoing.data || []).map(r => r.to_name);
            persistFriendsLocal();
        } catch (e) {
            myFriends = local.friends || [];
            myIncoming = local.incoming || [];
            myOutgoing = local.outgoing || [];
        }
        if (isDeity(name)) await deityAddAllFriends();
        updateFriendsUI();
        return;
    }
    const data = await apiFetch(`/api/friends?user=${encodeURIComponent(name)}`);
    if (data && Array.isArray(data.friends)) {
        myFriends = data.friends;
        myIncoming = data.incoming || [];
        myOutgoing = data.outgoing || [];
        persistFriendsLocal();
    } else {
        myFriends = local.friends || [];
        myIncoming = local.incoming || [];
        myOutgoing = local.outgoing || [];
    }
    if (isDeity(name)) await deityAddAllFriends();
    updateFriendsUI();
}

function updateFriendsUI() {
    renderChatOpenButton();
    renderBadges();
    renderChatRequests();
    renderRequestsDropdown();
    renderFriendsList();
    renderRequests();
    renderChatFriends();
    const now = myIncoming.length;
    if (friendsFirstLoad) {
        lastIncomingCount = now;
        friendsFirstLoad = false;
    } else if (now > lastIncomingCount && now > 0) {
        showNotification('🔔 ¡Solicitud de amistad!', `${now === 1 ? 'Tienes una nueva solicitud entrante.' : `Tienes ${now} solicitudes entrantes.`}`, 'Ábrela desde el chat o el menú de Amigos.');
    }
    lastIncomingCount = now;
}

async function postFriendAction(friend, action) {
    if (supabaseClient) {
        const me = getUsername();
        try {
            if (action === 'request') {
                const { error } = await supabaseClient
                    .from('friend_requests')
                    .upsert({ from_name: me, to_name: friend }, { onConflict: 'from_name,to_name' });
                if (error) throw error;
            } else if (action === 'accept') {
                const [a, b] = [me, friend].sort();
                const { error: delErr } = await supabaseClient
                    .from('friend_requests')
                    .delete()
                    .eq('from_name', friend)
                    .eq('to_name', me);
                if (delErr) throw delErr;
                const { error: insErr } = await supabaseClient
                    .from('friendships')
                    .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' });
                if (insErr) throw insErr;
            } else if (action === 'decline') {
                const { error } = await supabaseClient
                    .from('friend_requests')
                    .delete()
                    .eq('from_name', friend)
                    .eq('to_name', me);
                if (error) throw error;
            } else if (action === 'cancel') {
                const { error } = await supabaseClient
                    .from('friend_requests')
                    .delete()
                    .eq('from_name', me)
                    .eq('to_name', friend);
                if (error) throw error;
            } else if (action === 'remove') {
                const [a, b] = [me, friend].sort();
                const { error } = await supabaseClient
                    .from('friendships')
                    .delete()
                    .eq('user_a', a)
                    .eq('user_b', b);
                if (error) throw error;
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    const data = await apiFetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: getUsername(), friend, action })
    });
    return !!(data && data.ok);
}

async function addFriend(name) {
    const friend = (name || '').trim().slice(0, 30);
    if (!friend) { showToast('Escribe un nombre primero'); return false; }
    if (!isLoggedIn()) {
        showToast(UI.bloqueoRegistro && UI.bloqueoRegistro.agregar || '🔒 Regístrate con contraseña para agregar amigos');
        return false;
    }
    if (friend === getUsername()) { showToast('Ese eres tú 😅'); return false; }
    const exists = await userExists(friend);
    if (!exists) {
        showToast(`No existe ningún lopero llamado "${friend}" 😕`);
        return false;
    }
    if (myFriends.includes(friend)) { showToast(`${friend} ya es tu amigo`); return false; }
    if (myIncoming.includes(friend)) {
        await acceptFriend(friend);
        return true;
    }
    if (myOutgoing.includes(friend)) { showToast(`Ya enviaste solicitud a ${friend} (pendiente)`); return false; }
    myOutgoing.push(friend);
    persistFriendsLocal();
    const ok = await postFriendAction(friend, 'request');
    if (!ok) {
        myOutgoing = myOutgoing.filter(f => f !== friend);
        persistFriendsLocal();
        updateFriendsUI();
        showToast('⚠️ No se pudo enviar la solicitud (¿hay servidor?)');
        return false;
    }
    updateFriendsUI();
    showToast(`🤝 Solicitud enviada a ${friend}`);
    return true;
}

async function acceptFriend(name) {
    const prev = { incoming: myIncoming.slice(), friends: myFriends.slice() };
    myIncoming = myIncoming.filter(f => f !== name);
    if (!myFriends.includes(name)) myFriends.push(name);
    persistFriendsLocal();
    const ok = await postFriendAction(name, 'accept');
    if (!ok) {
        myIncoming = prev.incoming;
        myFriends = prev.friends;
        persistFriendsLocal();
        updateFriendsUI();
        showToast('⚠️ No se pudo aceptar la solicitud (¿hay servidor?)');
        return;
    }
    updateFriendsUI();
    showToast(`✅ ${name} ahora es tu amigo`);
}

async function declineFriend(name) {
    const prev = myIncoming.slice();
    myIncoming = myIncoming.filter(f => f !== name);
    persistFriendsLocal();
    const ok = await postFriendAction(name, 'decline');
    if (!ok) {
        myIncoming = prev;
        persistFriendsLocal();
        updateFriendsUI();
        showToast('⚠️ No se pudo rechazar la solicitud (¿hay servidor?)');
        return;
    }
    updateFriendsUI();
    showToast(`${name} rechazado`);
}

async function cancelRequest(name) {
    const prev = myOutgoing.slice();
    myOutgoing = myOutgoing.filter(f => f !== name);
    persistFriendsLocal();
    const ok = await postFriendAction(name, 'cancel');
    if (!ok) {
        myOutgoing = prev;
        persistFriendsLocal();
        updateFriendsUI();
        showToast('⚠️ No se pudo cancelar la solicitud (¿hay servidor?)');
        return;
    }
    updateFriendsUI();
    showToast(`Solicitud a ${name} cancelada`);
}

async function removeFriend(name) {
    const prev = myFriends.slice();
    myFriends = myFriends.filter(f => f !== name);
    persistFriendsLocal();
    const ok = await postFriendAction(name, 'remove');
    if (!ok) {
        myFriends = prev;
        persistFriendsLocal();
        updateFriendsUI();
        showToast('⚠️ No se pudo quitar al amigo (¿hay servidor?)');
        return;
    }
    if (activeChatWith === name) activeChatWith = null;
    updateFriendsUI();
    showToast(`${name} ya no es tu amigo`);
}

// --- Reliquia del Dragon Narco (botón usable cada N partidas) ---
function dragonRelicReady() {
    return !!statsData.lopa.owned.dragon && (statsData.lopa.relicGames || 0) >= RELIC_DRAGON_EVERY;
}

// --- Botón especial de la reliquia Syntek (solo si suena "Duele el Amor") ---
function syntekRelicReady() {
    return !!statsData.lopa.owned.syntek &&
        statsData.lopa.active.syntek !== false &&
        !syntekUsedThisGame &&
        getActiveTrack() && getActiveTrack().id === 'dueleamor';
}

function updateRelicDragonButton() {
    if (!relicDragonBtnEl) return;
    const inGame = gameScreen && !gameScreen.classList.contains('hidden');
    relicDragonBtnEl.classList.toggle('hidden', !(inGame && !gameOver && dragonRelicReady()));
    updateRelicSyntekButton();
    positionRelicButton();
}

function updateRelicSyntekButton() {
    if (!relicSyntekBtnEl) return;
    const inGame = gameScreen && !gameScreen.classList.contains('hidden');
    relicSyntekBtnEl.classList.toggle('hidden', !(inGame && !gameOver && syntekRelicReady()));
    positionRelicButton();
}

// Los botones de reliquias (dragón + Syntek) se anclan JUSTO a la derecha del
// tablero. Si están los dos activos, se apilan (uno sobre otro) sin pisarse.
function positionRelicButton() {
    if (!relicDragonBtnEl) return;
    if (window.innerWidth < 768) {
        // En móvil el tablero llena el ancho: se quedan en su sitio CSS
        // (arriba a la izquierda, pequeños y apilados por CSS).
        relicDragonBtnEl.style.left = '';
        relicDragonBtnEl.style.top = '';
        relicDragonBtnEl.style.transform = '';
        if (relicSyntekBtnEl) {
            relicSyntekBtnEl.style.left = '';
            relicSyntekBtnEl.style.top = '';
            relicSyntekBtnEl.style.transform = '';
        }
        return;
    }
    if (!boardEl || boardEl.getBoundingClientRect().width <= 0) return;
    const b = boardEl.getBoundingClientRect();
    const btnH = 86;
    let left = Math.round(b.right + 20);
    if (left + 86 > window.innerWidth - 12) left = window.innerWidth - 86 - 12;
    const top = Math.round(b.top + (b.height - btnH) / 2);
    // Syntek SIEMPRE encima (molesta menos); el dragón debajo. El primero del
    // array es el que se coloca más arriba.
    const visible = [relicSyntekBtnEl, relicDragonBtnEl].filter(el => el && !el.classList.contains('hidden'));
    visible.forEach((el, i) => {
        el.style.left = left + 'px';
        el.style.top = Math.max(90, top + i * 102) + 'px';
        el.style.transform = 'none';
    });
    // Los ocultos no mantienen posición rara.
    [relicDragonBtnEl, relicSyntekBtnEl].filter(el => el && el.classList.contains('hidden')).forEach(el => {
        el.style.left = '';
        el.style.top = '';
        el.style.transform = '';
    });
}

function useRelicDragon() {
    if (!dragonRelicReady() || gameOver) return;
    statsData.lopa.relicGames = 0;
    statsData.lopa.uses.dragon = (statsData.lopa.uses.dragon || 0) + 1;
    addMoney(RELIC_DRAGON_BONUS);
    saveStats();
    updateRelicDragonButton();
    renderHudAmulets();
    showToast('🐉 ¡El Dragon Narco te echa un cable! +50€', 'spiz');
}

// 3 segundos de inmunidad: puedes tocar cualquier casilla sin consecuencias
// negativas (las cosas se revelan, pero NO se pierde, NO se gasta el Milagro
// ni ningún objeto especial, y NO cuenta para estadísticas).
let syntekImmunityUntil = 0;
let syntekImmunityTimer = null;

function syntekImmunityActive() {
    return Date.now() < syntekImmunityUntil;
}

function useRelicSyntek() {
    if (!syntekRelicReady() || gameOver) return;
    syntekUsedThisGame = true;
    syntekImmunityUntil = Date.now() + SYNTEK_IMMUNITY_MS;
    document.body.classList.add('syntek-immunity');
    if (syntekImmunityTimer) clearTimeout(syntekImmunityTimer);
    syntekImmunityTimer = setTimeout(() => {
        document.body.classList.remove('syntek-immunity');
    }, SYNTEK_IMMUNITY_MS);
    statsData.lopa.uses.syntek = (statsData.lopa.uses.syntek || 0) + 1;
    saveStats();
    updateRelicSyntekButton();
    showToast('🛡️ ¡Inmunidad Syntek! 3 segundos sin miedo a las bolsas.', 'spiz');
}

async function searchUsers(q) {
    const term = (q || '').trim().toLowerCase();
    const names = new Set();
    const server = await apiFetch(`/api/search?q=${encodeURIComponent(term)}`);
    if (server && Array.isArray(server.names)) {
        server.names.forEach(n => names.add(n));
    }
    if (supabaseClient && term) {
        try {
            const { data, error } = await supabaseClient
                .from('scores')
                .select('name')
                .ilike('name', `%${term}%`);
            if (!error && data) data.forEach(r => { if (!isDeity(r.name)) names.add(r.name); });
        } catch (e) {}
    }
    return [...names].filter(n => n !== getUsername() && !isDeity(n)).sort().slice(0, 30);
}

async function openFriendsModal() {
    if (!isLoggedIn()) {
        showToast(UI.bloqueoRegistro && UI.bloqueoRegistro.amigos || '🔒 Regístrate con contraseña para usar Amigos');
        return;
    }
    await loadFriends();
    selectedFriend = null;
    hideConfirmBubble();
    switchFriendsTab('list');
    friendsModalEl.classList.remove('hidden');
    closeDropdown();
}

function switchFriendsTab(tab) {
    if (!friendsTabsEl) return;
    for (const t of friendsTabsEl) {
        t.classList.toggle('friends-tab-active', t.dataset.tab === tab);
    }
    const sections = {
        list: friendsListEl,
        requests: friendsRequestsEl,
        add: friendsAddInputEl ? friendsAddInputEl.closest('.friends-section') : null,
        search: friendsSearchInputEl ? friendsSearchInputEl.closest('.friends-section') : null
    };
    for (const [key, el] of Object.entries(sections)) {
        if (el) el.classList.toggle('hidden', key !== tab);
    }
    if (tab === 'requests') renderRequests();
    if (tab === 'search' && friendsSearchInputEl) friendsSearchInputEl.focus();
}

let selectedFriend = null;

function renderFriendsList() {
    if (!friendsNavEl) return;
    if (!myFriends.length) {
        friendsNavEl.innerHTML = '<div class="friends-empty">Aún no tienes amigos 🤷</div>';
        if (friendsDetailEl) friendsDetailEl.classList.add('hidden');
        selectedFriend = null;
        return;
    }
    if (selectedFriend && !myFriends.includes(selectedFriend)) selectedFriend = null;
    friendsNavEl.innerHTML = myFriends.map(f =>
        `<button class="friends-nav-btn${f === selectedFriend ? ' friends-nav-active' : ''}" type="button" data-name="${escapeHtml(f)}">
            <span class="friend-name">👤 ${escapeHtml(f)}</span>
        </button>`).join('');
    if (selectedFriend) {
        renderFriendsDetail(selectedFriend);
    } else if (friendsDetailEl) {
        friendsDetailEl.classList.add('hidden');
    }
}

function renderFriendsDetail(name) {
    if (!friendsDetailNameEl || !friendsDetailEl) return;
    friendsDetailNameEl.textContent = name;
    friendsDetailEl.classList.remove('hidden');
}

function selectFriendDetail(name) {
    selectedFriend = name;
    renderFriendsList();
    renderFriendsDetail(name);
}

function hideConfirmBubble() {
    if (confirmBubbleEl) confirmBubbleEl.classList.add('hidden');
    confirmBubbleCb = null;
}

let confirmBubbleCb = null;

function showConfirmBubble(msg, onYes) {
    if (!confirmBubbleEl || !confirmBubbleMsgEl) return;
    confirmBubbleMsgEl.textContent = msg;
    confirmBubbleCb = onYes;
    confirmBubbleEl.classList.remove('hidden');
}

function renderRequests() {
    if (!friendsRequestsEl) return;
    let html = '';
    if (myIncoming.length) {
        html += '<div class="friends-subtitle">📥 Solicitudes entrantes</div>';
        html += myIncoming.map(n =>
            `<div class="friend-row friend-incoming">
                <span class="friend-name">👤 ${escapeHtml(n)} quiere ser tu amigo</span>
                <div class="friend-actions">
                    <button class="btn-secondary friend-accept" type="button" data-name="${escapeHtml(n)}">✅</button>
                    <button class="btn-secondary friend-decline" type="button" data-name="${escapeHtml(n)}">✕</button>
                </div>
            </div>`).join('');
    }
    if (myOutgoing.length) {
        html += '<div class="friends-subtitle">📤 Solicitudes enviadas</div>';
        html += myOutgoing.map(n =>
            `<div class="friend-row friend-outgoing">
                <span class="friend-name">👤 ${escapeHtml(n)} (pendiente)</span>
                <div class="friend-actions">
                    <button class="btn-secondary friend-cancel" type="button" data-name="${escapeHtml(n)}">↩</button>
                </div>
            </div>`).join('');
    }
    if (!html) {
        html = '<div class="friends-empty">No hay solicitudes pendientes</div>';
    }
    friendsRequestsEl.innerHTML = html;
}

function renderSearchResults(names) {
    if (!friendsSearchResultsEl) return;
    if (!names.length) {
        friendsSearchResultsEl.innerHTML = '<div class="friends-empty">Sin resultados</div>';
        return;
    }
    friendsSearchResultsEl.innerHTML = names.map(n =>
        `<div class="friend-row">
            <span class="friend-name">👤 ${escapeHtml(n)}</span>
            ${myFriends.includes(n)
                ? '<span class="friend-yes">✓ Amigo</span>'
                : myOutgoing.includes(n)
                    ? '<span class="friend-yes">⏳ Pendiente</span>'
                    : myIncoming.includes(n)
                        ? '<span class="friend-yes">📥 Te ha invitado</span>'
                        : `<button class="btn-secondary friend-add" type="button" data-name="${escapeHtml(n)}">➕ Agregar</button>`}
        </div>`).join('');
}

async function openPlayerModal(name) {
    if (name === getUsername()) { openInfoModal(); return; }
    if (!name) return;
    playerNameEl.textContent = name;
    let data = null;
    try { data = await fetchPlayerData(name); } catch (e) {}
    let info = '';
    if (data && data.total !== null && data.total !== undefined) {
        const total = data.total || 0;
        let stats = data.stats;
        if (typeof stats === 'string') {
            try { stats = JSON.parse(stats); } catch (e) { stats = null; }
        }
        info = `<div class="player-stat">💰 Total: ${formatMoney(total)}€</div>`;
        if (stats && typeof stats === 'object') {
            info += `<div class="player-stat">🎮 Partidas: ${stats.games || 0}</div>`;
            info += `<div class="player-stat">🏆 Victorias: ${stats.wins || 0}</div>`;
        }
    } else {
        info = '<div class="player-stat">Sin datos guardados todavía</div>';
    }
    playerInfoEl.innerHTML = info;
    if (!isLoggedIn()) {
        playerAddFriendBtn.textContent = UI.bloqueoRegistro && UI.bloqueoRegistro.agregarRanking || '🔒 Regístrate con contraseña para agregar';
        playerAddFriendBtn.disabled = true;
        delete playerModalEl.dataset.accept;
    } else if (myFriends.includes(name)) {
        playerAddFriendBtn.textContent = '✓ Ya es tu amigo';
        playerAddFriendBtn.disabled = true;
    } else if (myOutgoing.includes(name)) {
        playerAddFriendBtn.textContent = '⏳ Solicitud pendiente';
        playerAddFriendBtn.disabled = true;
    } else if (myIncoming.includes(name)) {
        playerAddFriendBtn.textContent = '✅ Aceptar solicitud';
        playerAddFriendBtn.disabled = false;
        playerModalEl.dataset.accept = name;
    } else {
        playerAddFriendBtn.textContent = '➕ Agregar como amigo';
        playerAddFriendBtn.disabled = false;
        delete playerModalEl.dataset.accept;
    }
    playerModalEl.classList.remove('hidden');
}

// --- Chat (abajo a la izquierda) ---
function renderChatOpenButton() {
    if (!chatOpenBtn) return;
    chatOpenBtn.classList.toggle('hidden', !isLoggedIn());
    if (requestsOpenBtn) requestsOpenBtn.classList.toggle('hidden', !isLoggedIn());
}

function toggleRankingPanel() {
    if (!rankingPanelEl) return;
    const open = rankingPanelEl.classList.toggle('ranking-open');
    if (open) {
        rankingPanelEl.scrollTop = 0;
        closeMobilePanels('ranking');
    }
}

// En móvil solo puede haber un "globo" abierto (chat / amigos / ranking /
// panel de LopAmuletos): al abrir uno se cierran los demás.
function closeMobilePanels(except) {
    if (except !== 'chat' && chatPanelEl && !chatPanelEl.classList.contains('hidden')) closeChatPanel();
    if (except !== 'requests' && requestsDropdownEl && !requestsDropdownEl.classList.contains('hidden')) requestsDropdownEl.classList.add('hidden');
    if (except !== 'ranking' && rankingPanelEl && rankingPanelEl.classList.contains('ranking-open')) rankingPanelEl.classList.remove('ranking-open');
    if (except !== 'amulets') closeHudAmuletsPanel();
}

function renderBadges() {
    const req = myIncoming.length;
    if (requestsBadgeEl) {
        requestsBadgeEl.textContent = req;
        requestsBadgeEl.classList.toggle('hidden', req === 0);
    }
    const unread = totalUnread();
    if (chatBadgeEl) {
        chatBadgeEl.textContent = unread;
        chatBadgeEl.classList.toggle('hidden', unread === 0);
    }
}

function totalUnread() {
    const me = getUsername();
    if (!me) return 0;
    let n = 0;
    for (const f of myFriends) n += computeUnread(f);
    if (!isDeity(me)) n += computeUnread('Lucifer');
    n += broadcastUnread();
    return n;
}

function renderRequestsDropdown() {
    if (!requestsListEl) return;
    let html = '';
    if (myFriends.length) {
        html += '<div class="friends-subtitle">👥 Amigos</div>';
        html += myFriends.map(n =>
            `<button class="friend-row dd-friend" type="button" data-name="${escapeHtml(n)}">
                <span class="friend-name">👤 ${escapeHtml(n)}</span>
                <span class="friend-yes">💬</span>
            </button>`).join('');
    }
    if (myIncoming.length) {
        html += '<div class="friends-subtitle">📥 Solicitudes entrantes</div>';
        html += myIncoming.map(n =>
            `<div class="friend-row friend-incoming">
                <span class="friend-name">👤 ${escapeHtml(n)} quiere ser tu amigo</span>
                <div class="friend-actions">
                    <button class="btn-secondary friend-accept" type="button" data-name="${escapeHtml(n)}">✅</button>
                    <button class="btn-secondary friend-decline" type="button" data-name="${escapeHtml(n)}">✕</button>
                </div>
            </div>`).join('');
    }
    if (myOutgoing.length) {
        html += '<div class="friends-subtitle">📤 Solicitudes enviadas</div>';
        html += myOutgoing.map(n =>
            `<div class="friend-row friend-outgoing">
                <span class="friend-name">👤 ${escapeHtml(n)} (pendiente)</span>
                <div class="friend-actions">
                    <button class="btn-secondary friend-cancel" type="button" data-name="${escapeHtml(n)}">↩</button>
                </div>
            </div>`).join('');
    }
    if (!html) {
        html = '<div class="friends-empty">Aún no tienes amigos ni solicitudes ✨</div>';
    }
    requestsListEl.innerHTML = html;
}

async function toggleRequestsDropdown() {
    if (!isLoggedIn()) return;
    await loadFriends();
    if (requestsDropdownEl.classList.contains('hidden')) {
        closeMobilePanels('requests');
        renderRequestsDropdown();
        requestsDropdownEl.classList.remove('hidden');
    } else {
        requestsDropdownEl.classList.add('hidden');
    }
}

function renderChatRequests() {
    if (!chatRequestsEl) return;
    if (!myIncoming.length) {
        chatRequestsEl.classList.add('hidden');
        chatRequestsEl.innerHTML = '';
        return;
    }
    chatRequestsEl.classList.remove('hidden');
    chatRequestsEl.innerHTML = `<div class="chat-requests-title">🔔 ${myIncoming.length} solicitud${myIncoming.length > 1 ? 'es' : ''} de amistad</div>` +
        myIncoming.map(n =>
            `<div class="friend-row friend-incoming chat-req">
                <span class="friend-name">👤 ${escapeHtml(n)} quiere ser tu amigo</span>
                <div class="friend-actions">
                    <button class="btn-secondary friend-accept" type="button" data-name="${escapeHtml(n)}">✅</button>
                    <button class="btn-secondary friend-decline" type="button" data-name="${escapeHtml(n)}">✕</button>
                </div>
            </div>`).join('');
}

async function toggleChatPanel() {
    if (!isLoggedIn()) {
        showToast(UI.bloqueoRegistro && UI.bloqueoRegistro.chat || '🔒 Regístrate con contraseña para usar el chat');
        return;
    }
    if (!chatPanelEl.classList.contains('hidden')) {
        closeChatPanel();
        return;
    }
    closeMobilePanels('chat');
    await loadFriends();
    if (requestsDropdownEl) requestsDropdownEl.classList.add('hidden');
    chatPanelEl.classList.remove('hidden');
    document.body.classList.add('chat-open');
    renderChatView();
    renderChatFriends();
    refreshChatListUnread().then(() => renderChatFriends());
    startChatPolling();
    setTimeout(() => { if (chatInConv && activeChatWith && chatInputEl) chatInputEl.focus(); }, 50);
}

function closeChatPanel() {
    chatPanelEl.classList.add('hidden');
    document.body.classList.remove('chat-open');
    stopChatPolling();
    activeChatWith = null;
    chatInConv = false;
}

function startChatPolling() {
    stopChatPolling();
    chatPollTimer = setInterval(() => {
        if (chatPanelEl.classList.contains('hidden')) return;
        if (chatInConv && activeChatWith) {
            refreshChat().then(renderChatFriends);
        } else {
            refreshChatListUnread().then(renderChatFriends);
        }
    }, 3000);
}

function stopChatPolling() {
    if (chatPollTimer) {
        clearInterval(chatPollTimer);
        chatPollTimer = null;
    }
}

function renderChatView() {
    const inConv = !!(chatInConv && activeChatWith);
    const isBroadcast = activeChatWith === BROADCAST_KEY;
    if (chatBackBtn) chatBackBtn.classList.toggle('hidden', !inConv);
    if (chatTitleEl) chatTitleEl.textContent = inConv ? chatTitleFor(activeChatWith) : '💬 Chat';
    if (chatFriendsEl) chatFriendsEl.classList.toggle('hidden', inConv);
    if (chatViewEl) chatViewEl.classList.toggle('hidden', !inConv);
    if (chatInputRowEl) chatInputRowEl.classList.toggle('hidden', isBroadcast && !isDeity(getUsername()));
    if (inConv) renderChatMessages([]);
}

function chatTitleFor(name) {
    if (name === BROADCAST_KEY) return '📢 Avisos de Lucifer';
    if (isDeity(name)) return '😈 Lucifer';
    return name;
}

function getChatReadTs(friend) {
    try {
        const map = JSON.parse(localStorage.getItem(CHAT_READ_KEY) || '{}');
        return map[friend] || 0;
    } catch (e) { return 0; }
}

function setChatReadTs(friend, ts) {
    try {
        const map = JSON.parse(localStorage.getItem(CHAT_READ_KEY) || '{}');
        map[friend] = ts;
        localStorage.setItem(CHAT_READ_KEY, JSON.stringify(map));
    } catch (e) {}
}

function computeUnread(friend) {
    const me = getUsername();
    const msgs = JSON.parse(localStorage.getItem(chatLocalKey(me, friend)) || '[]');
    const readTs = getChatReadTs(friend);
    return msgs.filter(m => m && m.from === friend && m.ts > readTs).length;
}

async function refreshChatListUnread() {
    if (!chatPanelEl || chatPanelEl.classList.contains('hidden')) return;
    for (const f of myFriends) await loadChat(f);
    await loadBroadcast();
}

function broadcastUnread() {
    const msgs = JSON.parse(localStorage.getItem('buscalopas_broadcast') || '[]');
    const readTs = getChatReadTs(BROADCAST_KEY);
    return msgs.filter(m => m && m.ts > readTs).length;
}

function renderChatFriends() {
    if (!chatFriendsEl) return;
    const me = getUsername();
    const bcUnread = broadcastUnread();
    const activeBc = chatInConv && activeChatWith === BROADCAST_KEY;
    let extra = `<button class="chat-friend${activeBc ? ' chat-friend-active' : ''}" type="button" data-name="${BROADCAST_KEY}">
        <span class="chat-friend-name">📢 Avisos de Lucifer</span>${bcUnread > 0 ? `<span class="chat-friend-unread">${bcUnread}</span>` : ''}
    </button>`;
    if (!isDeity(me)) {
        const unreadL = computeUnread('Lucifer');
        const activeL = chatInConv && activeChatWith === 'Lucifer';
        extra += `<button class="chat-friend${activeL ? ' chat-friend-active' : ''}" type="button" data-name="Lucifer">
            <span class="chat-friend-name">😈 Lucifer</span>${unreadL > 0 ? `<span class="chat-friend-unread">${unreadL}</span>` : ''}
        </button>`;
    }
    if (!myFriends.length) {
        chatFriendsEl.innerHTML = extra + '<div class="chat-nofriends">Añade amigos primero 🤝</div>';
        return;
    }
    chatFriendsEl.innerHTML = extra + myFriends.map(f => {
        const unread = computeUnread(f);
        const active = chatInConv && activeChatWith === f;
        return `<button class="chat-friend${active ? ' chat-friend-active' : ''}" type="button" data-name="${escapeHtml(f)}">
            <span class="chat-friend-name">👤 ${escapeHtml(f)}</span>
            ${unread > 0 ? `<span class="chat-friend-unread">${unread}</span>` : ''}
        </button>`;
    }).join('');
}

async function openChatWith(name) {
    activeChatWith = name;
    chatInConv = true;
    if (chatPanelEl.classList.contains('hidden')) {
        chatPanelEl.classList.remove('hidden');
        document.body.classList.add('chat-open');
        await loadFriends();
    }
    renderChatView();
    await refreshChat();
    setChatReadTs(name, Date.now());
    renderChatFriends();
    renderChatRequests();
    startChatPolling();
    setTimeout(() => chatInputEl && chatInputEl.focus(), 50);
}

function goChatList() {
    activeChatWith = null;
    chatInConv = false;
    renderChatView();
    renderChatFriends();
    refreshChatListUnread().then(() => renderChatFriends());
}

function renderChatMessages(messages) {
    if (!chatMessagesEl) return;
    if (!activeChatWith) {
        chatMessagesEl.innerHTML = '<div class="chat-nofriends">Selecciona un amigo para hablar 💬</div>';
        return;
    }
    const me = getUsername();
    if (!messages.length) {
        chatMessagesEl.innerHTML = activeChatWith === BROADCAST_KEY
            ? '<div class="chat-nofriends">Sin avisos todavía</div>'
            : `<div class="chat-nofriends">Sin mensajes con ${escapeHtml(chatTitleFor(activeChatWith))} todavía</div>`;
        return;
    }
    chatMessagesEl.innerHTML = messages.map(m =>
        `<div class="chat-msg ${m.from === me ? 'chat-msg-me' : 'chat-msg-other'}">
            <span class="chat-msg-name">${escapeHtml(m.from)}</span>
            <span class="chat-msg-text">${escapeHtml(m.text)}</span>
        </div>`).join('');
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function mergeMessages(a, b) {
    const map = new Map();
    for (const m of [...a, ...b]) {
        if (m && m.text) map.set(`${m.from}|${m.text}|${m.ts}`, m);
    }
    return [...map.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0));
}

async function loadChat(withName) {
    const name = getUsername();
    if (!name) return [];
    if (withName === BROADCAST_KEY) return loadBroadcast();
    const local = JSON.parse(localStorage.getItem(chatLocalKey(name, withName)) || '[]');
    if (supabaseClient) {
        try {
            const [d1, d2] = await Promise.all([
                supabaseClient.from('chat_messages')
                    .select('user_from,user_to,text,created_at')
                    .eq('user_from', name).eq('user_to', withName)
                    .order('created_at', { ascending: true }).limit(200),
                supabaseClient.from('chat_messages')
                    .select('user_from,user_to,text,created_at')
                    .eq('user_from', withName).eq('user_to', name)
                    .order('created_at', { ascending: true }).limit(200)
            ]);
            if (d1.error) throw d1.error;
            if (d2.error) throw d2.error;
            const rows = [...(d1.data || []), ...(d2.data || [])].sort((x, y) => x.created_at - y.created_at);
            const remote = rows.map(r => ({ from: r.user_from, text: r.text, ts: r.created_at }));
            const merged = mergeMessages(remote, local);
            localStorage.setItem(chatLocalKey(name, withName), JSON.stringify(merged));
            return merged;
        } catch (e) {
            return local;
        }
    }
    const data = await apiFetch(`/api/chat?user=${encodeURIComponent(name)}&with=${encodeURIComponent(withName)}`);
    if (data && Array.isArray(data.messages)) {
        const merged = mergeMessages(data.messages, local);
        localStorage.setItem(chatLocalKey(name, withName), JSON.stringify(merged));
        return merged;
    }
    return local;
}

async function loadBroadcast() {
    const local = JSON.parse(localStorage.getItem('buscalopas_broadcast') || '[]');
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('chat_messages')
                .select('user_from,text,created_at')
                .eq('user_to', BROADCAST_KEY)
                .order('created_at', { ascending: true })
                .limit(200);
            if (error) throw error;
            const remote = (data || []).map(r => ({ from: r.user_from, text: r.text, ts: r.created_at }));
            const merged = mergeMessages(remote, local);
            localStorage.setItem('buscalopas_broadcast', JSON.stringify(merged));
            return merged;
        } catch (e) {
            return local;
        }
    }
    const data = await apiFetch('/api/chat/broadcast');
    const remote = (data && Array.isArray(data.messages)) ? data.messages : [];
    const merged = mergeMessages(remote, local);
    localStorage.setItem('buscalopas_broadcast', JSON.stringify(merged));
    return merged;
}

async function refreshChat() {
    if (!activeChatWith) return;
    const messages = await loadChat(activeChatWith);
    if (chatInConv) setChatReadTs(activeChatWith, Date.now());
    renderChatMessages(messages);
}

const CHAT_MAX_LEN = 500;
const CHAT_MIN_INTERVAL_MS = 1200;
let lastChatSendAt = 0;

async function sendChatMessage() {
    const text = chatInputEl.value.trim();
    if (!text || !activeChatWith || !getUsername()) return;
    if (text.length > CHAT_MAX_LEN) {
        showToast(`📵 Mensaje demasiado largo (máx ${CHAT_MAX_LEN} caracteres)`);
        return;
    }
    const now = Date.now();
    if (now - lastChatSendAt < CHAT_MIN_INTERVAL_MS) {
        showToast('📵 Un momento entre mensaje y mensaje…');
        return;
    }
    lastChatSendAt = now;
    if (activeChatWith === BROADCAST_KEY) {
        await sendBroadcastMessage(text);
        return;
    }
    chatInputEl.value = '';
    const local = JSON.parse(localStorage.getItem(chatLocalKey(getUsername(), activeChatWith)) || '[]');
    local.push({ from: getUsername(), text, ts: Date.now() });
    localStorage.setItem(chatLocalKey(getUsername(), activeChatWith), JSON.stringify(local));
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('chat_messages').insert({
                user_from: getUsername(), user_to: activeChatWith, text, created_at: Date.now()
            });
            if (error) throw error;
        } catch (e) {}
    } else {
        await apiFetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: getUsername(), with: activeChatWith, text })
        });
    }
    await refreshChat();
}

async function sendBroadcastMessage(text) {
    if (text.length > CHAT_MAX_LEN) {
        showToast(`📵 Mensaje demasiado largo (máx ${CHAT_MAX_LEN} caracteres)`);
        return;
    }
    const now = Date.now();
    if (now - lastChatSendAt < CHAT_MIN_INTERVAL_MS) {
        showToast('📵 Un momento entre mensaje y mensaje…');
        return;
    }
    lastChatSendAt = now;
    chatInputEl.value = '';
    const local = JSON.parse(localStorage.getItem('buscalopas_broadcast') || '[]');
    local.push({ from: getUsername(), text, ts: Date.now() });
    localStorage.setItem('buscalopas_broadcast', JSON.stringify(local));
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('chat_messages').insert({
                user_from: getUsername(), user_to: BROADCAST_KEY, text, created_at: Date.now()
            });
            if (error) throw error;
        } catch (e) {}
    } else {
        await apiFetch('/api/chat/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: getUsername(), text, pass: getPassHash(getUsername()) })
        });
    }
    await refreshChat();
}

function startFriendsPolling() {
    stopFriendsPolling();
    friendsPollTimer = setInterval(async () => {
        if (getUsername() && isLoggedIn()) {
            await loadFriends();
            if (Date.now() - lastRealtimeEvent > 30000) await refreshAllUnread();
        }
    }, 10000);
}

function stopFriendsPolling() {
    if (friendsPollTimer) {
        clearInterval(friendsPollTimer);
        friendsPollTimer = null;
    }
}

// --- Tiempo real: badges y sonido al recibir mensajes/solicitudes ---
let sfxCtx = null;
function playMessageSound() {
    try {
        if (isMuted || parseFloat(volumeSlider.value || '0') <= 0) return;
        sfxCtx = sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (sfxCtx.state === 'suspended') sfxCtx.resume();
        const ctx = sfxCtx;
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(932, t0);
        osc.frequency.setValueAtTime(1245, t0 + 0.1);
        const vol = Math.max(parseFloat(volumeSlider.value || '0.4'), 0.05);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.12 * vol, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.38);
    } catch (e) {}
}

// Sonido corto de notificaciones/desbloqueos (toasts, tienda, regalos).
function playUiSound() {
    try {
        if (isMuted || parseFloat(volumeSlider.value || '0') <= 0) return;
        sfxCtx = sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (sfxCtx.state === 'suspended') sfxCtx.resume();
        const ctx = sfxCtx;
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(660, t0);
        osc.frequency.setValueAtTime(880, t0 + 0.06);
        const vol = Math.max(parseFloat(volumeSlider.value || '0.4'), 0.05);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.08 * vol, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.2);
    } catch (e) {}
}

function vibrate(pattern) {
    if (!('vibrate' in navigator)) return;
    try { navigator.vibrate(pattern); } catch (e) {}
}

let realtimeChannel = null;
let realtimeActive = false;
let lastRealtimeEvent = 0;
function startRealtime() {
    stopRealtime();
    if (!supabaseClient || !getUsername()) return;
    try {
        realtimeChannel = supabaseClient.channel('buscalopas-live-' + getUsername());
        realtimeChannel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                lastRealtimeEvent = Date.now();
                handleRealtimeMessage((payload && payload.new) || {});
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, () => {
                lastRealtimeEvent = Date.now();
                loadFriends();
                playMessageSound();
            })
            .subscribe((status) => {
                realtimeActive = status === 'SUBSCRIBED';
            });
    } catch (e) {
        realtimeActive = false;
    }
}

function stopRealtime() {
    if (realtimeChannel && supabaseClient) {
        try { supabaseClient.removeChannel(realtimeChannel); } catch (e) {}
    }
    realtimeChannel = null;
    realtimeActive = false;
}

function syncRealtime() {
    if (getUsername() && isLoggedIn() && supabaseClient) startRealtime();
    else stopRealtime();
}

function handleRealtimeMessage(row) {
    const me = getUsername();
    if (!me || !row || !row.text || !row.user_from || row.user_from === me) return;
    const kind = row.user_to === BROADCAST_KEY ? 'broadcast' : 'chat';
    const from = row.user_from;
    const key = kind === 'broadcast' ? 'buscalopas_broadcast' : chatLocalKey(me, from);
    const msgs = JSON.parse(localStorage.getItem(key) || '[]');
    const ts = row.created_at || Date.now();
    if (!msgs.some(m => m && m.from === from && m.ts === ts && m.text === row.text)) {
        msgs.push({ from, text: row.text, ts });
        localStorage.setItem(key, JSON.stringify(msgs));
    }
    renderBadges();
    playMessageSound();
    if (chatPanelEl && !chatPanelEl.classList.contains('hidden')) {
        if (chatInConv && activeChatWith && (activeChatWith === from || (kind === 'broadcast' && activeChatWith === BROADCAST_KEY))) {
            refreshChat();
        } else {
            renderChatFriends();
        }
    }
}

async function refreshAllUnread() {
    if (!getUsername()) return;
    for (const f of myFriends) await loadChat(f);
    if (!isDeity(getUsername())) await loadChat('Lucifer');
    await loadBroadcast();
    renderBadges();
    renderChatFriends();
}

function revealArea(centerR, centerC, radius) {
    let revealedCount = 0;
    for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
            const r = centerR + dr;
            const c = centerC + dc;
            if (r < 0 || r >= size || c < 0 || c >= size) continue;
            if (revealed[r][c] || turulos[r][c]) continue;
            if (spizCell && spizCell.r === r && spizCell.c === c && !spizTriggered) continue;
            if (mines.some(m => m.r === r && m.c === c)) continue;
            revealed[r][c] = true;
            safeCellsRemaining--;
            revealedCount++;
        }
    }
    return revealedCount;
}

function spizRevealLevel() {
    const s = statsData.spizSaved || 0;
    let lvl = 0;
    for (let i = 0; i < SPIZ_REVEAL_THRESHOLDS.length; i++) {
        if (s >= SPIZ_REVEAL_THRESHOLDS[i]) lvl = i + 1;
    }
    return lvl;
}

function handleCorrectFlagReveal(r, c) {
    const ct = statsData.correctTurulos;
    if (isAmuletActive('rastreador') && (ct - amuletBaseline('rastreador')) % RASTREADOR_EVERY === 0) {
        const revealed = revealArea(r, c, 1);
        if (revealed > 0) {
            playUiSound();
            showNotification('🎯 ¡Amuleto del Rastreador!',
                'Has revelado la zona alrededor de la bolsa.',
                `${ct} bolsas marcadas en total`);
        }
    }
}

function settleGameCounters() {
    const ct = statsData.correctTurulos || 0;
    const start = gameStartCorrectTurulos || 0;
    if (statsData.lopa.owned.milagro) {
        const base = amuletBaseline('milagro');
        const n = Math.floor((ct - base) / MILAGRO_RECHARGE_EVERY) - Math.floor((start - base) / MILAGRO_RECHARGE_EVERY);
        for (let i = 0; i < n; i++) rechargeMilagro();
    }
    if (statsData.lopa.owned.ultimobaile) {
        const base = amuletBaseline('ultimobaile');
        const n = Math.floor((ct - base) / ULTIMOBAILE_RECHARGE_EVERY) - Math.floor((start - base) / ULTIMOBAILE_RECHARGE_EVERY);
        for (let i = 0; i < n; i++) rechargeUltimoBaile();
    }
    if (statsData.lopa.owned.vidente) {
        const w = statsData.wins || 0;
        const wstart = gameStartWins || 0;
        const base = amuletBaseline('vidente');
        const n = Math.floor((w - base) / VIDENTE_RECHARGE_EVERY) - Math.floor((wstart - base) / VIDENTE_RECHARGE_EVERY);
        for (let i = 0; i < n; i++) rechargeVidente();
    }
    if (statsData.lopa.owned.subidon) {
        const w = statsData.wins || 0;
        const wstart = gameStartWins || 0;
        const base = amuletBaseline('subidon');
        const n = Math.floor((w - base) / SUBIDON_RECHARGE_EVERY) - Math.floor((wstart - base) / SUBIDON_RECHARGE_EVERY);
        for (let i = 0; i < n; i++) rechargeSubidon();
    }
    hudCorrectTurulos = ct;
    renderHudAmulets();
}

function rechargeVidente() {
    const c = statsData.lopa.charges.vidente || 0;
    if (c >= MAX_CHARGES) return;
    statsData.lopa.charges.vidente = c + 1;
    saveStats();
    renderHudAmulets();
}

function rechargeSubidon() {
    const c = statsData.lopa.charges.subidon || 0;
    if (c >= SUBIDON_MAX_CHARGES) return;
    statsData.lopa.charges.subidon = c + 1;
    saveStats();
    renderHudAmulets();
}

function updateDifficultyOptions() {
    if (!qualitySelect) return;
    const medio = qualitySelect.querySelector('option[value="0.10-120"]');
    const chami = qualitySelect.querySelector('option[value="0.14-60"]');
    if (!medio || !chami) return;
    const medioUnlocked = (statsData.wins || 0) >= 1;
    const chamiOwned = !!statsData.lopa.owned.chami;
    medio.disabled = !medioUnlocked;
    chami.disabled = !chamiOwned;
    const optMedio = (TX.dificultades && TX.dificultades['0.10-120'] && TX.dificultades['0.10-120'].option) || 'Javi Taxi (Media)';
    const optChami = (TX.dificultades && TX.dificultades['0.14-60'] && TX.dificultades['0.14-60'].option) || 'Chami CC (Difícil)';
    medio.textContent = medioUnlocked ? optMedio : optMedio + ' 🔒';
    chami.textContent = chamiOwned ? optChami : optChami + ' 🔒';
    const v = qualitySelect.value;
    if ((v === '0.10-120' && !medioUnlocked) || (v === '0.14-60' && !chamiOwned)) {
        qualitySelect.value = '0.06-180';
    }
}

function updateSizeOptions() {
    if (!quantitySelect) return;
    const s14 = quantitySelect.querySelector('option[value="14"]');
    const s18 = quantitySelect.querySelector('option[value="18"]');
    if (!s14 || !s18) return;
    const o14 = !!statsData.lopa.owned.board15;
    const o18 = !!statsData.lopa.owned.board20;
    s14.disabled = !o14;
    s18.disabled = !o18;
    const opt14 = (TX.cantidades && TX.cantidades['14']) || 'Rayina (14x14)';
    const opt18 = (TX.cantidades && TX.cantidades['18']) || 'Pollo (18x18)';
    s14.textContent = o14 ? opt14 : opt14 + ' 🔒';
    s18.textContent = o18 ? opt18 : opt18 + ' 🔒';
    const v = quantitySelect.value;
    if ((v === '14' && !o14) || (v === '18' && !o18)) quantitySelect.value = '9';
}

function renderShopButton() {
    if (hudShopBtn) hudShopBtn.classList.toggle('hidden', !statsData.lopa.shopUnlocked);
    if (hudMoneyBtn) hudMoneyBtn.classList.toggle('hud-money-shop', !!statsData.lopa.shopUnlocked);
    const menuDealer = document.getElementById('menu-dealer-btn');
    if (menuDealer) menuDealer.classList.toggle('hidden', !statsData.lopa.shopUnlocked);
}

function checkShopUnlock(notify = true) {
    if (statsData.lopa.shopUnlocked) {
        renderShopButton();
        return true;
    }
    const wins = statsData.wins || 0;
    const played = statsData.timePlayed || 0;
    if (wins >= SHOP_WINS_REQ || played >= SHOP_TIME_REQ) {
        statsData.lopa.shopUnlocked = true;
        saveStats();
        renderShopButton();
        if (notify) {
            playUiSound();
            showNotification(
                '🐉 ¡TIENDA DESBLOQUEADA!',
                'El Dragon Narco de Ojos Azules, el dealer de los dealers, pone su tienda a tu disposición.',
                'Stock rotativo diario, mejoras y desbloqueos. Ojos azules, cartera llena.',
                'spiz',
                { label: '🛒 ¡A la tienda!', fn: openShopModal }
            );
        }
        return true;
    }
    return false;
}

function commitPlayTime() {
    if (gameElapsed > 0) {
        statsData.timePlayed = (statsData.timePlayed || 0) + gameElapsed;
        statsData.luciferTime = (statsData.luciferTime || 0) + luciferElapsed;
        gameElapsed = 0;
        luciferElapsed = 0;
        saveStats();
        checkShopUnlock();
    }
}

function rechargeMilagro() {
    const c = statsData.lopa.charges.milagro || 0;
    if (c >= MAX_CHARGES) return;
    if (c === 0 && !statsData.lopa.owned.milagro) return;
    statsData.lopa.charges.milagro = c + 1;
    saveStats();
    renderHudAmulets();
}

function rechargeUltimoBaile() {
    const c = statsData.lopa.charges.ultimobaile || 0;
    if (c >= MAX_CHARGES) return;
    if (c === 0 && !statsData.lopa.owned.ultimobaile) return;
    statsData.lopa.charges.ultimobaile = c + 1;
    saveStats();
    renderHudAmulets();
}

function shopItemState(item) {
    const owned = statsData.lopa.owned;
    const charges = statsData.lopa.charges;
    const levels = statsData.lopa.levels;
    if (item.kind === 'board' || item.kind === 'quality') {
        if (owned[item.id]) return { state: 'owned', label: '✓ Comprado' };
        if (item.id === 'board20' && !owned.board15) return { state: 'locked', label: '🔒 Requiere Rayina 14×14' };
        return { state: 'buy' };
    }
    if (item.kind === 'charge') {
        const c = charges[item.amulet] || 0;
        if (c >= MAX_CHARGES) return { state: 'max', label: 'MÁX' };
        return { state: 'buy', extra: `Cargas: ${c}/${MAX_CHARGES}` };
    }
    if (item.kind === 'level') {
        const lv = levels[item.level] || 0;
        if (lv >= MAX_UPGRADE_LEVEL) return { state: 'max', label: 'MÁX' };
        return { state: 'buy', extra: `Nivel ${lv}/${MAX_UPGRADE_LEVEL}` };
    }
    if (item.kind === 'relic') {
        if (owned[item.relic]) return { state: 'owned', label: '✓ Comprado' };
        if (item.reqStats && !item.reqStats(statsData)) return { state: 'locked', label: '🔒 Requiere el iPod' };
        return { state: 'buy', extra: charlieFreeNow() && item.id === 'charlie' ? '🎁 GRATIS del 10 al 16 de septiembre' : '' };
    }
    return { state: 'buy' };
}

function charlieFreeNow() {
    const now = new Date();
    const m = now.getMonth() + 1, d = now.getDate();
    const s = CHARLIE_FREE_START, e = CHARLIE_FREE_END;
    if (m < s.month || m > e.month) return false;
    if (m === s.month && d < s.day) return false;
    if (m === e.month && d > e.day) return false;
    return true;
}

function shopItemPrice(item) {
    if (item.id === 'charlie' && charlieFreeNow()) return 0;
    return item.price;
}

const DAILY_STOCK_COUNT = 3;

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function getTodayStock() {
    const today = new Date().toISOString().slice(0, 10);
    const rnd = mulberry32(hashString(today));
    const essential = SHOP_ITEMS.filter(it => it.essential);
    const pool = SHOP_ITEMS.filter(it => !it.essential);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return essential.concat(pool.slice(0, DAILY_STOCK_COUNT));
}

function shopItemVisible(item) {
    const owned = statsData.lopa.owned;
    if (item.kind === 'board' || item.kind === 'quality') {
        if (owned[item.id]) return false;
        if (item.reqStats && !item.reqStats(statsData)) return false;
        return true;
    }
    if (item.kind === 'charge') {
        const c = statsData.lopa.charges[item.amulet] || 0;
        if (c >= MAX_CHARGES) return false;
        if (item.reqStats && !item.reqStats(statsData)) return false;
        return true;
    }
    if (item.kind === 'level') {
        const lv = statsData.lopa.levels[item.level] || 0;
        if (lv >= MAX_UPGRADE_LEVEL) return false;
        if (item.reqStats && !item.reqStats(statsData)) return false;
        return true;
    }
    if (item.kind === 'relic') {
        // Siempre visibles en la tienda (si no se tienen): sin el iPod salen
        // como bloqueadas para que el jugador sepa que existen.
        if (owned[item.relic]) return false;
        return true;
    }
    return false;
}

function renderShop() {
    const walletEl = document.getElementById('shop-wallet');
    if (walletEl) walletEl.textContent = formatMoney(wallet);
    const dateEl = document.getElementById('shop-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('es-ES');
    renderShopIpod();
    placeShopIpodSlot();
    if (!shopListEl) return;
    const stock = getTodayStock().filter(shopItemVisible);
    const gift = statsData.lopa.owned.dragon
        ? `<div class="shop-item shop-gift">
            <div class="shop-item-info">
                <div class="shop-item-name">🐉 ${escapeHtml(RELIC_DRAGON.name)}</div>
                <div class="shop-item-desc">Reliquia regalada por el Dragon Narco de Ojos Azules, el dealer de los dealers.</div>
            </div>
            <span class="shop-state">✓ Regalada</span>
        </div>`
        : '';
    shopListEl.innerHTML = gift + stock.map(item => {
        const st = shopItemState(item);
        const price = shopItemPrice(item);
        const canAfford = wallet >= price;
        let right;
        if (st.state === 'buy') {
            right = `<button class="btn-secondary shop-buy" data-id="${item.id}" ${canAfford ? '' : 'disabled'}>${price === 0 ? '🎁 GRATIS' : price + '€'}</button>`;
        } else {
            right = `<span class="shop-state">${st.label || ''}</span>`;
        }
        const extra = st.extra ? `<div class="shop-item-extra">${st.extra}</div>` : '';
        return `<div class="shop-item ${st.state}">
            <div class="shop-item-info">
                <div class="shop-item-name">${item.icon} ${escapeHtml(item.name)}</div>
                <div class="shop-item-desc">${escapeHtml(item.desc)}</div>
                ${extra}
            </div>
            ${right}
        </div>`;
    }).join('');
}

function renderShopIpod() {
    const slot = document.getElementById('shop-ipod-slot');
    if (!slot) return;
    const ipodTx = TX.ipod || {};
    const owned = !!statsData.ipod;
    const canAfford = wallet >= (ipodTx.price || 666);
    slot.innerHTML = `
        <div class="shop-ipod-row">
            <img src="img/ipod.jpg" alt="iPod" class="shop-ipod-img">
            <div class="shop-ipod-info">
                <div class="shop-ipod-name">🎵 ${escapeHtml(ipodTx.shopName || 'iPod')}</div>
                <div class="shop-ipod-desc">${escapeHtml(ipodTx.shopDesc || '')}</div>
            </div>
        </div>
        ${owned
            ? `<div class="shop-ipod-row"><span class="shop-state">${escapeHtml(ipodTx.bought || '✓ En tu hueco')}</span></div>`
            : `<button class="btn-secondary shop-buy" id="shop-ipod-buy" type="button" ${canAfford ? '' : 'disabled'}>${ipodTx.price || 666}€</button>`}
    `;
    const buyBtn = slot.querySelector('#shop-ipod-buy');
    if (buyBtn) buyBtn.addEventListener('click', buyIpod);
}

// El iPod es un objeto ESPECIAL: no se queda fijo al final del scroll del stock
// quitando hueco a la navegación; vive DENTRO del scroll, junto a los objetos
// comprables (igual en móvil y en escritorio).
function placeShopIpodSlot() {
    const slot = document.getElementById('shop-ipod-slot');
    const stock = document.querySelector('.shop-stock');
    if (!slot || !stock) return;
    if (slot.parentNode !== stock) stock.appendChild(slot);
}

function buyIpod() {
    const ipodTx = TX.ipod || {};
    const price = ipodTx.price || 666;
    if (statsData.ipod) return;
    if (wallet < price) { showToast('Te falta dinero 💸'); return; }
    wallet -= price;
    localStorage.setItem('buscalopas_wallet', wallet);
    updateWalletDisplay();
    const name = getUsername();
    if (name) pushWalletExact(name, wallet).catch(() => {});
    statsData.ipod = true;
    saveStats();
    renderShopIpod();
    renderIpodPanel();
    playUiSound();
    showToast('🎵 ¡iPod comprado! Elige tu música de fondo.');
    checkIpodTrackUnlocks(1600);
}

function giftDragonRelic() {
    const lopa = statsData.lopa;
    if (lopa.owned.dragon) return;
    lopa.owned.dragon = true;
    markAcquired('dragon');
    saveStats();
    renderHudAmulets();
    playUiSound();
    setTimeout(() => openAmuletModal('dragon', true), 400);
}

function openShopModal() {
    giftDragonRelic();
    renderShop();
    shopModalEl.classList.remove('hidden');
}

// --- Vista ampliada del dragón (clic en la imagen del dealer) ---
const dragonViewEl = document.getElementById('dragon-view');
const dragonViewCloseBtn = document.getElementById('dragon-view-close');

function openDragonView() {
    if (dragonViewEl) dragonViewEl.classList.remove('hidden');
}

function closeDragonView() {
    if (dragonViewEl) dragonViewEl.classList.add('hidden');
}

const shopDragonImg = document.getElementById('shop-dragon-img');
if (shopDragonImg) shopDragonImg.addEventListener('click', openDragonView);
if (dragonViewCloseBtn) dragonViewCloseBtn.addEventListener('click', closeDragonView);
if (dragonViewEl) {
    dragonViewEl.addEventListener('mousedown', (e) => {
        if (e.target === dragonViewEl) closeDragonView();
    });
}

// --- iPod: música de fondo y reproductor ---
let ipodPrevTrack = 'cyber';
let ipodPlayPending = false;

function ipodTrackUnlocked(track) {
    if (!track) return false;
    if (track.unlock) return !!track.unlock(statsData);
    return true;
}

// Avisa de las canciones NUEVAS del iPod (solo si se tiene el iPod; si se
// cumple el hito sin tenerlo, se espera a comprarlo para informar). La marca
// de "ya avisada" se guarda al momento; los TOASTS salen en orden, uno tras
// otro (delayMs permite posponerlos para no pisar al toast anterior, p. ej.
// el "Comprado" de la tienda).
function checkIpodTrackUnlocks(delayMs = 0) {
    if (!statsData.ipod) return;
    const notified = statsData.ipodNotified || (statsData.ipodNotified = []);
    let changed = false;
    const fresh = [];
    for (const t of IPOD_TRACKS) {
        if (t.id === 'cyber' || notified.includes(t.id)) continue;
        if (ipodTrackUnlocked(t)) {
            notified.push(t.id);
            fresh.push(t.id);
            changed = true;
        }
    }
    if (changed) {
        saveStats();
        renderIpodTrackList();
        renderIpodPanel();
    }
    if (!fresh.length) return;
    const showOne = (i) => {
        if (i >= fresh.length) return;
        const meta = (TX.ipod && TX.ipod.tracks && TX.ipod.tracks[fresh[i]]) || {};
        showToast(`🎵 ¡Canción nueva en el iPod: ${meta.name || fresh[i]}!`, 'unlock');
        playUiSound();
        setTimeout(() => showOne(i + 1), 2600);
    };
    setTimeout(() => showOne(0), delayMs);
}

function getActiveTrack() {
    const t = (IPOD_TRACKS || []).find(x => x.id === statsData.ipodTrack);
    return t || IPOD_TRACKS[0];
}

function ipodTrackName(id) {
    const tx = (TX.ipod && TX.ipod.tracks && TX.ipod.tracks[id]) || {};
    return tx.name || id;
}

// iPod minimizado (móvil): se guarda el estado en la sesión (para que al volver
// al tablero se quede como estaba). Arranca minimizado de primeras en TODAS las
// pantallas (móvil y PC); el usuario puede desminimizarlo cuando quiera.
let ipodMinimized = true;

function setIpodMinimized(v) {
    ipodMinimized = !!v;
    if (!ipodPanelEl) return;
    ipodPanelEl.classList.toggle('ipod-minimized', ipodMinimized);
    document.body.classList.toggle('ipod-minimized', ipodMinimized);
    if (ipodMinimizeBtn) ipodMinimizeBtn.classList.toggle('hidden', ipodMinimized);
    if (ipodShuffleEl) ipodShuffleEl.classList.toggle('hidden', !ipodMinimized);
    updateIpodShuffleTrack();
}

function toggleIpodMinimized() {
    setIpodMinimized(!ipodMinimized);
}

function updateIpodShuffleTrack() {
    if (!ipodShuffleTrackEl) return;
    const t = getActiveTrack();
    const tx = (TX.ipod && TX.ipod.tracks && TX.ipod.tracks[t.id]) || {};
    ipodShuffleTrackEl.textContent = '🎵 ' + (tx.name || t.id);
}

function renderIpodPanel() {
    if (!ipodPanelEl) return;
    ipodPanelEl.classList.toggle('hidden', !statsData.ipod);
    document.body.classList.toggle('ipod-owned', !!statsData.ipod);
    if (statsData.ipod) renderIpodTrackList();
    setIpodMinimized(ipodMinimized);
}

function renderIpodTrackList() {
    if (!ipodTrackListEl) return;
    const tx = (TX.ipod && TX.ipod.tracks) || {};
    ipodTrackListEl.innerHTML = IPOD_TRACKS.map(t => {
        const unlocked = ipodTrackUnlocked(t);
        const active = t.id === statsData.ipodTrack;
        const meta = tx[t.id] || {};
        return `<div class="ipod-track-item${active ? ' ipod-track-active' : ''}${unlocked ? '' : ' ipod-track-locked'}"
                    data-id="${t.id}" title="${escapeHtml(meta.desc || '')}">
                <span>${active ? '▶' : (unlocked ? '' : '🔒')}</span>
                <span class="ipod-track-name">${escapeHtml(meta.name || t.id)}</span>
            </div>`;
    }).join('');
    if (ipodNowPlayingEl) {
        const active = getActiveTrack();
        const tx = (TX.ipod && TX.ipod.tracks && TX.ipod.tracks[active.id]) || {};
        ipodNowPlayingEl.textContent = (TX.ipod && TX.ipod.nowPlaying || 'Sonando:') + ' ' + (tx.name || active.id);
    }
}

function formatTimeShort(sec) {
    sec = Math.floor(sec);
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m${s > 0 ? ' ' + s + 's' : ''}`;
}

function selectIpodTrack(id) {
    const t = (IPOD_TRACKS || []).find(x => x.id === id);
    if (!t || !ipodTrackUnlocked(t)) { showToast('🔒 Aún no tienes esa canción'); return; }
    statsData.ipodTrack = t.id;
    saveStats();
    renderIpodTrackList();
    renderIpodPanel();
    playSelectedTrack();
    updateRelicSyntekButton();
    showToast(`🎵 Sonando: ${ipodTrackName(t.id)}`);
}

function playSelectedTrack() {
    const t = getActiveTrack();
    if (!t || !bgMusic) return;
    try {
        if (bgMusic.src && bgMusic.src.indexOf(t.src) === -1) {
            bgMusic.src = t.src;
            bgMusic.load();
        }
        bgMusic.play().then(() => { autoPlayStarted = true; }).catch(() => {});
        ipodPrevTrack = t.id;
    } catch (e) {}
}

// --- El iPod es un reproductor fijo sobre el fondo (sin modal): ---
// renderIpodPanel() rellena la lista y la rueda se controla con los
// listeners de abajo. La canción activa es la música de fondo del juego.

// --- Seguimiento del tiempo escuchando cada canción (se acumula localmente y
//     se sube con saveStats; NO escribe en Supabase en tiempo real) ---
let musicTimeInterval = null;

function startMusicTimeTracking() {
    if (musicTimeInterval) return;
    musicTimeInterval = setInterval(() => {
        if (!statsData.ipod || !bgMusic || bgMusic.paused || !getUsername()) return;
        const t = getActiveTrack();
        if (!t) return;
        statsData.musicTime = statsData.musicTime || {};
        statsData.musicTime[t.id] = (statsData.musicTime[t.id] || 0) + 1;
        if ((statsData.musicTime[t.id] || 0) % 60 === 0) saveStats();
    }, 1000);
}

// --- Popup de info reutilizable (Spiz / Lucifer) ---
function openInfoPopup({ title, desc, img, emoji }) {
    if (!infoPopupEl) return;
    if (infoPopupTitleEl) infoPopupTitleEl.textContent = title;
    if (infoPopupDescEl) infoPopupDescEl.innerHTML = desc;
    if (infoPopupImgWrap) {
        if (img) infoPopupImgWrap.innerHTML = `<img src="${img}" alt="" class="info-popup-img">`;
        else if (emoji) infoPopupImgWrap.innerHTML = `<span class="info-popup-emoji">${emoji}</span>`;
        else infoPopupImgWrap.innerHTML = '';
    }
    infoPopupEl.classList.remove('hidden');
}

function closeInfoPopup() {
    if (infoPopupEl) infoPopupEl.classList.add('hidden');
}

// --- Lore (📜): se lee desde el desplegable del usuario ---
function openLoreModal() {
    if (!loreModalEl) return;
    renderLoreList();
    loreModalEl.classList.remove('hidden');
}

function renderLoreList() {
    if (!loreListEl) return;
    const lore = TX.lore || {};
    const entries = Object.entries(lore);
    if (!entries.length) {
        loreListEl.innerHTML = '<p class="lore-empty">No hay lore todavía 📜</p>';
        return;
    }
    loreListEl.innerHTML = entries.map(([id, e]) =>
        `<button class="lore-item" data-lore-id="${id}" type="button">${escapeHtml(e.name || id)}</button>`
    ).join('');
}

function showLoreEntry(id) {
    const e = (TX.lore || {})[id];
    if (!e) return;
    if (loreViewTitleEl) loreViewTitleEl.textContent = e.name || id;
    if (loreViewTextEl) loreViewTextEl.innerHTML = e.desc || '';
    if (loreViewImgEl) loreViewImgEl.innerHTML = e.img ? `<img src="${e.img}" alt="" class="lore-img">` : '';
    if (loreListEl) loreListEl.classList.add('hidden');
    if (loreViewEl) loreViewEl.classList.remove('hidden');
}

function closeLoreView() {
    if (loreListEl) loreListEl.classList.remove('hidden');
    if (loreViewEl) loreViewEl.classList.add('hidden');
}

// --- Cola de notificaciones importantes (fin de partida) ---
const noticeQueue = [];
let noticeShowing = false;

function queueNotice(notice) {
    noticeQueue.push(notice);
}

function showNextNotice(onDone) {
    if (!noticeQueue.length) {
        noticeShowing = false;
        if (onDone) onDone();
        return;
    }
    noticeShowing = true;
    const n = noticeQueue.shift();
    if (noticeIconEl) noticeIconEl.textContent = n.icon || '💬';
    if (noticeTitleEl) noticeTitleEl.textContent = n.title || '';
    if (noticeMsgEl) noticeMsgEl.innerHTML = n.msg || '';
    if (noticeImgWrap) {
        if (n.img) noticeImgWrap.innerHTML = `<img src="${n.img}" alt="" class="notice-img">`;
        else noticeImgWrap.innerHTML = '';
    }
    const isLast = noticeQueue.length === 0;
    if (noticeNextBtn) noticeNextBtn.textContent = isLast ? 'Entendido ✓' : 'Siguiente ▶';
    noticeModalEl.classList.remove('hidden');
    noticeNextBtn.onclick = () => {
        noticeModalEl.classList.add('hidden');
        showNextNotice(onDone);
    };
}

function flushNotices(onDone) {
    if (noticeShowing) { if (onDone) onDone(); return; }
    showNextNotice(onDone);
}

// Muestra las notificaciones encoladas (spiz 1ª vez, resumen Lucifer...) y al
// terminar muestra el resultado de la partida (orden: notifs primero, resultado al final)
function showResultAfterNotices(resultData) {
    closeInfoPopup();
    const spizInfoShown = maybeQueueSpizNotice();
    // Resumen de Lucifer SOLO la primera partida en la que ha habido Lucifer.
    if (luciferElapsed > 0) {
        let luciferSeen = false;
        try { luciferSeen = !!localStorage.getItem('buscalopas_lucifer_notice'); } catch (e) {}
        if (!luciferSeen) {
            const li = (TX.luciferInfo) || {};
            const lucLv = statsData.lopa.levels.lucifer || 0;
            queueNotice({
                icon: '🔥',
                title: (li.title) || '🔥 Modo Lucifer',
                msg: (li.desc || 'Cuando el tiempo baja de 30s entras en modo Lucifer: la música cambia y los turulos correctos valen el doble de pasta.') +
                    `<br><br>Esta partida has estado <b>${formatTimeShort(luciferElapsed)}</b> en modo Lucifer ` +
                    `y tus turulos han valido <b>×${2 * (1 + 0.5 * lucLv)}</b>.`,
                emoji: '🔥'
            });
            try { localStorage.setItem('buscalopas_lucifer_notice', '1'); } catch (e) {}
        }
    }
    const hasNotices = noticeQueue.length > 0 || spizInfoShown;
    if (hasNotices) {
        flushNotices(() => {
            openResultScreen(resultData);
        });
    } else {
        openResultScreen(resultData);
    }
}

function spizTutorialSeen() {
    try { return !!localStorage.getItem('buscalopas_spiz_tutorial'); } catch (e) { return false; }
}

function maybeQueueSpizNotice() {
    try {
        if (spizTutorialSeen()) return false;
        // Solo la primera partida en la que se toca el Spiz.
        if (!spizFirstTouch) return false;
        const bonusTime = Math.round(initialTime * (isLuciferState ? 0.40 : 0.20));
        queueNotice({
            icon: '⚡',
            title: '¡Primer Spiz!',
            msg: `<strong>Para no ser Lopa el Spiz no está nada mal.</strong> ` +
                `Te dará un boost de energía y <b>+${Math.max(1, bonusTime)} segundos de tiempo</b>. ` +
                `Si acabas la partida con el Spiz sin gastar, cobras un bonus extra 💰.`,
            img: 'img/spiz.jpg'
        });
        try { localStorage.setItem('buscalopas_spiz_tutorial', '1'); } catch (e) {}
        return true;
    } catch (e) { return false; }
}

function buyShopItem(item) {
    const st = shopItemState(item);
    if (st.state !== 'buy') { showToast('Eso ya no se puede comprar'); return; }
    const price = shopItemPrice(item);
    if (wallet < price) { showToast('Te falta dinero 💸'); return; }
    wallet -= price;
    localStorage.setItem('buscalopas_wallet', wallet);
    updateWalletDisplay();
    const name = getUsername();
    if (name) pushWalletExact(name, wallet).catch(() => {});
    if (item.kind === 'board' || item.kind === 'quality') {
        statsData.lopa.owned[item.id] = true;
    } else if (item.kind === 'charge') {
        statsData.lopa.owned[item.amulet] = true;
        markAcquired(item.amulet);
        setAmuletAcquired(item.amulet);
        statsData.lopa.charges[item.amulet] = (statsData.lopa.charges[item.amulet] || 0) + 1;
    } else if (item.kind === 'level') {
        statsData.lopa.levels[item.level] = (statsData.lopa.levels[item.level] || 0) + 1;
        markAcquired(item.level === 'spiz' ? 'level-spiz' : (item.level === 'lucifer' ? 'level-lucifer' : 'level-dinero'));
    } else if (item.kind === 'relic') {
        statsData.lopa.owned[item.relic] = true;
        markAcquired(item.relic);
        setAmuletAcquired(item.relic);
    }
    saveStats();
    renderHudAmulets();
    updateDifficultyOptions();
    updateSizeOptions();
    renderShop();
    showToast(`🛒 Comprado: ${item.name}`);
    checkIpodTrackUnlocks(1600);
}

function refreshProgressionUI() {
    updateDifficultyOptions();
    updateSizeOptions();
    renderHudAmulets();
    renderShopButton();
    checkAmuletUnlocks();
    checkShopUnlock();
}

// --- Capa de almacenamiento de puntuaciones ---
const SUPABASE_TIMEOUT = 4000;
const SUPABASE_PROBE_TIMEOUT = 2000;
function supabaseFetch(input, init) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SUPABASE_TIMEOUT);
    return fetch(input, Object.assign({}, init, { signal: ctrl.signal }))
        .catch(() => new Response(null, { status: 503, statusText: 'Supabase no disponible' }))
        .finally(() => clearTimeout(timer));
}

let supabaseClient = null;
let supabaseFactory = () => null;
function refreshClientForUser() {
    supabaseClient = supabaseFactory();
}

function initSupabase() {
    return new Promise((resolve) => {
        if (!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)) {
            supabaseClient = null;
            return resolve(null);
        }
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), SUPABASE_PROBE_TIMEOUT);
        fetch(SUPABASE_URL + '/rest/v1/scores?select=name&limit=1', {
            method: 'HEAD',
            headers: { apikey: SUPABASE_ANON_KEY },
            signal: ctrl.signal
        })
            .then(() => {
                try {
                    supabaseFactory = () => window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: supabaseFetch } });
                } catch (e) {
                    supabaseFactory = () => null;
                }
                supabaseClient = supabaseFactory();
            })
            .catch(() => { supabaseClient = null; })
            .finally(() => { clearTimeout(timer); resolve(supabaseClient); });
    });
}

async function fetchPlayerData(name) {
    if (supabaseClient) {
        // Búsqueda SIN distinguir mayúsculas: si escribes "ED" y existe "ed",
        // devuelve la fila canónica (data.name trae el nombre real).
        const { data, error } = await supabaseClient
            .from('scores')
            .select('name, score, total, pass, stats')
            .ilike('name', name)
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }
    const res = await fetch(`/api/player?name=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error('Sin servidor');
    const data = await res.json();
    return (data && data.score !== null && data.score !== undefined) ? data : null;
}

async function pushPlayerData(name, score, total) {
    if (supabaseClient) {
        const current = await fetchPlayerData(name);
        const curTotal = current ? (current.total || current.score || 0) : 0;
        const newTotal = Math.max(curTotal, Math.floor(total));
        const { error } = await supabaseClient
            .from('scores')
            .upsert({ name, score: Math.floor(score), total: newTotal }, { onConflict: 'name' });
        if (error) throw error;
        return;
    }
    const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score, total })
    });
    if (!res.ok) throw new Error('Sin servidor');
}

async function pushWalletExact(name, wallet) {
    if (supabaseClient) {
        const { error } = await supabaseClient
            .from('scores')
            .upsert({ name, score: Math.floor(wallet) }, { onConflict: 'name' });
        if (error) throw error;
        return;
    }
    await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: wallet, exact: true })
    });
}

async function fetchLeaderboard() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient
            .from('scores')
            .select('name, score, total')
            .order('total', { ascending: false });
        if (error) throw error;
        return data || [];
    }
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Sin servidor');
    const data = await res.json();
    return data.players || [];
}

async function fetchUsedNames() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient
            .from('scores')
            .select('name');
        if (error) throw error;
        return (data || []).map(r => r.name);
    }
    const res = await fetch('/api/players');
    if (!res.ok) throw new Error('Sin servidor');
    const data = await res.json();
    return data.names || [];
}

async function loadPlayerFromServer() {
    const name = getUsername();
    if (!name) return;
    try {
        const data = await fetchPlayerData(name);
        if (data) {
            wallet = data.score || 0;
            totalEarned = (data.total !== null && data.total !== undefined) ? data.total : (data.score || 0);
            loadStats(name, data.stats);
            localStorage.setItem('buscalopas_wallet', wallet);
            localStorage.setItem('buscalopas_total', totalEarned);
            updateWalletDisplay();
        } else {
            loadStats(name, null);
            if (!hasStats(statsData)) {
                wallet = 0;
                totalEarned = 0;
                localStorage.removeItem('buscalopas_wallet');
                localStorage.removeItem('buscalopas_total');
            } else if (wallet > 0 || totalEarned > 0) {
                pushPlayerData(name, wallet, totalEarned).catch(() => {});
            }
            updateWalletDisplay();
        }
    } catch (e) {
        loadStats(name, null);
    }
    if (isDeity(name)) {
        wallet = DEITY_WALLET;
        localStorage.setItem('buscalopas_wallet', wallet);
    }
    refreshProgressionUI();
}

function rememberPassHash(name, hash) {
    try { sessionStorage.setItem('buscalopas_passhash_' + (name || '').toLowerCase(), hash); } catch (e) {}
}

function getPassHash(name) {
    try { return sessionStorage.getItem('buscalopas_passhash_' + (name || '').toLowerCase()) || ''; } catch (e) { return ''; }
}

function syncWalletToServer() {
    const name = getUsername();
    if (!name) return;
    pushPlayerData(name, wallet, totalEarned).catch(() => {});
}

async function loadRanking() {
    if (!rankingListEl) return;
    rankingListEl.innerHTML = '<li class="ranking-empty">Cargando...</li>';
    try {
        const myName = getUsername();
        const players = (await fetchLeaderboard()).filter(p => !isDeity(p.name));
        if (players.length === 0) {
            rankingListEl.innerHTML = '<li class="ranking-empty">Sin loperos todavía</li>';
            return;
        }
        const top = players.slice(0, 5);
        let html = top.map((p, i) => {
            const you = p.name === myName ? ' lb-you' : '';
            const total = (p.total !== null && p.total !== undefined) ? p.total : (p.score || 0);
            return `<li class="lb-row${you}" data-rank="${i + 1}" data-name="${escapeHtml(p.name)}"><span class="lb-rank">${i + 1}</span><span class="lb-name">${escapeHtml(p.name)}</span><span class="lb-score">${formatMoney(total)}€</span></li>`;
        }).join('');
        const myIdx = players.findIndex(p => p.name === myName);
        if (myIdx >= 5) {
            const p = players[myIdx];
            const total = (p.total !== null && p.total !== undefined) ? p.total : (p.score || 0);
            html += `<li class="lb-row lb-you lb-below" data-rank="${myIdx + 1}" data-name="${escapeHtml(p.name)}"><span class="lb-rank">${myIdx + 1}</span><span class="lb-name">${escapeHtml(p.name)}</span><span class="lb-score">${formatMoney(total)}€</span></li>`;
        }
        rankingListEl.innerHTML = html;
    } catch (e) {
        rankingListEl.innerHTML = '<li class="ranking-empty">Servidor no disponible</li>';
    }
}

function onUserReady(goMenu = false) {
    hideUserModal();
    updateWalletDisplay();
    updateDropdown();
    // El banner "Regístrate" no debe aparecer tras iniciar sesión: al entrar,
    // se oculta para que no quede un recuadro suelto bajo el botón de DEALER.
    if (registerBannerEl) registerBannerEl.classList.add('hidden');
    renderIpodPanel();
    checkIpodTrackUnlocks();
    loadPlayerFromServer();
    loadRanking();
    syncRealtime();
    // Al iniciar sesión SIEMPRE se va al menú principal: nunca se vuelve a la
    // pantalla (partida en curso, etc.) donde se quedó el usuario anterior.
    if (goMenu) showMenu();
}

function isMobileView() {
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
}

function updateHeroInfo() {
    const currentHero = heroData[gameModeSelect.value] || heroData.classic;
    heroDisplayNameEl.textContent = currentHero.name;
    const mobile = isMobileView();
    heroDisplayGoalEl.textContent = (mobile && currentHero.goalMobile) ? currentHero.goalMobile : currentHero.goal;
}

function startGame() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    collapseVolumeControls();
    // En móvil el iPod se minimiza al entrar en el tablero (no tapa el juego);
    // el usuario puede desminimizarlo para interactuar con el reproductor.
    if (isMobileView()) setIpodMinimized(true);
    closeHudAmuletsPanel();
    initGame();
}

// Abandonar una partida en curso (Menú Principal / Cerrar sesión): se da por
// PERDIDA, sin sumar logros ni dinero, y se detienen todos los timers/avisos
// (Lucifer, desbloqueos, tiempo...) para que nada siga sonando tras salir.
function abandonGame() {
    if (!gameStarted || gameOver) return;
    gameStarted = false;
    gameOver = true;
    clearInterval(timerInterval);
    timerInterval = null;
    stopLuciferMessages();
    hideToast();
    if (noticeModalEl) noticeModalEl.classList.add('hidden');
    hideConfirmBubble();
    recordGameResult('loss');
    gameElapsed = 0;
    luciferElapsed = 0;
    clearLastResult();
    updateRelicDragonButton();
    renderHudAmulets();
}

function showMenu() {
    const abandoning = gameStarted && !gameOver;
    abandonGame();
    collapseVolumeControls();
    if (!abandoning) {
        commitPlayTime();
        settleGameCounters();
    }
    gameStarted = false;
    clearInterval(timerInterval);
    stopLuciferMessages();
    clearLastResult();
    
    // Volver a la música normal del menú si estábamos en Lucifer
    if (isLuciferState) {
        exitLuciferState();
    } else {
        playNormalMusic();
    }

    gameScreen.classList.remove('lucifer-active');
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    closeHudAmuletsPanel();
    updateRelicDragonButton();
    loadRanking();
}

function initGame() {
    if (gameStarted) commitPlayTime();
    clearInterval(timerInterval);
    stopLuciferMessages();

    // Mantener sonando la música actual sin reiniciarla
    if (!isLuciferState) {
        playNormalMusic();
    }

    if (popupTimeout) clearTimeout(popupTimeout);
    if (spizPopupEl) spizPopupEl.classList.add('hidden');
    if (spizPopupLeftEl) spizPopupLeftEl.classList.add('hidden');
    closeInfoPopup();

    gameStarted = false;
    gameOver = false;
    isLuciferState = false;
    spizTriggered = false;
    spizFirstTouch = false;
    milagroDisarmed = {};
    syntekDisarmed = {};
    syntekImmunityUntil = 0;
    if (syntekImmunityTimer) { clearTimeout(syntekImmunityTimer); syntekImmunityTimer = null; }
    document.body.classList.remove('syntek-immunity');
    imanUsedThisGame = false;
    gameElapsed = 0;
    gameCorrectTurulosLucifer = 0;
    luciferElapsed = 0;
    subidonGraceTicks = 0;
    syntekUsedThisGame = false;
    gameEarnedAmulets = [];
    resultAmuletIds = [];
    clearLastResult();

    statsBarEl.classList.remove('lucifer-mode');
    gameScreen.classList.remove('lucifer-active');
    luciferLabelEl.style.display = 'none';

    gameMode = gameModeSelect.value;
    updateHeroInfo();

    size = parseInt(quantitySelect.value);
    const [ratioStr, timeStr] = qualitySelect.value.split('-');
    const ratio = parseFloat(ratioStr);
    initialTime = parseInt(timeStr);
    timeRemaining = initialTime + (isAmuletActive('papu') ? PAPU_TIME : 0) - (isAmuletActive('mala') ? MALA_TIME : 0);
    if (timeRemaining < 5) timeRemaining = 5;
    currentGameKey = qualitySelect.value + '_' + size;
    hudCorrectTurulos = statsData.correctTurulos || 0;
    gameStartCorrectTurulos = statsData.correctTurulos || 0;
    gameStartWins = statsData.wins || 0;
    gameCorrectTurulos = 0;
    videnteUsedThisGame = false;

    updateTimerDisplay();
    updateWalletDisplay();

    numMines = Math.floor((size * size) * ratio);
    safeCellsRemaining = (size * size) - numMines;

    board = Array(size).fill().map(() => Array(size).fill(0));
    revealed = Array(size).fill().map(() => Array(size).fill(false));
    turulos = Array(size).fill().map(() => Array(size).fill(false));

    generateMines();
    generateSpiz();
    calculateNeighbors();

    if (isAmuletActive('vidente') && (statsData.lopa.charges.vidente || 0) > 0) {
        statsData.lopa.charges.vidente = (statsData.lopa.charges.vidente || 0) - 1;
        videnteUsedThisGame = true;
        saveStats();
        renderHudAmulets();
    }

    updateTuruloCount();
    if (statsData.lopa.owned.dragon) {
        statsData.lopa.relicGames = Math.min((statsData.lopa.relicGames || 0) + 1, RELIC_DRAGON_EVERY);
        saveStats();
    }
    updateRelicDragonButton();
    renderHudAmulets();
    renderBoard();
}

function generateMines() {
    mines = [];
    while (mines.length < numMines) {
        let r = Math.floor(Math.random() * size);
        let c = Math.floor(Math.random() * size);
        if (!mines.some(m => m.r === r && m.c === c)) {
            mines.push({r, c});
        }
    }
}

function generateSpiz() {
    let r, c;
    do {
        r = Math.floor(Math.random() * size);
        c = Math.floor(Math.random() * size);
    } while (mines.some(m => m.r === r && m.c === c));

    spizCell = {r, c};
}

function calculateNeighbors() {
    mines.forEach(({r, c}) => {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (!mines.some(m => m.r === nr && m.c === nc)) {
                        board[nr][nc]++;
                    }
                }
            }
        }
    });
}

function updateTimerDisplay() {
    let mins = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
    let secs = String(timeRemaining % 60).padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
}

function updateTuruloCount() {
    let usedTurulos = turulos.flat().filter(Boolean).length;
    if (imanUsedThisGame) usedTurulos--;
    if (usedTurulos < 0) usedTurulos = 0;
    turuloCountEl.textContent = numMines - usedTurulos;
}

function checkLuciferThreshold() {
    let luciferThreshold = Math.round(initialTime * 0.20);

    if (timeRemaining <= luciferThreshold && !isLuciferState) {
        enterLuciferState();
    } else if (timeRemaining > luciferThreshold && isLuciferState) {
        if (subidonGraceTicks > 0) {
            subidonGraceTicks--;
        } else {
            exitLuciferState();
        }
    }
}

function enterLuciferState() {
    isLuciferState = true;
    statsBarEl.classList.add('lucifer-mode');
    gameScreen.classList.add('lucifer-active');
    luciferLabelEl.style.display = 'inline';
    startLuciferMessages();
    playLuciferMusic();

    statsData.luciferReached = (statsData.luciferReached || 0) + 1;
    checkAmuletUnlocks();
    rechargeUltimoBaile();

    if (isAmuletActive('subidon') && (statsData.lopa.charges.subidon || 0) > 0) {
        statsData.lopa.charges.subidon = (statsData.lopa.charges.subidon || 0) - 1;
        statsData.lopa.uses.subidon = (statsData.lopa.uses.subidon || 0) + 1;
        timeRemaining += SUBIDON_TIME;
        updateTimerDisplay();
        subidonGraceTicks = 2;
        saveStats();
        renderHudAmulets();
        showToast('⏱️ ¡Amuleto del Subidón! +10s');
    }

    // Aviso TEMPORAL en la zona media-izquierda: no bloquea ni desenfoca,
    // la partida sigue con normalidad. Va el último para no ser tapado.
    const lucLv = statsData.lopa.levels.lucifer || 0;
    showNotification(
        '🔥 ¡Modo Lucifer!',
        'La música cambia y los turulos correctos valen el doble de pasta.',
        `Bonus de turulos en Lucifer: ×${2 * (1 + 0.5 * lucLv)}`,
        'lucifer'
    );

    renderHudAmulets();
}

function exitLuciferState() {
    isLuciferState = false;
    statsBarEl.classList.remove('lucifer-mode');
    gameScreen.classList.remove('lucifer-active');
    luciferLabelEl.style.display = 'none';
    stopLuciferMessages();
    playNormalMusic();
}

function startLuciferMessages() {
    showLuciferMessage();
    if (luciferInterval) clearInterval(luciferInterval);
    luciferInterval = setInterval(() => {
        showLuciferMessage();
    }, 4000);
}

function showLuciferMessage() {
    if (!spizPopupEl || !spizPopupLeftEl) return;
    const msgRight = luciferMessages[Math.floor(Math.random() * luciferMessages.length)];
    const msgLeft = luciferMessages[Math.floor(Math.random() * luciferMessages.length)];

    spizPopupEl.innerHTML = `🔥 <b>${msgRight}</b>`;
    spizPopupLeftEl.innerHTML = `🔥 <b>${msgLeft}</b>`;

    spizPopupEl.classList.remove('spiz-cyan');
    spizPopupEl.classList.remove('hidden');
    spizPopupLeftEl.classList.remove('hidden');
}

function stopLuciferMessages() {
    if (luciferInterval) {
        clearInterval(luciferInterval);
        luciferInterval = null;
    }
    if (spizPopupEl) {
        spizPopupEl.classList.add('hidden');
        spizPopupEl.classList.remove('spiz-cyan');
    }
    if (spizPopupLeftEl) spizPopupLeftEl.classList.add('hidden');
}

function startTimer() {
    gameStarted = true;
    if (!isLuciferState) playNormalMusic();

    timerInterval = setInterval(() => {
        gameElapsed++;
        timeRemaining--;
        if (isLuciferState) luciferElapsed++;
        updateTimerDisplay();

        checkLuciferThreshold();

        if (timeRemaining <= 0) {
            const prorroga = statsData.lopa.charges.ultimobaile || 0;
            if (prorroga > 0) {
                statsData.lopa.charges.ultimobaile = prorroga - 1;
                timeRemaining = PRORROGA_TIME;
                updateTimerDisplay();
                saveStats();
                renderHudAmulets();
                showNotification('⏳ ¡Último Baile!', 'Prórroga de +5 segundos.', `Te quedan ${statsData.lopa.charges.ultimobaile} cargas`);
                return;
            }
            gameOver = true;
            clearInterval(timerInterval);
            stopLuciferMessages();
            updateRelicDragonButton();
            revealAllCells();
            commitPlayTime();
            recordGameResult('loss');
            settleGameCounters();
            checkAmuletUnlocks();
            const breakdown = buildLossBreakdown();
            if (breakdown.total > 0) addMoney(breakdown.total);
            showResultAfterNotices({
                title: (TX.resultado && TX.resultado.tiempo) || '⏰ ¡TIEMPO AGOTADO!',
                subtitle: `A ${heroData[gameMode].name} se le ha acabado el tiempo.`,
                extra: '⏱️ 0s restantes · Recuerda: con el Spiz habrías tenido más aire.',
                breakdown
            });
        }
    }, 1000);
}

function sidePanelReserve() {
    const w = window.innerWidth;
    if (w >= 769 && w < 1700) return 320;
    return 0;
}

function boardCellSize() {
    const gap = 6;
    const pad = 24;
    const reserve = sidePanelReserve();
    const available = Math.min(window.innerWidth - 28 - reserve, 1120) - pad - (size - 1) * gap;
    return Math.max(26, Math.min(52, Math.floor(available / size)));
}

function applyBoardCellSize() {
    const s = boardCellSize();
    boardEl.style.setProperty('--cell-size', s + 'px');
}

function updateBoardFit() {
    // En móvil, si el tablero cabe en la pantalla no debe poder desplazarse.
    const bc = boardEl.parentElement;
    if (!bc || !isMobileView()) return;
    const fits = boardEl.scrollWidth <= bc.clientWidth + 2;
    bc.classList.toggle('board-fits', fits);
}

function renderBoard() {
    applyBoardCellSize();
    boardEl.style.gridTemplateColumns = `repeat(${size}, var(--cell-size, 52px))`;
    boardEl.innerHTML = '';

    const videnteOwned = videnteUsedThisGame;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.r = r;
            cell.dataset.c = c;

            if (revealed[r][c]) {
                cell.classList.add('revealed');
                if (mines.some(m => m.r === r && m.c === c)) {
                    cell.classList.add('mine');
                    if (milagroDisarmed[r + '-' + c]) cell.classList.add('mine-disarmed');
                    if (syntekDisarmed[r + '-' + c]) cell.classList.add('mine-immunity');
                    const img = document.createElement('img');
                    img.src = 'img/papela.jpg';
                    img.alt = 'Papela';
                    img.classList.add('cell-img');
                    cell.appendChild(img);

                } else if (spizCell && spizCell.r === r && spizCell.c === c) {
                    cell.classList.add('spiz');
                    const img = document.createElement('img');
                    img.src = 'img/spiz.jpg';
                    img.alt = 'Spiz';
                    img.classList.add('cell-img');
                    cell.appendChild(img);

                } else if (board[r][c] > 0) {
                    cell.textContent = board[r][c];
                    cell.classList.add(`c-${board[r][c]}`);
                }
            } else if (turulos[r][c]) {
                cell.classList.add('turulo');
                const img = document.createElement('img');
                img.src = 'img/turulo.jpg';
                img.alt = 'Turulo';
                img.classList.add('cell-img');
                cell.appendChild(img);
            } else if (videnteOwned && spizCell && spizCell.r === r && spizCell.c === c) {
                cell.classList.add('vidente-spiz');
            }

            cell.addEventListener('click', () => handleReveal(r, c));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (isMobileView()) {
                    // Ratón en vista móvil (ventana estrecha/escritorio): el clic
                    // derecho pone/quita turulo (aquí no hay pulsación larga táctil).
                    if (e.button === 2) {
                        handleTurulo(r, c);
                        return;
                    }
                    // Respaldo touch: si el navegador canceló el long-press por
                    // pointer events (p.ej. iOS), el contextmenu nativo hace de
                    // pulsación larga. lpHandled evita el doble toggle si el
                    // long-press ya disparó; el click posterior se suprime.
                    if (!lpHandled) {
                        cancelLongPress();
                        lpFiredCell = { r, c };
                        lpFiredUntil = Date.now() + 2500;
                        handleTurulo(r, c);
                    }
                    return;
                }
                handleTurulo(r, c);
            });
            if (spizCell && spizCell.r === r && spizCell.c === c && !spizTriggered && videnteOwned && !spizTutorialSeen()) {
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openInfoPopup({
                        title: (TX.spizInfo && TX.spizInfo.title) || '⚡ El Spiz',
                        desc: (TX.spizInfo && TX.spizInfo.desc) || '',
                        img: 'img/spiz.jpg'
                    });
                });
            }

            boardEl.appendChild(cell);
        }
    }
    positionRelicButton();
    updateBoardFit();
}

function triggerSpiz() {
    if (spizTriggered) return;
    spizTriggered = true;

    let bonusPercentage = isLuciferState ? 0.40 : 0.20;
    let spizLevel = statsData.lopa.levels.spiz || 0;
    let bonusTime = Math.round(initialTime * bonusPercentage * (1 + SPIZ_LEVEL_PCT * spizLevel));
    if (isAmuletActive('gafe')) bonusTime = Math.round(bonusTime * 0.9);

    timeRemaining += bonusTime;
    updateTimerDisplay();

    const revealLvl = spizRevealLevel();
    let revealed = 0;
    if (revealLvl > 0 && spizCell) {
        revealed = revealArea(spizCell.r, spizCell.c, revealLvl);
    }

    checkLuciferThreshold();
    showSpizPopup(bonusPercentage);
    maybeShowSpizTutorial(bonusTime);

    if (revealed > 0) {
        renderBoard();
        // Si el Spiz (último movimiento) completa el tablero, cuenta como
        // "Spiz guardado" (igual que cuando lo cierra el flood de revealCell).
        if ((gameMode === 'classic' || gameMode === 'hybrid') && safeCellsRemaining === 0) {
            winGame(true);
        }
    }
}

function handleReveal(r, c) {
    if (gameOver || revealed[r][c] || turulos[r][c]) return;

    // En móvil, tras poner/quitar un turulo con pulsación larga llega un
    // `click` de "suelta de dedo" que no debe destapar la casilla (eso dejaba
    // la partida "pillada": la casilla se destapaba justo después de quitar
    // la bandera y si era bolsa → BOOM inmediato). Se ignora ese click.
    if (lpFiredCell && lpFiredCell.r === r && lpFiredCell.c === c && Date.now() < lpFiredUntil) {
        lpFiredCell = null;
        return;
    }

    if (!gameStarted) startTimer();

    const isSpizMove = spizCell && spizCell.r === r && spizCell.c === c && !spizTriggered;
    if (isSpizMove) {
        triggerSpiz();
    }

    if (mines.some(m => m.r === r && m.c === c)) {
        // Inmunidad Syntek (3s): se toca la bolsa sin consecuencias. Las cosas
        // se revelan, pero NO se pierde, NO se gasta Milagro/objetos y NO
        // cuenta para estadísticas de derrota.
        if (syntekImmunityActive()) {
            revealed[r][c] = true;
            syntekDisarmed[r + '-' + c] = true;
            renderBoard();
            return;
        }
        const milCharges = statsData.lopa.charges.milagro || 0;
        if (milCharges > 0) {
            statsData.lopa.charges.milagro = milCharges - 1;
            saveStats();
            renderHudAmulets();
            showNotification('🛡️ ¡El Milagro te ha salvado!',
                'Has pisado una bolsa pero el amuleto la ha desactivado.',
                `Te quedan ${statsData.lopa.charges.milagro} cargas`);
            // La bolsa queda VISIBLE en el terreno (desactivada) y NO resta
            // casillas seguras: no altera la condición de victoria.
            revealed[r][c] = true;
            milagroDisarmed[r + '-' + c] = true;
            renderBoard();
            return;
        }
        gameOver = true;
        vibrate([120, 60, 120]);
        clearInterval(timerInterval);
        stopLuciferMessages();
        updateRelicDragonButton();
        revealAllCells();
        commitPlayTime();
        recordGameResult('loss');
        settleGameCounters();
        checkAmuletUnlocks();
        const breakdown = buildLossBreakdown();
        if (breakdown.total > 0) addMoney(breakdown.total);
        showResultAfterNotices({
            title: (TX.resultado && TX.resultado.boom) || '💥 ¡BOOM!',
            subtitle: `${heroData[gameMode].name} ha pisado una bolsa. Juego terminado.`,
            extra: `⏱️ Quedaban ${timeRemaining}s · ${size}×${size} · ${DIFF_LABELS[qualitySelect.value] || ''}`,
            breakdown
        });
        return;
    }

    revealCell(r, c);
    renderBoard();

    if ((gameMode === 'classic' || gameMode === 'hybrid') && safeCellsRemaining === 0) {
        winGame(isSpizMove);
    }
}

function showSpizPopup(percentage, bonusTime) {
    stopLuciferMessages();

    const mobile = isMobileView();
    let body;
    if (bonusTime != null && mobile) {
        body = `<div class="spiz-popup-body">+${Math.max(1, bonusTime)}s de tiempo</div>`;
    } else if (bonusTime != null) {
        body = percentage === 0.40
            ? `<div class="spiz-popup-body">⚡ ¡¡SUBIDÓN LUCIFER!! Te mete un <b>+40% de tiempo</b>!</div>`
            : `<div class="spiz-popup-body">⚡ ¡Ufff rayote de Spiz! Recuperas un <b>+20% de energía</b>! (+${Math.max(1, bonusTime)}s)</div>`;
    } else if (percentage === 0.40) {
        body = '<div class="spiz-popup-body">⚡ ¡¡SUBIDÓN LUCIFER!! Te mete un <b>+40% de tiempo</b>!</div>';
    } else {
        body = '<div class="spiz-popup-body">⚡ ¡Ufff rayote de Spiz! Recuperas un <b>+20% de energía</b>!</div>';
    }
    const word = '<div class="spiz-popup-word">SPIZ</div>';
    const popupEl = mobile ? spizPopupLeftEl : spizPopupEl;
    const otherEl = mobile ? spizPopupEl : spizPopupLeftEl;
    if (otherEl) otherEl.classList.add('hidden');
    popupEl.innerHTML = word + body;
    popupEl.classList.add('spiz-cyan');
    popupEl.classList.remove('hidden');

    if (popupTimeout) clearTimeout(popupTimeout);
    popupTimeout = setTimeout(() => {
        popupEl.classList.add('hidden');
        popupEl.classList.remove('spiz-cyan');
        if (isLuciferState) startLuciferMessages();
    }, 4000);
}

function maybeShowSpizTutorial(bonusTime) {
    // Ya NO se muestra nada en medio de la partida: solo se marca que el
    // jugador ha tocado el Spiz por primera vez, para encolar la explicación
    // al final de la partida (como todas las notificaciones importantes).
    spizFirstTouch = true;
}

function revealCell(r, c) {
    if (r < 0 || r >= size || c < 0 || c >= size || revealed[r][c] || turulos[r][c]) return;

    if (spizCell && spizCell.r === r && spizCell.c === c && !spizTriggered) return;

    // El flood NO atraviesa minas (tienen board 0): si se destaparan se revelaría
    // casi todo el tablero con un solo clic y se corrompería la condición de
    // victoria. Las bolsas solo se muestran al pisarlas (BOOM/Milagro/Syntek).
    if (mines.some(m => m.r === r && m.c === c)) return;

    revealed[r][c] = true;
    safeCellsRemaining--;

    if (board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) revealCell(r + dr, c + dc);
            }
        }
    }
}

function handleTurulo(r, c) {
    if (gameOver || revealed[r][c]) return;

    if (!gameStarted) startTimer();    if (spizCell && spizCell.r === r && spizCell.c === c && !spizTriggered) {
        triggerSpiz();
        revealCell(r, c);
        renderBoard();
        if ((gameMode === 'classic' || gameMode === 'hybrid') && safeCellsRemaining === 0) {
            winGame(true);
        }
        return;
    }

    if (!turulos[r][c]) {
        let usedTurulos = turulos.flat().filter(Boolean).length;
        let effective = usedTurulos - (imanUsedThisGame ? 1 : 0);
        if (effective >= numMines) return;
    }

    turulos[r][c] = !turulos[r][c];
    if (turulos[r][c]) {
        vibrate(30);
    }
    if (turulos[r][c] && mines.some(m => m.r === r && m.c === c)) {
        statsData.correctTurulos = (statsData.correctTurulos || 0) + 1;
        gameCorrectTurulos++;
        if (isLuciferState) gameCorrectTurulosLucifer++;
        checkAmuletUnlocks();
        handleCorrectFlagReveal(r, c);
        saveStats();
        renderHudAmulets();
    } else if (!turulos[r][c] && mines.some(m => m.r === r && m.c === c)) {
        statsData.correctTurulos = Math.max(0, (statsData.correctTurulos || 0) - 1);
        gameCorrectTurulos = Math.max(0, gameCorrectTurulos - 1);
        if (isLuciferState) gameCorrectTurulosLucifer = Math.max(0, gameCorrectTurulosLucifer - 1);
        saveStats();
        renderHudAmulets();
    }
    if (turulos[r][c] && isAmuletActive('iman') && !imanUsedThisGame) {
        imanUsedThisGame = true;
        showToast('🧲 ¡Turulo gratis por el Amuleto Imán!');
    }
    updateTuruloCount();
    renderBoard();

    if (gameMode === 'turulos' || gameMode === 'hybrid') {
        if (checkTuruloWin()) {
            winGame();
        }
    }

    if ((gameMode === 'classic' || gameMode === 'hybrid') && safeCellsRemaining === 0) {
        winGame(false);
    }
}

// --- PULSACIÓN LARGA EN MÓVIL (poner/quitar turulo) ---
// En el móvil no hay clic derecho: se mantiene pulsada una casilla para
// colocar/quitar un turulo. Se gestiona con eventos pointer sobre #board
// (delegación: las celdas se regeneran en cada renderBoard). Si el dedo se
// mueve (scroll horizontal del tablero 14/18) se cancela. Al dispararse se
// marca la casilla para que el `click` posterior de "suelta de dedo" no la
// destape (ver handleReveal).
let lpTimer = null;
let lpArmed = false;
let lpHandled = false;
let lpStartX = 0;
let lpStartY = 0;
let lpFiredCell = null;
let lpFiredUntil = 0;
const LP_MS = 420;
const LP_MOVE_TOLERANCE = 14;

function cellFromTarget(target) {
    const cell = target && target.closest ? target.closest('.cell') : null;
    if (!cell) return null;
    const r = parseInt(cell.dataset.r, 10);
    const c = parseInt(cell.dataset.c, 10);
    if (isNaN(r) || isNaN(c)) return null;
    return { r, c };
}

function cancelLongPress() {
    lpArmed = false;
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
}

function initMobileLongPress() {
    if (!boardEl) return;
    boardEl.addEventListener('pointerdown', (e) => {
        if (!isMobileView() || e.pointerType === 'mouse') return;
        lpFiredCell = null;
        lpHandled = false;
        const pos = cellFromTarget(e.target);
        if (!pos) return;
        lpArmed = true;
        lpStartX = e.clientX;
        lpStartY = e.clientY;
        if (lpTimer) clearTimeout(lpTimer);
        lpTimer = setTimeout(() => {
            lpTimer = null;
            if (!lpArmed) return;
            lpArmed = false;
            lpHandled = true;
            lpFiredCell = pos;
            lpFiredUntil = Date.now() + 2500;
            handleTurulo(pos.r, pos.c);
        }, LP_MS);
    });
    boardEl.addEventListener('pointermove', (e) => {
        if (!lpArmed || e.pointerType === 'mouse') return;
        if (Math.abs(e.clientX - lpStartX) > LP_MOVE_TOLERANCE || Math.abs(e.clientY - lpStartY) > LP_MOVE_TOLERANCE) {
            cancelLongPress();
        }
    });
    boardEl.addEventListener('pointerup', cancelLongPress);
    boardEl.addEventListener('pointercancel', cancelLongPress);
    boardEl.addEventListener('pointerleave', cancelLongPress);
}

// Efecto de "pisar": la casilla bajo el dedo (o el ratón) se resalta mientras
// te deslizas por el tablero, para notar dónde vas a tocar antes de pulsar.
function initBoardStepEffect() {
    if (!boardEl) return;
    let lastStepCell = null;
    const clearStep = () => {
        if (lastStepCell) {
            lastStepCell.classList.remove('board-step');
            lastStepCell = null;
        }
    };
    const stepTo = (el) => {
        const cell = el && el.closest ? el.closest('.cell') : null;
        if (cell && !cell.classList.contains('revealed')) {
            if (lastStepCell && lastStepCell !== cell) lastStepCell.classList.remove('board-step');
            cell.classList.add('board-step');
            lastStepCell = cell;
        } else {
            clearStep();
        }
    };
    boardEl.addEventListener('pointermove', (e) => stepTo(e.target));
    boardEl.addEventListener('pointerdown', (e) => stepTo(e.target));
    boardEl.addEventListener('pointerleave', clearStep);
    boardEl.addEventListener('pointerup', clearStep);
    boardEl.addEventListener('pointercancel', clearStep);
}

// Detecta si el teclado del móvil está abierto: con el teclado el viewport se
// encoge, y al cerrarse se restaura. Se marca .kb-open en <body> mientras esté
// abierto (los modales se compactan con CSS) y se QUITA en cuanto se cierra,
// aunque el input conserve el foco: el modal vuelve a su sitio solo.
function initKeyboardDetect() {
    const KB_MIN_DROP = 130;
    let baseline = window.innerHeight;
    const update = () => {
        const h = window.innerHeight;
        if (h > baseline) baseline = h;
        document.body.classList.toggle('kb-open', h < baseline - KB_MIN_DROP);
    };
    window.addEventListener('resize', update);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', update);
    update();
}

function checkTuruloWin() {
    return mines.every(({r, c}) => turulos[r][c] === true
        || (milagroDisarmed && milagroDisarmed[r + '-' + c])
        || (syntekDisarmed && syntekDisarmed[r + '-' + c]));
}

function buildWinBreakdown(spizLast = false) {
    let baseMultiplier = 1;
    if (initialTime === 120) baseMultiplier = 5;
    if (initialTime === 60) baseMultiplier = 20;

    const base = timeRemaining * baseMultiplier * 0.1;
    const parts = [];
    parts.push({ label: `Tiempo restante (${timeRemaining}s × ${baseMultiplier})`, amount: Math.floor(base) });
    if (isAmuletActive('rizao')) {
        const amt = Math.floor(base * RIZAO_PCT);
        if (amt !== 0) parts.push({ label: 'LopAmuleto Rizao (+10%)', amount: amt });
    }
    const dineroLevel = statsData.lopa.levels.dinero || 0;
    if (dineroLevel > 0) {
        const amt = Math.floor(base * DINERO_LEVEL_PCT * dineroLevel);
        if (amt !== 0) parts.push({ label: `Mejora de dinero (+${dineroLevel * 10}%)`, amount: amt });
    }
    if (isAmuletActive('sombra')) {
        const sub = parts.reduce((s, p) => s + p.amount, 0);
        const amt = -Math.round(sub * 0.1);
        if (amt !== 0) parts.push({ label: 'LopAmuleto Sombra (-10%)', amount: amt });
    }
    if (spizLast) parts.push({ label: 'Spiz guardado', amount: spizSavedBonus() });
    const baseFlag = turuloBonusPerFlag();
    const luciferTur = Math.round(gameCorrectTurulosLucifer * baseFlag * luciferTuruloMultiplier());
    const normalTur = Math.round((gameCorrectTurulos - gameCorrectTurulosLucifer) * baseFlag);
    if (normalTur > 0) parts.push({ label: `Turulos correctos (${gameCorrectTurulos - gameCorrectTurulosLucifer} × ${baseFlag})`, amount: normalTur });
    if (luciferTur > 0) parts.push({ label: `Turulos en modo Lucifer (${gameCorrectTurulosLucifer} × ${baseFlag} ×${luciferTuruloMultiplier()})`, amount: luciferTur });
    return { parts, total: parts.reduce((s, p) => s + p.amount, 0) };
}

function buildLossBreakdown() {
    const parts = [];
    const baseFlag = turuloBonusPerFlag();
    const luciferTur = Math.round(gameCorrectTurulosLucifer * baseFlag * luciferTuruloMultiplier());
    const normalTur = Math.round((gameCorrectTurulos - gameCorrectTurulosLucifer) * baseFlag);
    if (normalTur > 0) parts.push({ label: `Turulos correctos (${gameCorrectTurulos - gameCorrectTurulosLucifer} × ${baseFlag})`, amount: normalTur });
    if (luciferTur > 0) parts.push({ label: `Turulos en modo Lucifer (${gameCorrectTurulosLucifer} × ${baseFlag} ×${luciferTuruloMultiplier()})`, amount: luciferTur });
    return { parts, total: parts.reduce((s, p) => s + p.amount, 0) };
}

function renderResultEarnings(breakdown) {
    if (!resultEarningsEl) return;
    if (!breakdown.parts.length) {
        resultEarningsEl.innerHTML = `<div class="result-earn-none">No has cobrado nada esta vez 💸</div>`;
        return;
    }
    const rows = breakdown.parts.map(p => {
        const sign = p.amount > 0 ? '+' : '';
        return `<div class="result-earn-row${p.amount < 0 ? ' result-earn-neg' : ''}"><span class="result-earn-label">${escapeHtml(p.label)}</span><span class="result-earn-amount">${sign}${formatMoney(p.amount)}€</span></div>`;
    }).join('');
    const total = breakdown.total;
    const totalTxt = total > 0 ? `+${formatMoney(total)}€` : `${formatMoney(total)}€`;
    resultEarningsEl.innerHTML = rows + `<div class="result-earn-row result-earn-total"><span class="result-earn-label">Total</span><span class="result-earn-amount">${totalTxt}</span></div>`;
}

function renderResultAmulets() {
    if (!resultAmuletsEl || !resultAmuletsWrapEl) return;
    if (!resultAmuletIds.length) {
        resultAmuletsWrapEl.classList.add('hidden');
        resultAmuletsEl.innerHTML = '';
        return;
    }
    resultAmuletsWrapEl.classList.remove('hidden');
    resultAmuletsEl.innerHTML = resultAmuletIds.map(id => {
        const a = ALL_AMULETS[id];
        if (!a) return '';
        return `<button class="result-amulet-btn" type="button" data-amulet-id="${id}">${amuletVisual(id)}<span class="result-amulet-name">${a.name}</span></button>`;
    }).join('');
}

let lastResult = null;

function renderResultFromLast() {
    if (!lastResult) return;
    if (resultTitleEl) resultTitleEl.textContent = lastResult.title;
    if (resultSubtitleEl) resultSubtitleEl.textContent = lastResult.subtitle;
    if (resultExtraEl) resultExtraEl.textContent = lastResult.extra || '';
    renderResultEarnings(lastResult.breakdown);
    resultAmuletIds = lastResult.amuletIds.slice();
    renderResultAmulets();
    resultModalEl.classList.toggle('result-spiz', lastResult.spiz);
}

function openResultScreen({ title, subtitle, breakdown, spiz = false, extra = '' }) {
    if (!resultModalEl) return;
    closeInfoPopup();
    lastResult = {
        title, subtitle, breakdown, spiz, extra,
        amuletIds: gameEarnedAmulets.slice().filter(id => ALL_AMULETS[id] && statsData.lopa.owned[id])
    };
    showResultCard();
    closeAmuletModal();
    resultModalEl.classList.remove('hidden');
    if (resetBtn) resetBtn.classList.add('btn-reset-end');
}

function showResultCard() {
    if (!lastResult) return;
    renderResultFromLast();
    resultModalEl.classList.remove('hidden');
    if (resultReopenBtnEl) resultReopenBtnEl.classList.add('hidden');
    applyResultPos(loadResultPos());
}

function hideResultCard() {
    if (resultModalEl) resultModalEl.classList.add('hidden');
    if (resultReopenBtnEl) resultReopenBtnEl.classList.remove('hidden');
    applyResultPos(loadResultPos());
}

function clearLastResult() {
    lastResult = null;
    if (resultModalEl) resultModalEl.classList.add('hidden');
    if (resultReopenBtnEl) resultReopenBtnEl.classList.add('hidden');
    if (resetBtn) resetBtn.classList.remove('btn-reset-end');
}

// --- Resultado: arrastrar la tarjeta y el botón de reabrir (posición persistente) ---
const RESULT_POS_KEY = 'buscalopas_result_pos';
let resultDrag = null;
// Tras arrastrar, el click que dispara el navegador al soltar no debe
// desplegar la tarjeta: mover algo no cambia si está plegado o no.
let resultDragJustMoved = false;

function loadResultPos() {
    try {
        const p = JSON.parse(localStorage.getItem(RESULT_POS_KEY));
        return (p && typeof p.x === 'number' && typeof p.y === 'number') ? p : { x: 0, y: 0 };
    } catch (e) { return { x: 0, y: 0 }; }
}

function saveResultPos(p) {
    try { localStorage.setItem(RESULT_POS_KEY, JSON.stringify(p)); } catch (e) {}
}

function applyResultPos(p) {
    // En móvil la tarjeta queda fija en su posición por CSS (no se arrastra):
    // se ignora la posición guardada, que además podía dejar la tarjeta
    // fuera de sitio o pisando los botones tras un resize.
    if (isMobileView()) p = { x: 0, y: 0 };
    const card = resultModalEl ? resultModalEl.querySelector('.result-card') : null;
    if (card) {
        card.style.transform = `translate(${p.x}px, ${p.y}px)`;
        card.style.animation = (p.x !== 0 || p.y !== 0) ? 'none' : '';
    }
    if (resultReopenBtnEl) {
        resultReopenBtnEl.style.transform = `translateX(-50%) translate(${p.x}px, ${p.y}px)`;
    }
}

function startResultDrag(el, excludeInteractive) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
        // En móvil no se arrastra la tarjeta: se mantiene la posición fija.
        if (isMobileView()) return;
        if (e.button !== undefined && e.button !== 0) return;
        if (excludeInteractive && e.target.closest('button, a, input, textarea, select')) return;
        const pos = loadResultPos();
        resultDrag = { startX: e.clientX, startY: e.clientY, pos, moved: false };
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
}

document.addEventListener('pointermove', (e) => {
    if (!resultDrag) return;
    const dx = e.clientX - resultDrag.startX;
    const dy = e.clientY - resultDrag.startY;
    if (dx !== 0 || dy !== 0) resultDrag.moved = true;
    resultDrag.pos.x += dx;
    resultDrag.pos.y += dy;
    resultDrag.startX = e.clientX;
    resultDrag.startY = e.clientY;
    const maxX = window.innerWidth * 0.45;
    const minX = -window.innerWidth * 0.45;
    const maxY = window.innerHeight * 0.5;
    const minY = -window.innerHeight * 0.4;
    resultDrag.pos.x = Math.max(minX, Math.min(maxX, resultDrag.pos.x));
    resultDrag.pos.y = Math.max(minY, Math.min(maxY, resultDrag.pos.y));
    applyResultPos(resultDrag.pos);
});

document.addEventListener('pointerup', () => {
    if (!resultDrag) return;
    if (resultDrag.moved) {
        saveResultPos(resultDrag.pos);
        resultDragJustMoved = true;
        setTimeout(() => { resultDragJustMoved = false; }, 0);
    }
    resultDrag = null;
});

function turuloBonusPerFlag() {
    if (initialTime === 60) return 3;
    if (initialTime === 120) return 2;
    return 1;
}

function luciferTuruloMultiplier() {
    if (!isLuciferState && gameCorrectTurulosLucifer === 0) return 1;
    const lv = statsData.lopa.levels.lucifer || 0;
    return 2 * (1 + 0.5 * lv);
}

function calculateTuruloEarnings() {
    const base = turuloBonusPerFlag();
    const normal = (gameCorrectTurulos - gameCorrectTurulosLucifer) * base;
    const lucifer = gameCorrectTurulosLucifer * base * luciferTuruloMultiplier();
    return normal + lucifer;
}

function winGame(spizLast = false) {
    if (gameOver) return;
    gameOver = true;
    clearInterval(timerInterval);
    stopLuciferMessages();
    updateRelicDragonButton();

    const spizRevealBefore = spizRevealLevel();
    const breakdown = buildWinBreakdown(spizLast);
    const earnings = breakdown.total;
    addMoney(earnings);
    recordGameResult('win', earnings, spizLast);
    rechargeMilagro();
    commitPlayTime();
    settleGameCounters();
    checkAmuletUnlocks();
    checkShopUnlock();
    updateDifficultyOptions();
    updateSizeOptions();
    renderHudAmulets();
    loadRanking();

    const spizRevealAfter = spizRevealLevel();
    if (spizRevealAfter > spizRevealBefore) {
        markAcquired('reveal-lvl');
        showToast(`🔭 ¡Spiz Revelador nivel ${spizRevealAfter}! El Spiz revela ${spizRevealAfter * 2 + 1}×${spizRevealAfter * 2 + 1} al activarse.`, 'spiz');
    }
    if (statsData.wins === 1) {
        showNotification('🏆 ¡Primera victoria!', 'Dificultad Media desbloqueada (Javi Taxi).', 'La tienda se abre con 3 victorias o 5 min de juego.');
    }

    const title = spizLast ? ((TX.resultado && TX.resultado.spizGuardado) || '⚡ ¡Spiz guardado!') : ((TX.resultado && TX.resultado.victoria) || '🏆 ¡Victoria!');
    const subtitle = spizLast
        ? 'Que máquina, has aguantado sin el Spiz. Guárdatelo pa otra noche.'
        : `${heroData[gameMode].name} ha completado la misión. Te sobraron ${timeRemaining}s.`;
    const extra = `⏱️ Te sobraron ${timeRemaining}s de ${initialTime}s · ${size}×${size} · ${DIFF_LABELS[qualitySelect.value] || ''}`;
    showResultAfterNotices({ title, subtitle, breakdown, spiz: spizLast, extra });
}

function revealAllCells() {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            revealed[r][c] = true;
        }
    }
    renderBoard();
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', initGame);
backMenuBtn.addEventListener('click', showMenu);
const backMenuArrowBtn = document.getElementById('back-menu-arrow');
if (backMenuArrowBtn) backMenuArrowBtn.addEventListener('click', showMenu);

const spizTutOkBtn = document.getElementById('spiz-tutorial-ok');
if (spizTutOkBtn) {
    spizTutOkBtn.addEventListener('click', () => {
        const el = document.getElementById('spiz-tutorial');
        if (el) el.classList.add('hidden');
    });
}

// Arrastre del resultado (tarjeta por su asa y botón de reabrir)
const resultCardEl = resultModalEl ? resultModalEl.querySelector('.result-card') : null;
const resultDragHandleEl = resultCardEl ? resultCardEl.querySelector('.result-drag-handle') : null;
startResultDrag(resultDragHandleEl, true);
startResultDrag(resultReopenBtnEl, false);
applyResultPos(loadResultPos());

// Pulsación larga en móvil para poner/quitar turulos
initMobileLongPress();

// Efecto "pisar": resalta la casilla bajo el dedo/ratón al deslizar
initBoardStepEffect();

// Teclado del móvil: compacta los modales mientras esté abierto
initKeyboardDetect();

const hudTitleEl = document.querySelector('.hud-title');
const hudTitleVersionEl = document.getElementById('hud-title-version');
if (hudTitleVersionEl) hudTitleVersionEl.textContent = window.APP_VERSION || '2.3';
if (hudTitleEl) {
    hudTitleEl.addEventListener('mouseenter', () => hudTitleEl.classList.add('title-clickable'));
    hudTitleEl.addEventListener('mouseleave', () => hudTitleEl.classList.remove('title-clickable'));
}

// Usuario
const loginFormEl = document.getElementById('login-form');
if (loginFormEl) {
    loginFormEl.addEventListener('submit', (e) => { e.preventDefault(); confirmUser(); });
}

if (userRegisterBtn) {
    userRegisterBtn.addEventListener('click', registerUser);
}

if (userInputEl) {
    userInputEl.addEventListener('input', resetNamePassword);
}

// Al tocar Borrar/Generar el botón no debe quitarle el foco al input: si el
// teclado está abierto se queda abierto y si está cerrado no se abre (sin
// "flash" de abrir/cerrar ni saltos del formulario).
const preventFocusSteal = (e) => e.preventDefault();

if (userClearBtn) {
    userClearBtn.addEventListener('pointerdown', preventFocusSteal);
    userClearBtn.addEventListener('click', () => {
        userInputEl.value = '';
        resetNamePassword();
        clearModalError();
    });
}

if (userGenBtn) {
    userGenBtn.addEventListener('pointerdown', preventFocusSteal);
    userGenBtn.addEventListener('click', generateLopero);
}

if (userCloseBtn) {
    userCloseBtn.addEventListener('click', () => {
        if (!modalRequired) hideUserModal();
    });
}

// Botón de usuario + desplegable
if (hudUserBtn) {
    hudUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
}

if (userDropdownEl) {
    userDropdownEl.addEventListener('click', (e) => e.stopPropagation());
}

document.addEventListener('click', closeDropdown);

if (ddName) ddName.addEventListener('click', () => { closeDropdown(); openUserModal(false); });
if (ddPassword) ddPassword.addEventListener('click', () => { closeDropdown(); openPassModal(); });
if (ddInfo) ddInfo.addEventListener('click', () => { closeDropdown(); openInfoModal(); });
if (ddFriends) ddFriends.addEventListener('click', openFriendsModal);
if (ddLogout) ddLogout.addEventListener('click', logout);
if (ddLore) ddLore.addEventListener('click', () => { closeDropdown(); openLoreModal(); });
if (ddSettings) ddSettings.addEventListener('click', openSettingsModal);

// Modal de contraseña
const passFormEl = document.getElementById('pass-form');
if (passFormEl) {
    passFormEl.addEventListener('submit', (e) => { e.preventDefault(); confirmPassword(); });
}
if (passCloseBtn) passCloseBtn.addEventListener('click', () => {
    passModalEl.classList.add('hidden');
    hideConfirmBubble();
});
if (passUserEl) {
    passUserEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); passInputEl.focus(); } });
}

// Banner de registro (fijo hasta que se cierre)
if (registerBannerCloseBtn) {
    registerBannerCloseBtn.addEventListener('click', () => {
        localStorage.setItem('buscalopas_regbanner_hide', '1');
        registerBannerEl.classList.add('hidden');
    });
}
renderRegisterBanner();

// Modal de Info
if (infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModalEl.classList.add('hidden'));
if (infoMoreBtn) {
    infoMoreBtn.addEventListener('click', () => {
        const hidden = infoMoreEl.classList.toggle('hidden');
        infoMoreBtn.textContent = hidden ? 'Más estadísticas ▾' : 'Menos estadísticas ▴';
    });
}

// Modal de Lore
if (loreCloseBtn) loreCloseBtn.addEventListener('click', () => loreModalEl.classList.add('hidden'));
if (loreBackBtn) loreBackBtn.addEventListener('click', closeLoreView);
if (loreListEl) {
    loreListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.lore-item');
        if (item) showLoreEntry(item.dataset.loreId);
    });
}

// Texto de Farlopín del menú: se puede cerrar con la X; se vuelve a leer desde
// el Lore (📜). El texto vive en textos.js (TX.lore.farlopin).
const storyBoxEl = document.querySelector('.story-box');
const storyBoxTextEl = document.querySelector('.story-box-text');
const storyCloseBtn = document.getElementById('story-close-btn');
if (storyBoxTextEl && TX.lore && TX.lore.farlopin) {
    storyBoxTextEl.innerHTML = TX.lore.farlopin.desc;
}
if (storyBoxEl && storyCloseBtn) {
    if (localStorage.getItem('buscalopas_story_hidden') === '1') storyBoxEl.classList.add('hidden');
    storyCloseBtn.addEventListener('click', () => {
        storyBoxEl.classList.add('hidden');
        localStorage.setItem('buscalopas_story_hidden', '1');
    });
}

// Cerrar modales clicando en el fondo (fuera del globo).
// Los importantes (Tienda, tutorial del Spiz, resultado) NO se cierran así.
const CLICK_OUTSIDE_MODALS = {
    'user-modal': () => { if (!modalRequired) hideUserModal(); },
    'pass-modal': () => { passModalEl.classList.add('hidden'); hideConfirmBubble(); },
    'info-modal': () => infoModalEl.classList.add('hidden'),
    'friends-modal': () => { friendsModalEl.classList.add('hidden'); hideConfirmBubble(); },
    'player-modal': () => playerModalEl.classList.add('hidden'),
    'suggestions-modal': () => suggestionsModalEl.classList.add('hidden'),
    'settings-modal': () => settingsModalEl.classList.add('hidden'),
    'lore-modal': () => { if (loreModalEl) loreModalEl.classList.add('hidden'); },
    'shop-modal': () => shopModalEl.classList.add('hidden'),
    'amulet-modal': () => closeAmuletModal()
};
for (const [id, closeFn] of Object.entries(CLICK_OUTSIDE_MODALS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('mousedown', (e) => {
        if (e.target === el) closeFn();
    });
}

// Clic en el título "Buscalopas": cierra cualquier modal/globo que haya abierto
// (tienda, notas, panel de LopAmuletos, chat...) y va al menú principal.
if (hudTitleEl) {
    hudTitleEl.addEventListener('click', () => {
        for (const closeFn of Object.values(CLICK_OUTSIDE_MODALS)) closeFn();
        closeMobilePanels();
        closeHudAmuletsPanel();
        showMenu();
    });
}

// En móvil, clic fuera de los globos flotantes (chat / amigos / ranking) y del
// panel de LopAmuletos también los cierra (convención móvil). Los clics DENTRO
// de un modal no tocan los paneles: así la X del visor de un LopAmuleto (abierto
// desde el panel) vuelve al panel y no al menú.
document.addEventListener('mousedown', (e) => {
    if (!isMobileView()) return;
    const chatBtn = document.getElementById('chat-open-btn');
    const reqBtn = document.getElementById('requests-open-btn');
    const rankBtn = document.getElementById('ranking-toggle-btn');
    const allBtn = document.getElementById('hud-amulets-all');
    const insideChat = chatPanelEl && chatPanelEl.contains(e.target);
    const insideReq = requestsDropdownEl && requestsDropdownEl.contains(e.target);
    const insideRank = rankingPanelEl && rankingPanelEl.contains(e.target);
    const insideAll = hudAmuletsPanelEl && hudAmuletsPanelEl.contains(e.target);
    const insideModal = !!(e.target.closest && e.target.closest('.modal, .notice-modal, .confirm-bubble'));
    const onBtn = (chatBtn && chatBtn.contains(e.target)) || (reqBtn && reqBtn.contains(e.target)) || (rankBtn && rankBtn.contains(e.target)) || (allBtn && allBtn.contains(e.target));
    if (insideChat || insideReq || insideRank || insideAll || insideModal || onBtn) return;
    closeMobilePanels();
    closeHudAmuletsPanel();
});

// Tienda
if (hudShopBtn) hudShopBtn.addEventListener('click', openShopModal);
const menuDealerBtn = document.getElementById('menu-dealer-btn');
if (menuDealerBtn) menuDealerBtn.addEventListener('click', openShopModal);
if (shopCloseBtn) shopCloseBtn.addEventListener('click', () => shopModalEl.classList.add('hidden'));
if (hudMoneyBtn) {
    hudMoneyBtn.addEventListener('click', () => {
        if (statsData.lopa.shopUnlocked) openShopModal();
    });
}
if (shopListEl) {
    shopListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.shop-buy');
        if (!btn) return;
        const item = SHOP_ITEMS.find(i => i.id === btn.dataset.id);
        if (item) buyShopItem(item);
    });
}

// --- iPod: reproductor fijo sobre el fondo (interactivo directamente) ---
if (ipodMinimizeBtn) {
    ipodMinimizeBtn.addEventListener('click', () => {
        setIpodMinimized(true);
    });
}
if (ipodShuffleEl) {
    ipodShuffleEl.addEventListener('click', () => {
        if (ipodMinimized) setIpodMinimized(false);
    });
}
if (ipodShufflePlayBtn) {
    ipodShufflePlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = getActiveTrack();
        if (!t || !bgMusic) return;
        if (bgMusic.paused) playSelectedTrack();
        else bgMusic.pause();
    });
}
if (ipodShufflePrevBtn) {
    ipodShufflePrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const unlocked = IPOD_TRACKS.filter(ipodTrackUnlocked);
        if (!unlocked.length) return;
        let idx = unlocked.findIndex(x => x.id === statsData.ipodTrack);
        idx = (idx - 1 + unlocked.length) % unlocked.length;
        selectIpodTrack(unlocked[idx].id);
    });
}
if (ipodShuffleNextBtn) {
    ipodShuffleNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const unlocked = IPOD_TRACKS.filter(ipodTrackUnlocked);
        if (!unlocked.length) return;
        let idx = unlocked.findIndex(x => x.id === statsData.ipodTrack);
        idx = (idx + 1) % unlocked.length;
        selectIpodTrack(unlocked[idx].id);
    });
}
if (ipodTrackListEl) {
    ipodTrackListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.ipod-track-item');
        if (!item) return;
        selectIpodTrack(item.dataset.id);
    });
}
if (ipodWheelMenuBtn) {
    ipodWheelMenuBtn.addEventListener('click', () => {
        if (ipodScreenEl) {
            const mini = ipodScreenEl.classList.toggle('ipod-screen-mini');
            showToast(mini ? '🎵 Solo canción actual' : '🎵 Lista de canciones');
        }
    });
}
if (ipodWheelPlayBtn) {
    ipodWheelPlayBtn.addEventListener('click', () => {
        const t = getActiveTrack();
        if (!t || !bgMusic) return;
        if (bgMusic.paused) playSelectedTrack();
        else bgMusic.pause();
    });
}
if (ipodWheelPrevBtn) {
    ipodWheelPrevBtn.addEventListener('click', () => {
        const unlocked = IPOD_TRACKS.filter(ipodTrackUnlocked);
        if (!unlocked.length) return;
        let idx = unlocked.findIndex(x => x.id === statsData.ipodTrack);
        idx = (idx - 1 + unlocked.length) % unlocked.length;
        selectIpodTrack(unlocked[idx].id);
    });
}
if (ipodWheelNextBtn) {
    ipodWheelNextBtn.addEventListener('click', () => {
        const unlocked = IPOD_TRACKS.filter(ipodTrackUnlocked);
        if (!unlocked.length) return;
        let idx = unlocked.findIndex(x => x.id === statsData.ipodTrack);
        idx = (idx + 1) % unlocked.length;
        selectIpodTrack(unlocked[idx].id);
    });
}

// --- Popup de info (Spiz / Lucifer): cierra con botón o clicando fuera ---
if (infoPopupOkBtn) infoPopupOkBtn.addEventListener('click', closeInfoPopup);
if (infoPopupEl) {
    infoPopupEl.addEventListener('mousedown', (e) => {
        if (e.target === infoPopupEl) closeInfoPopup();
    });
}
// Filas clicables del menú Info
ipodInfoRows.forEach((row) => {
    if (!row) return;
    row.addEventListener('click', () => {
        if (row.id === 'info-spiz-row') {
            openInfoPopup({
                title: (TX.spizInfo && TX.spizInfo.title) || '⚡ El Spiz',
                desc: (TX.spizInfo && TX.spizInfo.desc) || '',
                img: 'img/spiz.jpg'
            });
        } else {
            openInfoPopup({
                title: (TX.luciferInfo && TX.luciferInfo.title) || '🔥 Modo Lucifer',
                desc: (TX.luciferInfo && TX.luciferInfo.desc) || '',
                emoji: '🔥'
            });
        }
    });
});

// --- Cola de notificaciones: clic fuera también avanza/cierra ---
if (noticeModalEl) {
    noticeModalEl.addEventListener('mousedown', (e) => {
        if (e.target === noticeModalEl && noticeNextBtn) noticeNextBtn.click();
    });
}

startMusicTimeTracking();

// Amuletos: tooltip al pasar el ratón y visor al hacer clic
const hudAmuletsEl = document.getElementById('hud-amulets');
if (hudAmuletsEl) {
    hudAmuletsEl.addEventListener('click', (e) => {
        const allBtn = e.target.closest('#hud-amulets-all');
        if (allBtn) {
            toggleHudAmuletsPanel();
            return;
        }
        const el = e.target.closest('.amu');
        if (!el) return;
        openAmuletModal(el.dataset.amuletId);
    });
    hudAmuletsEl.addEventListener('mouseover', (e) => {
        // En táctil no hay "hover": al tocar un LopAmuleto se abre el visor con
        // toda la info y el tooltip de hover sobraría (redundante).
        if (isMobileView() || ('ontouchstart' in window)) return;
        const el = e.target.closest('.amu');
        if (el) showAmuletTooltip(el.dataset.amuletId, e);
    });
    hudAmuletsEl.addEventListener('mousemove', (e) => {
        if (!amuletTooltipEl.classList.contains('hidden')) positionAmuletTooltip(e);
    });
    hudAmuletsEl.addEventListener('mouseout', (e) => {
        if (e.target.closest('.amu')) hideAmuletTooltip();
    });
}
const hudAmuletsPanelEl = document.getElementById('hud-amulets-panel');
if (hudAmuletsPanelEl) {
    hudAmuletsPanelEl.addEventListener('click', (e) => {
        const pin = e.target.closest('.hap-pin');
        if (pin) {
            togglePinAmulet(pin.dataset.pinId);
            return;
        }
        const el = e.target.closest('.hap-item');
        if (!el) return;
        // Se abre el visor SIN cerrar el panel: al cerrar el modal con la X se
        // vuelve al panel de LopAmuletos, no al menú.
        openAmuletModal(el.dataset.amuletId);
    });
    hudAmuletsPanelEl.addEventListener('mousedown', (e) => {
        if (e.target === hudAmuletsPanelEl) closeHudAmuletsPanel();
    });
}
if (amuletCloseBtn) amuletCloseBtn.addEventListener('click', closeAmuletModal);
if (amuletOkBtn) amuletOkBtn.addEventListener('click', closeAmuletModal);
if (amuletToggleBtn) {
    amuletToggleBtn.addEventListener('click', () => {
        const id = amuletModalEl.dataset.currentId;
        if (id) {
            toggleAmulet(id);
            openAmuletModal(id);
        }
    });
}

// Notas
if (ddSuggestions) ddSuggestions.addEventListener('click', openSuggestionsModal);
if (suggestionsCloseBtn) suggestionsCloseBtn.addEventListener('click', () => suggestionsModalEl.classList.add('hidden'));
if (suggestionsSaveBtn) suggestionsSaveBtn.addEventListener('click', sendSuggestion);

// Pantalla de resultado de partida (flotante, no bloquea: Reiniciar/Menú siguen usables)
if (resultCloseXEl) resultCloseXEl.addEventListener('click', hideResultCard);
if (resultReopenBtnEl) resultReopenBtnEl.addEventListener('click', () => {
    if (resultDragJustMoved) return;
    showResultCard();
});
if (resultAmuletsEl) {
    resultAmuletsEl.addEventListener('click', (e) => {
        const el = e.target.closest('.result-amulet-btn');
        if (!el) return;
        openAmuletModal(el.dataset.amuletId, true);
    });
}

// Amigos y chat
if (friendsCloseBtn) friendsCloseBtn.addEventListener('click', () => {
    friendsModalEl.classList.add('hidden');
    hideConfirmBubble();
});
if (friendsTabsEl) {
    friendsTabsEl.forEach(t => t.addEventListener('click', () => {
        switchFriendsTab(t.dataset.tab);
        hideConfirmBubble();
    }));
}
if (friendsAddBtn) {
    friendsAddBtn.addEventListener('click', async () => {
        const ok = await addFriend(friendsAddInputEl.value);
        if (ok) friendsAddInputEl.value = '';
    });
}
if (friendsAddInputEl) {
    friendsAddInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') friendsAddBtn.click();
    });
}
if (friendsSearchInputEl) {
    let searchTimer = null;
    friendsSearchInputEl.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(async () => {
            const term = friendsSearchInputEl.value.trim();
            const names = await searchUsers(term);
            renderSearchResults(names);
            if (term && !names.length) {
                showToast(`No existe ningún lopero con "${term}" 😕`);
            }
        }, 250);
    });
}
if (friendsNavEl) {
    friendsNavEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.friends-nav-btn');
        if (btn) selectFriendDetail(btn.dataset.name);
    });
}
if (friendsDetailChatBtn) {
    friendsDetailChatBtn.addEventListener('click', () => {
        if (!selectedFriend) return;
        friendsModalEl.classList.add('hidden');
        openChatWith(selectedFriend);
    });
}
if (friendsDetailInfoBtn) {
    friendsDetailInfoBtn.addEventListener('click', () => {
        if (!selectedFriend) return;
        openPlayerModal(selectedFriend);
    });
}
if (friendsDetailRemoveBtn) {
    friendsDetailRemoveBtn.addEventListener('click', () => {
        if (!selectedFriend) return;
        showConfirmBubble(`¿Seguro que quieres eliminar a ${selectedFriend}?`, () => removeFriend(selectedFriend));
    });
}
if (confirmBubbleYesBtn) {
    confirmBubbleYesBtn.addEventListener('click', () => {
        const cb = confirmBubbleCb;
        hideConfirmBubble();
        if (cb) cb();
    });
}
if (confirmBubbleNoBtn) confirmBubbleNoBtn.addEventListener('click', hideConfirmBubble);
if (friendsRequestsEl) {
    friendsRequestsEl.addEventListener('click', (e) => {
        const accept = e.target.closest('.friend-accept');
        const decline = e.target.closest('.friend-decline');
        const cancel = e.target.closest('.friend-cancel');
        if (accept) acceptFriend(accept.dataset.name);
        else if (decline) declineFriend(decline.dataset.name);
        else if (cancel) cancelRequest(cancel.dataset.name);
    });
}
if (friendsSearchResultsEl) {
    friendsSearchResultsEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('.friend-add');
        if (!btn) return;
        const ok = await addFriend(btn.dataset.name);
        if (ok) renderSearchResults(await searchUsers(friendsSearchInputEl.value));
    });
}
if (playerCloseBtn) playerCloseBtn.addEventListener('click', () => playerModalEl.classList.add('hidden'));
if (playerAddFriendBtn) {
    playerAddFriendBtn.addEventListener('click', async () => {
        if (playerAddFriendBtn.disabled || !isLoggedIn()) return;
        const target = playerNameEl.textContent;
        if (playerModalEl.dataset.accept) {
            await acceptFriend(target);
            playerModalEl.classList.add('hidden');
            return;
        }
        const ok = await addFriend(target);
        if (ok) {
            playerAddFriendBtn.textContent = '✓ Ya es tu amigo';
            playerAddFriendBtn.disabled = true;
        } else {
            playerModalEl.classList.add('hidden');
        }
    });
}
if (chatOpenBtn) chatOpenBtn.addEventListener('click', toggleChatPanel);
if (chatBackBtn) chatBackBtn.addEventListener('click', goChatList);
if (rankingToggleBtn) rankingToggleBtn.addEventListener('click', toggleRankingPanel);
if (requestsAddBtnEl && requestsAddInputEl) {
    requestsAddBtnEl.addEventListener('click', () => {
        addFriend(requestsAddInputEl.value);
        requestsAddInputEl.value = '';
    });
    requestsAddInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addFriend(requestsAddInputEl.value);
            requestsAddInputEl.value = '';
        }
    });
}
if (requestsOpenBtn) requestsOpenBtn.addEventListener('click', toggleRequestsDropdown);
if (requestsListEl) {
    requestsListEl.addEventListener('click', (e) => {
        const accept = e.target.closest('.friend-accept');
        const decline = e.target.closest('.friend-decline');
        const cancel = e.target.closest('.friend-cancel');
        const ddFriend = e.target.closest('.dd-friend');
        if (accept) acceptFriend(accept.dataset.name);
        else if (decline) declineFriend(decline.dataset.name);
        else if (cancel) cancelRequest(cancel.dataset.name);
        else if (ddFriend) {
            requestsDropdownEl.classList.add('hidden');
            openChatWith(ddFriend.dataset.name);
        }
    });
}
if (chatCloseBtn) chatCloseBtn.addEventListener('click', closeChatPanel);
if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
if (chatInputEl) {
    chatInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}
if (chatFriendsEl) {
    chatFriendsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.chat-friend');
        if (btn) openChatWith(btn.dataset.name);
    });
}
if (chatRequestsEl) {
    chatRequestsEl.addEventListener('click', (e) => {
        const accept = e.target.closest('.friend-accept');
        const decline = e.target.closest('.friend-decline');
        if (accept) acceptFriend(accept.dataset.name);
        else if (decline) declineFriend(decline.dataset.name);
    });
}

// Reliquia del Dragon Narco
if (relicDragonBtnEl) relicDragonBtnEl.addEventListener('click', useRelicDragon);
if (relicSyntekBtnEl) relicSyntekBtnEl.addEventListener('click', useRelicSyntek);

// Ranking: clic en un jugador → perfil + agregar amigo
if (rankingListEl) {
    rankingListEl.addEventListener('click', (e) => {
        const row = e.target.closest('.lb-row');
        if (row && row.dataset.name) {
            if (rankingPanelEl) rankingPanelEl.classList.remove('ranking-open');
            openPlayerModal(row.dataset.name);
        }
    });
}

// X del ranking en móvil (además se cierra clicando fuera)
if (rankingCloseBtn) {
    rankingCloseBtn.addEventListener('click', () => {
        if (rankingPanelEl) rankingPanelEl.classList.remove('ranking-open');
    });
}

// Carga inicial de datos
function applyTextosToSelects() {
    if (gameModeSelect) {
        for (const [v, label] of Object.entries(TX.modos || {})) {
            const opt = gameModeSelect.querySelector(`option[value="${v}"]`);
            if (opt) opt.textContent = label;
        }
    }
    lockUnavailableModes();
}

// Los modos que no son Farlopín (classic) salen bloqueados con candado
function lockUnavailableModes() {
    if (!gameModeSelect) return;
    for (const v of ['turulos', 'hybrid']) {
        const opt = gameModeSelect.querySelector(`option[value="${v}"]`);
        if (!opt) continue;
        opt.disabled = true;
        opt.title = '🔒 Próximamente';
        if (opt.textContent.indexOf('🔒') === -1) opt.textContent += ' 🔒';
    }
    if (gameModeSelect.value === 'turulos' || gameModeSelect.value === 'hybrid') {
        gameModeSelect.value = 'classic';
    }
}

applyTextosToSelects();
updateWalletDisplay();
updateDropdown();
renderChatOpenButton();

window.addEventListener('resize', () => {
    applyBoardCellSize();
    if (gameScreen && !gameScreen.classList.contains('hidden')) renderBoard();
    positionRelicButton();
});

initSupabase().then(() => {
    loadFriends().then(() => {
        if (isLoggedIn()) startFriendsPolling();
    });
    (function initUser() {
        const name = getUsername();
        if (name) {
            setUsername(name);
            onUserReady();
        } else {
            openUserModal(true);
        }
        loadRanking();
    })();
});
