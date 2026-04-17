# HPP — Canonical Event Reference

This file is the single source of truth for the HPP event model.
All SDK docs, code, and integration examples must match this file exactly.
Do not add events without updating this document.

---

## Page-facing API events  (`window.HPP.on(...)`)

These are dispatched on `document` with the `hpp:` prefix.
Use `HPP.on(event, handler)` — do not listen to them directly.

| Event | Payload | When |
|---|---|---|
| `hpp:ready` | `{ extension: true }` | Extension detected and active on this page |
| `hpp:verified` | `PresenceResult` | Certificate issued; already at your callback endpoint |
| `hpp:error` | `{ code, message }` | Any failure in the verification flow |
| `hpp:expired` | `{}` | `HPP.invalidateSession()` was called |

**`PresenceResult` shape:**
```ts
{
  verified:  true,
  cert_id:   string,
  rp_id:     string,
  expiry_ms: number,
}
```

---

## Internal extension events  (DOM `CustomEvent` on `document`)

These are the wire protocol between `hpp-api.js` and the extension content script.
**Do not use these directly in page code.** Use `HPP.*` methods instead.

| Direction | Event name | `detail` fields |
|---|---|---|
| Extension → Page | `hpp-extension-ready` | `{}` |
| Extension → Page | `hpp-cert-ready` | `{ cert_id, rp_id, expiry_ms }` |
| Extension → Page | `hpp-error` | `{ code, message }` |
| Extension → Page | `hpp-session-response` | `SessionSummary \| null` |
| Page → Extension | `hpp-presence-requested` | `{ origin }` |
| Page → Extension | `hpp-session-request` | `{}` |

**`SessionSummary` shape (frozen):**
```ts
{
  cert_id:      string,
  rp_id:        string,
  issued_at:    number,
  expiry_ms:    number,
  remaining_ms: number,
}
```

---

## Security invariant

`hpp-cert-ready` and `hpp-session-response` expose **only** `cert_id`, `rp_id`,
`expiry_ms`, `issued_at`, and `remaining_ms` to the page.

The following fields are **never** transmitted to page JavaScript:

- `hpp_server_sig`
- `assertion_sig`
- `authenticator_data`
- `client_data_json`
- `credential_id`

The full certificate travels: **Extension → Verifier Server → RP Backend only.**

---

## Not in v1

These are reserved for a future release and intentionally absent:

- `hpp:expired` with cert details (currently fires with `{}`)
- `actionScope` on `hpp-presence-requested`
- `display` on `hpp-presence-requested`
- Any event related to re-attestation

---

*Agile On Target LLC · Patent Pending · agileontarget.com*
