# Changelog

All notable changes to this SDK are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.4.0] — 2026-05-02 — OpenAPI reconciled to shipping verifier; cross-refs cleaned; protocol-spec corpus expanded

This release closes three follow-ups that were tagged in v0.3.0's known-issues list, and pulls four more high-leverage protocol documents from the AOT VDR.

### Added — `protocol/openapi.yaml` rewritten to describe the shipping verifier
- **`protocol/openapi.yaml`** is now an OpenAPI 3.1 spec that faithfully describes the API the production verifier at `hpp-verifier.onrender.com` actually serves: `/challenge`, `/verify` (Bearer ES256 HPP-Proof JWT), `/receipt/{receipt_id}`, `/receipts/{pubkey}`, `/session*`, `/relay/create` + `/relay/{relay_id}` (GET / POST / DELETE), `/chain/public`, `/qr`, `/health`. 13 paths, 6 reusable schemas, every structured rejection enumerated with examples (`INVALID_SIG`, `REPLAY_DETECTED`, `SITE_MISMATCH`, `EPOCH_EXPIRED`, `ASSURANCE_INSUFFICIENT`, `NPHT_RATE_EXCEEDED`).
- The previous canonical-v1 design (`/v1/pulse`, `/v1/burn`, etc.) is preserved at **`protocol/openapi-canonical-v1-future.yaml`** with a banner clarifying that it is a future-state design, not the shipping API.
- This closes the OpenAPI drift that was documented in v0.2.0's wire-compatibility caveat. Both the iOS Swift Package and the Website JS SDK in this repo target the surface in `openapi.yaml`.

### Added — Protocol documentation (4 new files)
Pulled from AOT VDR and converted from .docx via pandoc; metadata tables stripped (Document IDs, Author, Classification rows removed); content unchanged.
- **`protocol/docs/canonical-protocol-spec.md`** — Platform-agnostic Canonical Protocol Reference (frozen v2.0). Six-phase protocol flow with cryptographic requirements and conformance criteria. 142 lines.
- **`protocol/docs/security-model.md`** — Security model and threat assumptions for HPP. Trust boundaries, threat-model assumptions, security objectives. 147 lines.
- **`protocol/docs/security-invariants.md`** — Eight platform-agnostic enforcement invariants. INV-1 through INV-8. Conformance MUST-statements. 100 lines.
- **`protocol/docs/formal-cryptographic-model.md`** — Formal cryptographic model and security-proof structure suitable for academic and standards review. 133 lines.

### Changed — `protocol/docs/relying-party-guide.md` cross-refs cleaned
The pre-existing dead cross-references to internal VDR document IDs (`OSI8_03A_33`, `OSI8_03A_42`, `OSI8_03A_43`, `OSI8_03A_47`, `OSI8_03A_55`, `OSI8_05A_07`) have been resolved:
- Two inline mid-document references rewritten to descriptive prose ("ZKP age-attestation extension", "the HPP iOS End-of-Life policy").
- Section 10 "VDR Cross-Reference Index" replaced with a "Related Reading" table that points exclusively at public-repo artifacts (other docs in `protocol/docs/`, schemas in `protocol/schemas/`, reference implementations, and `openapi.yaml`).

### Changed — Root README documentation index expanded
The "Documentation" section in `README.md` was reorganized into four functional groupings (Specs and architecture, Security, Integration, Operational) and gained pointers to:
- The four new protocol-spec docs above
- The shipping `openapi.yaml` and the canonical-v1-future spec, with their relationship explained

### Files NOT pulled this wave (with reasons)
- `OSI8_04A_00_IDX_Protocol_Agnostic_SDK_v2_0.docx` — content is a VDR-internal reader's guide listing other `OSI8_04A_NN` documents. Most lines are "see folder X" pointers that don't have a meaningful public translation; the public README's Documentation section already serves the same purpose for external readers using the public file names. Skipped as wrong-fit.
- `OSI8_04A_25_TEC_Canonical_API_Ref_v2_0.docx` — documents the Chrome extension's `HPP.requestPresence()` JavaScript API surface, not the protocol/verifier API. Belongs in the chrome-extension docs workstream rather than `protocol/docs/`. Deferred.

