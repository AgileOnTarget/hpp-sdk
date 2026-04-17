# HPP Verifier API Specification v1

**Base URL:** `https://api.hpp.example`

All endpoints use TLS. All timestamps are Unix seconds unless noted. All responses are JSON with UTF-8 encoding.

---

## 1. Common Concepts

### 1.1 Epoch

The verifier defines epochs in UTC.

- `epoch_length_seconds`: 86400
- `epoch_id` format: `YYYY-MM-DD` in UTC

### 1.2 Strict Window

- `strict_window_seconds`: 60

The verifier rejects submissions whose critical timestamps exceed this window.

### 1.3 Site Origin Binding

If the relying party uses site binding:

- Client includes `site_origin`
- Verifier includes it in nonce and receipts
- Relying parties MUST enforce it

---

## 2. Error Format

All error responses use:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

Common error codes:

- `invalid_request`
- `unauthorized`
- `rate_limited`
- `nonce_expired`
- `nonce_used`
- `signature_invalid`
- `strict_window_violation`
- `epoch_mismatch`
- `device_not_enrolled`
- `internal_error`

---

## 3. Endpoints

### 3.1 Health

```
GET /v1/health
```

Response 200:

```json
{
  "status": "ok",
  "verifier_time": 1760142000,
  "epoch": { "epoch_id": "2026-02-06", "epoch_length_seconds": 86400 }
}
```

### 3.2 Public Keys

```
GET /v1/keys
```

Returns verifier signing public keys.

Response 200:

```json
{
  "keys": [
    {
      "verifier_key_id": "vkey_2026_01",
      "alg": "ed25519",
      "public_key_base64": "BASE64...",
      "status": "active",
      "not_before": 1760142000,
      "not_after": 1791678000
    }
  ]
}
```

Clients and relying parties select key by `verifier_key_id`.

### 3.3 Enrollment

```
POST /v1/enroll
```

Enrolls a device public key.

**Request:**

```json
{
  "device_public_key": "BASE64...",
  "device_attestation": {}
}
```

`device_attestation` is OPTIONAL in v1 but RECOMMENDED when available. If omitted, verifier MAY accept and mark device as un-attested.

**Response 200:**

```json
{
  "enrolled": true,
  "device_public_key": "BASE64...",
  "enrolled_at": 1760142000,
  "attestation_status": "verified",
  "epoch": { "epoch_id": "2026-02-06", "epoch_length_seconds": 86400 }
}
```

Possible `attestation_status`: `verified`, `unverified`, `unsupported`.

### 3.4 Nonce Issuance

```
GET /v1/nonce?device_public_key=BASE64...&site_origin=https://demo.example.com
```

**Parameters:**

- `device_public_key` — REQUIRED
- `site_origin` — OPTIONAL but RECOMMENDED if using site binding

**Response 200:**

```json
{
  "device_public_key": "BASE64...",
  "epoch": { "epoch_id": "2026-02-06", "epoch_length_seconds": 86400 },
  "nonce": "NONCE_BASE64...",
  "nonce_issued_at": 1760142320,
  "nonce_expires_at": 1760142380,
  "verifier_time": 1760142320,
  "strict_window_seconds": 60,
  "verifier_base_url": "https://api.hpp.example",
  "site_origin": "https://demo.example.com"
}
```

Errors: `device_not_enrolled`, `rate_limited`.

### 3.5 Pulse Submission

```
POST /v1/pulse
```

The client submits a Pulse signed by the device key.

**Request:**

```json
{
  "device_public_key": "BASE64...",
  "epoch_id": "2026-02-06",
  "nonce": "NONCE_BASE64...",
  "client_confirmed_at": 1760142325,
  "issued_at": 1760142327,
  "biometric_success": true,
  "signature": "BASE64...",
  "site_origin": "https://demo.example.com"
}
```

`signature` is over the canonical Pulse signing string defined by the client SDK spec. `client_confirmed_at` is captured at biometric success. `issued_at` is when the client assembled the submission.

**Response 200 (accepted):**

```json
{
  "status": "accepted",
  "receipt": {
    "receipt_id": "rcpt_01HPP...",
    "receipt_type": "pulse_accept",
    "status": "accepted",
    "epoch_id": "2026-02-06",
    "score_after": 47,
    "credits_after": 12,
    "delta_credits": 1,
    "receipt_hash": "SHA256...",
    "receipt_signature": "BASE64...",
    "verifier_key_id": "vkey_2026_01"
  }
}
```

**Response 200 (rejected):**

```json
{
  "status": "rejected",
  "rejection_reason": "strict_window_violation",
  "receipt": { ... }
}
```

Errors: `nonce_expired`, `nonce_used`, `epoch_mismatch`, `signature_invalid`, `strict_window_violation`.

### 3.6 Status Query

```
GET /v1/status/{device_public_key}?site_origin=https://demo.example.com
```

**Response 200:**

```json
{
  "device_public_key": "BASE64...",
  "verifier_time": 1760142400,
  "epoch": { "epoch_id": "2026-02-06", "epoch_length_seconds": 86400 },
  "continuity": {
    "score": 47,
    "last_pulse_epoch": "2026-02-06",
    "grace_remaining": 3,
    "state": "active"
  },
  "credits": {
    "balance": 12,
    "last_accrual_epoch": "2026-02-06"
  }
}
```

### 3.7 Threshold Verification for Relying Parties

```
GET /v1/verify/{device_public_key}?threshold=30&site_origin=https://demo.example.com
```

**Response 200:**

```json
{
  "device_public_key": "BASE64...",
  "threshold": 30,
  "meets_threshold": true,
  "score": 47,
  "verifier_time": 1760142400,
  "verifier_base_url": "https://api.hpp.example",
  "site_origin": "https://demo.example.com"
}
```

### 3.8 Burn Credits

```
POST /v1/burn
```

**Request:**

```json
{
  "device_public_key": "BASE64...",
  "credits_to_burn": 2,
  "site_origin": "https://demo.example.com",
  "action_reference": "post_link_12345",
  "signature": "BASE64..."
}
```

**Response 200:**

```json
{
  "status": "accepted",
  "receipt": {
    "receipt_id": "rcpt_02HPP...",
    "receipt_type": "burn_accept",
    "status": "accepted",
    "credits_after": 10,
    "delta_credits": -2,
    "receipt_hash": "SHA256...",
    "receipt_signature": "BASE64...",
    "verifier_key_id": "vkey_2026_01"
  }
}
```

---

## 4. Rate Limiting

All endpoints are rate-limited. Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1760142600
```

When rate-limited, the verifier returns HTTP 429 with error code `rate_limited`.

---

## 5. Versioning

All endpoints are prefixed with `/v1/`. Future versions will use `/v2/`, etc. The verifier SHOULD support multiple versions concurrently during migration periods.

---

## 6. Security Requirements

- All communication MUST use TLS 1.2 or higher
- Certificate pinning is RECOMMENDED for mobile clients
- Nonces MUST be single-use and short-lived
- Receipts MUST be signed and verifiable
- The verifier MUST NOT log raw biometric data (it never receives any)

---

## 7. Summary

This API is minimal by design. Eight endpoints cover the complete lifecycle: health, keys, enrollment, nonce, pulse, status, verify, and burn.

Every state-changing operation produces a signed receipt. Every receipt is independently verifiable.
