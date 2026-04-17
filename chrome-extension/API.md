# HPP SDK — Canonical API Reference  v1.0

This is the single source of truth for the HPP developer-facing API surface,
event model, and attestation contract. All SDK docs and integration examples
must match this file.

---

## Integration checklist

Three things. No more.

**1. HTML — declare the enrollment endpoint**
```html
<meta name="hpp-enrollment"
      data-hpp-callback="/api/hpp"
      data-hpp-site-name="My Site">
```

`data-hpp-callback` may be a relative path. The extension resolves it against
the page origin before validation. Same-origin enforcement is strict.

**2. JavaScript — request presence**
```html
<script src="hpp-api.js"></script>
<script>
  const result = await HPP.requestPresence();
  // result = { verified: true, cert_id, rp_id, expiry_ms }
  // Full certificate is already at your /api/hpp endpoint.
</script>
```

**3. Server — verify the certificate**
```js
const { verifyPresenceCertificate } = require('./hpp-verify');
app.post('/api/hpp', async (req, res) => {
  const result = await verifyPresenceCertificate(req.body);
  if (!result.valid) return res.status(401).json({ error: result.error });
  res.json({ cert_id: result.cert_id, granted: true });
});
```

---

## Public API surface  (frozen v1)

### `HPP.requestPresence([options])` → `Promise<PresenceResult>`

Triggers the Presence Gate overlay. The user completes a biometric gesture
(Touch ID, Face ID, Windows Hello). Resolves when the full certificate has
been delivered to the RP callback endpoint and a session has been issued.

```ts
HPP.requestPresence({ timeoutMs?: number })
```

| Option | Type | Default | Notes |
|---|---|---|---|
| `timeoutMs` | `number` | `60000` | Milliseconds before HPP_TIMEOUT is thrown |

**Resolves with `PresenceResult`:**
```ts
{
  verified:  true,
  cert_id:   string,   // UUID — reference the certificate at your backend
  rp_id:     string,   // eTLD+1 of the authenticated origin
  expiry_ms: number,   // Unix ms — when the certificate expires
}
```

**Rejects with `HppError`:**
```ts
{
  code:    string,   // HPP_EXTENSION_NOT_FOUND | HPP_TIMEOUT | HPP_UV_FLAG_MISSING | ...
  message: string,
}
```

**Page security invariant:** `cert_id` is the only certificate field this
call returns. `hpp_server_sig`, `assertion_sig`, `credential_id`, and
`client_data_json` are never transmitted to page JavaScript.

---

### `HPP.getSession()` → `Promise<SessionSummary | null>`

Returns the current session summary, or `null` if no session is active.
Async — queries the extension service worker. Resolves within ~1 second.

**`SessionSummary` shape (frozen):**
```ts
{
  cert_id:      string,   // UUID
  rp_id:        string,
  issued_at:    number,   // Unix ms
  expiry_ms:    number,   // Unix ms
  remaining_ms: number,   // computed: expiry_ms - Date.now()
}
```

No deviations. Every integration, doc, and test must use this exact shape.

---

### `HPP.on(event, handler)` → `unsubscribe()`

Subscribe to HPP lifecycle events. Returns an unsubscribe function.

```js
const off = HPP.on('verified', (result) => {
  console.log('verified', result.cert_id);
});
// later:
off();
```

**Supported events (frozen v1):**

| Event | Payload | Notes |
|---|---|---|
| `"ready"` | `{ extension: true }` | Extension detected and active on this page |
| `"verified"` | `PresenceResult` | Certificate issued; already at your callback endpoint |
| `"error"` | `{ code, message }` | Any failure in the verification flow |
| `"expired"` | `{}` | `invalidateSession()` was called |

---

### `HPP.invalidateSession()` → `void`

Marks the current session invalid on the page side. `getSession()` returns
`null` immediately after this call. Does **not** revoke the certificate on
the server — for server-side revocation contact your RP backend directly.

---

### `HPP.debug()` → `object`

```ts
{
  api_version:     '1.0.0',
  extension_ready: boolean,
  pending_calls:   number,
  origin:          string,
}
```

For debugging only. Do not rely on this shape in production code.

---

## Underlying DOM event model

