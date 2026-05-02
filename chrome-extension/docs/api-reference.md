# HPP Browser SDK — Canonical API Reference

*Frozen v1 Public Surface — Platform-Agnostic*

*API Version: 1.0.0 (Frozen)*

*Source of truth: `chrome-extension/hpp-api.js`, `chrome-extension/API.md`, `chrome-extension/API_EVENTS.md`*

---

| **Source of Truth** | hpp-api.js (browser), API.md, API_EVENTS.md |

**1. Integration Checklist**

Three things. No more.

1\. HTML: \<meta name="hpp-enrollment" data-hpp-callback="/api/hpp" data-hpp-site-name="My Site"\>

2\. JavaScript: await HPP.requestPresence()

3\. Server: await verifyPresenceCertificate(cert, publicKey)

**2. Public API Surface (Frozen v1)**

**HPP.requestPresence(\[options\])**

Triggers the Presence Gate. The user completes a biometric gesture. Resolves when the full certificate has been delivered to the RP callback and a session has been issued.

Options: { timeoutMs: number (default 60000) }

Resolves with PresenceResult: { verified: true, cert_id: string, rp_id: string, expiry_ms: number }

Rejects with HppError: { code: string, message: string }

Security invariant: cert_id is the ONLY certificate field this call returns. hpp_server_sig, assertion_sig, credential_id, and client_data_json are never transmitted to page JavaScript (INV-5).

**HPP.getSession()**

Returns the current session summary, or null if no session is active. Async — queries the client service layer.

SessionSummary shape (frozen): { cert_id: string, rp_id: string, issued_at: number, expiry_ms: number, remaining_ms: number }

**HPP.on(event, handler)**

Subscribe to HPP lifecycle events. Returns an unsubscribe function.

|           |                     |                                              |
|-----------|---------------------|----------------------------------------------|
| **Event** | **Payload**         | **When**                                     |
| ready     | { extension: true } | Client detected and active on this page      |
| verified  | PresenceResult      | Certificate issued and delivered to callback |
| error     | { code, message }   | Any failure in the verification flow         |
| expired   | {}                  | invalidateSession() was called               |

**HPP.invalidateSession()**

Marks the current session invalid on the page side. getSession() returns null immediately after. Does NOT revoke the certificate server-side.

**HPP.debug()**

Returns: { api_version: '1.0.0', extension_ready: boolean, pending_calls: number, origin: string }. For debugging only.

**3. Internal Event Model**

The public API is built on DOM CustomEvents dispatched on document. These are the wire protocol between the page SDK and the HPP client. Do NOT use these directly — use HPP.\* methods.

|               |                        |                               |
|---------------|------------------------|-------------------------------|
| **Direction** | **Event**              | **Detail**                    |
| Client → Page | hpp-extension-ready    | {}                            |
| Client → Page | hpp-cert-ready         | { cert_id, rp_id, expiry_ms } |
| Client → Page | hpp-error              | { code, message }             |
| Client → Page | hpp-session-response   | SessionSummary \| null        |
| Page → Client | hpp-presence-requested | { origin }                    |
| Page → Client | hpp-session-request    | {}                            |

**4. Not in v1**

These are explicitly deferred to a future release:

- actionScope — certificate scoping for high-value sub-actions

- HPP.requestReAttestation() — depends on actionScope being real end-to-end

- Form interception — HPP v1 is a programmatic API only

- display option — custom gate message text

- npm package (@humanpresence/sdk) — forthcoming; use hpp-api.js via script tag for now

*Human Presence Protocol \| Canonical API Reference \| Agile On Target LLC \| April 2026 \| v2.0*
