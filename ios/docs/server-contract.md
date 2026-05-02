**HPP iOS SERVER CONTRACT**

Complete API Reference for iOS Client Development

12 Endpoints · Swift Codable Structs · Error Handling · Offline Queue


**1. Base Configuration**

let baseURL = URL(string: ProcessInfo.processInfo.environment\["HPP_VERIFIER_URL"\] ?? "https://api.hpp.example")!

TLS 1.3 required. Certificate pinning via URLSessionDelegate with SHA-256 pin set. Connection timeout: 30s. Resource timeout: 60s. ATS enabled (no exceptions).

// URLSession Configuration

let config = URLSessionConfiguration.default

config.timeoutIntervalForRequest = 30

config.timeoutIntervalForResource = 60

config.waitsForConnectivity = true

config.httpAdditionalHeaders = \["Content-Type": "application/json"\]

**2. Core Endpoints**

**2.1 GET /v1/health**

|  |  |
|----|----|
| **Endpoint** | GET /v1/health |
| Purpose | Service health check. Call on app launch to verify connectivity and sync verifier time. |
| Response | { verifier_time: ISO8601, epoch_id: String, status: "ok" } |
| iOS Notes | Use verifier_time to detect client clock drift \> 30s. Alert user if drift detected. |

struct HealthResponse: Codable {

let verifier_time: String

let epoch_id: String

let status: String

}

**2.2 GET /v1/keys**

|  |  |
|----|----|
| **Endpoint** | GET /v1/keys |
| Purpose | Retrieve active verifier public signing keys for receipt verification. |
| Response | { keys: \[{ verifier_key_id, alg: "ed25519", public_key_base64, status, not_before, not_after }\] } |
| iOS Notes | Cache locally. Refresh on 404 during receipt verification. Reject receipts signed by revoked keys. |

**2.3 POST /v1/enroll**

|  |  |
|----|----|
| **Endpoint** | POST /v1/enroll |
| Purpose | Register device public key with verifier. Call once at first launch after Secure Enclave key generation. |
| Request | { device_public_key: Base64, device_attestation?: { format: "apple-appattest", payload: Base64 } } |
| Response | { enrolled: true, device_public_key: String, enrolled_at: ISO8601, epoch_id: String } |
| iOS Notes | Include App Attest attestation payload if available (recommended). Retry with exponential backoff on network failure. Store enrollment receipt in Keychain. |

struct EnrollRequest: Codable {

let device_public_key: String

let device_attestation: DeviceAttestation?

}

struct DeviceAttestation: Codable {

let format: String // "apple-appattest"

let payload: String // Base64

}

**2.4 GET /v1/nonce**

|  |  |
|----|----|
| **Endpoint** | GET /v1/nonce?device_public_key={key}&site_origin={origin} |
| Purpose | Request epoch-bound, single-use nonce for Pulse signing. |
| Request | Query params: device_public_key (required), site_origin (optional) |
| Response | { device_public_key, epoch, nonce: Base64, nonce_issued_at, nonce_expires_at, verifier_time, strict_window_seconds: 60, verifier_base_url, site_origin } |
| iOS Notes | Nonce expires in 60 seconds. Request nonce immediately before Pulse, not in advance. Single use — if Pulse submission fails, request a new nonce. |

struct NonceResponse: Codable {

let device_public_key: String

let epoch: String

let nonce: String // Base64

let nonce_issued_at: String

let nonce_expires_at: String

let verifier_time: String

let strict_window_seconds: Int

let verifier_base_url: String

let site_origin: String?

}

**2.5 POST /v1/pulse**

|  |  |
|----|----|
| **Endpoint** | POST /v1/pulse |
| Purpose | Submit signed daily Pulse attestation. Core protocol operation. |
| Request | { pulse_version: 1, device_public_key, epoch_id, nonce, client_confirmed_at, issued_at, biometric_success: true, signature: Base64, site_origin? } |
| Response | ReceiptV1 (see Section 3) |
| iOS Notes | Biometric must succeed BEFORE signing. Sign the canonical Pulse string with Secure Enclave key. If offline, queue for later submission. One Pulse per epoch — duplicate rejection returns HTTP 409. |

