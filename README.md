# Human Presence Protocol — SDK

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Patents](https://img.shields.io/badge/patents-USPTO%20Customer%20No.%20224891-gold)](PATENT-NOTICE.md)

The Human Presence Protocol (HPP) is a cryptographic attestation system that proves a biological human is physically present at a hardware-bound device, without requiring identity disclosure. This repository contains the open-source SDK across four surfaces:

| Surface | Folder | What it is | Status |
|---|---|---|---|
| **Protocol** | [`protocol/`](protocol/) | Canonical spec, OpenAPI for the verifier API, JSON schemas, test vectors, threat model | Stable reference |
| **iOS** | [`ios/`](ios/) | Swift Package — Secure Enclave key management, biometric auth, attestation orchestration | Working source (iOS 17+) |
| **Website** | [`website/`](website/) | Drop-in `<script>` tag for relying-party sites to add an HPP presence gate | Working source |
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

Drop the SDK into any HTML page. See [`website/`](website/) for the full reference.

```html
<div id="hpp-gate"></div>
<script src="/path/to/hpp.js"></script>
<script>
  HPP.gate({
    container: '#hpp-gate',
    verifier:  'https://hpp-verifier.onrender.com',
    site:      'example.com',
    onUnlock: function (session) {
      // session.sessionToken — POST to your backend over TLS.
    }
  });
</script>
```

The shipped file is [`website/dist/hpp.js`](website/dist/hpp.js) — vanilla JS, no build step, no dependencies. A live working example is at [`website/examples/basic.html`](website/examples/basic.html).

### As an iOS app integrator (your app needs to attest)

The iOS SDK is a Swift Package at [`ios/`](ios/). In Xcode: **File → Add Package Dependencies…** and paste this repo's URL.

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/AgileOnTarget/hpp-sdk", branch: "main"),
],
targets: [
    .target(name: "MyApp", dependencies: [
        .product(name: "HPP", package: "hpp-sdk"),
    ])
]
```

```swift
import HPP

