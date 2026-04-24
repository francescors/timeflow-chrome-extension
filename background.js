// ─────────────────────────────────────────────────────────────────────────────
// TimeFlow — background.js
//
// POURQUOI storage.session ?
// En Manifest V3, le service worker est tué par Chrome après ~30s d'inactivité.
// Toutes les variables JS (currentSite, startTime...) sont perdues à chaque réveil.
// chrome.storage.session persiste pendant toute la session du navigateur
// et survit aux redémarrages du service worker → tracking fiable.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Session state helpers ────────────────────────────────────────────────────

async function getSession() {
  const s = await chrome.storage.session.get(['currentSite', 'startTime', 'isFocused']);
  return {
    currentSite: s.currentSite ?? null,
    startTime:   s.startTime   ?? null,
    isFocused:   s.isFocused   ?? true,
  };
}

async function setSession(patch) {
  await chrome.storage.session.set(patch);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHostname(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

async function saveTime(site, duration) {
  if (!site || duration < 1000) return;
  const result = await chrome.storage.local.get(['timeData']);
  const allData = result.timeData || {};
  const today = getTodayKey();
  if (!allData[today]) allData[today] = {};
  allData[today][site] = (allData[today][site] || 0) + duration;
  await chrome.storage.local.set({ timeData: allData });
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function flushCurrent() {
  // Sauvegarde le temps accumulé depuis startTime pour currentSite
  const { currentSite, startTime } = await getSession();
  if (currentSite && startTime) {
    await saveTime(currentSite, Date.now() - startTime);
  }
}

async function handleTabChange(url) {
  await flushCurrent();
  const hostname = getHostname(url);
  const { isFocused } = await getSession();
  await setSession({
    currentSite: hostname,
    startTime: hostname && isFocused ? Date.now() : null,
  });
}

async function pauseTracking() {
  await flushCurrent();
  await setSession({ startTime: null, isFocused: false });
}

async function resumeTracking() {
  const { currentSite } = await getSession();
  await setSession({
    isFocused: true,
    startTime: currentSite ? Date.now() : null,
  });
}

// ─── Event listeners ─────────────────────────────────────────────────────────

// Changement d'onglet actif
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await handleTabChange(tab.url);
  } catch {}
});

// Navigation dans l'onglet courant
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.active || changeInfo.status !== 'complete') return;
  await handleTabChange(tab.url);
});

// Fermeture d'onglet → flush + reset
chrome.tabs.onRemoved.addListener(async () => {
  await flushCurrent();
  await setSession({ currentSite: null, startTime: null });
});

// Focus / unfocus de la fenêtre Chrome
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await pauseTracking();
  } else {
    await resumeTracking();
  }
});

// Idle detection (AFK, écran verrouillé)
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'active') {
    await resumeTracking();
  } else {
    await pauseTracking();
  }
});

// ─── Init au démarrage du service worker ──────────────────────────────────────

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) await handleTabChange(tab.url);
  } catch {}
}

init();
