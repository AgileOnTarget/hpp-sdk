# HPP Website SDK

Drop-in `<script>` tag for relying-party websites that want to gate content behind a [Human Presence Protocol](https://github.com/AgileOnTarget/hpp-sdk) attestation.

The SDK renders a QR code, polls the verifier's relay endpoint every 2 seconds, and fires `onUnlock(session)` when the user's iPhone deposits a valid session token. Pure vanilla JS, no build step, no dependencies, all styling isolated in a Shadow DOM.

- **Browsers:** any with `fetch`, Shadow DOM, and ES5 (i.e. all modern browsers)
- **License:** Apache 2.0 (see repo root)
- **Patents:** USPTO Customer No. 224891 — see [`PATENT-NOTICE.md`](../PATENT-NOTICE.md) and [`PATENT-POLICY.md`](../PATENT-POLICY.md) at the repo root.

## Install

Self-host or include from the repo's CDN of your choice:

```html
<script src="https://your-cdn.example/hpp.js"></script>
```

The shipped file is [`dist/hpp.js`](dist/hpp.js). It is identical to [`src/hpp.js`](src/hpp.js) — there is no build step.

## Usage

```html
<div id="hpp-gate"></div>

<script src="/path/to/hpp.js"></script>
<script>
  HPP.gate({
    container: '#hpp-gate',
    verifier:  'https://hpp-verifier.onrender.com',
    site:      'example.com',
    onUnlock: function (session) {
      // session.sessionToken — POST this to your backend over TLS.
      // Your backend should validate it against the verifier's receipt chain.
    },
    onExpired: function () { /* QR expired */ },
    onError:   function (err) { /* setup or transport error */ },
  });
</script>
```

`HPP.gate(...)` returns a controller:

```js
var ctrl = HPP.gate({ ... });
// later, e.g. on page navigation:
ctrl.destroy();   // stops polling, removes the gate from the DOM
```

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `container` | CSS selector or `HTMLElement` | — | **Required.** Where the gate mounts. |
| `verifier`  | absolute URL | — | **Required.** Base URL of the HPP verifier. |
| `site`      | string | hostname of `verifier` | Site identifier baked into the QR. Override only if your verifier is hosted on a different origin from your relying-party page. |
| `sessionDuration` | number (seconds) | `600` | TTL of the session token issued on success. |
| `pollIntervalMs`  | number (ms, ≥ 500) | `2000` | How often to poll `/relay/:id`. |
| `onUnlock`  | `(session) => void` | — | Fires once with `{ sessionToken }` on success. |
| `onExpired` | `() => void` | — | Fires when the verifier reports the relay as `expired` or `not_found`. |
| `onError`   | `(err) => void` | — | Fires on setup failures (e.g. `/relay/create` non-200). Transient poll failures are silent. |

## What the SDK does (under the hood)

1. `POST {verifier}/relay/create` → `{ relay_id }`
2. Render an `<img>` whose `src` is `{verifier}/qr?relay_id=…&site=…&session_duration=…` (a server-rendered QR PNG).
3. `setInterval(2000)` → `GET {verifier}/relay/:id` returning `{ status, session_token? }`.
4. On `status === "ready"`, stop polling and fire `onUnlock({ sessionToken })`.
5. On `status === "expired" | "not_found"`, stop polling and fire `onExpired()`.

The SDK never holds a session token in `localStorage` or `cookie` — the token is only exposed once, via `onUnlock`, so your app decides exactly how to forward it to your backend.

## Style isolation

The gate mounts inside an open Shadow DOM (`<div data-hpp-gate>` with `attachShadow({ mode: 'open' })`). All SDK styles are scoped to that root via `:host { all: initial }`, so nothing on your page bleeds in or out. The host element inherits its layout from its container, so position the gate by styling your container, not the SDK internals.

## Backend validation (your responsibility)

The session token returned to `onUnlock` is opaque. Your backend should validate it against the verifier — typically by `GET {verifier}/session?session_token=…` or by walking the receipt chain at `GET {verifier}/receipt/:receipt_id`. The SDK intentionally does no client-side validation: the token must round-trip through your trust boundary.

## Browser smoke test

Open [`test/smoke.html`](test/smoke.html) in any local HTTP server. The page asserts the public surface (`window.HPP`, `HPP.version`, frozen namespace, argument validation, shell DOM mounting) and calls `HPP.gate(...)` against the production verifier so you can watch the live `/relay/create` + `/qr` + polling round-trip.

```sh
# from this folder
python3 -m http.server 8765
# then open http://127.0.0.1:8765/test/smoke.html
```
