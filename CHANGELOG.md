# Changelog

All notable changes to this SDK are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

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
- **`NOTICE`** — Apache 2.0 attribution file naming Agile On Target LLC (North Carolina) as copyright owner and patent holder. Enumerates the four things the Apache 2.0 patent grant does NOT authorize (commercial production deployment, OEM embedding, HPP-as-a-service, ground-up reimplementation) and the defensive-termination clause. Claims trademark on "HPP", "Human Presence Protocol", "Reasoned Authentication Demonstration", "RAD".
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