### Source-file headers
The new `openapi.yaml` carries the standard SDK YAML SPDX header (Apache-2.0 + USPTO Customer No. 224891 trademarks-reserved restatement). The four new .md files do not, matching the existing public-repo convention from v0.1.x.

### Authorization trail
- Tom directive (2026-05-02): "Please do 1, 2 and 3 in the list. Skip the support ticket." → authorizes this combined release covering OpenAPI reconciliation (item 1), cross-ref cleanup (item 2), and Wave 1 of the docx-conversion workstream (item 3).

No rights added or removed vs. v0.3.0. Apache 2.0 grant, CLA terms, and patent scope unchanged.

---

## [0.3.0] — 2026-05-02 — Protocol documentation corpus + reference implementations published

This release pulls 20 internal documents and reference artifacts into the public SDK. The published surface now covers the canonical client SDK architecture, verifier reference architecture, Genesis Epoch bootstrap, continuity-score behavior, device recovery, integration patterns, and ready-to-use Node.js / Python verification libraries.

### Added — Protocol documentation (`protocol/docs/`)
- `client-sdk-architecture.md` — Recommended architecture for any HPP client SDK (key management, biometric gating, pulse construction, submission, ledger integration)
- `keys-and-genesis.md` — Verifier signing keys, Genesis Epoch bootstrap, key rotation flow, root-of-trust establishment
- `continuity-reference.md` — Practical Continuity Score reference: default parameters, decay behavior, recovery patterns, edge cases
- `device-recovery.md` — Migration and recovery flows for device loss, replacement, cross-device handoff
- `rp-use-case-map.md` — Seven concrete relying-party integration patterns (login, transaction signing, content gating, age verification, presence-bound credits, etc.) with worked examples
- `ledger-architecture.md` — Local hash-chained ledger format for cached score and credits on device
- `reference-verifier-architecture.md` — Reference architecture for an HPP Verifier Service: scaling, observability, key custody

### Added — Schemas (`protocol/schemas/`)
- `challenge-v1.json` — `/challenge` endpoint request/response JSON Schema
- `attest-request-v1.json` — Attestation request payload schema
- `presence-cert-v1.json` — Presence Certificate schema
- `error-codes-v1.json` — Canonical error code registry for client and server implementations

### Added — Reference implementations (`protocol/reference-implementations/`)
- `verify-node.js` — Node.js verification library for relying parties
- `verify-python.py` — Python verification library for relying parties
- `verify-test-suite.js` — Cross-implementation test vectors
- `example-rp-server.js` — Minimal working relying-party backend
- `example-integration.html` — Minimal working relying-party front-end

### Added — Tools (`protocol/tools/`)
- `simulator.html` — Interactive protocol simulator (educational; runs entirely client-side)

### Added — iOS docs
- `ios/docs/implementation-notes.md` — Secure Enclave + Keychain access-control patterns for HPP iOS clients

### Added — Project governance (root)
- `GOVERNANCE.md` — How the protocol is governed: decision-making process, maintainer selection, protocol evolution
- `MAINTAINERS.md` — Maintainer roles, responsibilities, expectations

### Changed
- Root `README.md` gained a new "Documentation" section that surfaces every doc in `protocol/docs/` plus the reference-implementation links and the simulator
- Repository Layout block updated to reflect the new files
- `protocol/docs/relying-party-guide.md` — removed pre-existing internal classification banner ("Confidential — M&A Diligence" header and footer) that was inadvertently published in v0.1.x. Document content unchanged.

### Source-file headers
All new code files (5 JS, 1 PY, 2 HTML) carry the standard SDK SPDX header (Apache-2.0 + USPTO Customer No. 224891 trademarks-reserved restatement) matching the chrome-extension convention. Markdown and JSON-schema files do not carry SPDX headers, matching the convention established in v0.1.x.

