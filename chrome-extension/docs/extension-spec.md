**Human Presence Protocol**

Chrome Extension

*Full Design Specification*

Version 11.0 \| March 2026 \| Agile On Target LLC

**v1.1 Revision Summary**

This revision incorporates ten security and implementation tightening items identified in pre-build review, plus two architectural diagrams. Each change is marked in the relevant section. v1.1 is a strict superset of v1.0 — no content has been removed.

|  |  |  |
|----|----|----|
| **\#** | **Area** | **Change** |
| 1 | Content script scope | Explicit DOM-inspection constraint added — five permitted operations only. |
| 2 | WebAuthn rp.id rules | Registrable domain suffix (eTLD+1) requirement specified. PSL library mandated. |
| 3 | Challenge freshness logic | window_ms/2 heuristic replaced with absolute server_timestamp + window_ms rule. |
| 4 | Clock skew threshold | Fixed 5-second threshold replaced with server-configurable max_clock_skew_ms (default 30s). |
| 5 | Certificate lifetime | Session reuse philosophy explained. High-value re-attestation pattern documented. |
| 6 | Origin binding / iframes | Top-level frame enforcement added. window !== window.top check required. |
| 7 | Certificate transport | Extension service worker (not the page) initiates relay to RP backend. Explicit. |
| 8 | Service worker lifecycle | hpp_inflight_map added to session storage. Covers worker-termination mid-attestation. |
| 9 | Trust anchor | Public key pinned inside extension package (lib/hpp-server-pubkey.pem). Not fetched. |
| 10 | Impersonation defense | Verified Publisher status and extension ID binding on production server endpoints added. |
| \+ | Section XIII | Full authentication sequence diagram added. |
| \+ | Section XIV | Five-zone trust boundary diagram added. |

*Document Classification: HPP Internal Technical Specification — Pre-Build v1.1*

**I. Purpose and Scope**

The HPP Chrome Extension is the primary consumer-facing delivery vehicle for Human Presence Protocol authentication. It operates as a browser-layer intermediary between any participating web site and the user's hardware security subsystem, executing the HPP challenge-response protocol without requiring the site operator to deploy custom client-side JavaScript.

The extension achieves three things simultaneously: it intercepts login flows on participating sites; it executes hardware-bound liveness verification using the device's Trusted Execution Environment (TEE); and it presents a Presence Certificate to the relying party in place of a traditional credential.

**1.1 Goals**

- Replace password entry on HPP-enabled sites with a presence-verified, hardware-anchored session establishment.

- Replace CAPTCHA challenges with a non-parallelizable liveness gate that does not degrade with AI advancement.

- Preserve full privacy: no biometric data leaves the device; no user identity is transmitted to HPP infrastructure.

- Integrate with WebAuthn/FIDO2 as the hardware transport substrate, extending it with HPP's time-authoritative gating layer.

- Deploy via Chrome Web Store with zero required backend account creation for end users.

**1.2 Out of Scope for v1.0**

- Firefox, Safari, and Edge ports.

- Native mobile applications.

- Enterprise managed device policy integration (v2.0).

- HPP Server infrastructure and relying-party SDK (separate specification).

**II. Architecture Overview**

The extension is built to Chrome's Manifest V3 (MV3) specification. MV3 replaced the persistent background page model with a service worker model, which has significant implications for state management. All architecture decisions are made with MV3 constraints in mind.

|  |  |  |
|----|----|----|
| **Component** | **File / Context** | **Responsibility** |
| **Service Worker** | background.js | Central orchestrator. Manages HPP session state, alarm-based certificate refresh, communication with HPP Attestation Server, and message routing between content scripts and popup. |
| **Content Script** | content.js | Injected into participating pages. Performs five permitted DOM operations (see Section 3.2). Detects HPP triggers, injects the Presence Gate overlay, relays messages to service worker. |
| **Popup UI** | popup.html / popup.js | Toolbar icon popup. Displays session status, active certificates, enrolled sites, settings. |
| **Options Page** | options.html / options.js | Full-page settings UI. Certificate lifetime, site list, privacy mode, debug logging, diagnostic export. |
| **WebAuthn Bridge** | webauthn-bridge.js | Wrapper around navigator.credentials. Constructs HPP-extended PublicKeyCredentialRequestOptions, handles assertions, extracts attestation data. |

> *The service worker is the only component that holds live HPP session state. Content scripts and the popup never cache certificates. A compromised content script cannot exfiltrate a valid certificate.*

**2.1 State Management**

All durable state is stored in chrome.storage.session (cleared on browser restart) or chrome.storage.sync (settings and enrolled sites). Certificates are never written to chrome.storage.local or to disk.

|  |  |  |
|----|----|----|
| **State Object** | **Storage Area** | **Contents** |
| hpp_session_map | session | Map of tab ID to active Presence Certificate, issue timestamp, expiry, relying party ID. |
| hpp_inflight_map | session | \[v1.1 NEW\] Map of tab ID to in-progress attestation state (challenge, assertion, cert_id). Written before the POST /attest call; cleared on server confirmation or error. Prevents state loss if service worker restarts during attestation. |
| hpp_enrolled_sites | sync | Array of enrolled relying party origins, each with enrollment timestamp and device credential ID. |
| hpp_settings | sync | User preferences: certificate lifetime, privacy mode, debug logging, server endpoint override, max_clock_skew_ms (default 30000). |
| hpp_server_config | session | Cached server config: H-Constant, window_ms bounds, max_clock_skew_ms. Refreshed every 5 minutes via GET /v1/config. |

> *REVISION 8 — hpp_inflight_map is new in v1.1. On service worker restart, the worker checks hpp_inflight_map and either resumes or safely abandons in-progress attestations. Without this, a worker termination between assertion creation and POST /attest submission would silently discard a completed biometric gesture.*

**III. Manifest V3 Configuration**

**3.1 Complete manifest.json**

