# Human Presence Protocol — SDK

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Patents](https://img.shields.io/badge/patents-USPTO%20Customer%20No.%20224891-gold)](PATENT-NOTICE.md)

The Human Presence Protocol (HPP) is a cryptographic attestation system that proves a biological human is physically present at a hardware-bound device, without requiring identity disclosure. This repository contains the open-source SDK across four surfaces:

| Surface | Folder | What it is | Status |
|---|---|---|---|
| **Protocol** | [`protocol/`](protocol/) | Canonical spec, OpenAPI for the verifier API, JSON schemas, test vectors, threat model | Stable reference |
| **iOS** | [`ios/`](ios/) | Swift Package — Secure Enclave key management, biometric auth, attestation orchestration | Phase 2 (extraction in progress) |
| **Website** | [`website/`](website/) | Drop-in `<script>` tag for relying-party sites to add an HPP presence gate | Phase 2 (spec ready) |
| **Chrome Extension** | [`chrome-extension/`](chrome-extension/) | MV3 browser extension implementing HPP browser login | Working source |

This SDK is the **distribution mechanism** for HPP. Without it, HPP is a demo. With it, HPP is a building block any platform can adopt.

---

## What is HPP?

HPP is a **constraint-based attestation protocol** that produces cryptographically verifiable evidence of human presence. It enforces thermodynamic cost symmetry between humans and bots: the human body is the non-parallelizable substrate, and no software substitution is possible at the hardware attestation layer.

**Core architecture (one round-trip):**

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Phone   │                    │ Verifier │                    │ Browser  │
│  (HPP)   │                    │  Backend │                    │  / Site  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  POST /challenge              │                               │
     ├──────────────────────────────>│                               │
     │  { challenge, relay_id }      │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
     │  [ Biometric: Face ID ]       │                               │
     │  [ Secure Enclave signs ]     │                               │
     │                               │                               │
     │  POST /verify { sig, pubkey } │                               │
     ├──────────────────────────────>│                               │
     │  { session_token, receipt }   │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
     │  POST /relay/:id { token }    │                               │
     ├──────────────────────────────>│   GET /relay/:id (poll)       │
     │                               │<──────────────────────────────┤
     │                               │   { session_token }           │
     │                               ├──────────────────────────────>│
     │                               │                               │
     │                               │   [ Gate unlocks ]            │
```

**Properties:**
- **Hardware-bound** — private key lives only in the device's Secure Enclave; cannot be exported by any software
- **Time-anchored** — server-issued challenge has a 5-minute TTL; replays are detected
- **Privacy-preserving** — pseudonymous; no identity disclosure; only a public-key fingerprint is associated with sessions
- **Cost-symmetric** — every attestation has a thermodynamic floor (the H-Constant); bot farms scale at the cost of physical hardware, not compute cycles
- **Verifiable** — every attestation produces a chain-linked receipt; the receipt chain is publicly walkable

For the formal model (HPP-PRES, NPHT, Biometric Burn, CCM, H-Constant), see [`protocol/docs/core-spec.md`](protocol/docs/core-spec.md) and the academic submission at [humanpresenceprotocol.com#academic](https://humanpresenceprotocol.com#academic).

---

## Quick Start

### As a relying party (your website wants to gate content behind HPP)

The website SDK (Phase 2 — spec at [`website/REQUIREMENTS.md`](website/REQUIREMENTS.md)) will let you add a presence gate with one script tag:

```html
<script src="https://hpp-verifier.onrender.com/sdk/hpp.js"></script>
<script>
  HPP.gate({
    container: '#content',
    verifier: 'https://hpp-verifier.onrender.com',
    site:     'example.com',
    onUnlock: (session) => { console.log('verified:', session.receipt_id); }
  });
</script>
```

Until the website SDK ships, see [`protocol/docs/relying-party-guide.md`](protocol/docs/relying-party-guide.md) for the manual integration pattern (call `POST /challenge`, render the QR, poll `GET /relay/:id`, handle the unlock).

### As an iOS app integrator (your app needs to attest)

The iOS SDK (Phase 2) will be a Swift Package:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/AgileOnTarget/hpp-sdk", from: "0.1.0"),
],
targets: [
    .target(name: "MyApp", dependencies: [
        .product(name: "HPPCore", package: "hpp-sdk"),
    ])
]
```

Until then, the live HPP iOS app (`HPPDemo`) is the reference implementation; the relevant Swift sources are in [`HPPDemo/Services/`](https://github.com/AgileOnTarget/hpp-verifier) (private) and will be extracted to [`ios/Sources/HPPCore/`](ios/) in Phase 2.

### As a Chrome extension developer

The working browser extension is in [`chrome-extension/`](chrome-extension/). Build instructions in its [README](chrome-extension/README.md).

### As a verifier operator (you want to run your own backend)

The reference verifier implementation is at [`github.com/AgileOnTarget/hpp-verifier`](https://github.com/AgileOnTarget/hpp-verifier) (Express / Node). The protocol's API surface is documented in [`protocol/openapi.yaml`](protocol/openapi.yaml).

---

## Repository Layout

```
hpp-sdk/
├── README.md                     ← you are here
├── LICENSE                       ← Apache 2.0
├── PATENT-NOTICE.md              ← USPTO Customer No. 224891 disclosure
├── CONTRIBUTING.md
├── SECURITY.md                   ← responsible-disclosure policy
├── CHANGELOG.md
│
├── protocol/                     ← Protocol-agnostic core
│   ├── openapi.yaml              ← Verifier API (canonical v1)
│   ├── schemas/                  ← JSON Schemas for receipts, payloads
│   ├── test-vectors.json         ← Deterministic crypto vectors
│   ├── docs/
│   │   ├── core-spec.md          ← Formal model (HPP-PRES / NPHT / Biometric Burn / CCM)
│   │   ├── canonical-signing.md  ← Canonical-string construction rules
│   │   ├── receipt-canon.md      ← Receipt structure + hash linkage
│   │   ├── threat-model.md       ← Adversarial games + assumptions
│   │   ├── architecture.md       ← System architecture overview
│   │   └── relying-party-guide.md ← How to integrate HPP without the website SDK
│   └── README.md
│
├── ios/                          ← iOS Swift Package (Phase 2)
│   └── README.md
│
├── website/                      ← Relying-party JS SDK (Phase 2)
│   └── README.md
│
├── chrome-extension/             ← MV3 browser extension (working)
│   ├── manifest.json
│   ├── background.js / content.js / popup / options / onboarding
│   ├── lib/
│   ├── icons/
│   └── README.md
│
└── docs/                         ← Cross-cutting docs
    └── (architecture, integration verticals, etc.)
```

---

## Versioning

This repository uses [SemVer](https://semver.org/). Phase 1 is `v0.1.0` — the initial public scaffold. Phase 2 (iOS Swift Package + Website SDK) targets `v0.2.0`. Production-readiness across all four surfaces targets `v1.0.0`.

The protocol itself is at canonical version `v1.0` (per [`protocol/openapi.yaml`](protocol/openapi.yaml)). The reference verifier (production at `hpp-verifier.onrender.com`) currently runs an MVP precursor with different endpoint naming; see the production endpoint table in the parent project's System Reality doc for the as-built reality. The canonical v1 surface is what the SDK targets going forward.

---

## License

Code in this repository is licensed under [Apache License 2.0](LICENSE). See [`PATENT-NOTICE.md`](PATENT-NOTICE.md) for the patent context: HPP is the subject of 42 provisional patent applications under USPTO Customer No. 224891, filed February 14 – March 28, 2026. The Apache 2.0 license grants implementation rights to the code in this repo; **separate patent grants are required for production use of the patented architecture**.

---

## Status

| Component | State | Phase |
|---|---|---|
| Protocol spec | Stable v1.0 reference | Live |
| OpenAPI YAML | Canonical v1.0 | Live |
| Test vectors | Stable MVP | Live |
| Chrome extension | Working source (MV3) | Live |
| iOS Swift Package | Documented + planned | Phase 2 |
| Website SDK | Specced + planned | Phase 2 |
| Reference verifier | At [`hpp-verifier`](https://github.com/AgileOnTarget/hpp-verifier) (production live) | Live |

This is **v0.1.0 — initial public scaffold (Phase 1)**. See [`CHANGELOG.md`](CHANGELOG.md).

---

## Get in touch

- Issues, PRs, discussion: this repo
- Security disclosure: see [`SECURITY.md`](SECURITY.md)
- Patent / commercial licensing inquiries: USPTO Customer No. 224891
- Public marketing site: [humanpresenceprotocol.com](https://humanpresenceprotocol.com)
