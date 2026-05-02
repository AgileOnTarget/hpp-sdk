# Security Invariants Reference — Human Presence Protocol

*Platform-Agnostic Enforcement Requirements (Frozen v2.0)*

*Scope: All HPP implementations (browser, mobile, native, server)*

---

**Purpose**

This document defines the eight security invariants that every HPP implementation MUST enforce. These invariants are platform-agnostic — they apply equally to browser extensions, mobile SDKs, native OS modules, and server-side verifier implementations. An implementation that violates any invariant is non-conforming and MUST NOT be deployed.

**Invariant Registry**

**INV-1: User Verification Required**

Every WebAuthn credential.get() and credential.create() call MUST set userVerification to 'required'. This value MUST NOT be relaxed to 'preferred' or 'discouraged' under any circumstances, including fallback paths, error recovery, or developer configuration.

Rationale: This invariant is the foundation of HPP. If userVerification is not required, the platform authenticator may produce assertions without a biometric event, which means the certificate does not prove human presence. The entire protocol collapses to device authentication — equivalent to FIDO2-as-deployed, which HPP exists to improve upon.

**INV-2: UV Flag Double-Checked**

The UV flag (bit 2 of the flags byte at offset 32 in authenticatorData) MUST be verified at two independent points: once in the client before submission, and once on the verifier server before signing the certificate. If either check fails, the attestation MUST be rejected.

Rationale: Defense in depth. A compromised client could strip the client-side check; a compromised network could modify the payload. Double verification ensures that even if one verification point is bypassed, the other catches the violation.

**INV-3: Server Signature Verified Before Session**

The client MUST verify hpp_server_sig on the returned certificate before issuing a local session or notifying the page. The signature MUST be verified using ECDSA P-256 with SHA-256 against the pinned HPP Attestation Server public key. If verification fails, the certificate MUST be discarded and an error emitted.

Rationale: Without this check, a man-in-the-middle could forge certificates. The client must never trust a certificate it cannot cryptographically verify.

**INV-4: Session Storage Ephemeral Only**

Local sessions MUST be stored in ephemeral storage that is cleared when the application closes. In browser implementations, this means chrome.storage.session (not localStorage, sessionStorage, or IndexedDB). Mobile implementations MUST use in-memory or secure enclave ephemeral storage. Sessions MUST NOT persist across application restarts.

Rationale: A persisted session could be extracted and replayed after the user's biometric context has ended. Ephemeral storage ensures sessions cannot survive beyond the current application lifecycle.

**INV-5: Certificate Never Exposed to Page JavaScript**

The full Presence Certificate (including hpp_server_sig, assertion_sig, credential_id, authenticator_data, and client_data_json) MUST NEVER be transmitted to page-level JavaScript. The page receives only cert_id and session summary metadata (rp_id, expiry_ms, issued_at, remaining_ms). The full certificate travels exclusively: Client → Verifier Server → Relying Party Backend.

Rationale: Page JavaScript is the highest-risk execution context. XSS, compromised third-party scripts, and browser extensions can all read page-level data. Keeping the full certificate out of the page eliminates token theft via script compromise.

**INV-6: Callback URL Same-Origin Enforcement**

The callbackUrl for certificate delivery MUST resolve to the same origin as the page that initiated verification. HTTPS is required for all callback URLs except localhost/127.0.0.1 (development only). Relative URLs MUST be resolved against the page origin before validation. Cross-origin callbacks MUST be rejected.

Rationale: If certificates could be delivered to arbitrary URLs, an attacker controlling page content could redirect certificates to their own server.

**INV-7: Nonce Single-Use Enforcement**

Each challenge nonce MUST be consumed exactly once. The verifier server MUST maintain a nonce consumption store and reject any attestation carrying a nonce that has already been consumed. The nonce MUST also be included in the Presence Certificate to create an auditable binding between the challenge and the certificate.

Rationale: Nonce reuse would allow replay attacks — an attacker could capture an attestation submission and replay it to obtain additional certificates from the same biometric event.

**INV-8: Iframe Context Rejection**

The HPP client MUST NOT operate in iframe contexts. In browser implementations, the content script MUST exit silently if window !== window.top. Mobile implementations MUST verify they are running in the foreground application context, not embedded in another application's WebView.

Rationale: Iframe embedding enables clickjacking attacks where an attacker frames the verification prompt inside a malicious page, tricking the user into completing biometric verification for a different origin.

**H-Constant Enforcement**

In addition to the eight invariants above, all HPP implementations MUST respect the H-Constant constraint: the minimum wall-clock time required to complete one genuine biometric interaction. The verifier server enforces this through the window_ms parameter in challenge responses. Implementations MUST NOT attempt to circumvent, shorten, or bypass the window_ms enforcement period.

The H-Constant is the mathematical foundation that makes HPP fundamentally different from computational proof-of-work systems. Unlike computation, biological time cannot be parallelized. This property — Non-Parallelizable Human Time (NPHT) — ensures that the cost of certificate production scales linearly with the number of genuine humans involved, regardless of computational resources available to an attacker.

**Conformance Testing**

An implementation claiming HPP conformance MUST pass the following verification tests for each invariant. The HPP SDK Protocol package includes a certificate validation test suite (hpp-test-suite.js) that automates these checks.

|  |  |  |
|----|----|----|
| **Invariant** | **Test** | **Pass Condition** |
| INV-1 | Attempt credential.get() with UV=preferred | Client MUST reject or override to required |
| INV-2 | Submit attestation with UV=0 in authenticator_data | Both client and server MUST reject |
| INV-3 | Return certificate with invalid hpp_server_sig | Client MUST discard and emit error |
| INV-4 | Restart application after session issuance | Session MUST NOT survive restart |
| INV-5 | Inspect page JavaScript context after verification | No certificate fields present except cert_id |
| INV-6 | Set callbackUrl to cross-origin URL | Client MUST reject the callback |
| INV-7 | Submit attestation with previously used nonce | Server MUST return 401 NONCE_ALREADY_USED |
| INV-8 | Load HPP-enabled page in iframe | Client MUST not activate |

*Human Presence Protocol \| Security Invariants Reference \| Agile On Target LLC \| April 2026 \| v2.0*