> {
>
> "manifest_version": 3,
>
> "name": "HPP Browser Login — Human Presence Protocol",
>
> "short_name": "HPP Login",
>
> "version": "1.0.0",
>
> "description": "Replaces passwords and CAPTCHAs with cryptographic proof of human presence. Hardware-bound. Time-anchored. Privacy-preserving.",
>
> "author": "Agile On Target LLC",
>
> "homepage_url": "https://agileontarget.com",
>
> "icons": { "16":"icons/hpp-16.png","32":"icons/hpp-32.png","48":"icons/hpp-48.png","128":"icons/hpp-128.png" },
>
> "action": { "default_popup":"popup.html", "default_icon":{"16":"icons/hpp-16.png","32":"icons/hpp-32.png"}, "default_title":"HPP Browser Login" },
>
> "background": { "service_worker":"background.js", "type":"module" },
>
> "content_scripts": \[{
>
> "matches": \["\<all_urls\>"\],
>
> "js": \["content.js"\],
>
> "run_at": "document_idle",
>
> "all_frames": false
>
> }\],
>
> "options_ui": { "page":"options.html", "open_in_tab":true },
>
> "permissions": \["storage","alarms","activeTab","scripting"\],
>
> "host_permissions": \["https://attest.humanpresenceprotocol.com/\*"\],
>
> "content_security_policy": {
>
> "extension_pages": "default-src 'self'; connect-src https://attest.humanpresenceprotocol.com; script-src 'self'; style-src 'self' 'unsafe-inline'"
>
> },
>
> "web_accessible_resources": \[{ "resources":\["hpp-gate.html","icons/\*.png"\], "matches":\["\<all_urls\>"\] }\],
>
> "minimum_chrome_version": "120"
>
> }

**3.2 Content Script Scope — DOM Inspection Constraint**

> *REVISION 1 — This subsection is new in v1.1. It addresses the principal question Chrome Web Store reviewers will ask about the \<all_urls\> match pattern.*

The content script uses \<all_urls\> because HPP site enrollment is open: any site can declare HPP support at any time by adding a meta tag, and restricting the match pattern to a static list would require a new extension submission for every new relying party. This is the correct architectural decision.

To bound the attack surface and satisfy Web Store review, the content script's DOM access is explicitly limited to the following five operations. No other DOM access is permitted in any version of content.js:

- Read document.location.origin — extracts the current page's registrable domain for relying party identification. No other location properties are read.

- Query one meta tag: document.querySelector('meta\[name="hpp-enrollment"\]') — detects whether the page is requesting HPP enrollment. No other meta tags are inspected.

- Add one event listener to the login form submit event — intercepts the submission to present the Presence Gate. The listener does not read form field values. It calls event.preventDefault() and then releases control.

- Inject the Presence Gate overlay element into the document body as a shadow DOM element — the overlay is self-contained and reads nothing from the host page.

- Dispatch a hpp-cert-ready CustomEvent on the document — notifies the page that a certificate is available. The event detail contains cert_id, expiry_ms, and rp_id only.

The content script performs no other DOM queries, no text extraction, no input field inspection, no cookie access, no localStorage access, and no network requests. Its only network-adjacent action is sending a message to the extension service worker via chrome.runtime.sendMessage.

> *Any code change that adds a DOM query selector, event listener, or storage access to content.js beyond the five operations listed above constitutes a scope expansion. It requires a separate security review and an updated Web Store privacy disclosure before the modified extension can be submitted.*

**3.3 Permissions Rationale**

|  |  |  |  |
|----|----|----|----|
| **Permission** | **Why Required** | **Risk** | **Classification** |
| storage | Persist enrolled sites, settings, and active session certificate map across browser restarts and devices. | **Low** | Required |
| alarms | Schedule certificate expiry checks and server config refresh without relying on a persistent background page. | **Low** | Required |
| activeTab | Read the current tab's top-level frame origin to verify relying party identity matches the enrolled site before initiating a challenge. | **Low** | Required |
| scripting | Inject the Presence Gate overlay into participating pages. DOM inspection constrained to five defined operations (Section 3.2). | **Medium** | Required |
| host: attest.humanpresenceprotocol.com | Allow service worker to communicate with HPP Attestation Server for challenges and attestation submissions. | **Low** | Required |

> *The extension does NOT request tabs, history, webNavigation, or cookies permissions. These are explicitly excluded to minimize attack surface. Any future version requiring these must pass a separate security review before submission.*

**IV. HPP Protocol Implementation**

**4.1 Challenge Acquisition (P1 — Server Time Authority)**

The HPP Attestation Server is the sole time authority. The extension never constructs a challenge from local device time.

1.  Service worker sends GET /v1/challenge with relying party ID and extension version/ID headers.

2.  Server responds with: server_timestamp (Unix ms, authoritative), nonce (256-bit random), rp_id (eTLD+1), window_ms (8000–30000), max_clock_skew_ms (server-configurable), and server_sig (ECDSA P-256 over all fields).

3.  Service worker verifies server_sig against the pinned HPP Attestation Server public key (see Section 7.4) before any further processing. A failed verification triggers HPP_CHALLENGE_SIG_INVALID and aborts the flow.

4.  Challenge freshness is evaluated at time of use per Section 4.1.1.

**4.1.1 Challenge Freshness Rule**

> *REVISION 3 — The window_ms/2 heuristic from v1.0 has been replaced with this precise absolute rule.*

A challenge is valid to use if and only if both conditions hold at the moment the WebAuthn assertion is initiated:

- The current estimated server time (local receipt time + elapsed local time since receipt) is strictly less than server_timestamp + window_ms. This is the absolute expiry boundary. A challenge used at or after this boundary is rejected regardless of any other condition.

- The absolute difference between the local device clock at the time of challenge receipt and server_timestamp is less than max_clock_skew_ms. This is the clock guard. A challenge received when the clocks are too far apart is discarded immediately on receipt.

If the first condition fails: the challenge has expired; fetch a fresh one and retry once. If the second condition fails: surface HPP_CLOCK_SKEW_ERROR to the user; do not retry silently. Both conditions must be evaluated at the moment of use, not only at receipt time, because a valid challenge may become stale while waiting in the queue.

> *The absolute rule eliminates the ambiguity of the window_ms/2 heuristic. A challenge is either within its server-declared window or it is not. There is no gray zone.*

**4.2 WebAuthn rp.id Rules**

> *REVISION 2 — rp.id domain suffix constraints are new in v1.1. Read this before writing any enrollment code.*

The WebAuthn specification requires rp.id to be a registrable domain suffix (eTLD+1) of the page origin, not the full origin string. Passing a raw origin (which includes scheme and port) will cause the browser to reject the credential request.