let client = HPPClient(configuration: HPPConfiguration(
    verifierURL: URL(string: "https://hpp-verifier.onrender.com")!,
    site: "example.com"
))
let result = try await client.attest(reason: "Verify your presence to log in")
// → result.sessionToken, result.receiptId, result.assurance
```

Requires a physical iPhone or iPad with Secure Enclave; iOS 17+. See [`ios/README.md`](ios/README.md) for the full API.

### As a Chrome extension developer

The working browser extension is in [`chrome-extension/`](chrome-extension/). Build instructions in its [README](chrome-extension/README.md).

### As a verifier operator (you want to run your own backend)

The reference verifier implementation is at [`github.com/AgileOnTarget/hpp-verifier`](https://github.com/AgileOnTarget/hpp-verifier) (Express / Node). The protocol's API surface is documented in [`protocol/openapi.yaml`](protocol/openapi.yaml). For a deeper architecture treatment of the verifier service itself, see [`protocol/docs/reference-verifier-architecture.md`](protocol/docs/reference-verifier-architecture.md).

---

## Documentation

Beyond the per-surface READMEs above, the protocol documentation in [`protocol/docs/`](protocol/docs/) covers everything an integrator needs:

**Specs and architecture:**
- [`core-spec.md`](protocol/docs/core-spec.md) — Formal model: HPP-PRES, NPHT, Biometric Burn, CCM
- [`canonical-protocol-spec.md`](protocol/docs/canonical-protocol-spec.md) — Platform-agnostic protocol specification (frozen v2.0)
- [`architecture.md`](protocol/docs/architecture.md) — System architecture overview
- [`client-sdk-architecture.md`](protocol/docs/client-sdk-architecture.md) — Recommended architecture for any HPP client SDK
- [`reference-verifier-architecture.md`](protocol/docs/reference-verifier-architecture.md) — Reference architecture for an HPP Verifier Service

**Security:**
- [`threat-model.md`](protocol/docs/threat-model.md) — Adversarial games and assumptions
- [`security-model.md`](protocol/docs/security-model.md) — Security objectives, trust boundaries, threat-model assumptions
- [`security-invariants.md`](protocol/docs/security-invariants.md) — Eight enforcement invariants every HPP implementation must satisfy
- [`formal-cryptographic-model.md`](protocol/docs/formal-cryptographic-model.md) — Formal cryptographic model and security-proof structure

**Integration:**
- [`relying-party-guide.md`](protocol/docs/relying-party-guide.md) — REST API integration, JWT validation, trust tiering
- [`rp-use-case-map.md`](protocol/docs/rp-use-case-map.md) — Seven concrete integration patterns for relying parties

**Operational:**
- [`keys-and-genesis.md`](protocol/docs/keys-and-genesis.md) — Verifier signing keys and Genesis Epoch bootstrap
- [`continuity-reference.md`](protocol/docs/continuity-reference.md) — Practical Continuity Score reference
- [`device-recovery.md`](protocol/docs/device-recovery.md) — Migration and recovery flows
- [`ledger-architecture.md`](protocol/docs/ledger-architecture.md) — Local hash-chained ledger format
- [`canonical-signing.md`](protocol/docs/canonical-signing.md) — Canonical-string construction rules
- [`receipt-canon.md`](protocol/docs/receipt-canon.md) — Receipt structure and hash linkage

**API specs:**
- [`protocol/openapi.yaml`](protocol/openapi.yaml) — OpenAPI 3.1 spec for the **shipping** verifier API at `hpp-verifier.onrender.com`
- [`protocol/openapi-canonical-v1-future.yaml`](protocol/openapi-canonical-v1-future.yaml) — Canonical v1 future-state design (not yet implemented; reference only)

For ready-to-use code, see [`protocol/reference-implementations/`](protocol/reference-implementations/) — Node.js and Python verification libraries, a minimal RP server, and an example integration page. An interactive simulator lives at [`protocol/tools/simulator.html`](protocol/tools/simulator.html).

### iOS client docs

The full iOS client documentation set lives in [`ios/docs/`](ios/docs/) — 27 documents covering everything from the client guide through end-of-life policy.

- **[`client-guide.md`](ios/docs/client-guide.md)** — top-level iOS client guide
- **[`implementation-notes.md`](ios/docs/implementation-notes.md)** — Secure Enclave + Keychain access-control patterns
- **[`security-model.md`](ios/docs/security-model.md)** · **[`security-review-checklist.md`](ios/docs/security-review-checklist.md)** · **[`cryptographic-primitives.md`](ios/docs/cryptographic-primitives.md)**
- **[`platform-integration.md`](ios/docs/platform-integration.md)** · **[`state-machines.md`](ios/docs/state-machines.md)** · **[`data-model-schemas.md`](ios/docs/data-model-schemas.md)** · **[`server-contract.md`](ios/docs/server-contract.md)**
- **[`build-and-distribution.md`](ios/docs/build-and-distribution.md)** · **[`release-runbook.md`](ios/docs/release-runbook.md)** · **[`post-release-monitoring.md`](ios/docs/post-release-monitoring.md)** · **[`xcode-skeleton.md`](ios/docs/xcode-skeleton.md)**
- **[`acceptance-tests.md`](ios/docs/acceptance-tests.md)** · **[`test-runbook.md`](ios/docs/test-runbook.md)** · **[`test-data-pack.md`](ios/docs/test-data-pack.md)** · **[`debugging-guide.md`](ios/docs/debugging-guide.md)** · **[`performance-budgets.md`](ios/docs/performance-budgets.md)**
- **[`flows-and-wireframes.md`](ios/docs/flows-and-wireframes.md)** · **[`accessibility-spec.md`](ios/docs/accessibility-spec.md)** · **[`privacy-label.md`](ios/docs/privacy-label.md)**
- **[`backward-compatibility.md`](ios/docs/backward-compatibility.md)** · **[`migration-flow.md`](ios/docs/migration-flow.md)** · **[`end-of-life.md`](ios/docs/end-of-life.md)**
- **[`faq.md`](ios/docs/faq.md)** · **[`known-limits.md`](ios/docs/known-limits.md)** · **[`implementation-checklist.md`](ios/docs/implementation-checklist.md)**

### Chrome extension docs

The full Chrome extension documentation set lives in [`chrome-extension/docs/`](chrome-extension/docs/) — 13 documents covering the browser SDK API, security review, and integration walkthroughs.

- **[`guide.md`](chrome-extension/docs/guide.md)** — top-level Chrome plugin guide
- **[`api-reference.md`](chrome-extension/docs/api-reference.md)** — Frozen v1 public API surface (`HPP.requestPresence()`, `HPP.getSession()`, etc.)
- **[`quick-start.md`](chrome-extension/docs/quick-start.md)** · **[`reference-implementation.md`](chrome-extension/docs/reference-implementation.md)** · **[`rp-integration-guide.md`](chrome-extension/docs/rp-integration-guide.md)**
- **[`extension-spec.md`](chrome-extension/docs/extension-spec.md)** · **[`component-spec.md`](chrome-extension/docs/component-spec.md)** · **[`browser-integration.md`](chrome-extension/docs/browser-integration.md)** · **[`browser-login-spec.md`](chrome-extension/docs/browser-login-spec.md)**
- **[`protocol-spec.md`](chrome-extension/docs/protocol-spec.md)** — Chrome-side protocol binding
- **[`system-walkthrough.md`](chrome-extension/docs/system-walkthrough.md)** — End-to-end demo walkthrough
- **[`demo-site-spec.md`](chrome-extension/docs/demo-site-spec.md)** · **[`security-review.md`](chrome-extension/docs/security-review.md)**

### Vertical integration recipes

[`docs/verticals/`](docs/verticals/) contains 13 recipe books showing how HPP slots into specific industry verticals. Useful for partners scoping a deployment.

- **[`guide.md`](docs/verticals/guide.md)** — top-level integration verticals guide
- **[`website-integration.md`](docs/verticals/website-integration.md)** — Generic web/JS SDK integration
- **[`hpp-over-sip-anti-robocall.md`](docs/verticals/hpp-over-sip-anti-robocall.md)** — SIP/VoIP anti-robocall
- **[`hpp-over-smtp-email-gating.md`](docs/verticals/hpp-over-smtp-email-gating.md)** — SMTP email gating
- **[`financial-services.md`](docs/verticals/financial-services.md)** — KYC, AML, transaction signing
- **[`ad-tech-impression-validation.md`](docs/verticals/ad-tech-impression-validation.md)** — Ad-fraud / impression validation
- **[`age-verification-zkp.md`](docs/verticals/age-verification-zkp.md)** + **[`age-verify-zkp-details.md`](docs/verticals/age-verify-zkp-details.md)** — Zero-knowledge age verification
- **[`child-safety.md`](docs/verticals/child-safety.md)** — Child-safety / parental-controls integration
- **[`autonomous-compute-agentic-ai.md`](docs/verticals/autonomous-compute-agentic-ai.md)** — Agentic-AI authentication and continuity
- **[`e-ticketing-venue-access.md`](docs/verticals/e-ticketing-venue-access.md)** — Event ticketing and venue access
- **[`tld-presence-gated-namespace.md`](docs/verticals/tld-presence-gated-namespace.md)** — TLD-level presence-gated namespaces
- **[`ai-triage-defense.md`](docs/verticals/ai-triage-defense.md)** — AI-based bot/triage defense

### Project governance

[`GOVERNANCE.md`](GOVERNANCE.md) and [`MAINTAINERS.md`](MAINTAINERS.md).

---

## Repository Layout

```
hpp-sdk/
├── README.md                            ← you are here
├── LICENSE                              ← Apache 2.0 (with patent-scope note)
├── NOTICE                               ← Apache 2.0 attribution + patent + trademark reservations
├── PATENT-NOTICE.md                     ← USPTO Customer No. 224891 disclosure; patent scope, inquiries
├── PATENT-POLICY.md                     ← Non-normative status of protocol documentation
├── CLA.md                               ← Contributor License Agreement
├── AUTHORS                              ← Copyright-holder attribution
├── GOVERNANCE.md                        ← How the protocol is governed (decisions, maintainer selection, evolution)
├── MAINTAINERS.md                       ← Maintainer roles, responsibilities, expectations
├── THIRD-PARTY-LICENSES.md              ← Third-party component inventory (currently zero)
├── CONTRIBUTING.md
├── SECURITY.md                          ← Responsible-disclosure policy
├── CHANGELOG.md
│
├── protocol/                            ← Protocol-agnostic core
│   ├── openapi.yaml                     ← Verifier API (canonical v1)
│   ├── schemas/                         ← JSON Schemas for receipts, payloads
│   │   ├── presence-receipt.json
│   │   ├── presence-cert-v1.json        ← Presence-certificate schema
│   │   ├── challenge-v1.json            ← /challenge endpoint payload
│   │   ├── attest-request-v1.json       ← /attest endpoint payload
│   │   └── error-codes-v1.json          ← Canonical error code registry
│   ├── test-vectors.json                ← Deterministic crypto vectors
│   ├── docs/
│   │   ├── core-spec.md                 ← Formal model (HPP-PRES / NPHT / Biometric Burn / CCM)
│   │   ├── canonical-signing.md         ← Canonical-string construction rules
│   │   ├── receipt-canon.md             ← Receipt structure + hash linkage
│   │   ├── threat-model.md              ← Adversarial games + assumptions
│   │   ├── architecture.md              ← System architecture overview
│   │   ├── relying-party-guide.md       ← REST API integration, JWT validation, trust tiering
│   │   ├── client-sdk-architecture.md   ← Recommended architecture for any HPP client SDK
│   │   ├── keys-and-genesis.md          ← Verifier signing keys + Genesis Epoch bootstrap
│   │   ├── continuity-reference.md      ← Practical continuity-score reference
│   │   ├── device-recovery.md           ← Migration + recovery flows
│   │   ├── rp-use-case-map.md           ← Seven integration patterns for relying parties
│   │   ├── ledger-architecture.md       ← Local hash-chained ledger format
│   │   └── reference-verifier-architecture.md  ← Reference architecture for an HPP Verifier Service
│   ├── reference-implementations/       ← Ready-to-use code samples
│   │   ├── verify-node.js               ← Node.js verification library
│   │   ├── verify-python.py             ← Python verification library
│   │   ├── verify-test-suite.js         ← Cross-implementation test vectors
│   │   ├── example-rp-server.js         ← Minimal RP backend
│   │   └── example-integration.html     ← Minimal RP front-end
│   ├── tools/
│   │   └── simulator.html               ← Interactive protocol simulator
│   └── README.md
│
├── ios/                                 ← iOS Swift Package (HPP)
│   ├── Package.swift
│   ├── Sources/HPP/                     ← public API + extracted internals
│   ├── Tests/HPPTests/
│   ├── Examples/                        ← illustrative SwiftUI snippets
│   ├── docs/                            ← 27 client-side docs (security, build, test, monitoring, …)
│   └── README.md
│
├── chrome-extension/                    ← MV3 browser extension
│   ├── manifest.json + JS sources
│   ├── docs/                            ← 13 docs (API reference, security review, integration guides, …)
│   └── README.md
│
├── docs/
│   └── verticals/                       ← 13 integration recipe books (SIP, SMTP, ad-tech, age-ZKP, …)
│
├── website/                      ← Relying-party JS SDK
│   ├── src/hpp.js                ← source (vanilla, no build)
│   ├── dist/hpp.js               ← shipped file (identical to src)
│   ├── examples/basic.html       ← working drop-in example
│   ├── test/smoke.html           ← in-browser smoke tests
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

