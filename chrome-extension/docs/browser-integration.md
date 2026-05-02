**HUMAN PRESENCE PROTOCOL**

**Browser Integration Architecture**

Version 3.0

Agile On Target LLC · Patent Pending · agileontarget.com

**1. Introduction**

The Human Presence Protocol (HPP) introduces a new security primitive for the internet: verifiable human presence. Where most authentication systems verify identity or possession of credentials, HPP proves that a real human interaction occurred within a server-authoritative time window.

This document describes how HPP integrates with modern web browsers. It explains why the browser is the correct initial deployment layer, how the architecture maintains strict security boundaries between components, and how HPP could evolve into a deeper browser-native capability.

The reference implementation uses a browser extension that mediates between web pages, platform authenticators, and a verifier service. This architecture enables experimentation and deployment without requiring changes to browser engines.

**2. Why the Browser Is the Correct Integration Layer**

The browser is the natural integration point for HPP for three structural reasons.

**Existing Security Boundary Management**

Browsers already manage the security boundary between websites and the operating system. They enforce origin policies, sandbox execution environments, and mediate access to device capabilities. HPP operates within these existing enforcement mechanisms rather than replacing them.

**Standardized Authentication Primitives**

Modern browsers provide standardized biometric authentication through WebAuthn. These primitives enable hardware-bound authentication without exposing biometric data to web applications. HPP builds on this foundation rather than defining its own biometric transport.

**Positioning Between User and Website**

The browser sits between the user and every website they visit. This makes it the correct layer to verify that a human interaction occurred before a web service performs a sensitive action. No other component in the stack occupies this position with both the capability and the authority to enforce such a boundary.

**3. System Components**

The verifier client is implemented as a browser extension rather than page JavaScript because **authentication artifacts produced by WebAuthn must remain outside the page execution environment.** The extension ensures that attestation data and verifier certificates never enter the DOM or page script context. A page-hosted implementation would place cryptographic material inside an environment the relying party itself controls, invalidating the security guarantee.

The architecture consists of four principal components, each with a defined role and security boundary.

| **Component** | **Role and Security Boundary** |
|----|----|
| **Web Page (Relying Party)** | Requests proof of human presence before allowing a protected action. Cannot access authentication artifacts. Receives only a session summary. |
| **Browser Extension (Verifier Client)** | Detects HPP-enabled sites, requests challenges, invokes WebAuthn, submits attestations, verifies server signatures, and manages sessions. All sensitive operations occur here. Implemented as an extension specifically to keep attestation data outside the page execution environment. |
| **Platform Authenticator** | Performs biometric verification through WebAuthn. Protects private keys in secure hardware. Biometric data never leaves the device. |
| **Verifier Server** | Issues server-signed challenges, validates attestation responses, enforces nonce single-use, and issues cryptographically signed presence certificates. |

**4. Integration Flow**

The HPP integration flow is designed to be minimal from the relying party’s perspective while maintaining a complete cryptographic chain of custody. There are seven steps.

1.  **The site declares HPP support using a meta tag in the page header, specifying the callback endpoint for certificate delivery.** — Site Declaration

2.  **The web page calls HPP.requestPresence() through the JavaScript SDK. The extension service worker takes over from this point.** — Presence Request

3.  **The extension requests a server-signed challenge from the verifier. The challenge includes a single-use nonce, a server-authoritative timestamp, and a time window. The extension verifies the server signature before proceeding.** — Challenge Retrieval

4.  **The extension invokes the platform WebAuthn authenticator, passing the server-issued challenge. The user completes a biometric gesture. userVerification is required.** — Biometric Authentication

5.  **The extension submits the signed assertion to the verifier. The payload includes the nonce, rp_id, credential_id, authenticator_data, assertion_sig, and client_data_json. The nonce binds the WebAuthn assertion to a specific server-issued challenge, preventing replay or reuse of authentication artifacts.** — Attestation Submission

6.  **The verifier validates the attestation, consumes the nonce, checks the time window, and issues a signed presence certificate. The certificate is delivered directly to the relying party callback endpoint.** — Certificate Issuance

7.  **The extension verifies the server signature on the certificate, creates a tab-scoped session, and delivers a session summary to the page.** — Session Establishment

The relying party page receives a session summary. The full certificate is available at the callback endpoint for independent server-side verification.

**5. Security Boundaries**

The architecture enforces isolation between three execution environments. Each boundary is explicit and enforced mechanically, not by policy alone.

**Web Page Boundary**

The web page executes in an untrusted context. It can invoke HPP.requestPresence() and receive a session summary. It cannot access challenge data, assertion signatures, authenticator responses, or the presence certificate. This boundary is enforced by the extension messaging model: sensitive data is never placed in a DOM event or page-accessible storage.

**Extension Boundary**

The extension service worker and content script operate in a trusted context isolated from page JavaScript. All cryptographic operations—challenge verification, WebAuthn invocation, attestation submission, server signature verification, and session management—occur within the extension. The rp_id field is always recomputed from the page origin within the service worker and is never accepted from page input. **This prevents a malicious page from substituting a different relying party identifier to redirect or misbind verification results.** The content script acts only as a message relay and does not perform cryptographic operations.

**Authenticator Boundary**

The platform authenticator protects private keys in secure hardware. Biometric data is processed by the authenticator and never transmitted. The extension receives only the WebAuthn authentication result.

**Verifier Boundary**