|  |  |  |
|----|----|----|
| **Site Origin** | **Correct rp.id** | **Notes** |
| https://example.com | example.com | Standard case. Strip scheme and trailing slash. |
| https://login.example.com | example.com | Subdomain: rp.id must be eTLD+1. A credential enrolled on example.com is valid on all its subdomains. |
| https://login.example.com | login.example.com | WRONG in v1.0. WebAuthn will reject this. Subdomain-scoped credentials are reserved for v2.0. |
| https://example.co.uk | example.co.uk | Multi-part TLD. Must use full eTLD+1. Requires PSL library — naive string-split will fail. |
| http://localhost:3000 | localhost | Development only. localhost is a valid rp.id per WebAuthn spec. Never use http in production. |

The hpp-crypto.js module must bundle the Mozilla Public Suffix List (vendor/psl.min.js) to compute eTLD+1 correctly. A naive split on '.' produces wrong results for multi-part TLDs (.co.uk, .com.au, .gov.uk, etc.) and will cause enrollment to fail or incorrectly scope credentials across unrelated sites.

> *All v1.0 enrollment uses eTLD+1 as rp.id. Subdomain-scoped enrollment (rp.id = login.example.com) requires explicit relying-party opt-in and is deferred to v2.0.*

**4.3 Clock Skew Threshold**

> *REVISION 4 — Fixed 5-second threshold removed in v1.1. Threshold is now server-configurable with a sensible default.*

The maximum permissible difference between the device clock and the HPP Attestation Server clock is defined by max_clock_skew_ms in the server configuration object (hpp_server_config). The server sets this value based on operational conditions and network topology. The default is 30000ms (30 seconds), consistent with Kerberos, FIDO2 server implementations, and standard distributed systems practice.

At extension startup and every 5 minutes thereafter, the service worker fetches hpp_server_config via GET /v1/config. If the config has not yet been populated (first use before the first refresh cycle), the extension falls back to 30000ms as a hardcoded compile-time constant in hpp-crypto.js. This constant must not be set below 10000ms or above 60000ms without a security review.

Clock skew violations trigger HPP_CLOCK_SKEW_ERROR. The error is presented to the user with a link to OS clock settings. Silent retry is not permitted.

**4.4 Liveness Gate (P2 — Hardware Key, P5 — NPHT)**

> const options = {
>
> publicKey: {
>
> challenge: hppChallenge.nonce_bytes,
>
> rpId: computeRpId(tabOrigin), // eTLD+1, NOT raw origin
>
> allowCredentials: \[{ type:'public-key', id:enrolledCredentialId }\],
>
> userVerification: 'required', // UV flag mandatory — non-negotiable
>
> timeout: hppChallenge.window_ms, // server-controlled NPHT window
>
> extensions: {
>
> hpp_server_ts: hppChallenge.server_timestamp,
>
> hpp_window_ms: hppChallenge.window_ms,
>
> hpp_version: '1.0'
>
> }
>
> }
>
> };
>
> const assertion = await navigator.credentials.get(options);

userVerification: 'required' is non-negotiable and must never be relaxed. An assertion without UV=1 in the authenticator data flags is discarded immediately with HPP_UV_FLAG_MISSING.

**4.5 Certificate Construction (P7 — Receipt Architecture)**

|  |  |  |
|----|----|----|
| **Field** | **Source** | **Description** |
| cert_id | Generated | UUID v4. Unique per certificate instance. |
| rp_id | Server challenge | eTLD+1 of relying party origin from server challenge. Bound to this site; non-transferable. |
| server_timestamp | Server challenge | Server-authoritative issue time. Anchor for time-warehousing resistance proof. |
| client_timestamp | Device clock | Device-local completion time. Delta vs server_timestamp must be within max_clock_skew_ms. |
| credential_id | WebAuthn | Enrolled platform authenticator ID. Binds certificate to a specific device. |
| authenticator_data | WebAuthn | Raw authenticator data: UV flag, sign count, AAGUID. |
| assertion_sig | WebAuthn | ECDSA P-256 signature over authenticator data and challenge hash. Hardware-produced. |
| hpp_server_sig | Attestation Server | Countersignature from HPP Attestation Server after server-side verification. |
| expiry_ms | Computed | server_timestamp + certificate_lifetime_ms. Default 3600000 (1 hour). See Section 4.6. |
| action_scope | RP request | Optional. Populated on re-attestation requests. Scopes the certificate to a specific high-value action. |

**4.6 Certificate Lifetime and Session Reuse Policy**

> *REVISION 5 — Certificate lifetime rationale and high-value re-attestation pattern are new in v1.1.*

The default certificate lifetime is one hour. This represents a deliberate, principled usability tradeoff rather than an arbitrary threshold.

Most authenticated user sessions consist of a sequence of actions within a single working context that represent a continuous human intent — browsing, editing, transacting. Requiring a fresh biometric gesture for every individual page load or API call would impose friction severe enough that users would route around it or disable the extension. A one-hour session presence reuse window balances security with practicality.

The philosophical position of HPP is not that a human has been continuously present for the full hour. It is that a human was verifiably present on specific hardware at the start of the session and that the session has remained active and uninterrupted on that hardware since. This is a stronger guarantee than any password-based session provides, because the session is hardware-bound and hardware cannot be replicated at scale.

For high-value actions within a session — payment authorization, account deletion, privilege escalation, medical record access — HPP supports a re-attestation pattern:

- The relying party includes an hpp-reauth: required header in its API response for a specific action.

- The extension detects this signal and initiates a new challenge-liveness-certificate cycle before the action is permitted to proceed.

- The re-attestation certificate is issued with a short lifetime (default 120 seconds) and carries an action_scope field populated by the relying party's reauth request.

- Standard session certificate lifetime: 1 hour. Re-attestation certificate lifetime: 120 seconds. Both use the identical protocol path.

**4.7 Certificate Presentation and Transport (P10 — Origin Binding)**

> *REVISION 6 — Top-level frame enforcement. REVISION 7 — Transport channel clarification. Both new in v1.1.*

Frame context validation occurs before any HPP action:

> // Abort if running inside an iframe
>
> if (window !== window.top) { return; }

