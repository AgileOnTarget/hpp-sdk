# Security Policy

## Reporting a vulnerability

**Do not file public GitHub issues for security vulnerabilities.**

Send a written report referencing **USPTO Customer No. 224891**. Include:

1. **Component** — protocol / iOS / website / chrome-extension / verifier reference implementation
2. **Severity** — CRITICAL / HIGH / MEDIUM / LOW (your assessment; we may revise)
3. **Reproduction steps** — minimum viable steps to reproduce on the current `main` branch and the production verifier (if applicable)
4. **Impact** — what attack becomes possible; what data / property is compromised
5. **Suggested mitigation** — if you have one (optional)
6. **Disclosure preference** — coordinated disclosure window (default 90 days) or public disclosure on receipt

We acknowledge receipt within 3 business days. We provide a status update within 14 days. We coordinate public disclosure with the reporter.

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
