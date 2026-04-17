# Website SDK — Phase 2

The Website SDK is the **drop-in `<script>` tag** that lets any relying-party site add an HPP presence gate without copying client-side integration code.

> **Status: Phase 2 (planned).** The full requirements specification is at [`REQUIREMENTS.md`](REQUIREMENTS.md). The reference implementation pattern lives inside the unified site (`unified-site.js`) in the production reference verifier today; the extraction work is what Phase 2 ships.

---

## Anticipated v0.2.0 API

```html
<!DOCTYPE html>
<html>
<head>
  <title>Premium Content</title>
</head>
<body>
  <div id="content" style="display:none;">
    <h1>Premium content goes here</h1>
    <p>Visible only after presence verification.</p>
  </div>

  <script src="https://hpp-verifier.onrender.com/sdk/hpp.js"></script>
  <script>
    HPP.gate({
      // Where to mount the gate UI
      container: '#content',

      // Verifier endpoint (defaults to production)
      verifier: 'https://hpp-verifier.onrender.com',

      // Site identifier (your domain)
      site: 'example.com',

      // Optional: site-defined session duration in seconds (default 600)
      sessionDuration: 1800,

      // Optional: age predicate (will request age_qualified boolean)
      // The user's DOB never leaves their device; only yes/no comes back.
      agePredicate: { minAge: 18 },

      // Hook fired when the user completes a successful round-trip
      onUnlock: (session) => {
        console.log('verified human, session:', session.sessionToken);
        console.log('receipt id:', session.receiptId);
        document.querySelector('#content').style.display = 'block';
      },

      // Hook fired when the user explicitly cancels or times out
      onCancel: (reason) => {
        console.log('cancelled:', reason);
      },

      // Optional event hooks for finer integration
      on: {
        challenge: (c)  => console.log('challenge issued', c.challengeId),
        qrShown:   (q)  => console.log('QR rendered', q.relayId),
        attest:    (r)  => console.log('phone attested', r.receiptId),
        rateLimit: (e)  => console.log('NPHT rate limit hit', e.retryAfterMs),
        error:     (e)  => console.error('hpp error', e.code, e.message),
      },

      // Visual customization (defaults match the unified site's HPP palette)
      style: {
        accent:        '#1a3a6b',  // navy
        accentSecond:  '#8b6914',  // gold
        warmWhite:     '#fafaf8',
        font:          'system',   // 'system' | 'serif' | 'mono'
      },
    });
  </script>
</body>
</html>
```

That's the entire integration. One `<script>` tag, one `HPP.gate({...})` call.

---

## NPM package alternative

For build-tooled sites:

```bash
npm install @humanpresenceprotocol/sdk
```

```javascript
import { gate } from '@humanpresenceprotocol/sdk';

gate({
  container: '#content',
  verifier: 'https://hpp-verifier.onrender.com',
  site: 'example.com',
  onUnlock: (session) => { /* ... */ },
});
```

Same API surface; tree-shakable; TypeScript types ship with the package.

---

## What this replaces

Today, a relying party that wants HPP has to:

1. Read the welcome-gate code in `unified-site.js` (~3,000 lines)
2. Copy out the relevant client-side fragments (challenge call, QR rendering, relay polling, unlock callback)
3. Adapt to their own DOM structure and styling
4. Test against the canonical protocol

After Phase 2, they'll add **one script tag**.

---

## Contents (will populate in Phase 2)

```
website/
├── REQUIREMENTS.md             ← detailed spec (port of HPP_ENT2_Website_SDK_Requirements_v1_0.md)
├── package.json
├── src/
│   ├── hpp.js                  ← entry point exposing the global HPP namespace
│   ├── gate.js                 ← gate UI + lifecycle
│   ├── challenge.js            ← /challenge call
│   ├── relay.js                ← polling logic
│   ├── qr.js                   ← QR rendering
│   ├── events.js               ← event hooks
│   ├── style.js                ← runtime style injection
│   └── types.d.ts              ← TypeScript types
├── dist/
│   ├── hpp.min.js              ← single-file CDN bundle
│   ├── hpp.esm.js              ← ESM build for bundlers
│   └── hpp.d.ts                ← TypeScript declarations
├── examples/
│   ├── minimal-html/           ← <script> drop-in
│   ├── react/                  ← React component wrapper
│   └── npm-package/            ← bundler integration
└── tests/
    ├── unit/
    └── integration/            ← against a mock verifier
```

---

## Privacy properties

The Website SDK does not introduce any new privacy implications beyond what HPP already does. The relying party site never sees:

- The user's DOB (only `age_qualified` boolean if requested)
- The user's biometric data (Face ID never leaves Apple's framework)
- The user's identity (only a pseudonymous public key fingerprint)
- The user's other site sessions (cross-tenant isolation enforced at the verifier)

The relying party DOES receive: session token, receipt ID, expiry timestamp, optional age predicate result. That's it.

---

## Phase 2 plan

1. Port the existing welcome-gate client-side code from `unified-site.js` into `website/src/`
2. Refactor as a self-contained module with the configurable API surface above
3. Build pipeline: bundle to `dist/hpp.min.js` for CDN, `dist/hpp.esm.js` for bundlers
4. Publish the CDN bundle to the production verifier at `https://hpp-verifier.onrender.com/sdk/hpp.js`
5. Publish to npm as `@humanpresenceprotocol/sdk`
6. Examples for HTML drop-in, React, and bundler integrations
7. Integration tests against a mock verifier
8. Tag `v0.2.0`

Closes the parent project's backlog item ENT.2 — Multi-Tenant Website SDK.


---

## License, patents, and trademarks

- **Code:** [Apache License, Version 2.0](../LICENSE). Copyright © 2026 Agile On Target LLC.
- **Patent scope:** [`../PATENT-NOTICE.md`](../PATENT-NOTICE.md) and [`../PATENT-POLICY.md`](../PATENT-POLICY.md). USPTO Customer No. 224891. All patent rights reserved by Agile On Target LLC; Apache 2.0 §3 grant is narrow and does not authorize commercial production deployment, OEM embedding, or ground-up reimplementation.
- **Trademarks:** `HPP` (USPTO Serial 99656390), `Human Presence Protocol` (Serial 99656359), + 3 others filed 2026-02-17 — see [`../NOTICE`](../NOTICE) and [`../PATENT-NOTICE.md §4`](../PATENT-NOTICE.md). Use `℠` or `™` (not `®` until registration issues).
- **Attribution:** [`../NOTICE`](../NOTICE), [`../AUTHORS`](../AUTHORS), [`../THIRD-PARTY-LICENSES.md`](../THIRD-PARTY-LICENSES.md).
- **Contributions:** governed by [`../CLA.md`](../CLA.md).
