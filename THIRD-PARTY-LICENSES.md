# Third-Party Licenses

**Audit date:** 2026-04-17
**SDK version covered:** v0.1.3

This document inventories every third-party component embedded in, shipped with, or loaded at runtime by the Human Presence Protocol SDK, and the license governing each.

## Summary

At v0.1.3, the SDK ships **zero unmodified third-party components**. Every source file in the repository is original work of Agile On Target LLC, licensed under the Apache License, Version 2.0 (see [`LICENSE`](LICENSE)), subject to the patent scope in [`PATENT-NOTICE.md`](PATENT-NOTICE.md) and [`PATENT-POLICY.md`](PATENT-POLICY.md).

## Detailed inventory

### Chrome extension (`chrome-extension/`)

| File | Third-party status | Notes |
|---|---|---|
| `background.js`, `content.js`, `hpp-api.js`, `popup.js`, `options.js` | Original | Apache 2.0, © 2026 Agile On Target LLC |
| `lib/hpp-crypto.js`, `hpp-errors.js`, `hpp-logger.js`, `hpp-storage.js` | Original | Apache 2.0, © 2026 Agile On Target LLC |
| `lib/psl.min.js` | **Original clean-room shim**, not the upstream [`psl`](https://github.com/lupomontero/psl) library | Apache 2.0, © 2026 Agile On Target LLC. The file documents a migration path to the real upstream library (MIT-licensed) for production deployment; implementers who choose to substitute the real library must add the MIT copyright notice to this file and record the substitution here. |
| `lib/hpp-server-pubkey.pem` | Configuration / key material | Not a license-bearing work. Pinned public key of the attestation-server operator (Agile On Target LLC). |
| `icons/hpp-*.png` | Original artwork | Copyright Agile On Target LLC. Not separately licensed; distributed as part of the Apache 2.0 Work. |
| `manifest.json`, `*.html` | Original | Apache 2.0, © 2026 Agile On Target LLC |
| `presence-receipt-schema.json`, `API.md`, `API_EVENTS.md`, `README.md` | Original | Apache 2.0, © 2026 Agile On Target LLC |

### Protocol (`protocol/`)

| File | Third-party status | Notes |
|---|---|---|
| `openapi.yaml` | Original | Apache 2.0, © 2026 Agile On Target LLC. **Non-normative for patent-grant purposes** — see [`PATENT-POLICY.md`](PATENT-POLICY.md). |
| `schemas/presence-receipt.json` | Original | Apache 2.0, © 2026 Agile On Target LLC. Non-normative for patent-grant purposes. |
| `test-vectors.json` | Original | Apache 2.0, © 2026 Agile On Target LLC. Non-normative for patent-grant purposes. |
| `docs/*.md` (7 files) | Original | Apache 2.0, © 2026 Agile On Target LLC. Non-normative for patent-grant purposes. |

### iOS (`ios/`) and Website (`website/`)

| File | Third-party status | Notes |
|---|---|---|
| `README.md` files | Original | Apache 2.0, © 2026 Agile On Target LLC. Phase 2 extraction plans. |

At the time of SDK extraction (v0.2.0 — Phase 2), the Swift Package and Website SDK source will be brought into this repository. When they are, any third-party Swift Package dependencies or npm dependencies will be inventoried in this file with their licenses before the v0.2.0 tag is published.

## Migration notes (forward-looking)

When the SDK matures into Phase 2, the following third-party components are **candidates** for inclusion. They are not present today. Each will require an addition to this file before inclusion:

- **`psl` (npm) — MIT License.** Candidate replacement for `chrome-extension/lib/psl.min.js` in production. If incorporated, add the MIT copyright notice alongside the Apache 2.0 grant on the substituted file.
- **QR rendering library.** The Phase 2 Website SDK may ship a QR renderer. Likely candidates (`qrcode.js` MIT, `qrcode-generator` MIT) are permissively licensed; attribution will be added here.
- **Swift Package Manager transitive dependencies.** The Phase 2 iOS Swift Package may transitively include Apple `swift-crypto` (Apache 2.0) or similar; any resulting attributions will be added here before the `v0.2.0` iOS tag.

## Contributor license posture

Every contribution merged into this repository is governed by the Contributor License Agreement at [`CLA.md`](CLA.md). Contributors grant Agile On Target LLC a perpetual copyright and patent license to their contribution; the copyright on the contribution vis-à-vis Agile On Target LLC flows to Agile On Target LLC. Contributors retain their own rights in their contributions for their own use.

Contributions that embed or propose to embed **third-party code** (code not authored solely by the contributor or by Agile On Target LLC) must disclose the source, the license, and the copyright holder in the pull request description, and the maintainers must explicitly approve the inclusion and update this file in the same commit.

## Reporting a missing attribution

If you believe this file fails to attribute a third-party component, please open an issue tagged `license-attribution` or reach out through the channels listed in [`SECURITY.md`](SECURITY.md) (you do not need to use the private security channel for license-attribution matters).

---

*Agile On Target LLC — USPTO Customer No. 224891 — April 2026*