The verifier server receives attestation requests and issues signed certificates. It enforces nonce consumption, time windows, and clock skew limits. The full certificate is relayed to the relying party backend, not to the page.

**6. Data Exposure Model**

The architecture applies strict data minimization at every boundary. The following fields are never transmitted to page JavaScript under any condition:

- authenticator_data

- assertion_sig

- client_data_json

- hpp_server_sig (verifier countersignature)

- credential_id

The page receives only a session summary:

- active — Boolean. True when a valid session exists for this tab.

- cert_id — UUID. Safe reference to the issued certificate.

- rp_id — eTLD+1 of the authenticated origin.

- issued_at — Unix ms. When the certificate was issued.

- expiry_ms — Unix ms. When the certificate expires.

- remaining_ms — Computed. Milliseconds until expiry.

This design prevents web applications from capturing authentication artifacts, constructing replays, or bypassing the verifier for subsequent requests.

**7. Extension as Reference Implementation**

The browser extension serves as the initial deployment vehicle for HPP. Extensions allow new security primitives to be developed, evaluated, and iterated without requiring changes to browser engines. This makes them the correct starting point for a protocol at this stage of maturity.

The extension demonstrates that HPP can operate within existing browser security constraints while maintaining strong separation between web pages and authentication systems. It provides:

- A practical development environment for testing verifier servers and relying party integrations

- A concrete artifact against which SDK documentation and protocol specifications can be validated

- A reference that browser security engineers can evaluate against WebAuthn and extension security models

Extension distribution occurs through the Chrome Web Store update channel, which provides integrity verification and signed update delivery. This ensures that the extension binary received by users matches the reviewed and published version.

The extension does not represent the final deployment form of HPP. It represents the correct form for this stage.

**8. Future Integration Paths**

If HPP demonstrates sufficient value and adoption, deeper browser integration becomes a plausible evolution. Several paths are possible.

**Native Browser API**

The functionality currently implemented by the extension could be proposed as a native browser API, analogous to how credential management and payment request APIs evolved. A standardized presence verification API would eliminate the extension dependency and allow tighter integration with browser security policies.

**WebAuthn Extension**

HPP’s challenge-binding and nonce-consumption model could be expressed as a WebAuthn extension, adding server-authoritative time constraints to existing authentication flows without requiring a separate protocol layer.

**Browser Identity Framework Integration**

As browser identity frameworks evolve, HPP’s presence primitive could integrate at the session layer, allowing presence to be asserted as a property of an authenticated session rather than a standalone verification event.

None of these paths require changes to the current implementation. The extension architecture is designed to be replaceable by a native implementation with the same external contract.

**9. Privacy Considerations**

HPP is designed so that presence verification does not become a cross-site tracking mechanism.

- Presence certificates are scoped to individual relying parties by rp_id. A certificate issued for example.com cannot be presented to another.com.

- The protocol does not create global identifiers. The cert_id is a session-scoped UUID with no persistent meaning outside the current verification.

- Sessions are stored in chrome.storage.session, which is cleared when the browser closes. No persistent identity records are maintained.

- The verifier server receives only the minimum fields required to validate the attestation. No biometric data and no user identity are transmitted.

These properties ensure that HPP can confirm human presence without enabling the infrastructure for tracking or profiling.

**10. Security Goals**

The browser integration architecture is designed to satisfy the following explicit objectives. The threat classes addressed by each control are summarized below.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p><strong>Threat Classes Addressed</strong></p>
<ul>
<li><p>Automation and bot interaction — hardware-bound credential requirements prevent software-only verification</p></li>
<li><p>Replay attacks — server-enforced nonce consumption and time-windowed challenges</p></li>
<li><p>Cross-origin callback hijacking — meta tag enrollment and strict origin validation</p></li>
<li><p>Page script credential interception — execution context isolation via extension architecture</p></li>
<li><p>Challenge forgery — server signature verification before any challenge is used</p></li>
<li><p>rp_id substitution — recomputation from page origin within the trusted extension context</p></li>
</ul></td>
</tr>
</tbody>
</table>

- Verify that a real human biometric interaction occurred before issuing a presence certificate

- Prevent automated or bot-driven verification through hardware-bound credential requirements

- Protect authentication artifacts from page scripts through execution context isolation

- Enforce strict origin boundaries through meta tag enrollment and callback validation

- Prevent replay through server-enforced nonce consumption and time-windowed challenges

- Minimize data exposure by delivering only session summaries to the page

- Preserve user privacy by scoping certificates to individual relying parties

Together these goals allow websites to confirm human presence without requiring passwords, persistent identity, or CAPTCHA systems.

**11. Conclusion**

The browser is the correct environment for a protocol that verifies human presence. It manages the security boundary between websites and the operating system, provides standardized biometric primitives through WebAuthn, and occupies the trusted position between user and website that the protocol requires.

HPP is designed as a verification primitive that extends WebAuthn with server-authoritative time constraints and nonce-bound challenge-response, not as a replacement for existing authentication infrastructure. Browser engineers evaluating the protocol should find it structurally familiar: it applies the same origin enforcement, execution isolation, and hardware-bound key principles already present in WebAuthn, with the addition of a server-authoritative presence assertion.

The extension architecture described here serves as a reference implementation demonstrating that HPP can operate within existing browser security models with strong boundaries, minimal data exposure, and clean separation between components. It is designed to evolve toward native browser integration as the protocol matures.

Agile On Target LLC · Patent Pending · agileontarget.com