struct PulseRequest: Codable {

let pulse_version: Int // 1

let device_public_key: String

let epoch_id: String

let nonce: String

let client_confirmed_at: String

let issued_at: String

let biometric_success: Bool

let signature: String // Base64

let site_origin: String?

}

**2.6 GET /v1/status/{device_public_key}**

|  |  |
|----|----|
| **Endpoint** | GET /v1/status/{device_public_key} |
| Purpose | Query current continuity score, credits balance, and grace status. |
| Request | Path param: device_public_key (URL-encoded Base64) |
| Response | { continuity: { score, last_epoch_id, state, grace_remaining, bleed_active, cliff_epoch_id }, credits: { balance } } |
| iOS Notes | Cache response. Refresh on app foreground. Use cached value for UI display when offline. |

struct StatusResponse: Codable {

let continuity: ContinuityStatus

let credits: CreditsStatus

}

struct ContinuityStatus: Codable {

let score: Int

let last_epoch_id: String

let state: String // active\|abandoned

let grace_remaining: Int

let bleed_active: Bool

let cliff_epoch_id: String?

}

struct CreditsStatus: Codable {

let balance: Int

}

**2.7 GET /v1/verify/{device_public_key}**

|  |  |
|----|----|
| **Endpoint** | GET /v1/verify/{dpk}?threshold=N&site_origin={origin} |
| Purpose | Threshold verification for relying parties. iOS client does NOT typically call this — the relying party server does. |
| Request | Query params: threshold (int), site_origin (optional) |
| Response | { verified: Bool, score: Int, threshold: Int, epoch_id: String } |
| iOS Notes | Include in SDK for testing/debugging only. Production verification goes server-to-server. |

**2.8 POST /v1/burn**

|  |  |
|----|----|
| **Endpoint** | POST /v1/burn |
| Purpose | Burn presence credits for a relying party action. Triggered by QR scan. |
| Request | { device_public_key, amount: Int, site_origin, action_id: String, nonce, client_confirmed_at, issued_at, biometric_success: true, signature: Base64 } |
| Response | ReceiptV1 with receipt_type: burn_accept or burn_reject |
| iOS Notes | Biometric required before signing. Amount comes from QR payload. action_id is unique per burn attempt. Append burn receipt to local ledger hash chain. |

struct BurnRequest: Codable {

let device_public_key: String

let amount: Int

let site_origin: String

let action_id: String

let nonce: String

let client_confirmed_at: String

let issued_at: String

let biometric_success: Bool

let signature: String

}

**3. Receipt Schema**

Every Pulse and Burn submission returns a signed ReceiptV1. Store all receipts in the local ledger.

struct ReceiptV1: Codable {

let receipt_version: Int // 1

let receipt_id: String

let receipt_type: String // pulse_accept\|pulse_reject\|burn_accept\|burn_reject

let status: String

let device_public_key: String

let epoch_id: String

let nonce: String

let issued_at: String

let client_confirmed_at: String

let submit_received_at: String

let verifier_time: String

let strict_window_seconds: Int

let verifier_base_url: String

let site_origin: String?

let score_after: Int

let credits_after: Int

let delta_credits: Int

let prev_receipt_hash: String

let verifier_key_id: String

let receipt_hash: String // SHA256

let receipt_signature: String // Ed25519

}

**4. Migration Endpoints**

**4.1 POST /v1/migration/start**

|  |  |
|----|----|
| **Endpoint** | POST /v1/migration/start |
| Purpose | Initiate device migration. Called from NEW device. |
| Request | { new_device_public_key: Base64 } |
| Response | { migration_id, challenge_token, expires_at } |
| iOS Notes | New device generates fresh Secure Enclave key, then calls this. Share migration_id with old device via QR code. |

**4.2 POST /v1/migration/relinquish**

