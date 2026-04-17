/**
 * content.js
 * HPP Content Script — injected into all pages at document_idle.
 *
 * PERMITTED DOM OPERATIONS:
 *   1.  Read document.location.origin
 *   2.  Query meta[name="hpp-enrollment"]
 *   3.  Observe and intercept login form submission
 *   4.  Inject the Presence Gate overlay as a shadow DOM host element
 *   5.  Dispatch hpp-cert-ready CustomEvent on the document
 *   6.  Dispatch hpp-extension-ready CustomEvent on the document
 *   7.  Dispatch hpp-session-response CustomEvent on the document
 *   8.  Dispatch hpp-error CustomEvent on the document
 *   9.  Inject enrollment toast prompt as a shadow DOM host element
 *   10. Inject error overlay as a shadow DOM host element
 *   11. Attach one MutationObserver to observe form insertion
 *
 * INVARIANT (INV-8): Exits silently if running in an iframe context.
 * No text extraction, no input field inspection, no cookie access,
 * no localStorage access, no network requests.
 */

'use strict';

// ── INV-8: Iframe guard — silent early return (fix 3.2) ──────────────────────
function init() {
  if (window !== window.top) return;
  run();
}

function run() {

// ── State ─────────────────────────────────────────────────────────────────────
let gateInjected    = false;
let gateHost        = null;
let errorHost       = null;

// ── 1. Read origin ────────────────────────────────────────────────────────────
const pageOrigin = document.location.origin;

// ── Notify extension that content script is live ─────────────────────────────
chrome.runtime.sendMessage({
  type:   'CONTENT_SCRIPT_READY',
  origin: pageOrigin,
}).catch(() => {});

// ── 6. hpp-extension-ready ────────────────────────────────────────────────────
document.dispatchEvent(new CustomEvent('hpp-extension-ready', {
  bubbles: false, cancelable: false, composed: false,
}));

// ── 2. Query HPP meta tag ─────────────────────────────────────────────────────
const hppMeta = document.querySelector('meta[name="hpp-enrollment"]');

if (hppMeta) {
  const callbackUrl = hppMeta.getAttribute('data-hpp-callback') ?? null;
  const siteName    = hppMeta.getAttribute('data-hpp-site-name') ?? pageOrigin;

  chrome.runtime.sendMessage({
    type: 'HPP_SITE_DETECTED', origin: pageOrigin, callbackUrl, siteName,
  }).catch(() => {});

  // NOTE (v1): HPP is a programmatic API.
  // Sites call HPP.requestPresence() via hpp-api.js.
  // Automatic form interception is NOT active in production builds.
  // To gate a legacy form submit, call HPP.requestPresence() in your
  // form's submit handler before allowing the request to proceed.
}

// ── Page API: hpp-presence-requested ─────────────────────────────────────────
// Fired by hpp-api.js when HPP.requestPresence() is called.
// detail.origin is informational; rpId is always recomputed server-side from origin.
document.addEventListener('hpp-presence-requested', (event) => {
  const detail = event.detail ?? {};   // eslint-disable-line no-unused-vars
  chrome.runtime.sendMessage({
    type:   'VERIFY_PRESENCE',
    origin: pageOrigin,
    rpId:   computeRpIdFromOrigin(pageOrigin),
    // detail.display reserved for future gate customization (v2)
  }).catch(() => {});
});

// ── Page API: hpp-session-request → hpp-session-response (fix 1.4 / 5.2) ─────
document.addEventListener('hpp-session-request', async () => {
  let summary = null;
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
    if (resp?.active) {
      summary = {
        active:       true,
        rp_id:        resp.rp_id,
        expiry_ms:    resp.expiry_ms,
        issued_at:    resp.issued_at,
        cert_id:      resp.cert_id,
        remaining_ms: Math.max(0, resp.expiry_ms - Date.now()),
      };
    }
  } catch (_) {}

  // 7. Dispatch hpp-session-response
  document.dispatchEvent(new CustomEvent('hpp-session-response', {
    detail: summary, bubbles: false, cancelable: false, composed: false,
  }));
});

