# Changelog

All notable changes to this SDK are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2026-04-17 — Initial public scaffold (Phase 1)

### Added
- **Top-level repository scaffold** with README, LICENSE (Apache 2.0), PATENT-NOTICE, CONTRIBUTING, SECURITY, CHANGELOG
- **`protocol/`** — canonical protocol surface
  - `openapi.yaml` — Verifier API v1.0 reference (16 endpoint definitions; the production reference verifier at `hpp-verifier.onrender.com` currently runs an MVP precursor with 30 endpoints under different naming — see the parent project's System Reality §7 for the as-built table)
  - `schemas/presence-receipt.json` — JSON Schema for the canonical presence receipt
  - `test-vectors.json` — deterministic crypto test vectors with verification procedure
  - `docs/core-spec.md`, `architecture.md`, `canonical-signing.md`, `receipt-canon.md`, `threat-model.md`, `relying-party-guide.md`
- **`chrome-extension/`** — working MV3 browser extension
  - `manifest.json` (V3), `background.js` (service worker), `content.js` (5 DOM operations only), `popup.html/js`, `options.html/js`, `onboarding.html`
  - `hpp-api.js` — page-side API surface
  - `lib/` — cryptographic helpers, storage wrappers, error codes, structured logger
  - `presence-receipt-schema.json`
  - Tested against a mock attestation server; CSP-pinned to the production verifier hostname
- **`ios/README.md`** — Phase 2 integration plan (Swift Package extraction from the live HPP iOS app's `Services/` layer)
- **`website/README.md`** — Phase 2 integration plan + `<script>` tag spec from `HPP_ENT2_Website_SDK_Requirements_v1_0`
- **`docs/`** — cross-cutting integration and architecture documentation

### Status
- Protocol spec: stable
- Chrome extension: working source, not yet on Chrome Web Store
- iOS Swift Package: planned (Phase 2)
- Website JS SDK: planned (Phase 2)
- Reference verifier: lives at [`github.com/AgileOnTarget/hpp-verifier`](https://github.com/AgileOnTarget/hpp-verifier); production at `hpp-verifier.onrender.com`

### Origin
This scaffold consolidates ~50 design / spec documents from the parent project's VDR (`AOT VDR/04 — Developer SDK & Integration/`) into a single living repository. The VDR retains a 1-page pointer to this repo for go-forward reference.

---

## [Unreleased] — Phase 2

### Planned
- Extract iOS HPP-CORE services (`SecureEnclaveKeyManager`, `BiometricAuthManager`, `AttestationService`, `AgePredicateStore`, related models) from the live iOS app into a Swift Package
- Build the relying-party JS SDK (`<script>` drop-in) per the ENT.2 requirements
- Generate a second OpenAPI spec documenting the production verifier's exact 30 endpoints (closes parent project's TD.5)
- Integration examples for both surfaces
- CI: GitHub Actions for build + lint + test on each PR

---

## [Unreleased] — Phase 3 (later)

### Planned
- Submit Chrome extension to the Chrome Web Store
- Register iOS package with the Swift Package Index
- Versioning + release tags + signed release artifacts
- Conformance test suite that adopters can run against their own verifier implementations