`hpp-api.js` is built on these DOM `CustomEvent`s dispatched on `document`.
They are the wire protocol between the page and the extension content script.
**Do not use these directly** — use the `HPP.*` methods above instead.

| Direction | Event name | detail |
|---|---|---|
| Extension → Page | `hpp-extension-ready` | `{}` |
| Extension → Page | `hpp-cert-ready` | `{ cert_id, rp_id, expiry_ms }` |
| Extension → Page | `hpp-error` | `{ code, message }` |
| Extension → Page | `hpp-session-response` | `SessionSummary \| null` |
| Page → Extension | `hpp-presence-requested` | `{ origin }` |
| Page → Extension | `hpp-session-request` | `{}` |

`hpp-api.js` also emits higher-level `CustomEvent`s on `document` with
`hpp:` prefix for use with `HPP.on()`:

| Event name | detail |
|---|---|
| `hpp:ready` | `{ extension: true }` |
| `hpp:verified` | `PresenceResult` |
| `hpp:error` | `{ code, message }` |
| `hpp:expired` | `{}` |

---

## Attestation contract  (canonical)

This is the wire contract between the extension and the HPP Attestation Server.
The certificate must be visibly and verifiably tied to one specific challenge.

**Challenge response** `GET /v1/challenge?rp_id=…&purpose=attest`
```ts
{
  nonce:              string,   // base64url, 32 bytes — single-use
  rp_id:              string,
  server_timestamp:   number,   // Unix ms — server-authoritative
  window_ms:          number,   // NPHT enforcement window
  purpose:            string,   // "attest" | "enrollment"
  server_sig:         string,   // base64url — extension verifies before use
}
```

**Attest request** `POST /v1/attest`
```ts
{
  cert_id:            string,   // UUID generated by extension
  nonce:              string,   // MUST match an issued, unconsumed challenge nonce
  rp_id:              string,
  server_timestamp:   number,
  client_timestamp:   number,
  credential_id:      string,   // base64url
  authenticator_data: string,   // base64url — UV flag verified here and at server
  assertion_sig:      string,   // base64url — ECDSA P-256
  client_data_json:   string,   // base64url — for server-side WebAuthn verification
}
```

**Certificate payload** (signed by server → `hpp_server_sig`)
```ts
{
  assertion_sig:      string,
  authenticator_data: string,
  cert_id:            string,
  client_data_json:   string,
  credential_id:      string,
  expiry_ms:          number,
  nonce:              string,   // binds certificate to this specific challenge
  rp_id:              string,
  server_timestamp:   number,
}
```

**Certificate response** `200 OK`
```ts
{
  cert_id:         string,
  hpp_server_sig:  string,   // base64url — extension verifies before session issuance
  expiry_ms:       number,
  status:          "issued",
}
```

**Nonce enforcement rule:**  
A nonce issued by `/v1/challenge` must be consumed exactly once.  
Any `/v1/attest` request carrying an unknown or already-used nonce is rejected `401 NONCE_ALREADY_USED`.

---

## Security invariants (summary)

| # | Invariant |
|---|---|
| INV-1 | `userVerification: "required"` — never relaxed |
| INV-2 | UV flag checked in content script AND service worker |
| INV-3 | `hpp_server_sig` verified before session issuance |
| INV-4 | Sessions stored in `chrome.storage.session` only — cleared on browser close |
| INV-5 | Full certificate never transmitted to page JavaScript |
| INV-6 | `callbackUrl` must resolve to same origin as page, HTTPS required (localhost exempt) |
| INV-7 | Nonce single-use — replay prevention at server |
| INV-8 | Content script exits silently in iframe context |

---

## Not in v1

These are explicitly deferred to a future release:

- **`actionScope`** — certificate scoping for high-value sub-actions
- **`HPP.requestReAttestation()`** — depends on `actionScope` being real end-to-end
- **Form interception** — HPP v1 is a programmatic API only. Sites call
  `HPP.requestPresence()` directly. The extension does not intercept form submits.
- **`display` option** — custom gate message text
- **Node verifier library** — `verifyPresenceCertificate()` reference implementation

---

*Agile On Target LLC · Patent Pending · agileontarget.com*
