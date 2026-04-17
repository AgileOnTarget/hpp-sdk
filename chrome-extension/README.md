# HPP Chrome Extension

**Human Presence Protocol — Browser Login**
Manifest V3 · Chrome 120+ · USPTO Customer No. 224891 (Patent Pending)

Replaces passwords and CAPTCHAs with cryptographic proof of human presence on the device. Hardware-bound (via the iPhone HPP app's Secure Enclave key). Time-anchored. Privacy-preserving.

This is one of the four surfaces in the HPP SDK — see [`../README.md`](../README.md) for the full picture.

---

## Repository structure

```
chrome-extension/
├── manifest.json                  Chrome MV3 manifest
├── background.js                  Service worker — protocol orchestrator
├── content.js                     Content script — 5 DOM operations only
├── hpp-api.js                     Page-side API surface (window.HPP)
├── popup.html / popup.js          Toolbar popup (3 tabs)
├── options.html / options.js      Advanced settings page
├── onboarding.html                First-run onboarding (3 steps)
├── index.html                     Standalone test page
├── lib/
│   ├── hpp-crypto.js              Certificate construction, sig verify, eTLD+1
│   ├── hpp-storage.js             Typed chrome.storage wrappers
│   ├── hpp-errors.js              Error codes and display strings
│   ├── hpp-logger.js              Structured logger with field redaction
│   ├── hpp-server-pubkey.pem      PINNED attestation server public key
│   └── psl.min.js                 Public Suffix List (eTLD+1 computation)
├── icons/                         Extension icons (16/32/48/128px)
├── presence-receipt-schema.json   Receipt schema (mirrors ../protocol/schemas/presence-receipt.json)
├── API.md                         Full API reference
└── API_EVENTS.md                  Event catalog
```

---

## Loading the unpacked extension (developer mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle, top right)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. The HPP icon appears in the toolbar

The extension is in MV3 (Manifest V3) and requires Chrome 120 or later.

---

## How it works

The extension does **not** have its own crypto identity. It is a **browser-side relay** for the HPP attestation that happens on the user's iPhone:

1. User visits a site with `<meta name="hpp-enrollment" content="...">` (or with an explicit "Sign in with HPP" button)
2. Extension content script detects the marker and shows the HPP login affordance
3. On login attempt: extension's background service worker calls `POST /challenge` against the configured verifier (default: pinned `attest.humanpresenceprotocol.com`, configurable in options)
4. Extension renders a QR code with the `relay_id` from the challenge response
5. User scans the QR with the HPP iPhone app, completes Face ID, the SE signs the challenge
6. Extension polls `GET /relay/:id` for the session token (2-second interval)
7. On token receipt, extension calls the site's HPP integration callback with the session token + receipt id

The browser is never trusted with private key material. All cryptographic operations that prove presence happen on the iPhone's Secure Enclave; the browser extension just shuttles the challenge and the resulting token between the verifier and the page.

---

## Permissions and content security

| Permission | Why |
|---|---|
| `storage` | Persist user preferences (verifier hostname, log level) and per-origin enrollment flags |
| `alarms` | Schedule periodic relay-poll cleanup and session-expiry checks |
| `activeTab` | Read current tab origin to enforce per-origin enrollment |
| `scripting` | Inject the page-side API (`window.HPP`) into pages that have declared HPP enrollment |
| `tabs` | Open the onboarding page after install; switch to the verifier site after attestation |
| `host_permissions: https://attest.humanpresenceprotocol.com/*` | Pinned verifier — no other origins are allowed by default |

The CSP is restrictive: `default-src 'self'; connect-src https://attest.humanpresenceprotocol.com; script-src 'self'; style-src 'self' 'unsafe-inline'`. No remote scripts, no analytics, no telemetry.

For local development against a non-production verifier, see the dev notes in `manifest.json`'s `_content_security_policy_dev` comment.

---

## Page-side API

Once the extension is installed and active on a page that has declared HPP support, the page can use:

```javascript
// Detect HPP availability
if (window.HPP && window.HPP.ready) {
    // The extension is installed and the page is enrolled
    window.HPP.attest({
        verifier: 'https://attest.humanpresenceprotocol.com',
        site: 'example.com',
        onUnlock: (session) => {
            console.log('verified:', session.receiptId);
            // Proceed with site-specific session establishment
        },
        onError: (err) => {
            console.error(err.code, err.message);
        },
    });
}
```

Full API reference: [`API.md`](API.md). Event catalog: [`API_EVENTS.md`](API_EVENTS.md).

---

## Site enrollment

A site declares HPP support by adding a meta tag:

```html
<meta name="hpp-enrollment" content="version=1; site=example.com">
```

The extension's content script picks this up at `document_idle` and exposes `window.HPP` to the page. Without the meta tag, `window.HPP` is not exposed — the extension does not interfere with sites that haven't opted in.

Detailed integration guide: [`../protocol/docs/relying-party-guide.md`](../protocol/docs/relying-party-guide.md).

---

## Roadmap (Phase 3)

- Submit to the Chrome Web Store (currently developer-mode only)
- Firefox WebExtension port (the MV3 logic is portable; manifest needs adjustment)
- Safari Web Extension port (requires Apple Developer Program and a small Xcode wrapper)
- Edge: should work as-is on Chromium Edge; explicit testing pending

---

## License & patents

Code: [Apache 2.0](../LICENSE).
Patent context: [`../PATENT-NOTICE.md`](../PATENT-NOTICE.md).

---

## Security disclosure

See [`../SECURITY.md`](../SECURITY.md). Do not file public GitHub issues for security vulnerabilities.
