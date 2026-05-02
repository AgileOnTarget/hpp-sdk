**HUMAN PRESENCE PROTOCOL**

**Chrome Extension Security Review**

Explanation and Architecture Reference — Version 2.0

Agile On Target LLC · Patent Pending · agileontarget.com

**1. Purpose of This Document**

This document explains the security architecture of the Human Presence Protocol (HPP) Chrome extension. Its purpose is to help browser security reviewers understand how the extension operates, what security boundaries it maintains, and how it protects user data and relying party services while enabling proof of human presence.

The extension acts as a reference verifier client for HPP. It enables a website to request proof that a real human is present, using biometric authentication through the platform’s WebAuthn capabilities. The extension mediates between the web page, the user’s authenticator, and the relying party backend.

The design intentionally minimizes the data exposed to web pages and ensures that sensitive cryptographic material never leaves the trusted extension context.

**2. Architectural Overview**

The HPP browser architecture consists of four principal components:

1.  Web Page (Relying Party)

2.  Chrome Extension (Service Worker + Content Script)

3.  User Authenticator (WebAuthn / platform biometric)

4.  HPP Verifier Server

The web page requests presence verification through a small JavaScript API exposed by the extension. The extension performs all cryptographic operations and communicates with the verifier server. The following responsibilities belong exclusively to the extension:

- Detects HPP-enabled websites via the enrollment meta tag

- Requests a server-authoritative challenge from the verifier

- Initiates WebAuthn authentication with the platform authenticator

- Submits the signed attestation response to the verifier

- Receives and validates the signed presence certificate

- Provides only a minimal session summary to the web page

This separation ensures that sensitive cryptographic material never enters page JavaScript execution contexts.

**3. Security Boundaries**

The architecture enforces strict isolation between three execution environments:

**Web Page Environment**

This environment is untrusted and controlled by the website. It may request presence verification through the public SDK surface but cannot access raw authentication artifacts. The page receives only a session summary upon successful verification.

**Extension Environment**

This environment is trusted. It runs as a Chrome extension service worker and associated content script. All sensitive operations—challenge verification, WebAuthn invocation, attestation submission, certificate validation, and session management—are performed here. No sensitive data is relayed to the page.

**Verifier Server**

The verifier validates the authentication response, enforces nonce single-use, and issues the signed presence certificate. The full certificate is relayed directly to the relying party backend via the callback endpoint. It is never transmitted to the page.

**4. Data Minimization**

The extension enforces a strict boundary on what data reaches the web page. The following fields are never transmitted to page JavaScript under any condition:

- authenticator_data

- assertion_sig

- client_data_json

- hpp_server_sig (verifier countersignature)

- credential_id

Instead, the page receives only a minimal session summary upon successful verification:

**Session Summary Object**

| **Field** | **Purpose** |
|----|----|
| **active** | Boolean. True when a valid session exists for this tab. |
| **cert_id** | UUID identifying the issued certificate. Safe to log and reference. |
| **rp_id** | eTLD+1 of the authenticated origin. |
| **issued_at** | Unix milliseconds. When the certificate was issued. |
| **expiry_ms** | Unix milliseconds. When the certificate expires. |
| **remaining_ms** | Computed. Milliseconds remaining until expiry. |

This ensures the page cannot misuse, replay, or exfiltrate authentication artifacts.

**5. Challenge–Response Flow**

The verification flow follows a strict server-authoritative challenge–response protocol. Each step is bounded and cannot be skipped.

**Step 1 — Challenge Request**

The extension requests a signed challenge from the verifier server. The server returns a nonce, an rp_id, a server-authoritative timestamp, a time window, and a server signature binding these fields. The extension verifies the server signature before proceeding.

**Step 2 — Biometric Authentication**

The extension invokes the platform WebAuthn authenticator, passing the server-issued challenge. The user completes a biometric gesture (Touch ID, Face ID, Windows Hello). The platform authenticator returns an assertion containing authenticator_data, assertion_sig, and client_data_json.

**Step 3 — Attestation Submission**

The extension submits the assertion to the verifier server. The attestation payload includes:

**Attestation Request Fields**

| **Field** | **Purpose** |
|----|----|
| **cert_id** | UUID generated by the extension for this verification. |
| **nonce** | Must match the nonce issued in Step 1. Single-use enforcement occurs here. |
| **rp_id** | Recomputed from page origin. Not accepted from page input. |
| **server_timestamp** | Carried from the challenge. Used for window enforcement. |
| **client_timestamp** | Extension local time. Used for clock skew detection. |
| **credential_id** | Identifies the enrolled credential. |
| **authenticator_data** | Raw authenticator data from the WebAuthn assertion. |
| **assertion_sig** | ECDSA P-256 signature from the platform authenticator. |
| **client_data_json** | WebAuthn client data. Required for server-side assertion verification. |

