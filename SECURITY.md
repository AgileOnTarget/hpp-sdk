# Security Policy

**Issuer:** Agile On Target LLC (USPTO Customer No. 224891).

## Reporting a vulnerability

**Do not file public GitHub issues for security vulnerabilities.**

### How to reach us

Send a written report by **one** of the following channels, referencing **USPTO Customer No. 224891** in the subject line:

1. **GitHub Security Advisories** (preferred) — use the "Report a vulnerability" button on the repository's Security tab at [github.com/AgileOnTarget/hpp-sdk/security/advisories](https://github.com/AgileOnTarget/hpp-sdk/security/advisories). This creates a private advisory visible only to the maintainers.
2. **Direct correspondence** — through the contact channels listed on the project's marketing site at [humanpresenceprotocol.com](https://humanpresenceprotocol.com) under "Inquiry." Use "Security / USPTO Customer No. 224891" as the subject line.

### What to include

1. **Component** — protocol / iOS / website / chrome-extension / verifier reference implementation
2. **Severity** — CRITICAL / HIGH / MEDIUM / LOW (your assessment; we may revise)
3. **Reproduction steps** — minimum viable steps to reproduce on the current `main` branch and the production verifier (if applicable)
4. **Impact** — what attack becomes possible; what data / property is compromised
5. **Suggested mitigation** — if you have one (optional)
6. **Disclosure preference** — coordinated disclosure window (default 90 days) or public disclosure on receipt

We acknowledge receipt within 3 business days. We provide a status update within 14 days. We coordinate public disclosure with the reporter.

## Safe harbor for good-faith security research

Agile On Target LLC authorizes good-faith security research conducted under this policy and will not pursue or support legal action (including under the U.S. Computer Fraud and Abuse Act, the Digital Millennium Copyright Act, or state computer-crime statutes) against researchers who:

1. Comply with the reporting process in "How to reach us" above;
2. Test **only against their own accounts, devices, or explicitly authorized test fixtures** (do not test against other users' data or against production systems at scale);
3. Avoid privacy violations, destruction of data, and interruption or degradation of services available to other users;
4. Do not exfiltrate data beyond the minimum necessary to demonstrate the vulnerability, do not retain it longer than necessary for the report, and do not disclose it to any third party;
5. Give Agile On Target LLC a reasonable coordinated-disclosure window (default 90 days from acknowledged receipt, extendable by agreement for vulnerabilities requiring material engineering effort to remediate);
6. Comply with all applicable laws.

This safe-harbor statement is binding on Agile On Target LLC as the publisher of this repository. It does not bind Apple, relying-party sites, the production reference verifier's hosting provider, or any other third party whose systems a researcher may touch in the course of research. Researchers are responsible for ensuring their activity is authorized under every applicable jurisdiction and every party's terms of service.

This is not legal advice. If you are unsure whether a particular research activity is in scope, ask us first through the reporting channels above.

## Scope

### In scope

- Cryptographic implementation flaws in any SDK component
- Privacy violations (PII leakage, identity disclosure, behavioral inference)
- Replay / race / time-skew attacks against the protocol
- Hardware-binding bypass (extracting an SE-bound key by software means)
- Receipt chain integrity violations
- Authentication bypass on any verifier endpoint
- Cross-tenant isolation violations (e.g. fetching another device's receipts)

### Out of scope (file as a normal issue or in `protocol/docs/threat-model.md`)

- Design discussions or invariant clarifications
- Hardware attacks requiring physical access to the SE chip (decapping, fault injection, etc.) — out of scope by the protocol's stated threat model
- Apple's Secure Enclave hardware itself — that's a vendor matter
- Theoretical attacks on cryptographic primitives broadly accepted as secure (P-256, SHA-256, ES256, HMAC-SHA256)
- DDoS / resource exhaustion against the reference verifier (RED-002 territory; documented limitation)

## Hardening already in place

- **NPHT rate enforcement** (RED-001 mitigation) on `POST /challenge` (per-IP) and `POST /verify` (per-pubkey) with structured `429 NPHT_RATE_EXCEEDED` rejections
- **Cross-tenant isolation** on `GET /receipts/:pubkey` — session-token auth + `PUBKEY_MISMATCH` guard
- **Sanitized public projection** at `GET /chain/public` — no pub keys, nonces, signatures, JWTs, age fields exposed
- **Hardware-bound non-exportable keys** in iOS — see the in-app Key Proof diagnostic (Inside HPP → Key Proof) for live evidence on a physical device
- **No third-party SDKs** in the iOS app or the chrome extension — full audit surface

## Out-of-band disclosure

If your finding is critical and you need a faster channel than written request, the marketing site at [humanpresenceprotocol.com](https://humanpresenceprotocol.com) provides contact paths under "Inquiry" — note the routing identifier (USPTO Customer No. 224891) in the subject line.

## Hall of fame

Acknowledged researchers will be listed here (with permission) once the program receives its first reports.

## Bounty

This is a pre-launch SDK without a paid bounty program. Public credit + acknowledgement is what's offered today. A formal program is on the roadmap conditioned on production deployment scale.