HPP authentication only occurs in the top-level browsing context. If the content script detects it is running in an iframe (window !== window.top), it exits silently and takes no HPP action. This eliminates the attack where a malicious site embeds a legitimate HPP-protected login page in an invisible iframe to capture presence events.

On certificate issuance, the content script fires a minimal notification event:

> document.dispatchEvent(new CustomEvent('hpp-cert-ready', {
>
> detail: { cert_id, expiry_ms, rp_id },
>
> bubbles:false, cancelable:false, composed:false
>
> }));

The event contains only cert_id, expiry_ms, and rp_id — identifiers, not credentials. The full certificate (authenticator_data, assertion_sig, hpp_server_sig) never enters the page's JavaScript context under any circumstances.

The full certificate is transmitted to the relying party backend by the extension's service worker directly. The service worker holds the certificate in hpp_session_map and, upon the CERT_READY notification, initiates an authenticated POST to the relying party's HPP callback endpoint. This is a privileged network request originating from the extension context — not the page context. No script running on the page can intercept, observe, or modify this request.

> *The extension is the certificate courier. The page learns only that authentication succeeded. The actual proof material travels on a channel the page cannot reach.*

**V. Site Enrollment Flow**

Before HPP can gate authentication on a site, the site must be enrolled: the user creates a platform authenticator credential bound to that site's eTLD+1. Enrollment is a one-time flow per site per device.

**5.1 Enrollment Triggers**

- Site includes \<meta name='hpp-enrollment' content='request'\> in its login page. Content script detects this and presents the enrollment prompt.

- User clicks 'Enroll This Site' from the extension popup.

- User selects 'Enable HPP Login Here' from the popup menu on the site's login page.

**5.2 Enrollment Steps**

5.  Content script or popup sends ENROLL_REQUEST to service worker with the target origin.

6.  Service worker computes rp_id = eTLD+1 of target origin using the bundled PSL library (vendor/psl.min.js).

7.  Service worker fetches an enrollment challenge from the HPP Attestation Server.

8.  Service worker calls navigator.credentials.create() with: authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'required', attestation: 'direct', pubKeyCredParams: \[{ alg:-7, type:'public-key' }\], rp.id = computed eTLD+1.

9.  On success, service worker stores credential ID and public key in hpp_enrolled_sites.

10. Service worker registers the credential with the HPP Attestation Server via POST /v1/enroll.

11. ENROLL_SUCCESS message sent to content script/popup. Extension icon badge updates to indicate HPP is active on this site.

> *No biometric data leaves the device at any point. The attestation object contains a public key and device attestation certificate chain — not biometric material. The private key never leaves the TEE.*

**5.3 Credential Revocation**

Revocation removes the entry from hpp_enrolled_sites, notifies the Attestation Server via DELETE /v1/credential (signed with a fresh WebAuthn assertion proving device possession), and clears active session state. The WebAuthn credential in the TEE is deleted through the OS credential manager (Chrome Settings \> Privacy \> Manage Passkeys).

**VI. User Interface Specification**

**6.1 Extension Icon States**

|  |  |  |
|----|----|----|
| **State** | **Badge** | **Meaning** |
| Default (gray) | None | Current site not HPP-enrolled. No action pending. |
| Active (navy) | Green dot | HPP-enrolled; valid Presence Certificate active for this session. |
| Pending (navy) | Spinning gold ring | HPP authentication in progress — challenge fetched, waiting for biometric. |
| Expiring (amber) | Gold dot | Certificate expires in under 5 minutes. Soft re-attestation prompt displayed. |
| Error (red) | Red X | Authentication failed or certificate rejected. User action required. |
| Enrollment (gold) | Gold + | Site has requested HPP enrollment. Tap to begin. |

**6.2 Presence Gate Overlay**

- Injected as a shadow DOM element — prevents style leakage from host page.

- Dimensions: 400px wide, 240px tall, centered in viewport, positioned above login form.

- Visual: white background, 2px navy border, 8px radius, HPP wordmark at top, gold rule below wordmark.

- Action button: 'Verify Your Presence' — navy fill, white text, 24px Georgia bold.

- Sub-label: 'Touch ID / Face ID / Windows Hello — no password required'.

- Dismissal without completing: standard login form reactivated, no page reload.

**6.3 Popup UI — Three Tabs**

**Status Tab**

Certificate status, relying party, issue time, expiry countdown, cert_id (8-char truncation). 'Re-Attest Now' button for manual refresh before expiry.

**Sites Tab**

Scrollable enrolled site list: favicon, origin, enrollment date, revoke button. Search field. 'Enroll Current Site' pinned to bottom.

**Settings Tab**

HPP Active toggle, Privacy Mode toggle, Debug Logging toggle. Certificate Lifetime dropdown (30m / 1h / 4h / 8h). Link to full Options page.

**6.4 Onboarding Flow**

12. What HPP is: single paragraph, HPP wordmark, Continue.

13. How it works: three-step illustration, Continue.

14. Try it now: live gate if on enrolled site; site search field if not.

**VII. Security Model**

**7.1 Threat Model**

|  |  |  |
|----|----|----|
| **Adversary** | **Attack Vector** | **HPP Defense** |
| Bot / Automation Farm | Complete liveness gate without a human present. | userVerification: required forces TEE activation. No software path satisfies UV requirement. NPHT gate consumes a full server-controlled time slot per attempt. |
| Replay Attacker | Replay a captured certificate on another session or site. | Certificate is bound to rp_id (eTLD+1), credential_id (device), and server_timestamp with a short window. Nonce and timestamp combination never repeats. |
| Time Warehouser | Stockpile challenges during off-peak hours for future use. | Challenges expire at server_timestamp + window_ms (8–30 seconds). Absolute freshness rule (Section 4.1.1) — no grace period. Pre-computed challenges are structurally worthless. |
| Credential Thief | Steal credentials from extension or browser storage. | No passwords exist in the extension. Certificates are in chrome.storage.session and expire. TEE private key is hardware-bound and cannot be exported by any software path. |
| Malicious Page Script | Exfiltrate Presence Certificate from page JS context. | Full certificate (assertion_sig, hpp_server_sig, authenticator_data) never enters page JS context. Only cert_id notification dispatched. Certificate travels service-worker-to-RP-backend (see Section 4.7). |
| IFrame Embedder | Embed HPP login page in iframe to capture presence events. | Content script checks window !== window.top before any HPP action. Iframe context triggers silent abort. (INV-8, Section 4.7.) |
| Extension Impersonator | Create fake extension mimicking HPP. | Server requires valid TEE assertion_sig. Impersonator without device TEE key cannot produce it. Production endpoints enforce X-HPP-Extension-ID binding (Section 7.5). |