### Cross-reference normalization
Two pulled docs originally referenced sibling docs by their internal aspirational names (`SPEC.md`, `VERIFIER_API_SPEC.md`); these references have been rewritten to point at the public-repo names (`core-spec.md`, `verifier-api.md`).

### Excluded from this pull (with reasons)
- Doc Dependency Map — internal "Confidential — M&A / Engineering Diligence" classification; reserved for internal use.
- Attestation OpenAPI YAML — license clause conflicts with the repo's Apache 2.0 grant ("Proprietary — Patent Pending"), and would worsen the documented `protocol/openapi.yaml` API drift versus the shipping verifier; deferred until the OpenAPI reconciliation task lands.
- iOS Xcode Skeleton — carries an internal "Confidential" banner pending editorial cleanup.

### Known issue (tagged for follow-up)
- `protocol/docs/relying-party-guide.md` retains several cross-references to internal document IDs (`OSI8_03A_*`, `OSI8_05A_*`) that do not exist in the public repo. These are dead links, not PII or classification leaks. A separate cleanup pass will convert or remove them.

### Authorization trail
- Tom directive (2026-05-02): "Yes, this needs to be done. Scrub the SDK. Do the work." → covered the PII history rewrite (v0.2.0 retro) and authorized continuing the original asks.
- Tom directive (2026-05-02): "Please also look in the AOT VDR and see if there is anything ... that should be included in the GitHub public sdk. Then update the AOT VDR with the hpp-sdk information we just built and reviewed." → authorizes this 0.3.0 doc-pull release.

No rights added or removed vs. v0.2.0. Apache 2.0 grant, CLA terms, and patent scope unchanged.

---

## [0.2.0] — 2026-05-02 — iOS Swift Package + Website JS drop-in shipped

The two surfaces previously labeled "Phase 2 — planned" are now working source.

### Added — iOS Swift Package (`ios/`)
- **`Package.swift`** — SPM manifest, iOS 17+, single library product `HPP`.
- **`Sources/HPP/HPPClient.swift`** — public actor with `attest(reason:)`, `depositToRelay(_:relayId:)`, `keyExists`, `publicKeyFingerprint()`, `publicKeyB64URL()`, `deleteKey()`. Wraps the canonical `POST /challenge` → biometric → SE sign → `POST /verify` flow against any HPP verifier.
- **`Sources/HPP/HPPConfiguration.swift`** — verifier URL, site, timeouts, configurable Keychain service/account.
- **`Sources/HPP/HPPError.swift`** — typed error enum: `secureEnclaveUnavailable`, `biometricCancelled`, `verifierColdStart`, `verificationRejected(code, reason)`, etc.
- **`Sources/HPP/AttestationResult.swift`** — `sessionToken`, `receiptId`, `assurance` (enum: `.faceID` / `.touchID` / `.passcode`), `publicKeyFingerprint`.
- **`Sources/HPP/Internal/`** — extracted from the HPP demo app:
  - `SecureEnclaveKeyManager` (P-256 in SE, Keychain-backed handle, `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`)
  - `BiometricAuthManager` (`actor`; Face ID → Touch ID → passcode fallback chain)
  - `JWTBuilder` (canonical ES256 HPP-Proof JWT with sorted-keys payload, RFC 7518 §3.4 raw IEEE P1363 signature)
  - `Base64URL`, `ChallengeResponse` / `VerifySuccess` / `VerifyFailure` wire types
- **`Tests/HPPTests/`** — 10 tests (Base64URL vectors, JWT structure, configuration). Pass via `xcodebuild -scheme HPP -destination 'platform=iOS Simulator,name=iPhone 17' test`.
- **`Examples/MinimalAttestApp.swift`** — illustrative SwiftUI snippet (not compiled; for documentation).
- **`README.md`** — install, usage, browser-relay flow, key management, requirements, wire compatibility table.

