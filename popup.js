// ─── Utils ───────────────────────────────────────────────────────────────────

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, '0')}s`;
  return `${secs}s`;
}

const COLORS = [
  'var(--accent)',
  'var(--green)',
  'var(--blue)',
  'var(--yellow)',
  'var(--pink)',
  'var(--orange)',
  'var(--red)',
];

function getColor(index) {
  return COLORS[index % COLORS.length];
}

// ─── State ───────────────────────────────────────────────────────────────────

let currentPeriod = 'today'; // 'today' | 'week'

// ─── Rendering ───────────────────────────────────────────────────────────────

function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // "2025-04-14"
}

function getWeekKeys() {
  const keys = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(d.toISOString().split('T')[0]);
  }
  return keys;
}

function getDataForPeriod(allData, period) {
  // allData structure: { "2025-04-14": { "youtube.com": 12000, ... }, ... }
  const keys = period === 'today' ? [getTodayKey()] : getWeekKeys();
  const merged = {};
  for (const key of keys) {
    const dayData = allData[key] || {};
    for (const [site, time] of Object.entries(dayData)) {
      merged[site] = (merged[site] || 0) + time;
    }
  }
  return merged;
}

function render(allData) {
  const data = getDataForPeriod(allData, currentPeriod);
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const totalMs = sorted.reduce((sum, [, t]) => sum + t, 0);
  const maxMs = sorted[0]?.[1] || 1;

  // Total
  document.getElementById('total-time').textContent = totalMs > 0 ? formatTime(totalMs) : '0s';
  document.getElementById('total-sub').textContent =
    sorted.length > 0
      ? `across ${sorted.length} site${sorted.length > 1 ? 's' : ''}`
      : currentPeriod === 'today' ? 'No activity today' : 'No activity this week';

  // List
  const list = document.getElementById('sites-list');
  list.innerHTML = '';

  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">No data yet.<br/>Start browsing!</div>`;
    return;
  }

  sorted.forEach(([site, time], i) => {
    const pct = Math.round((time / maxMs) * 100);
    const color = getColor(i);

    const row = document.createElement('div');
    row.className = 'site-row';
    row.style.animationDelay = `${i * 30}ms`;
    row.innerHTML = `
      <span class="site-rank">${i + 1}</span>
      <img
        class="site-favicon"
        src="https://www.google.com/s2/favicons?domain=${site}&sz=32"
        alt=""
        onerror="this.style.visibility='hidden'"
      />
      <div class="site-info">
        <div class="site-name">${site}</div>
        <div class="site-bar-wrap">
          <div class="site-bar" style="width:0%; background:${color}" data-pct="${pct}"></div>
        </div>
      </div>
      <span class="site-time">${formatTime(time)}</span>
    `;
    list.appendChild(row);

    // Animate bar after DOM insertion
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.querySelector('.site-bar').style.width = pct + '%';
      });
    });
  });
}

// ─── Load ────────────────────────────────────────────────────────────────────

function load() {
  chrome.storage.local.get(['timeData'], (result) => {
    render(result.timeData || {});
  });
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    load();
  });
});

// ─── Reset (avec confirm) ─────────────────────────────────────────────────────

document.getElementById('btn-reset').addEventListener('click', () => {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <p>Reset all data?</p>
      <small>This action cannot be undone.</small>
      <div class="confirm-actions">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-confirm">Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.btn-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.btn-confirm').addEventListener('click', () => {
    chrome.storage.local.set({ timeData: {} }, () => {
      overlay.remove();
      load();
    });
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

load();
