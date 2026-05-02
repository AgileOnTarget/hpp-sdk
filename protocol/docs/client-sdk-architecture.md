# Client SDK Architecture — Human Presence Protocol (HPP)

This document describes the recommended architecture for the HPP Client SDK.

The SDK's responsibility is to produce valid Pulses using secure hardware and OS biometric gating, and to submit them to a Verifier Service with minimal privacy leakage.

The SDK is not an identity system. The SDK is not an authentication framework. The SDK implements presence.

---

## 1. Goals

- Generate device-bound keys inside secure hardware
- Gate Pulse signing behind successful biometric verification
- Bind Pulses to verifier-issued nonces and server-defined epochs
- Minimize data collection
- Provide deterministic, testable behavior
- Support offline and degraded connectivity without breaking security

---

## 2. Non-Goals

- User identity
- Account recovery beyond device migration protocols
- Reputation systems
- Social graph features
- Token economics logic

---

## 3. High-Level Components

The SDK is composed of:

- Secure Key Manager
- Biometric Gate
- Epoch Client
- Pulse Builder
- Network Client
- Local State Store
- Policy Engine
- Observability Hooks

---

## 4. Component Responsibilities

### 4.1 Secure Key Manager

Responsibilities:

- Create device key pair inside secure hardware
- Enforce non-exportability
- Provide a `Sign()` operation that cannot be invoked without biometric gating

**iOS:** Secure Enclave keys via Keychain + access control. Private key never exported. Prefer keys requiring user presence.

**Android:** StrongBox / hardware-backed Keystore when available. Enforce user authentication requirements for key use.

Outputs: `device_public_key`, `key_handle`, attestation evidence (if supported).

### 4.2 Biometric Gate

Responsibilities:

- Trigger OS biometric prompt
- Return success or failure
- Prevent silent fallback to passcode when policy forbids it

**Design rule:** Biometric success must be required for Pulse signing. If platform allows alternate unlock methods, SDK policy MUST define allowed modes.

Outputs: `biometric_result` (success/failure), `biometric_mode` (face/fingerprint/other).

### 4.3 Epoch Client

Responsibilities:

- Fetch server epoch definition and current epoch ID
- Fetch verifier nonce bound to the current epoch
- Enforce epoch window constraints

**Caching:** Cache epoch config briefly. Cache nonce only for a short time window.

Outputs: `epoch_id`, `nonce`, `verifier_time` (optional), strict window parameters (optional).

### 4.4 Pulse Builder

Responsibilities:

- Construct canonical Pulse payload
- Bind Pulse to: `device_public_key`, `epoch_id`, `nonce`, server time fields, `biometric_success` flag
- Create a deterministic signing string and sign in secure hardware

Output: `pulse_payload`, `signature`.

### 4.5 Network Client

Responsibilities:

- Submit Pulse to verifier
- Query continuity status for UI or relying-party flows
- Handle retries safely without creating replay vulnerabilities

**Security:** All requests over TLS. Pinning optional but recommended in early pilots.

### 4.6 Local State Store

Responsibilities: Store only what is necessary for UX continuity indicators, offline-mode support, and reducing repeated prompts.

**Must not store:** Raw biometric material or any sensitive OS biometric artifacts.

**Recommended stored fields:**

- `device_public_key`
- `last_successful_epoch_id`
- `last_submission_time`
- `local_cached_score` (non-authoritative)
- `verifier_base_url`
- `site_origin` bindings (if used for receipts)

**Storage guidance:**

- iOS: Keychain for sensitive fields
- Android: EncryptedSharedPreferences / Keystore-sealed blobs

### 4.7 Policy Engine

Responsibilities:

- Define when a Pulse attempt is allowed
- Enforce cooldowns between attempts
- Handle rate limiting responses from verifier
- Define biometric fallback policy
- Manage retry behavior

### 4.8 Observability Hooks

Responsibilities:

- Emit structured events for debugging and telemetry
- No PII in events
- No biometric data in events

Events should include: Pulse attempt, Pulse success, Pulse failure (with error code), network failure, biometric failure, epoch sync.

---

## 5. Security Invariants

- Private key MUST NOT leave secure hardware
- Pulse signing MUST require biometric success
- Nonce MUST be fresh and epoch-bound
- No Pulse data MUST be cached beyond retry window
- Client MUST NOT trust its own clock for epoch determination

---

## 6. Offline Behavior

When the device is offline:

- Biometric verification can still occur
- Pulse is constructed and signed locally
- Pulse is queued for submission when connectivity returns
- Queue depth is bounded
- Queued Pulses that exceed epoch window are discarded

---

## 7. Error Handling

All errors must be explicit and deterministic.

- Invalid nonce → re-fetch
- Expired epoch → re-sync
- Biometric failure → no Pulse
- Network failure → queue with bounded retry
- Verifier rejection → surface error code from Error Code Registry

---

## 8. Testing Strategy

- Unit tests for each component in isolation
- Integration tests for full Pulse lifecycle
- Mock Verifier for offline testing
- Platform-specific TEE integration tests
- Adversarial tests: replay, skew, forgery, offline overflow

---

## 9. Platform Abstraction

The SDK should define a platform-neutral interface with platform-specific implementations:

```
interface HPPClient {
  enroll() → DeviceRegistration
  pulse() → PulseResult
  status() → ContinuityStatus
}
```

iOS and Android implementations conform to this interface while using platform-native secure hardware APIs.

---

## 10. Philosophy

The SDK is a thin wrapper around secure hardware and a network client.

It should be boring, auditable, and correct.

Clever abstractions are the enemy of security review.