**7.2 Security Invariants**

The following invariants must hold in every version of the extension. A code change that violates any invariant must be rejected in review:

- INV-1: The private key material for any enrolled credential never leaves the TEE. The extension makes no calls to export or serialize private key material.

- INV-2: Challenges are always fetched from the HPP Attestation Server. Local challenge generation is never permitted under any condition.

- INV-3: The UV (User Verification) flag in authenticator data is checked before any certificate is constructed. Assertions with UV=0 are discarded immediately.

- INV-4: Certificates are stored only in chrome.storage.session. Never written to localStorage, IndexedDB, cookies, or any storage accessible to page scripts.

- INV-5: rp_id in a certificate must exactly match the eTLD+1 of the current top-level frame origin before the certificate is presented. Mismatches abort the flow.

- INV-6: Challenge freshness is evaluated using the absolute rule in Section 4.1.1. The window_ms/2 heuristic is not used in any code path.

- INV-7: Extension page CSP prohibits eval() and connections to any origin other than the HPP Attestation Server.

- INV-8: HPP authentication is never initiated in an iframe context (window !== window.top). Content script exits silently in all non-top-level frame contexts.

**7.3 Privacy Guarantees**

The following are architectural guarantees — properties enforced by the system's design, not by policy statements:

- No biometric data transmitted to any server. WebAuthn assertions contain signatures, not biometric material. Biometric verification occurs entirely within the TEE.

- No user identity transmitted to HPP infrastructure. The Attestation Server receives credential IDs and nonces only.

- No page content read. Content script DOM access is limited to five defined operations (Section 3.2).

- No third-party analytics or telemetry SDKs. The only external connection is to attest.humanpresenceprotocol.com.

- No persistent certificate storage. All certificate data lives in chrome.storage.session and is cleared on browser restart.

**7.4 Attestation Server Trust Anchor**

> *REVISION 9 — The source and management of the server public key is specified explicitly in v1.1. Reviewers will ask; the answer must be in the spec.*

The HPP Attestation Server public key used to verify all challenge signatures and certificate countersignatures is bundled inside the extension package as a PEM-encoded ECDSA P-256 public key at lib/hpp-server-pubkey.pem. This is public key pinning at the package level.

The trust anchor is not fetched from the server at runtime. Fetching the key from the entity being trusted creates a circular trust problem: if the server is compromised, the fetched key is also compromised, and the signature verification provides no protection. Package-level pinning eliminates this vector.

- lib/hpp-server-pubkey.pem — current pinned key, used for all signature verification.

- lib/hpp-server-pubkey-next.pem — optional rotation key, accepted during transition window only.

- Key rotation schedule: minimum 12 months. The server maintains a 30-day dual-validity transition window. New extension version with updated pinned key must be published at least 30 days before the old key expires.

> *Trust anchor files must be verified against the authoritative key fingerprint in the build configuration during CI. A build that cannot verify the pinned key fingerprint must fail and must not produce a deployable artifact.*

**7.5 Extension Impersonation Defense**

> *REVISION 10 — Verified Publisher status and extension ID binding are new in v1.1.*

The primary defense against extension impersonation is server-side: the HPP Attestation Server verifies every assertion_sig against the enrolled credential's public key. An impersonator without access to the device TEE cannot produce a valid assertion regardless of how convincingly it mimics the extension UI.

Two additional layers are required for production deployment:

- Chrome Web Store Verified Publisher: Agile On Target LLC must complete Google's Verified Publisher program before the production extension is submitted. The Verified Publisher badge appears on the Web Store listing and is visible to users before installation. This does not prevent all impersonation but raises the cost and visibility substantially.