## License, Patents, and Trademarks

**Copyright © 2026 Agile On Target LLC.** All rights reserved except as expressly licensed below.

**Code:** [Apache License, Version 2.0](LICENSE).

**Patents:** The Human Presence Protocol is the subject of 42 provisional patent applications under **USPTO Customer No. 224891** (1,429 claims; filed February 14 – March 28, 2026; non-provisional conversion deadline February 14, 2027). **All patent rights are reserved by Agile On Target LLC.** The Apache 2.0 patent grant is narrow and defensive — it covers only patent claims necessarily infringed by the specific code in this repository, used as distributed. It does **not** authorize:

- commercial production deployment of HPP,
- embedding HPP into a commercial product,
- offering HPP as a service to third parties, or
- ground-up reimplementations of the HPP architecture.

Each of the above requires a **separate written patent license** from Agile On Target LLC. See [`PATENT-NOTICE.md`](PATENT-NOTICE.md) and [`NOTICE`](NOTICE) for the full scope, and the Apache License's Section 3 for the defensive termination clause.

**Trademarks:** Agile On Target LLC has filed federal service-mark applications on the USPTO Principal Register for **Human Presence Protocol** (Serial 99656359), **HPP** (99656390), **Proof of Time** (99656418), **Temporal Identity** (99656431), and **Presence Proof** (99656479) — all in Class 042 (authentication services), all filed 2026-02-17 under Section 1(b) intent-to-use. Priority date for each mark: 2026-02-17 (Lanham Act §7(c)). Apache 2.0 Section 6 does not grant trademark rights; forks and reimplementations must use a different product name. The ® symbol must not be used until registration issues; ℠ or ™ is appropriate in the interim.

**Contributions:** every contribution to this repository is governed by the [Contributor License Agreement](CLA.md), which grants Agile On Target LLC copyright and patent licenses in the contribution so the portfolio remains consolidated.

---

## Status

| Component | State |
|---|---|
| Protocol spec | Stable v1.0 reference |
| OpenAPI YAML | Canonical v1.0 |
| Test vectors | Stable MVP |
| Chrome extension | Working source (MV3) |
| iOS Swift Package | Working source (iOS 17+, builds + tests passing) |
| Website SDK | Working source (vanilla JS, no build) |
| Reference verifier | At [`hpp-verifier`](https://github.com/AgileOnTarget/hpp-verifier) (production live at `hpp-verifier.onrender.com`) |

See [`CHANGELOG.md`](CHANGELOG.md) for the release history.

---

## Get in touch

- Issues, PRs, discussion: this repo
- Security disclosure: see [`SECURITY.md`](SECURITY.md)
- Patent / commercial licensing / trademark inquiries: reference **USPTO Customer No. 224891** in correspondence (via the GitHub org at [https://github.com/AgileOnTarget](https://github.com/AgileOnTarget))
- Public marketing site: [humanpresenceprotocol.com](https://humanpresenceprotocol.com)