// ── Service worker message listener ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.type === 'SHOW_GATE') {
    injectPresenceGate(msg.rp_id);
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'SHOW_ENROLL_PROMPT') {
    injectEnrollPrompt(msg.siteName);
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'HIDE_GATE') {
    removeGate();
    sendResponse({ ok: true });
    return false;
  }

  // fix 1.5: SHOW_ERROR handler
  if (msg.type === 'SHOW_ERROR') {
    removeGate();
    injectErrorOverlay(msg.code, msg.message);
    // 8. Dispatch hpp-error
    document.dispatchEvent(new CustomEvent('hpp-error', {
      detail: { code: msg.code, message: msg.message },
      bubbles: false, cancelable: false, composed: false,
    }));
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'CERT_READY') {
    // 5. Dispatch hpp-cert-ready — summary metadata only, never full cert material
    document.dispatchEvent(new CustomEvent('hpp-cert-ready', {
      detail: { cert_id: msg.cert_id, expiry_ms: msg.expiry_ms, rp_id: msg.rp_id },
      bubbles: false, cancelable: false, composed: false,
    }));
    removeGate();
    sendResponse({ ok: true });
    return false;
  }

  // fix 1.1: RUN_WEBAUTHN — background passes enrolledCredentialId after storage lookup
  if (msg.type === 'RUN_WEBAUTHN') {
    handleRunWebAuthn(msg, sendResponse);
    return true; // async
  }

  // fix 1.2: RUN_WEBAUTHN_CREATE
  if (msg.type === 'RUN_WEBAUTHN_CREATE') {
    handleRunWebAuthnCreate(msg, sendResponse);
    return true; // async
  }

  return false;
});

// ── WebAuthn authentication (fix 1.1 / 1.3 — inlined, Option B arch) ─────────
async function handleRunWebAuthn(msg, sendResponse) {
  try {
    const { challenge, origin, enrolledCredentialId } = msg;
    if (!enrolledCredentialId) {
      sendResponse({ ok: false, error: 'HPP_ORIGIN_MISMATCH' });
      return;
    }
    const result = await invokePresenceGate(challenge, enrolledCredentialId, origin ?? pageOrigin);
    sendResponse(result);
  } catch (_) {
    sendResponse({ ok: false, error: 'HPP_SERVER_UNAVAILABLE' });
  }
}

