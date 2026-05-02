/*!
 * HPP Website SDK v0.1.0 — Drop-in browser gate for the Human Presence Protocol.
 * License: Apache 2.0  ·  Patents: USPTO Customer No. 224891
 * Source: https://github.com/AgileOnTarget/hpp-sdk/blob/main/website/src/hpp.js
 *
 * This file is the same as src/hpp.js. The SDK has no build step — `dist/hpp.js`
 * exists so relying parties can `<script src=".../dist/hpp.js">` against a
 * stable filename without depending on the `src/` path.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HPP = factory();
    root.hpp = root.HPP;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '0.1.0';

  function resolveContainer(target) {
    if (!target) {
      throw new Error('[HPP] container is required');
    }
    if (typeof target === 'string') {
      var el = document.querySelector(target);
      if (!el) throw new Error('[HPP] container not found: ' + target);
      return el;
    }
    if (target instanceof HTMLElement) return target;
    throw new Error('[HPP] container must be a CSS selector or HTMLElement');
  }

  function trimTrailingSlash(s) {
    return typeof s === 'string' && s.length && s.charAt(s.length - 1) === '/'
      ? s.slice(0, -1)
      : s;
  }

  function siteFromVerifier(verifierUrl) {
    try { return new URL(verifierUrl).hostname; } catch (e) { return ''; }
  }

  function GateController(opts) {
    this.opts = opts;
    this.container = opts.container;
    this.host = null; this.shadow = null;
    this.qrImg = null; this.statusEl = null;
    this.relayId = null; this.timer = null;
    this.destroyed = false;
  }

  GateController.prototype.start = function () {
    var self = this;
    this._mountShell();
    this._setStatus('Preparing presence challenge…');
    fetch(this.opts.verifier + '/relay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(function (res) {
        if (!res.ok) throw new Error('relay/create returned HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (self.destroyed) return;
        if (!data || !data.relay_id) throw new Error('relay/create returned no relay_id');
        self.relayId = data.relay_id;
        self._renderQR();
        self._setStatus('Scan with the HPP iPhone app');
        self._startPolling();
      })
      .catch(function (err) { self._fail(err); });
  };

  GateController.prototype.destroy = function () {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
  };

  GateController.prototype._mountShell = function () {
    var host = document.createElement('div');
    host.setAttribute('data-hpp-gate', '');
    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = [
      ':host { all: initial; }',
      '.hpp-gate { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
      '  background: #fafaf8; color: #1a1a1a; padding: 2.5rem 1.5rem; border: 1px solid #ccc;',
      '  border-radius: 6px; max-width: 420px; margin: 0 auto; text-align: center; box-sizing: border-box; }',
      '.hpp-title { font-size: 1.4rem; font-weight: 500; color: #1a3a6b; margin: 0 0 .5rem; }',
      '.hpp-sub   { font-size: .95rem; color: #555;  margin: 0 0 1.75rem; line-height: 1.5; }',
      '.hpp-qr    { width: 240px; height: 240px; display: block; margin: 0 auto 1.25rem;',
      '  background: #fff; border: 1px solid #e8e8e8; }',
      '.hpp-qr.is-loading { opacity: .25; }',
      '.hpp-status { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;',
      '  font-size: .78rem; letter-spacing: .04em; color: #777; margin: 0 0 .5rem; min-height: 1.2em; }',
      '.hpp-status.is-error { color: #8b1a1a; }',
      '.hpp-footer { font-size: .68rem; color: #999; margin-top: 1.5rem; letter-spacing: .03em; }',
      '.hpp-footer a { color: #1a3a6b; text-decoration: none; }',
      '.hpp-footer a:hover { text-decoration: underline; }',
    ].join('\n');
    shadow.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'hpp-gate';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'false');
    wrap.setAttribute('aria-label', 'Verify Your Presence');
    wrap.innerHTML = [
      '<h2 class="hpp-title">Verify Your Presence</h2>',
      '<p class="hpp-sub">Scan the QR code with the Human Presence Protocol app on your iPhone.</p>',
      '<img class="hpp-qr is-loading" alt="HPP QR code" />',
      '<p class="hpp-status"></p>',
      '<p class="hpp-footer">Powered by <a href="https://humanpresenceprotocol.com" target="_blank" rel="noopener">HPP</a></p>',
    ].join('');
    shadow.appendChild(wrap);

    this.container.appendChild(host);
    this.host = host; this.shadow = shadow;
    this.qrImg = wrap.querySelector('.hpp-qr');
    this.statusEl = wrap.querySelector('.hpp-status');
  };

  GateController.prototype._renderQR = function () {
    var qrUrl = this.opts.verifier + '/qr'
      + '?relay_id=' + encodeURIComponent(this.relayId)
      + '&session_duration=' + encodeURIComponent(this.opts.sessionDuration)
      + '&site=' + encodeURIComponent(this.opts.site);
    this.qrImg.src = qrUrl;
    this.qrImg.classList.remove('is-loading');
  };

  GateController.prototype._setStatus = function (msg, isError) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
    this.statusEl.classList.toggle('is-error', !!isError);
  };

  GateController.prototype._startPolling = function () {
    var self = this;
    this.timer = setInterval(function () {
      if (self.destroyed) return;
      fetch(self.opts.verifier + '/relay/' + encodeURIComponent(self.relayId))
        .then(function (res) {
          if (!res.ok) throw new Error('relay poll returned HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (self.destroyed) return;
          if (data && data.status === 'ready' && data.session_token) {
            clearInterval(self.timer); self.timer = null;
            self._setStatus('Presence verified');
            try {
              if (typeof self.opts.onUnlock === 'function') {
                self.opts.onUnlock({ sessionToken: data.session_token });
              }
            } catch (e) {
              if (typeof self.opts.onError === 'function') self.opts.onError(e);
            }
          } else if (data && (data.status === 'expired' || data.status === 'not_found')) {
            clearInterval(self.timer); self.timer = null;
            self._setStatus('QR expired — refresh to try again', true);
            if (self.qrImg) self.qrImg.classList.add('is-loading');
            if (typeof self.opts.onExpired === 'function') self.opts.onExpired();
          }
        })
        .catch(function () { /* transient network errors are silent */ });
    }, this.opts.pollIntervalMs);
  };

  GateController.prototype._fail = function (err) {
    this._setStatus(err && err.message ? err.message : 'Setup failed', true);
    if (typeof this.opts.onError === 'function') {
      try { this.opts.onError(err); } catch (_) {}
    }
  };

  function gate(options) {
    var opts = options || {};
    var container = resolveContainer(opts.container);
    var verifier = trimTrailingSlash(opts.verifier);
    if (!verifier) throw new Error('[HPP] verifier URL is required');
    try { new URL(verifier); } catch (e) { throw new Error('[HPP] verifier must be an absolute URL'); }
    var site = (typeof opts.site === 'string' && opts.site.length)
      ? opts.site : siteFromVerifier(verifier);
    var sessionDuration = (typeof opts.sessionDuration === 'number' && opts.sessionDuration > 0)
      ? Math.floor(opts.sessionDuration) : 600;
    var pollIntervalMs = (typeof opts.pollIntervalMs === 'number' && opts.pollIntervalMs >= 500)
      ? Math.floor(opts.pollIntervalMs) : 2000;

    var controller = new GateController({
      container: container, verifier: verifier, site: site,
      sessionDuration: sessionDuration, pollIntervalMs: pollIntervalMs,
      onUnlock: opts.onUnlock, onExpired: opts.onExpired, onError: opts.onError,
    });
    controller.start();
    return { destroy: function () { controller.destroy(); } };
  }

  return Object.freeze({ version: VERSION, gate: gate });
}));