**Step 4 — Certificate Issuance**

The verifier validates the attestation, consumes the nonce, verifies the time window, and signs the presence certificate with the HPP server private key. The certificate is returned to the extension and relayed to the relying party callback endpoint.

**Step 5 — Session Creation**

The extension verifies the server signature on the certificate before storing the session. A short-lived session is created scoped to the browser tab. The page receives only the session summary.

**6. Replay Protection**

Replay protection is achieved through nonce-based single-use challenges enforced server-side.

Each challenge includes a unique 32-byte nonce. The verifier server tracks two sets:

- issuedNonces — nonces that have been issued but not yet consumed

- usedNonces — nonces that have been consumed and are permanently rejected

When the verifier receives an attestation request it applies the following rules in sequence:

5.  If the nonce is not present in issuedNonces, reject with NONCE_UNKNOWN.

6.  If the nonce is present in usedNonces, reject with NONCE_ALREADY_USED.

7.  Move the nonce from issuedNonces to usedNonces immediately, before further validation.

8.  Proceed with certificate issuance only if all remaining checks pass.

Consuming the nonce before further validation ensures that a failed or replayed request cannot consume a valid nonce window while leaving the original nonce reusable.

The certificate payload includes the nonce, binding the issued certificate cryptographically to the specific challenge that produced it.

**7. Origin Binding**

The extension enforces strict origin binding at both the enrollment and verification stages.

Each HPP-enabled website declares its callback endpoint using a meta tag:

> \<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="My Site"\>

The extension applies the following rules to the callback value:

- Relative URLs are resolved against the page origin before validation. A value of /api/hpp on https://example.com resolves to https://example.com/api/hpp.

- The resolved origin must match the page origin exactly. Cross-origin callbacks are rejected.

- HTTPS is required except on localhost for development use.

The rp_id field is always recomputed from the page origin within the extension service worker. It is never accepted from page input. This prevents a malicious or compromised page from substituting a different rp_id to redirect or misbind the verification.

**8. WebAuthn Usage**

The extension relies on the WebAuthn standard for all biometric authentication. The platform authenticator provides:

- Biometric liveness enforcement through the platform (Touch ID, Face ID, Windows Hello)

- Hardware-protected private keys that cannot be extracted from the device

- Origin-bound credential usage that prevents cross-site credential reuse

The extension configures WebAuthn with userVerification set to required. This ensures that every verification requires an explicit biometric gesture and cannot be satisfied by a device PIN or passive presence alone.

The extension does not have access to biometric data. It receives only the WebAuthn authentication result. The authenticator_data and assertion_sig are verified by the relying party backend using the enrolled credential’s public key.

**9. Extension Permission Model**

The extension uses a minimal permission model consistent with the principle of least privilege:

- No broad host permissions. The extension operates on sites that explicitly declare the hpp-enrollment meta tag.

- Explicit site enrollment via meta tag. The extension does not automatically activate on arbitrary websites.

- Session storage scoped to chrome.storage.session. Sessions are cleared when the browser closes and are not persisted across restarts.

- Background service worker for all sensitive operations. No sensitive logic executes inside page JavaScript.

- Content script limited to DOM observation and event relay. It does not perform cryptographic operations.

**10. Privacy Considerations**

The extension is designed to verify presence without constructing persistent user profiles.

- Certificates are scoped to a specific relying party by rp_id and cannot be reused across domains.

- Sessions are stored in chrome.storage.session, which is tab-scoped and cleared on browser close.

- The extension does not maintain persistent identity records across sessions or sites.

- The verifier server receives only the minimum fields required to validate the attestation. No user identity or biometric data is transmitted.

**11. Security Goals**

The architecture is designed to satisfy the following explicit security objectives:

- Require a real human biometric interaction for every verification.

- Bind each certificate to a single server-issued challenge through nonce consumption.

- Prevent replay and automation attacks through time-windowed, single-use challenges.

- Protect authentication artifacts from web page access through strict execution environment isolation.

- Enforce strict origin boundaries to prevent cross-origin callback hijacking.

- Minimize data exposure by providing only a session summary to the page.

Together these goals allow websites to verify human presence without requiring passwords, CAPTCHAs, or persistent user identity.

**12. Summary**

The HPP Chrome extension is a minimal, security-focused reference verifier client. All sensitive cryptographic operations occur within the extension context. Web pages receive only a limited verification result.

The architecture provides strong security boundaries through execution context isolation, replay protection through server-enforced nonce consumption, and strict origin controls through meta tag enrollment and callback validation.

The result is a verifier that websites can integrate to confirm the presence of a real human user without requiring passwords, tracking infrastructure, or persistent identity.

Agile On Target LLC · Patent Pending · agileontarget.com
