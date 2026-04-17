/**
 * popup.js
 * Logic for the HPP toolbar popup.
 * Three tabs: Status, Sites, Settings.
 *
 * fix 1.6: GET_SESSION now passes tabId explicitly so background can route correctly.
 * fix 1.7: re-attest determines rpId from enrolled record or computeRpId, not null.
 * fix 7.3: all sendMessage calls wrapped defensively against unavailable service worker.
 */

'use strict';

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`pane-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'sites')    loadSites();
    if (tab.dataset.tab === 'settings') loadSettings();
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// fix 7.3: defensive sendMessage — returns null if service worker is unavailable
async function safeSend(msg) {
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (_) {
    return null;
  }
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// fix 1.7: compute rpId from origin using eTLD+1 logic
const MULTI_PART_TLDS = new Set([
  'co.uk','co.jp','co.nz','co.za','co.in','co.kr',
  'com.au','com.br','com.mx','com.ar','com.cn',
  'org.uk','net.uk','gov.uk','ac.uk','me.uk',
  'gov.au','edu.au','id.au','ne.jp','or.jp','ac.jp',
]);
function computeRpId(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length < 2) return hostname;
    if (parts.length >= 3 && MULTI_PART_TLDS.has(parts.slice(-2).join('.'))) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  } catch { return null; }
}

// ── Status tab ────────────────────────────────────────────────────────────────
let countdownInterval = null;

async function loadStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { showInactive(); return; }

  // fix 1.6: pass tabId explicitly
  const resp = await safeSend({ type: 'GET_SESSION', tabId: tab.id });

  if (resp?.active) showActive(resp);
  else              showInactive();
}

function showActive(session) {
  document.getElementById('status-active').style.display  = 'block';
  document.getElementById('status-inactive').style.display = 'none';
  document.getElementById('status-rp').textContent    = session.rp_id ?? '—';
  document.getElementById('cert-id').textContent      = (session.cert_id ?? '').substring(0, 8) + '…';
  document.getElementById('cert-rp').textContent      = session.rp_id ?? '—';
  document.getElementById('cert-issued').textContent  = session.issued_at
    ? new Date(session.issued_at).toLocaleTimeString() : '—';
  startCountdown(session.expiry_ms);
}

function showInactive() {
  document.getElementById('status-active').style.display  = 'none';
  document.getElementById('status-inactive').style.display = 'block';
  if (countdownInterval) clearInterval(countdownInterval);
}

function startCountdown(expiryMs) {
  if (countdownInterval) clearInterval(countdownInterval);
  function tick() {
    const remaining = Math.max(0, expiryMs - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const el   = document.getElementById('countdown');
    el.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    el.classList.toggle('expiring', remaining < 5 * 60 * 1000);
    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot ' + (remaining < 5 * 60 * 1000 ? 'expiring' : 'active');
    if (remaining === 0) { clearInterval(countdownInterval); showInactive(); }
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

document.getElementById('btn-reattest').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // fix 1.7: determine rpId from enrolled record or compute from origin
  const pageOrigin = new URL(tab.url).origin;
  const sitesResp  = await safeSend({ type: 'GET_ENROLLED_SITES' });
  const enrolled   = sitesResp?.sites?.find(s => s.origin === pageOrigin);
  const rpId       = enrolled?.rp_id ?? computeRpId(pageOrigin);

  if (!rpId) return;

  await safeSend({
    type:   'VERIFY_PRESENCE',
    origin: pageOrigin,
    rpId,
    tabId:  tab.id,
  });
  window.close();
});

document.getElementById('btn-refresh').addEventListener('click', loadStatus);
document.getElementById('btn-refresh-inactive').addEventListener('click', loadStatus);

// ── Sites tab ─────────────────────────────────────────────────────────────────

async function loadSites() {
  const resp  = await safeSend({ type: 'GET_ENROLLED_SITES' });
  renderSites(resp?.sites ?? []);
}

function renderSites(sites) {
  const list   = document.getElementById('sites-list');
  const search = document.getElementById('site-search').value.toLowerCase();
  const filtered = sites.filter(s => s.origin.toLowerCase().includes(search));

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-sites">No enrolled sites yet.</div>';
    return;
  }

  list.innerHTML = '';
  for (const site of filtered) {
    const row  = document.createElement('div');
    row.className = 'site-row';
    const date = site.enrolled_at ? new Date(site.enrolled_at).toLocaleDateString() : '—';
    row.innerHTML = `
      <div class="site-favicon">🔐</div>
      <div style="flex:1;overflow:hidden">
        <div class="site-origin" title="${escHtml(site.origin)}">${escHtml(site.origin)}</div>
        <div class="site-date">Enrolled ${escHtml(date)}</div>
      </div>
      <button class="revoke-btn" data-origin="${escHtml(site.origin)}">Revoke</button>
    `;
    row.querySelector('.revoke-btn').addEventListener('click', async (e) => {
      const origin = e.target.dataset.origin;
      if (!confirm(`Remove HPP enrollment for ${origin}?`)) return;
      await safeSend({ type: 'REVOKE_SITE', origin });
      loadSites();
    });
    list.appendChild(row);
  }
}

document.getElementById('site-search').addEventListener('input', async () => {
  const resp = await safeSend({ type: 'GET_ENROLLED_SITES' });
  renderSites(resp?.sites ?? []);
});

document.getElementById('btn-enroll-current').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await safeSend({ type: 'ENROLL_REQUEST', origin: new URL(tab.url).origin, tabId: tab.id });
    window.close();
  }
});

// ── Settings tab ──────────────────────────────────────────────────────────────

async function loadSettings() {
  const resp = await safeSend({ type: 'GET_SETTINGS' });
  const s    = resp?.settings ?? {};
  document.getElementById('toggle-active').checked  = s.hpp_active !== false;
  document.getElementById('toggle-privacy').checked = s.privacy_mode === true;
  document.getElementById('toggle-debug').checked   = s.debug_logging === true;
  document.getElementById('select-lifetime').value  = String(s.certificate_lifetime ?? 3600000);
}

async function saveSettings() {
  await safeSend({
    type: 'UPDATE_SETTINGS',
    settings: {
      hpp_active:           document.getElementById('toggle-active').checked,
      privacy_mode:         document.getElementById('toggle-privacy').checked,
      debug_logging:        document.getElementById('toggle-debug').checked,
      certificate_lifetime: parseInt(document.getElementById('select-lifetime').value),
    },
  });
}

['toggle-active','toggle-privacy','toggle-debug','select-lifetime'].forEach(id => {
  document.getElementById(id).addEventListener('change', saveSettings);
});

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadStatus();