// ── WebAuthn enrollment (fix 1.2 / 1.3 — inlined) ────────────────────────────
async function handleRunWebAuthnCreate(msg, sendResponse) {
  try {
    const { enrollChallenge, origin } = msg;
    const result = await createPlatformCredential(enrollChallenge, origin ?? pageOrigin);
    sendResponse(result);
  } catch (_) {
    sendResponse({ ok: false, error: 'HPP_SERVER_UNAVAILABLE' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WebAuthn + crypto utilities — inlined from webauthn-bridge.js / hpp-crypto.js
// Architecture: content.js remains a classic (non-module) content script per
// MV3 rules. Bridge logic is inlined to avoid ES module import issues (fix 1.3).
// ─────────────────────────────────────────────────────────────────────────────

function base64urlToBuffer(b64) {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded  = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary  = atob(padded);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buf) {
  const bytes = new Uint8Array(buf);
  let binary  = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function extractUVFlag(b64) {
  return (new Uint8Array(base64urlToBuffer(b64))[32] & 0x04) !== 0;
}

const MULTI_PART_TLDS = new Set([
  'co.uk','co.jp','co.nz','co.za','co.in','co.kr',
  'com.au','com.br','com.mx','com.ar','com.cn',
  'org.uk','net.uk','gov.uk','ac.uk','me.uk',
  'gov.au','edu.au','id.au','ne.jp','or.jp','ac.jp',
]);

function computeRpIdFromOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (typeof psl !== 'undefined' && psl.get) return psl.get(hostname);
    const parts = hostname.split('.');
    if (parts.length < 2) return hostname;
    if (parts.length >= 3 && MULTI_PART_TLDS.has(parts.slice(-2).join('.'))) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  } catch { return null; }
}

async function invokePresenceGate(challenge, enrolledCredentialId, tabOrigin) {
  const rpId = computeRpIdFromOrigin(tabOrigin);
  if (!rpId) return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };

  const options = {
    publicKey: {
      challenge:        base64urlToBuffer(challenge.nonce),
      rpId,
      allowCredentials: [{ type: 'public-key', id: base64urlToBuffer(enrolledCredentialId) }],
      userVerification: 'required',        // INVARIANT INV-3: must never be relaxed
      timeout:          challenge.window_ms,
      extensions: {
        hpp_server_ts: challenge.server_timestamp,
        hpp_window_ms: challenge.window_ms,
        hpp_version:   '1.0',
      },
    },
  };

  let credential;
  try {
    credential = await navigator.credentials.get(options);
  } catch (err) {
    return { ok: false, error: err.name === 'NotAllowedError' ? 'HPP_WEBAUTHN_CANCELLED' : 'HPP_SERVER_UNAVAILABLE' };
  }

  const r                 = credential.response;
  const authenticator_data = bufferToBase64url(r.authenticatorData);

  if (!extractUVFlag(authenticator_data)) return { ok: false, error: 'HPP_UV_FLAG_MISSING' };

  return {
    ok: true,
    assertion: {
      credential_id:      bufferToBase64url(credential.rawId),
      authenticator_data,
      assertion_sig:      bufferToBase64url(r.signature),
      clientDataJSON:     bufferToBase64url(r.clientDataJSON),
      uv_flag:            true,
    },
  };
}

async function createPlatformCredential(enrollChallenge, tabOrigin) {
  const rpId = computeRpIdFromOrigin(tabOrigin);
  if (!rpId) return { ok: false, error: 'HPP_ORIGIN_MISMATCH' };

  const options = {
    publicKey: {
      rp:      { id: rpId, name: enrollChallenge.site_name ?? rpId },
      user:    { id: crypto.getRandomValues(new Uint8Array(16)), name: 'hpp-presence-user', displayName: 'HPP Presence User' },
      challenge:    base64urlToBuffer(enrollChallenge.nonce),
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification:        'required',   // INVARIANT INV-3
        residentKey:             'required',
      },
      timeout:     60000,
      attestation: 'direct',
    },
  };

  let credential;
  try {
    credential = await navigator.credentials.create(options);
  } catch (err) {
    return { ok: false, error: err.name === 'NotAllowedError' ? 'HPP_WEBAUTHN_CANCELLED' : 'HPP_SERVER_UNAVAILABLE' };
  }

  const r = credential.response;
  return {
    ok: true,
    credential: {
      credential_id:      bufferToBase64url(credential.rawId),
      public_key_cbor:    bufferToBase64url(r.getPublicKey?.() ?? new ArrayBuffer(0)),
      attestation_object: bufferToBase64url(r.attestationObject),
      client_data_json:   bufferToBase64url(r.clientDataJSON),
      rp_id:              rpId,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

// ── 4. Presence Gate ──────────────────────────────────────────────────────────
function injectPresenceGate(rpId) {
  if (gateInjected) return;

  gateHost = document.createElement('div');
  gateHost.id = 'hpp-gate-host';
  Object.assign(gateHost.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    zIndex: '2147483647', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
  });

  const shadow = gateHost.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .gate { width:400px; background:#fff; border:2px solid #1B3A6B; border-radius:8px;
              padding:32px 36px 28px; font-family:Georgia,'Times New Roman',serif;
              box-shadow:0 8px 40px rgba(0,0,0,0.28); display:flex; flex-direction:column;
              align-items:center; gap:0; }
      .wordmark { font-size:13px; font-weight:bold; letter-spacing:0.12em; color:#1B3A6B;
                  text-transform:uppercase; margin-bottom:10px; }
      .rule { width:100%; height:2px; background:#B8860B; margin-bottom:22px; border:none; }
      .icon { width:52px; height:52px; border-radius:50%; background:#EEF2FB; display:flex;
              align-items:center; justify-content:center; margin-bottom:16px; }
      .icon svg { width:28px; height:28px; }
      h2 { font-size:18px; font-weight:bold; color:#1B3A6B; margin:0 0 10px; text-align:center; }
      .rp { font-size:13px; color:#666; margin:0 0 22px; text-align:center; }
      button.verify { width:100%; height:52px; background:#1B3A6B; color:#fff; border:none;
                      border-radius:6px; font-family:Georgia,serif; font-size:16px; font-weight:bold;
                      cursor:pointer; transition:background 0.15s; margin-bottom:12px; }
      button.verify:hover { background:#142d54; }
      button.verify:disabled { background:#8a9fc2; cursor:not-allowed; }
      .sublabel { font-size:12px; color:#888; text-align:center; margin:0 0 18px; }
      button.dismiss { background:none; border:none; font-size:12px; color:#999; cursor:pointer;
                       text-decoration:underline; font-family:Georgia,serif; }
      button.dismiss:hover { color:#555; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .spinner { display:inline-block; width:16px; height:16px; border:2px solid #ffffff44;
                 border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite;
                 margin-right:8px; vertical-align:middle; }
    </style>
    <div class="gate" role="dialog" aria-modal="true" aria-label="HPP Presence Verification">
      <div class="wordmark">Human Presence Protocol</div>
      <hr class="rule"/>
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1B3A6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
          <path d="M17.5 14.5c-2-1-3.5-1.5-5.5-1.5s-3.5.5-5.5 1.5C4.5 15.5 3 18 3 21h18c0-3-1.5-5.5-3.5-6.5z"/>
        </svg>
      </div>
      <h2>Verify Your Presence</h2>
      <p class="rp">${escapeHtml(rpId)}</p>
      <button class="verify" id="hpp-verify-btn">Verify Your Presence</button>
      <p class="sublabel">Touch ID · Face ID · Windows Hello — no password required</p>
      <button class="dismiss" id="hpp-dismiss-btn">Use password instead</button>
    </div>`;

  shadow.getElementById('hpp-verify-btn').addEventListener('click', () => {
    const btn = shadow.getElementById('hpp-verify-btn');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span>Verifying\u2026';
    chrome.runtime.sendMessage({
      type: 'VERIFY_PRESENCE', origin: pageOrigin, rpId: computeRpIdFromOrigin(pageOrigin),
    }).catch(() => {});
  });

  // fix 9.1: dismiss wired to GATE_DISMISSED
  shadow.getElementById('hpp-dismiss-btn').addEventListener('click', () => {
    removeGate();
    chrome.runtime.sendMessage({ type: 'GATE_DISMISSED', origin: pageOrigin }).catch(() => {});
  });

  document.body.appendChild(gateHost);
  gateInjected = true;
}

// ── 9. Enrollment prompt ──────────────────────────────────────────────────────
function injectEnrollPrompt(siteName) {
  if (gateInjected) return;
  gateHost = document.createElement('div');
  gateHost.id = 'hpp-gate-host';
  Object.assign(gateHost.style, { position:'fixed', bottom:'24px', right:'24px', zIndex:'2147483646' });

  const shadow = gateHost.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .toast { width:320px; background:#1B3A6B; color:#fff; border-radius:8px; padding:16px 20px;
               font-family:Georgia,serif; font-size:14px; box-shadow:0 4px 20px rgba(0,0,0,0.3);
               display:flex; flex-direction:column; gap:10px; animation:slideIn 0.25s ease; }
      @keyframes slideIn { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }
      .title { font-weight:bold; font-size:15px; }
      .sub   { font-size:13px; color:#c8d4e8; }
      .actions { display:flex; gap:10px; }
      button { flex:1; padding:8px; border-radius:5px; border:none; font-family:Georgia,serif;
               font-size:13px; cursor:pointer; font-weight:bold; }
      .enroll { background:#B8860B; color:#fff; }
      .skip   { background:transparent; border:1px solid #ffffff55; color:#c8d4e8; }
      .enroll:hover { background:#9a6f09; }
    </style>
    <div class="toast" role="alert">
      <div class="title">Enable passwordless login?</div>
      <div class="sub">${escapeHtml(siteName)} supports HPP. Enroll this device for one-tap login.</div>
      <div class="actions">
        <button class="enroll" id="hpp-enroll-btn">Enroll This Device</button>
        <button class="skip"   id="hpp-skip-btn">Not Now</button>
      </div>
    </div>`;

  shadow.getElementById('hpp-enroll-btn').addEventListener('click', () => {
    removeGate();
    chrome.runtime.sendMessage({ type: 'ENROLL_REQUEST', origin: pageOrigin }).catch(() => {});
  });
  shadow.getElementById('hpp-skip-btn').addEventListener('click', removeGate);

  document.body.appendChild(gateHost);
  gateInjected = true;
}

// ── 10. Error overlay (fix 1.5) ───────────────────────────────────────────────
function injectErrorOverlay(code, message) {
  if (errorHost) { errorHost.remove(); errorHost = null; }

  errorHost = document.createElement('div');
  errorHost.id = 'hpp-error-host';
  Object.assign(errorHost.style, { position:'fixed', bottom:'24px', right:'24px', zIndex:'2147483646' });

  const shadow = errorHost.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .err { width:340px; background:#8B1A1A; color:#fff; border-radius:8px; padding:16px 20px;
             font-family:Georgia,serif; font-size:13px; box-shadow:0 4px 20px rgba(0,0,0,0.35);
             display:flex; flex-direction:column; gap:10px; animation:slideIn 0.25s ease; }
      @keyframes slideIn { from{transform:translateY(12px);opacity:0} to{transform:none;opacity:1} }
      .err-title { font-weight:bold; font-size:14px; }
      .err-msg   { color:#f5c0c0; }
      button { align-self:flex-end; background:transparent; border:1px solid #ffffff55; color:#fff;
               border-radius:4px; padding:4px 12px; font-family:Georgia,serif; font-size:12px; cursor:pointer; }
      button:hover { background:rgba(255,255,255,0.1); }
    </style>
    <div class="err" role="alert">
      <div class="err-title">HPP Authentication Error</div>
      <div class="err-msg">${escapeHtml(message ?? 'An unexpected error occurred.')}</div>
      <button id="hpp-err-dismiss">Dismiss</button>
    </div>`;

  shadow.getElementById('hpp-err-dismiss').addEventListener('click', () => {
    errorHost?.remove(); errorHost = null;
  });
  document.body.appendChild(errorHost);
  setTimeout(() => { errorHost?.remove(); errorHost = null; }, 8000);
}

function removeGate() {
  if (gateHost) { gateHost.remove(); gateHost = null; gateInjected = false; }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

} // end run()

init();
