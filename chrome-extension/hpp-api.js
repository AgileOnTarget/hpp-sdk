/**
 * hpp-api.js  —  Human Presence Protocol  |  Website Integration SDK  v1.0
 *
 * FROZEN PUBLIC API SURFACE (v1):
 *
 *   HPP.requestPresence()    → Promise<PresenceResult>
 *   HPP.getSession()         → Promise<SessionSummary|null>
 *   HPP.on(event, handler)   → unsubscribe()
 *   HPP.invalidateSession()  → void
 *
 * FROZEN SessionSummary SHAPE:
 *   { cert_id, rp_id, issued_at, expiry_ms, remaining_ms }
 *
 * FROZEN EVENTS:
 *   "ready"    — extension detected and active on this page
 *   "verified" — PresenceResult when a certificate is issued
 *   "error"    — { code, message } on any failure
 *   "expired"  — when invalidateSession() is called
 *
 * NOT IN v1 (reserved for v2):
 *   actionScope / display options — carry-through to gate not yet implemented
 *   requestReAttestation()        — depends on actionScope being real end-to-end
 *
 * SECURITY CONTRACT:
 *   The full presence certificate (hpp_server_sig, assertion_sig, credential_id,
 *   client_data_json) NEVER enters page JavaScript. This SDK exposes only
 *   cert_id and session summary metadata. Certificate travels:
 *     Extension → Verifier Server → RP Backend
 *
 * INTEGRATION (three things only):
 *
 *   HTML:
 *     <meta name="hpp-enrollment"
 *           data-hpp-callback="/api/hpp"
 *           data-hpp-site-name="My Site">
 *
 *   JavaScript:
 *     await HPP.requestPresence()
 *
 *   Server (Node):
 *     verifyPresenceCertificate(cert)
 *
 * Include as a plain <script> tag — no bundler required.
 * Self-host in your public directory.
 */

(function (global) {
  'use strict';

  // ── Internal state ──────────────────────────────────────────────────────────

  let _ready          = false;
  let _pending        = [];      // [{ resolve, reject, timer }]
  let _sessionInvalid = false;

  // ── Extension signals ───────────────────────────────────────────────────────

  document.addEventListener('hpp-extension-ready', () => {
    _ready = true;
    _emit('ready', { extension: true });
  });

  document.addEventListener('hpp-cert-ready', (e) => {
    const d = e.detail ?? {};
    // INVARIANT: only cert_id, rp_id, expiry_ms reach the page — never cert body.
    const result = {
      verified:  true,
      cert_id:   d.cert_id,
      rp_id:     d.rp_id,
      expiry_ms: d.expiry_ms,
    };
    _sessionInvalid = false;
    _resolveAll(result);
    _emit('verified', result);
  });

  document.addEventListener('hpp-error', (e) => {
    const d = e.detail ?? {};
    _rejectAll({ code: d.code, message: d.message });
    _emit('error', d);
  });

  // ── Public API — FROZEN v1 ──────────────────────────────────────────────────

  const HPP = {

    /**
     * Request a human presence verification.
     *
     * Triggers the HPP Presence Gate. The user completes a biometric gesture
     * (Touch ID, Face ID, Windows Hello). On success resolves with PresenceResult.
     * On failure rejects with HppError.
     *
     * The full certificate travels Extension → Verifier → RP Backend only.
     * This call receives only cert_id and summary metadata.
     *
     * @param {object}  [options]
     * @param {number}  [options.timeoutMs=60000]
     *
     * @returns {Promise<PresenceResult>}
     * @typedef  {object}  PresenceResult
     * @property {true}    verified
     * @property {string}  cert_id
     * @property {string}  rp_id
     * @property {number}  expiry_ms
     *
     * @throws   {HppError}
     * @typedef  {object}  HppError
     * @property {string}  code     e.g. HPP_EXTENSION_NOT_FOUND, HPP_TIMEOUT
     * @property {string}  message
     */
    requestPresence(options = {}) {
      const { timeoutMs = 60000 } = options;

      return new Promise((resolve, reject) => {
        if (!_ready) {
          return reject({
            code:    'HPP_EXTENSION_NOT_FOUND',
            message: 'The HPP extension is not installed or not active on this page.',
          });
        }

        const timer = setTimeout(() => {
          _removePending(resolve);
          reject({ code: 'HPP_TIMEOUT', message: 'Presence verification timed out.' });
        }, timeoutMs);

        _pending.push({ resolve, reject, timer });

        document.dispatchEvent(new CustomEvent('hpp-presence-requested', {
          detail:  { origin: window.location.origin },
          bubbles: false,
        }));
      });
    },

    /**
     * Returns the current session summary, or null if no session is active.
     *
     * Async — queries the extension service worker via the content script.
     * Resolves within ~1 second or returns null on timeout.
     *
     * Frozen SessionSummary shape:
     *   { cert_id, rp_id, issued_at, expiry_ms, remaining_ms }
     *
     * @returns {Promise<SessionSummary|null>}
     *
     * @typedef  {object} SessionSummary
     * @property {string} cert_id
     * @property {string} rp_id
     * @property {number} issued_at     Unix ms when the certificate was issued
     * @property {number} expiry_ms     Unix ms when the certificate expires
     * @property {number} remaining_ms  Milliseconds until expiry
     */
    getSession() {
      if (_sessionInvalid) return Promise.resolve(null);

      return new Promise((resolve) => {
        const handler = (e) => { resolve(e.detail ?? null); };
        document.addEventListener('hpp-session-response', handler, { once: true });
        setTimeout(() => {
          document.removeEventListener('hpp-session-response', handler);
          resolve(null);
        }, 1000);
        document.dispatchEvent(new CustomEvent('hpp-session-request', { bubbles: false }));
      });
    },

    /**
     * Subscribe to HPP lifecycle events.
     * Returns an unsubscribe function.
     *
     * @param {'ready'|'verified'|'error'|'expired'} event
     * @param {function} handler
     * @returns {function} unsubscribe
     */
    on(event, handler) {
      const key = 'hpp:' + event;
      const fn  = (e) => handler(e.detail);
      document.addEventListener(key, fn);
      return () => document.removeEventListener(key, fn);
    },

    /**
     * Mark the current session as invalid from the page's perspective.
     * getSession() returns null immediately after this call.
     * Does NOT revoke the certificate server-side.
     */
    invalidateSession() {
      _sessionInvalid = true;
      _emit('expired', {});
    },

    /** Returns API version and extension status. For debugging only. */
    debug() {
      return {
        api_version:     '1.0.0',
        extension_ready: _ready,
        pending_calls:   _pending.length,
        origin:          window.location.origin,
      };
    },
  };

  // ── Internal helpers ────────────────────────────────────────────────────────

  function _resolveAll(result) {
    const batch = _pending.splice(0);
    for (const { resolve, timer } of batch) { clearTimeout(timer); resolve(result); }
  }

  function _rejectAll(err) {
    const batch = _pending.splice(0);
    for (const { reject, timer } of batch) { clearTimeout(timer); reject(err); }
  }

  function _removePending(resolve) {
    const i = _pending.findIndex(r => r.resolve === resolve);
    if (i >= 0) _pending.splice(i, 1);
  }

  function _emit(event, detail) {
    document.dispatchEvent(new CustomEvent('hpp:' + event, { detail, bubbles: false }));
  }

  // ── Expose as window.HPP (canonical) and window.hpp (alias) ────────────────
  global.HPP = HPP;
  global.hpp = HPP;

})(window);