|  |  |
|----|----|
| **Endpoint** | POST /v1/migration/relinquish |
| Purpose | Old device signs relinquish statement. Called from OLD device. |
| Request | { migration_id, old_device_public_key, new_device_public_key, challenge_token, client_confirmed_at, issued_at, biometric_success: true, signature: Base64 } |
| Response | { acknowledged: true } |
| iOS Notes | Requires biometric on old device. Signs with old Secure Enclave key. Old device should display confirmation before signing. |

**4.3 POST /v1/migration/claim**

|  |  |
|----|----|
| **Endpoint** | POST /v1/migration/claim |
| Purpose | New device claims migration after old device relinquishes. Called from NEW device. |
| Request | { migration_id, new_device_public_key, challenge_token, client_confirmed_at, issued_at, biometric_success: true, signature: Base64 } |
| Response | { migration_complete: true, score_preserved: Int, credits_preserved: Int } |
| iOS Notes | Requires biometric on new device. Continuity fully preserved on normal migration. |

**4.4 GET /v1/migration/status/{migration_id}**

|  |  |
|----|----|
| **Endpoint** | GET /v1/migration/status/{id} |
| Purpose | Check migration progress. Poll from new device. |
| Response | { migration_id, status: pending\|relinquished\|claimed\|expired\|contested, expires_at } |
| iOS Notes | Poll every 5 seconds during migration ceremony. Timeout after 10 minutes. |

**5. Error Handling**

|  |  |  |  |
|----|----|----|----|
| **HTTP** | **Error Code** | **iOS Action** | **User Message** |
| 400 | invalid_request | Log + show error | Something went wrong. Please try again. |
| 401 | unauthorized | Re-enroll | Your device needs to be re-registered. |
| 403 | device_not_enrolled | Trigger enrollment | Setting up your device... |
| 409 | duplicate_pulse | Ignore (already pulsed) | You’ve already checked in today. |
| 410 | nonce_expired | Request new nonce + retry | (Silent retry — no user message) |
| 429 | rate_limited | Backoff + retry | Please wait a moment and try again. |
| 500 | internal_error | Retry with backoff | Server is temporarily unavailable. |
| 0 | network_unreachable | Queue for offline | You’re offline. We’ll sync when connected. |

enum HPPError: Error {

case invalidRequest(String)

case unauthorized

case deviceNotEnrolled

case duplicatePulse

case nonceExpired

case rateLimited(retryAfter: TimeInterval)

case serverError

case networkUnreachable

case signatureFailure

case biometricFailure

case secureEnclaveUnavailable

}

**6. Offline Queue Strategy**

— On network failure during Pulse submission: store signed Pulse in offline queue (max 7 entries = 7 days)

— On app foreground with connectivity: sync queue FIFO, oldest first

— Each queued Pulse needs a FRESH nonce before resubmission (old nonce expired)

— Re-sign with Secure Enclave using new nonce (biometric required again)

— If re-signing fails (e.g., biometric changed), discard the queued entry and log

— Burn operations are NOT queued offline — burns require real-time confirmation

**7. Rate Limit Handling**

// Exponential backoff with jitter

func retryDelay(attempt: Int) -\> TimeInterval {

let base = min(pow(2.0, Double(attempt)), 60.0)

let jitter = Double.random(in: 0...base \* 0.3)

return base + jitter

}

Rate limits per endpoint (requests/minute): health=60, keys=60, enroll=10, nonce=30, pulse=30, status=60, verify=120, burn=30.

**8. Cross-References**

— 04A_03: OpenAPI specification (authoritative schema definitions)

— 04A_17: Verifier API documentation (endpoint behavior details)

— 04A_14: Device Recovery protocol (migration ceremony details)

— 04A_18: Canonical Signing Strings (signing format specification)

— 04A_20: Ledger Architecture (local hash chain specification)

— 04B_04: iOS Platform Integration (Secure Enclave, App Attest)

— 04B_14: iOS Data Model Schemas (local storage structures)

— 04B_15: iOS Cryptographic Primitives (P-256, ECDSA, SHA-256)