### Added — Website JS SDK (`website/`)
- **`src/hpp.js`** — vanilla JS SDK exposing a single global `HPP` (frozen) with one method, `HPP.gate({...})`. No build step, no dependencies, ES5-compatible. Mounts the gate UI inside an open Shadow DOM (`:host { all: initial }`) so all styling is isolated from the host page. Calls `POST /relay/create`, renders the verifier's `/qr?relay_id=...` PNG, and polls `GET /relay/:id` every 2s until `status === "ready"` (then fires `onUnlock({ sessionToken })`) or `expired` / `not_found` (then `onExpired()`). Returns a controller with `destroy()` to stop polling and unmount.
- **`dist/hpp.js`** — shipped file, identical to `src/hpp.js`. Exists so relying parties can `<script src=".../dist/hpp.js">` against a stable filename.
- **`examples/basic.html`** — working drop-in example against the production verifier.
- **`test/smoke.html`** — in-browser smoke tests covering the public surface (frozen namespace, argument validation, shell DOM mounting, controller shape) plus a live integration that exercises `/relay/create` + `/qr` + the polling round-trip. 12/12 passing locally.
- **`README.md`** — install, options table, lifecycle description, style-isolation notes, backend-validation responsibilities.

### Changed
- **Root `README.md`** — Status table for `iOS` and `Website` updated from "Phase 2 (extraction in progress)" / "Phase 2 (spec ready)" to "Working source". Quick Start replaced the placeholder install instructions with the real ones (Swift Package URL, vanilla `<script>` tag). Repository Layout now shows the populated `ios/` and `website/` trees.
- **`.gitignore`** — `website/dist/` removed from ignore list (the shipped `dist/hpp.js` IS source, not a build artifact). `.claude/` added (local preview-server config; never committed).

### Wire compatibility
Both surfaces target the **shipping HPP verifier API** at `hpp-verifier.onrender.com`: `POST /challenge`, `POST /verify` (Bearer JWT), `POST /relay/:id` for the iOS device-side flow; `POST /relay/create`, `GET /qr?relay_id=...`, `GET /relay/:id` for the browser-side flow. The `protocol/openapi.yaml` describes a different (canonical v1) API surface which the production verifier does not yet implement; that drift will be reconciled in a separate doc-fix release.

### Acquisition posture
The SDK is now executable end-to-end without recourse to private repos: a third-party iOS developer can `import HPP` and call `attest(...)`; a relying-party site can `<script>` in `dist/hpp.js` and call `HPP.gate(...)`. No part of the iOS or website surface depends on `hpp-monorepo` (the private internal repo).

No rights added or removed vs. v0.1.4. Apache 2.0 grant, CLA terms, and patent scope unchanged. New code carries the same SPDX headers as the existing chrome-extension files.

---

## [0.1.4] — 2026-04-17 — CLA Assistant automated signing

