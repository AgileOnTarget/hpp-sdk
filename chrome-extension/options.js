/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Agile On Target LLC
 *
 * This file is part of the Human Presence Protocol SDK
 * (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
 * License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
 * PATENT-POLICY.md for the scope of the patent grant. All trademarks
 * and patent rights reserved by Agile On Target LLC
 * (USPTO Customer No. 224891).
 */

/**
 * options.js
 * Logic for the HPP Advanced Settings page.
 *
 * fix 1.6 / 3.3: GET_SESSION passes tabId explicitly.
 * fix 7.3: defensive sendMessage wrappers throughout.
 */

'use strict';

const VERSION = chrome.runtime.getManifest().version;
document.getElementById('ext-version').textContent = VERSION;

// fix 7.3: defensive sendMessage
async function safeSend(msg) {
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (_) {
    return null;
  }
}

async function loadAll() {
  const resp = await safeSend({ type: 'GET_SETTINGS' });
  const s    = resp?.settings ?? {};
  document.getElementById('opt-active').checked        = s.hpp_active !== false;
  document.getElementById('opt-privacy').checked       = s.privacy_mode === true;
  document.getElementById('opt-debug').checked         = s.debug_logging === true;
  document.getElementById('opt-lifetime').value        = String(s.certificate_lifetime ?? 3600000);
  document.getElementById('opt-server-override').value = s.server_endpoint_override ?? '';
  document.getElementById('opt-clock-skew').value      = s.max_clock_skew_ms ?? 30000;
  await loadEnrolledSites();
}

async function save() {
  const override = document.getElementById('opt-server-override').value.trim();
  const skew     = parseInt(document.getElementById('opt-clock-skew').value);
  await safeSend({
    type: 'UPDATE_SETTINGS',
    settings: {
      hpp_active:               document.getElementById('opt-active').checked,
      privacy_mode:             document.getElementById('opt-privacy').checked,
      debug_logging:            document.getElementById('opt-debug').checked,
      certificate_lifetime:     parseInt(document.getElementById('opt-lifetime').value),
      server_endpoint_override: override || null,
      max_clock_skew_ms:        Math.min(60000, Math.max(10000, skew || 30000)),
    },
  });
  showToast();
}

function showToast() {
  const t = document.getElementById('save-toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

['opt-active','opt-privacy','opt-debug','opt-lifetime'].forEach(id => {
  document.getElementById(id).addEventListener('change', save);
});
['opt-server-override','opt-clock-skew'].forEach(id => {
  document.getElementById(id).addEventListener('change', save);
});

async function loadEnrolledSites() {
  const resp  = await safeSend({ type: 'GET_ENROLLED_SITES' });
  const sites = resp?.sites ?? [];
  const container = document.getElementById('enrolled-container');

  if (sites.length === 0) {
    container.innerHTML = '<div class="no-sites">No sites enrolled on this device.</div>';
    return;
  }

  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'enrolled-list';

  for (const site of sites) {
    const item = document.createElement('div');
    item.className = 'enrolled-item';
    const date      = site.enrolled_at ? new Date(site.enrolled_at).toLocaleDateString() : '—';
    const credShort = site.credential_id ? site.credential_id.substring(0, 8) + '…' : '—';
    item.innerHTML = `
      <div class="enrolled-icon">🔐</div>
      <div class="enrolled-meta">
        <div class="enrolled-origin">${esc(site.origin)}</div>
        <div class="enrolled-date">Enrolled ${esc(date)} · Credential: ${esc(credShort)}</div>
      </div>
      <button class="btn-revoke" data-origin="${esc(site.origin)}">Revoke</button>
    `;
    item.querySelector('.btn-revoke').addEventListener('click', async (e) => {
      const origin = e.target.dataset.origin;
      if (!confirm(`Revoke HPP enrollment for ${origin}?\n\nYou will need to re-enroll this device to use HPP login on this site again.`)) return;
      await safeSend({ type: 'REVOKE_SITE', origin });
      await loadEnrolledSites();
    });
    list.appendChild(item);
  }

  container.appendChild(list);
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

document.getElementById('btn-run-diag').addEventListener('click', async () => {
  const out = document.getElementById('diag-output');
  out.textContent = 'Running…';

  const settings = (await safeSend({ type: 'GET_SETTINGS' }))?.settings ?? {};
  const sites    = (await safeSend({ type: 'GET_ENROLLED_SITES' }))?.sites ?? [];
  const manifest = chrome.runtime.getManifest();

  // fix 1.6 / 3.3: pass tabId explicitly for GET_SESSION
  const [tab]    = await chrome.tabs.query({ active: true, currentWindow: true });
  const session  = tab ? await safeSend({ type: 'GET_SESSION', tabId: tab.id }) : null;

  const diag = {
    extension: { version: manifest.version, id: chrome.runtime.id },
    settings: {
      hpp_active:           settings.hpp_active,
      certificate_lifetime: settings.certificate_lifetime,
      server_override:      settings.server_endpoint_override ?? '(production)',
      max_clock_skew_ms:    settings.max_clock_skew_ms,
    },
    enrolled_site_count: sites.length,
    active_tab: tab ? { id: tab.id, origin: tab.url ? new URL(tab.url).origin : '—' } : null,
    session: session?.active ? {
      active:     true,
      rp_id:      session.rp_id,
      expires_in: Math.round((session.expiry_ms - Date.now()) / 1000) + 's',
    } : { active: false },
    timestamp: new Date().toISOString(),
  };

  out.textContent = JSON.stringify(diag, null, 2);
});

document.getElementById('btn-export-diag').addEventListener('click', async () => {
  const content = document.getElementById('diag-output').textContent;
  const blob = new Blob([content], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `hpp-diag-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-clear-sessions').addEventListener('click', async () => {
  if (!confirm('Clear all active HPP sessions? You will need to re-authenticate on enrolled sites.')) return;
  await chrome.storage.session.remove(['hpp_session_map', 'hpp_inflight_map']);
  document.getElementById('btn-run-diag').click();
});

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

loadAll();