- Extension ID Binding: The HPP Attestation Server production endpoints enforce an X-HPP-Extension-ID header containing the official extension ID (a SHA-256 hash of the extension's public key, assigned at first Web Store publication and immutable thereafter). Requests from unknown extension IDs are rejected with HTTP 403 and error code UNKNOWN_EXTENSION_ID. Development and staging use a separate endpoint that does not enforce ID binding.

The extension ID must be recorded in the HPP key inventory at first publication. Any action that would change the extension ID requires re-verification of the production server endpoint configuration before the new version is activated.

**VIII. HPP Attestation Server API Contract**

All endpoints: HTTPS, TLS 1.3 minimum. All bodies: JSON. All timestamps: Unix milliseconds.

**8.1 GET /v1/challenge**

|  |  |
|----|----|
| **Field** | **Value** |
| Method | GET |
| Headers | X-HPP-Extension-Version (semver), X-HPP-Extension-ID (Chrome extension ID) |
| Query params | rp_id (eTLD+1, required), session_hint (opaque, optional) |
| Response 200 | { server_timestamp, nonce, rp_id, window_ms, max_clock_skew_ms, server_sig } |
| Response 400 | { error: 'INVALID_RP_ID' \| 'MISSING_PARAM' } |
| Response 403 | { error: 'UNKNOWN_EXTENSION_ID' } |
| Response 429 | Rate limit exceeded. Back off for Retry-After seconds. |

**8.2 POST /v1/attest**

|  |  |
|----|----|
| **Field** | **Value** |
| Body | { cert_id, rp_id, server_timestamp, client_timestamp, credential_id, authenticator_data, assertion_sig, action_scope? } |
| Response 200 | { cert_id, hpp_server_sig, expiry_ms, status:'ISSUED' } |
| Response 401 | { error: 'UV_FLAG_MISSING' \| 'SIG_INVALID' \| 'CLOCK_SKEW' \| 'CREDENTIAL_REVOKED' } |
| Response 408 | { error: 'CHALLENGE_EXPIRED' } |

**8.3 POST /v1/enroll**

|  |  |
|----|----|
| **Field** | **Value** |
| Body | { rp_id, credential_id, public_key_cbor, attestation_object, client_data_json, enrollment_challenge_nonce } |
| Response 200 | { credential_id, rp_id, enrolled_at, status:'ENROLLED' } |
| Response 409 | { error: 'CREDENTIAL_ALREADY_ENROLLED' } |

**8.4 DELETE /v1/credential**

|  |  |
|----|----|
| **Field** | **Value** |
| Body | { credential_id, rp_id, revocation_sig } |
| Note | revocation_sig is a fresh WebAuthn assertion over credential_id and rp_id, proving the device still holds the key. |
| Response 200 | { credential_id, status:'REVOKED' } |

**8.5 GET /v1/config**

|  |  |
|----|----|
| **Field** | **Value** |
| Purpose | Allows server to push runtime configuration to the extension. Polled every 5 minutes. |
| Response 200 | { max_clock_skew_ms, window_ms_min, window_ms_max, h_constant, supported_attestation_formats } |

**IX. Error Handling and Recovery**

|  |  |  |
|----|----|----|
| **Error Code** | **Origin** | **Recovery Action** |
| HPP_CHALLENGE_SIG_INVALID | Extension | Discard. Log HIGH severity. Display 'Unable to verify server identity'. Do not retry automatically — possible MITM. |
| HPP_UV_FLAG_MISSING | Extension | Discard assertion. Display 'Biometric verification required'. Offer to retry. |
| HPP_CLOCK_SKEW_ERROR | Extension | Display 'Device clock may be incorrect'. Link to OS clock settings. Do not retry silently. |
| HPP_CHALLENGE_EXPIRED | Server | Fetch fresh challenge. Retry once. Second expiry: display 'Connection too slow for real-time verification'. |
| HPP_CREDENTIAL_REVOKED | Server | Remove from hpp_enrolled_sites. Display 'Device no longer enrolled. Re-enroll to continue.' |
| HPP_ORIGIN_MISMATCH | Extension | Abort immediately. Log HIGH. Display generic 'Authentication error'. Do not expose mismatched origins. |
| HPP_WEBAUTHN_CANCELLED | Browser | Restore original login form. Display 'Verification cancelled — password login available below'. |
| HPP_SERVER_UNAVAILABLE | Network | Retry once after 2 seconds. Fall back to standard site login. Display 'HPP servers temporarily unavailable'. |
| HPP_UNKNOWN_EXTENSION_ID | Server | Log CRITICAL. Display 'Extension not recognized by HPP servers'. Do not retry. Indicates dev build against prod or impersonation attempt. |

**X. Extension File Structure**

> hpp-chrome-extension/
>
> ├── manifest.json
>
> ├── background.js \# Service worker — protocol orchestrator
>
> ├── content.js \# Content script — 5 DOM operations only
>
> ├── webauthn-bridge.js \# WebAuthn API wrapper
>
> ├── popup.html / popup.js / popup.css
>
> ├── options.html / options.js / options.css
>
> ├── onboarding.html / onboarding.js / onboarding.css
>
> ├── hpp-gate.html \# Presence Gate overlay (shadow DOM)
>
> ├── lib/
>
> │ ├── hpp-crypto.js \# Cert construction, sig verify, eTLD+1 via PSL
>
> │ ├── hpp-storage.js \# Typed chrome.storage wrappers
>
> │ ├── hpp-errors.js \# Error codes and display strings
>
> │ ├── hpp-logger.js \# Debug logger with field redaction
>
> │ ├── hpp-server-pubkey.pem \# PINNED attestation server public key
>
> │ └── hpp-server-pubkey-next.pem \# Rotation transition key (optional)
>
> ├── vendor/
>
> │ └── psl.min.js \# Mozilla Public Suffix List — eTLD+1 computation
>
> └── icons/
>
> ├── hpp-16.png hpp-32.png hpp-48.png hpp-128.png

**XI. Chrome Web Store Deployment**

**11.1 Listing Requirements**

- Name: HPP Browser Login — Human Presence Protocol

- Short description: Replace passwords and CAPTCHAs with proof of human presence. Hardware-bound. Privacy-preserving. No account required.

- Category: Productivity

- Screenshots: 5–10. Must include: Presence Gate overlay, popup Status tab, popup Sites tab, enrollment flow, onboarding screen.

- Verified Publisher: Agile On Target LLC Verified Publisher status required before production submission.

**11.2 Privacy Practices Disclosure**

- Collects user data? No — the extension does not collect, transmit, or sell user data.

- Uses remote code execution? No — CSP prohibits eval() and all code is bundled in the package.

- Uses analytics or tracking? No.

- Single purpose statement: The extension intercepts login flows on participating sites and replaces password entry with hardware-verified human presence attestation using WebAuthn. DOM inspection is limited to five defined operations (Section 3.2). Privacy policy: agileontarget.com/privacy.

**11.3 Review Preparation**

- Video walkthrough (under 5 minutes): full enrollment and login flow on a test site.

- Written \<all_urls\> justification: new sites can declare HPP support at any time; a static list would require an extension update for each new relying party. DOM inspection constrained to five operations (Section 3.2).

- Privacy policy link: agileontarget.com/privacy.


**11.4 Version and Key Rotation Policy**

- Semantic versioning: MAJOR.MINOR.PATCH. MAJOR version requires new Web Store submission with full permission change description.

- Trust anchor rotation: new version with updated hpp-server-pubkey.pem must be published at least 30 days before the old key expires.

- Extension ID is immutable after first publication. Record in HPP key inventory at first submission.

**XII. Testing Requirements**

**12.1 Unit Test Coverage — 100% Required**

- hpp-crypto.js — certificate construction, signature verification, eTLD+1 computation (including multi-part TLDs), clock skew detection, freshness rule.

- hpp-storage.js — typed read/write/clear for all storage areas including hpp_inflight_map.

- hpp-errors.js — all error code mappings and display strings.

- background.js — all message handler branches and all error code paths.

**12.2 Integration Test Scenarios**

15. Successful enrollment on a new site with a platform authenticator.

16. Successful login with a valid Presence Certificate.

17. Challenge expiry during attestation — automatic retry and fallback.

18. UV flag missing in assertion — rejection and user prompt.

19. Origin mismatch — immediate abort, no certificate issued.

20. Server unavailable — fallback to standard login.

21. Credential revocation — site removal from enrolled list.

22. Service worker restart mid-attestation — hpp_inflight_map recovery.

23. Iframe context — silent abort, no HPP action taken.

24. Subdomain origin (login.example.com) — verify eTLD+1 (example.com) used as rp_id.

25. Clock skew exceeding max_clock_skew_ms — HPP_CLOCK_SKEW_ERROR surfaced.

26. Re-attestation trigger (hpp-reauth: required) — short-lifetime action-scoped certificate issued.

**12.3 Manual Verification Checklist**

- Presence Gate overlay renders correctly on 1080p and 4K displays.

- Touch ID on macOS completes gate in under 2 seconds.

- Windows Hello on Windows 11 completes gate in under 2 seconds.

- All six icon states transition correctly through a full session lifecycle.

- Popup certificate countdown updates in real time.

- Dismissing the gate restores standard login without page reload.

- First-run onboarding completes without JavaScript console errors.

- Content script generates zero console output on non-HPP sites.

**XIII. Authentication Flow — Sequence Diagram**

The diagram below traces the complete HPP browser login sequence from navigation to authenticated session. Horizontal lanes represent participants. The NPHT Gate marks the hardware-enforced boundary: no sequence of software calls can satisfy it without a real human present on real hardware inside the server-controlled time window.

**Figure 1 — HPP Browser Login: Full Authentication Sequence**

> COLUMNS: USER PAGE CONTEXT CONTENT SCRIPT SERVICE WORKER TEE/WEBAUTHN ATTEST SERVER
>
> \| \| \| \| \| \|
>
> 1.Navigate \|--\[navigate\]--\>\| \| \| \| \|
>
> \| \|--\[inject\]-----\>\| \| \| \|
>
> \| \| content.js \| \| \| \|
>
> \| \| (document_idle) \| \| \|
>
> \| \| \| \| \| \|
>
> 2.Detect \| \|\<-\[HPP meta tag or login trigger\]\| \| \|
>
> trigger \| \| detected by content script \| \| \|
>
> \| \| \| \| \| \|
>
> 3.Request \| \| \|-CHALLENGE_REQ-\>\| \| \|
>
> challenge \| \| \| { rp_id, \| \| \|
>
> \| \| \| tab_id } \| \| \|
>
> \| \| \| \| \| \|
>
> 4.Fetch \| \| \| \|-GET /challenge-\>\| \|
>
> from \| \| \| \| \|-GET /challenge-\>\|
>
> server \| \| \| \| \| \|
>
> 5.Challenge \| \| \| \| \|\<-{ ts, nonce, \|
>
> issued \| \| \| \| \| window_ms, \|
>
> \| \| \| \| \| server_sig } \|
>
> \| \| \| \|\<-challenge-------\| \|
>
> \| \| \| \| VERIFY server_sig\| \|
>
> \| \| \| \| against pinned key \|
>
> \| \| \|\<-challenge-----\| \| \|
>
> \| \| \| \| \| \|
>
> 6.Show Gate \| \|\<-\[inject Presence Gate overlay\]-\| \| \|
>
> \| \| (shadow DOM, above login form) \| \| \|
>
> \| \| \| \| \| \|
>
> 7.User \|\<-\['Verify Your Presence' button\] \| \| \|
>
> gesture \| \| \| \| \| \|
>
> \|--\[biometric gesture: Touch ID / Face ID / \| \| \|
>
> \| Windows Hello\]--------------\>\| \| \| \|
>
> \| \| \| \| \| \|
>
> ╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
>
> ║ NPHT GATE — hardware-enforced, server-controlled time window, UV=1 mandatory ║
>
> ╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
>
> \| \|--\[credentials.get()\]----------\>\|----------------\>\| \|
>
> \| \| \| \| TEE activates \| \|
>
> \| \| \| \| biometric check\| \|
>
> \| \| \| \| signs challenge\| \|
>
> \| \| \| \| UV flag = 1 \| \|
>
> \| \| \| \| \| \|
>
> 8.Assertion \| \| \|\<-assertion-----\|\<-{ auth_data, \| \|
>
> returned \| \| \| forwarded to \| assertion_sig,\| \|
>
> \| \| \| service worker\| UV=1 } \| \|
>
> \| \| \|-assertion-----\>\| \| \|
>
> \| \| \| \| \| \|
>
> 9.Persist \| \| \| \| WRITE \| \|
>
> inflight \| \| \| \| hpp_inflight_map\| \|
>
> state \| \| \| \| (guard vs worker\| \|
>
> \| \| \| \| restart) \| \|
>
> \| \| \| \| \| \|
>
> 10.Submit \| \| \| \|-POST /attest----\|----------------\>\|
>
> to server \| \| \| \| { cert_id, \| \|
>
> \| \| \| \| auth_data, \| \|
>
> \| \| \| \| assertion_sig}\| \|
>
> \| \| \| \| \| \|
>
> 11.Counter- \| \| \| \|\<-{ cert_id, \|\<----------------\|
>
> signed \| \| \| \| hpp_server_sig\| \|
>
> cert \| \| \| \| expiry_ms } \| \|
>
> \| \| \| \| \| \|
>
> 12.Store \| \| \| \| STORE cert in \| \|
>
> & clear \| \| \| \| hpp_session_map \| \|
>
> \| \| \| \| CLEAR inflight \| \|
>
> \| \| \| \| \| \|
>
> 13.Notify \| \| \|\<-CERT_READY----\| \| \|
>
> page \| \|\<-\[dispatch hpp-cert-ready event\]\| \| \|
>
> \| \| { cert_id, expiry_ms, rp_id } \| \| \|
>
> \| \| (credentials NOT in event) \| \| \|
>
> \| \| \| \| \| \|
>
> 14.Relay \| \| \| \|-POST cert to RP-\|--------+ \|
>
> to RP \| \| \| \| backend \| \| Relying
>
> backend \| \| \| \| (service worker\| \| Party
>
> \| \| \| \| network req, \| \| Backend
>
> \| \| \| \| not page req) \| \| \|
>
> \| \| \| \| \| \| \|
>
> 15.Session \|\<-\[session granted\]-------------\| \| \| \| \|
>
> granted \| \| \| \| \| \| \|

*Yellow = challenge/response path. Green = success path. Red = user-facing human interaction. The NPHT Gate cannot be satisfied by any software path — it requires a human present on specific hardware inside the server-controlled time window.*

**XIV. Trust Boundary Architecture — Five-Zone Diagram**

The diagram below maps the five trust zones in the HPP Browser Login architecture. Each zone carries a defined trust level, a defined set of principals it trusts, and formal rules governing what may cross its boundaries. The security invariants in Section 7.2 are the precise expression of those crossing rules.

**Figure 2 — HPP Browser Login: Five-Zone Trust Boundary Architecture**

> ┌────────────────────────────────────────────────────────────────────┐
>
> │ ZONE 1: DEVICE HARDWARE \[Trust Level: Absolute\] │
>
> │ │
>
> │ ┌─────────────────────────────────────────────────────────────┐ │
>
> │ │ Trusted Execution Environment (TEE) │ │
>
> │ │ │ │
>
> │ │ • Platform private key ← NEVER crosses this boundary │ │
>
> │ │ • Biometric sensor input (Touch ID / Face ID / Hello) │ │
>
> │ │ • ECDSA P-256 signing engine │ │
>
> │ │ • UV flag enforcement — UV=1 only if biometric passes │ │
>
> │ │ │ │
>
> │ │ Trusts: Nothing external. Inputs only from hardware sensor │ │
>
> │ └───────────────────────┬─────────────────────────────────────┘ │
>
> │ │ assertion (public data only): │
>
> │ │ { authenticator_data, assertion_sig } │
>
> │ │ Private key material NEVER exits │
>
> └──────────────────────────┼─────────────────────────────────────────┘
>
> │
>
> ▼
>
> ┌────────────────────────────────────────────────────────────────────┐
>
> │ ZONE 2: BROWSER EXTENSION CONTEXT \[Trust Level: High\] │
>
> │ │
>
> │ Service Worker (background.js) │
>
> │ • Sole holder of Presence Certificates (hpp_session_map) │
>
> │ • Verifies server_sig against PINNED key (lib/hpp-server- │
>
> │ pubkey.pem) — trust anchor not fetched at runtime │
>
> │ • Enforces UV=1 before constructing any certificate │
>
> │ • Enforces rp_id == eTLD+1(tab origin) — origin binding │
>
> │ • Holds hpp_inflight_map for worker-restart safety │
>
> │ • Initiates certificate relay to RP backend directly │
>
> │ │
>
> │ Content Script (content.js) — runs in page context │
>
> │ • 5 permitted DOM operations only (see Section 3.2) │
>
> │ • Exits silently if window !== window.top (INV-8) │
>
> │ • Passes assertion to service worker, never to page │
>
> │ │
>
> │ WebAuthn Bridge (webauthn-bridge.js) │
>
> │ • Constructs credential requests with server-controlled window │
>
> │ • Passes assertions only to service worker │
>
> │ │
>
> │ Trusts: TEE assertions (via WebAuthn), pinned server public key │
>
> └──────────┬────────────────────────┬────────────────────────────────┘
>
> │ │
>
> │ cert_id notification │ FULL CERTIFICATE
>
> │ only (no credentials) │ { assertion_sig,
>
> │ dispatched to page │ hpp_server_sig,
>
> │ │ authenticator_data }
>
> │ │ sent directly to RP
>
> │ │ backend by service
>
> ▼ │ worker (not page)
>
> ┌──────────────────────────────── │ ───────────────────────────────┐
>
> │ ZONE 3: PAGE CONTEXT \[Trust Level: Untrusted\] │
>
> │ │ │
>
> │ Relying Party Web Page │ │
>
> │ • Receives hpp-cert-ready event: { cert_id, expiry_ms, rp_id } │
>
> │ • NEVER receives assertion_sig, hpp_server_sig, auth_data │
>
> │ • Cannot observe the extension→RP-backend network channel │
>
> │ • Treated as potentially hostile — all inputs validated │
>
> │ │ │
>
> │ Trusts: Nothing. All HPP signals validated before use │
>
> └──────────────────────────────────┼─────────────────────────────────┘
>
> │ full certificate
>
> ▼ (privileged extension request)
>
> ┌────────────────────────────────────────────────────────────────────┐
>
> │ ZONE 4: HPP ATTESTATION SERVER \[Trust Level: Trusted 3rd Party\]│
>
> │ │
>
> │ • Sole time authority — server_timestamp in all challenges │
>
> │ • Issues signed challenges with max_clock_skew_ms │
>
> │ • Verifies assertion_sig against enrolled credential public key │
>
> │ • Verifies UV=1 in authenticator_data (server-side check) │
>
> │ • Countersigns certificates with hpp_server_sig │
>
> │ • Enforces X-HPP-Extension-ID binding (production only) │
>
> │ • Does not store user identity, biometric data, or PII │
>
> │ │
>
> │ Trusted by: Extension (pinned key), Relying Party (via SDK) │
>
> └──────────────────────────┬─────────────────────────────────────────┘
>
> │ hpp_server_sig on
>
> │ Presence Certificate
>
> ▼
>
> ┌────────────────────────────────────────────────────────────────────┐
>
> │ ZONE 5: RELYING PARTY BACKEND \[Trust Level: Downstream Verifier\]│
>
> │ │
>
> │ • Receives full Presence Certificate from extension service │
>
> │ worker (not from page — Zone 3 never holds this data) │
>
> │ • Verifies hpp_server_sig using HPP Server SDK │
>
> │ • Verifies rp_id matches its own eTLD+1 origin │
>
> │ • Verifies expiry_ms \> current server time │
>
> │ • Issues its own session token on success │
>
> │ • Optionally sends hpp-reauth: required for high-value actions │
>
> │ │
>
> │ Trusts: HPP Attestation Server signature chain (Zone 4) │
>
> └────────────────────────────────────────────────────────────────────┘

*Five zones, five trust levels. The critical boundary is between Zone 2 (Extension) and Zone 3 (Page): full certificate material never crosses from Zone 2 into Zone 3. The certificate travels from Zone 2 directly to Zone 5, bypassing the page entirely.*


Human Presence Protocol \| Patent Pending \| Agile On Target LLC \| agileontarget.com