### Added
- **`.github/workflows/cla.yml`** — GitHub Actions workflow using [`contributor-assistant/github-action@v2.3.2`](https://github.com/contributor-assistant/github-action). Runs on every pull request. Posts a comment prompting the contributor to sign the [CLA](CLA.md) by replying with the exact text "I have read the CLA Document and I hereby sign the CLA". On signature, commits an entry to the repository's signatures ledger and unblocks the PR for merge. Explicit least-privilege permissions (`contents: write`, `pull-requests: write`, `statuses: write`, `actions: write`). `lock-pullrequest-after-merge: true` so the signature record is immutable post-merge. Allowlisted bots: `dependabot`, `renovate`, `github-actions`.
- **`signatures/version1/cla.json`** — initial empty signatures ledger. Every contributor signature against CLA version 1 lands here. The file is committed to `main` so the audit trail lives in git history forever — **not on a third-party service**.

### Changed
- **`CLA.md`** — "How to sign" section rewritten to document the automated workflow. Retains the organization-contributor one-liner requirement and the outside-GitHub signing channel. Adds a note that re-versioning the `signatures/` directory forces fresh consent from all contributors if the CLA text is materially revised.
- **`CONTRIBUTING.md`** — "Contributor License Agreement — required" section updated to describe the automated flow. Previous "submitting a PR is the sign" language replaced with the explicit sign-off comment requirement.

### Why this over hosted `cla-assistant.io`
Two reasons: (1) the signatures ledger is committed to this repository's main branch, so the record of every contributor's agreement is under Agile On Target LLC's direct control and survives indefinitely in git history — it doesn't depend on a third-party service continuing to exist or maintain its database; (2) no OAuth flow to authorize an external app on the AgileOnTarget organization — the workflow runs under the repository's built-in `GITHUB_TOKEN` with explicit least-privilege permissions.

### Acquisition posture
This upgrades the CLA evidentiary record from "implicit consent via PR submission" (legally valid but weakly-documented) to "timestamped signature ledger committed to main" (strongly-documented). A corp-dev counsel's diligence pass can inspect `signatures/version1/cla.json` directly and see the full list of contributors who have agreed to the CLA version under which their code is incorporated.

No rights added or removed vs. v0.1.3 for the Apache 2.0 grant, the CLA's substantive terms, or the patent scope. This is procedure, not substance.

---

## [0.1.3] — 2026-04-17 — Acquisition-readiness audit pass

Purpose: close every legal-hygiene gap a corp-dev counsel's diligence pass would flag. No rights added or removed vs. v0.1.2. Shipping-completeness, attribution consistency, and disclosure clarity all upgraded.

### Added
- **`AUTHORS`** — names Agile On Target LLC as sole copyright holder and points to USPTO records as the canonical source for inventor and authorized-signatory attribution; documents the CLA-consolidated posture (contributors appear in git log, copyright flows to AOT LLC). A single file an acquirer's counsel can reference for chain-of-title.
- **`THIRD-PARTY-LICENSES.md`** — full inventory of every file shipping in v0.1.3 with third-party-status classification. Current state: **zero unmodified third-party components**. Documents the forward-looking posture for Phase 2 (psl upstream MIT, QR rendering libraries, Swift Package transitives) so there's a standing framework when the first dep is added.
- **Apache 2.0 SPDX headers on every source file:**
  - 9 JavaScript files in `chrome-extension/` (`background.js`, `content.js`, `hpp-api.js`, `popup.js`, `options.js` + 4 `lib/*.js`)
  - 4 HTML files in `chrome-extension/` (`index.html`, `onboarding.html`, `options.html`, `popup.html`)
  - `protocol/openapi.yaml` (with the non-normative-for-patent-grant-purposes restatement inline)
  - Format: `SPDX-License-Identifier: Apache-2.0` + `Copyright 2026 Agile On Target LLC` + cross-reference to LICENSE, NOTICE, PATENT-NOTICE, PATENT-POLICY + USPTO Customer No. 224891 + trademarks-reserved statement
- **Safe-harbor clause in `SECURITY.md`** — binding on Agile On Target LLC for good-faith security research conducted under the policy. Covers CFAA, DMCA, state computer-crime statutes. 6 compliance conditions (follow reporting process; test only own / authorized fixtures; avoid privacy violations and data destruction; minimize and don't exfiltrate data; 90-day coordinated disclosure window default; comply with applicable laws). Scoped to AOT — does not bind Apple, relying parties, or third parties.
- **Explicit contact channels in `SECURITY.md`** — GitHub Security Advisories (preferred, private) + direct correspondence via the marketing-site inquiry form. Subject-line discipline ("USPTO Customer No. 224891") documented.

### Restored
- **`chrome-extension/icons/`** — `hpp-16.png`, `hpp-32.png`, `hpp-48.png`, `hpp-128.png`. Referenced in `chrome-extension/README.md` file tree; previously absent from the v0.1.0–v0.1.2 release, which made the extension non-loadable. Shipping-completeness fix.
- **`chrome-extension/lib/hpp-server-pubkey.pem`** — the pinned attestation-server public key. Referenced in the file tree; previously missing. Extension cannot verify server signatures without it.

### Changed
- **Every sub-README** (`chrome-extension/README.md`, `ios/README.md`, `website/README.md`, `protocol/README.md`) now carries the same "License, patents, and trademarks" block at the bottom, cross-referencing the top-level legal documents (LICENSE, NOTICE, PATENT-NOTICE, PATENT-POLICY, AUTHORS, THIRD-PARTY-LICENSES, CLA). Trademark serial numbers cited inline. Symbol-usage note inline. No folder is an orphan for license traceability.
- **`README.md` file tree** surfaces the new `AUTHORS` and `THIRD-PARTY-LICENSES.md` files.
- **`CONTRIBUTING.md`** fixed a broken relative path (`../NOTICE` → `NOTICE`) since CONTRIBUTING and NOTICE are both at the repository root.

### Audit trail
- **Cross-file entity-name consistency verified:** `Agile On Target LLC` used consistently across all legal-bearing files. No drift to "AOT LLC" / "Agile-On-Target" / other variants in normative text. (The shorthand "AOT LLC" survives in two descriptive annotations in README and THIRD-PARTY-LICENSES but is unambiguous in context and points to the same legal entity.)
- **USPTO Customer No. 224891** cited consistently.
- **Jurisdiction** cited consistently in PATENT-POLICY and CLA §8 governing-law clauses.
- **Apache 2.0 + patent-narrowing language** consistent across LICENSE APPENDIX, NOTICE, PATENT-NOTICE §1–§2, PATENT-POLICY §2, README.

### What this release does NOT do
- Does not change the Apache 2.0 grant or add any new license terms.
- Does not modify the Contributor License Agreement (`CLA.md` is byte-identical to v0.1.2).
- Does not add, drop, or modify the 5 filed USPTO service-mark applications.
- Does not assert new rights.

The intent is that a corp-dev counsel's diligence pass — "inventory licenses, confirm chain of title, verify safe-harbor policy, check for third-party-license gaps, confirm trademark claims are backed by filings" — lands on a repository where every answer is one file away.

---

## [0.1.2] — 2026-04-17 — Filed-trademark citations + Patent Policy + Pulse/RAD corrections

### Added
- **`PATENT-POLICY.md`** — new file clarifying that the protocol documentation in `protocol/` (OpenAPI, JSON Schema, test vectors, design markdown) is **non-normative for patent grant purposes**. Establishes the two-tier posture (open specification, separately-licensed patents) that mirrors W3C / IETF / 3GPP / ETSI convention. Section-by-section: §1 documentation is descriptive not a patent grant; §2 the Apache 2.0 grant is narrow; §3 industry convention and precedent; §4 specific applications (clean-room implementers, academic research, relying parties, derivative specifications, machine-readable excerpts); §5 what the policy is not; §6 relationship to LICENSE / NOTICE / PATENT-NOTICE / CLA; §7 no legal advice + NC governing law. Written to close the diligence gap an acquirer's counsel would otherwise flag: "does the Apache release of the protocol docs imply a license beyond the code?" — the answer is documented on record now.

### Changed
- **`NOTICE`** — Trademark Notice section upgraded from "claimed common-law marks" to **filed federal service-mark applications with USPTO serial numbers**. Table added: Human Presence Protocol (Serial 99656359), HPP (99656390), Proof of Time (99656418), Temporal Identity (99656431), Presence Proof (99656479). All Class 042, all filed 2026-02-17, all Section 1(b) intent-to-use. Priority dates under Lanham Act §7(c) established 2026-02-17. Added SM/TM/® usage note: the ® symbol may not be used until a registration certificate issues.
- **`PATENT-NOTICE.md §4 Trademarks`** — rewritten with the same application table, Lanham Act §7(c) priority-date statement, Symbol usage subsection (no ® before registration), Apache 2.0 exclusion subsection, Forks & reimplementations subsection, and licensing-inquiries subsection that asks correspondents to cite the specific USPTO serial number.
- **`README.md`** — Trademarks paragraph rewritten with the five filed marks and their serial numbers. File tree updated to list PATENT-NOTICE.md and PATENT-POLICY.md.

### Removed
- **"Reasoned Authentication Demonstration" and "RAD"** as claimed trademarks. These were incorrectly included in v0.1.1's trademark list; they are not claimed as trademarks and have not been filed as applications. The words may still appear in the codebase and documentation as descriptive terms; no trademark rights are being asserted over them.
- **"Pulse"** — NOT listed as a trademark, notwithstanding that Agile On Target LLC filed Serial 99656452 for PULSE on 2026-02-17. Pulse Network LLC (40-year-incumbent debit/payment processor with 22+ federal registrations for PULSE in overlapping Class 036/042 authentication services) sent a demand letter on 2026-04-16 through Cowan, Liebowitz & Latman, P.C. requesting withdrawal of Serial 99656452 by 2026-04-30. The application is being withdrawn. PULSE does not belong in this repository's trademark list.

### Rationale
Two corrections and one clarification. (1) Correction: v0.1.1 listed four trademarks; only two of them (HPP, Human Presence Protocol) were supported by filed applications, and the filings existed but were not cited. v0.1.2 lists the five actually-filed marks with their USPTO serials — a reviewer or acquirer's counsel can verify status independently in TSDR in 30 seconds. (2) Correction: "Pulse" is an active demand-letter matter and must not appear as an AOT mark. "Reasoned Authentication Demonstration" and "RAD" are descriptive protocol terms, not claimed marks. (3) Clarification: the PATENT-POLICY establishes on-record that publication of protocol documentation in this repository is not and has never been a patent grant for independent implementations — closing the one specific gap an acquirer's counsel would otherwise flag in corp-dev diligence.

No rights are added or removed vs. v0.1.1 for the Apache 2.0 grant itself. The upgrades are to specificity (serials replace generic claims), accuracy (Pulse and RAD out), and the on-record clarity of the documentation-vs-code patent distinction.

---

## [0.1.1] — 2026-04-17 — Patent / trademark / CLA hardening

### Added
- **`NOTICE`** — Apache 2.0 attribution file naming Agile On Target LLC as copyright owner and patent holder. Enumerates the four things the Apache 2.0 patent grant does NOT authorize (commercial production deployment, OEM embedding, HPP-as-a-service, ground-up reimplementation) and the defensive-termination clause. Claims trademark on "HPP", "Human Presence Protocol", "Reasoned Authentication Demonstration", "RAD".
- **`CLA.md`** — Contributor License Agreement. Every contribution grants Agile On Target LLC copyright + patent licenses in the contribution, consolidating the portfolio. PR submission is the signing event; organizations with IP-assignment policies get a one-line statement in the PR description.
- **Patent-scope note in `LICENSE`** — appended to the Apache 2.0 boilerplate APPENDIX so any file rendering the LICENSE sees the narrowing language inline. Fills in Copyright holder: `Agile On Target LLC`, year `2026`.

### Changed
- **`PATENT-NOTICE.md`** — rewritten. Names Agile On Target LLC as patent holder. Adds §2 "What the Apache 2.0 license does NOT grant" with six specific non-grants. Adds §4 Trademarks section. Adds §5 Contributions section referencing the new CLA. §6 Inquiries as a table mapping situations to required actions.
- **`README.md`** — "License" section renamed to "License, Patents, and Trademarks"; explicitly names Agile On Target LLC as copyright + patent holder; enumerates the four non-grants inline; surfaces the CLA. File tree updated to include `NOTICE` and `CLA.md`.
- **`CONTRIBUTING.md`** — "Patent / commercial licensing" section rewritten as "Contributor License Agreement — required" + companion "Patent / commercial / trademark licensing" section.

### Rationale
Apache 2.0's Section 3 patent grant is narrow by design: it covers only patent claims "necessarily infringed" by the Contribution, applied to that Contribution in the form distributed. A ground-up reimplementation gets no patent license. Adoption of HPP for commercial production requires a separate patent license. This release makes all of that explicit so a reader doesn't have to reason about it from the Apache text alone.

Nothing in this release grants additional rights or imposes additional restrictions beyond what the Apache 2.0 license already permits — it clarifies the scope. The patent portfolio under USPTO Customer No. 224891 remains **reserved to Agile On Target LLC**.

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
