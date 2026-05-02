# Reference Verifier Architecture — Human Presence Protocol

This document describes a reference architecture for an HPP Verifier Service. It is intended to be implementable, scalable, and auditable, while keeping the protocol surface area small.

The Verifier is the continuity truth source. Clients and relying parties may cache, but the verifier is authoritative.

---

## 1. Responsibilities

The Verifier Service MUST:

- Issue epoch-bound nonces
- Verify Pulse signatures
- Enforce one Pulse per device per epoch
- Maintain continuity state and deterministic decay
- Issue verifier-signed receipts
- Answer threshold queries for relying parties
- Provide audit logs without leaking sensitive data

The Verifier Service MUST NOT:

- Receive or store raw biometric data
- Attempt identity resolution
- Infer intent or behavior

---

## 2. High-Level Components

A reference verifier has six components:

- **API Gateway**
- **Nonce Service**
- **Verification Engine**
- **Continuity Store**
- **Receipt Service**
- **Query Service**

Optional but recommended:

- Telemetry and Audit Pipeline
- Key Management Service

---

## 3. Data Model

### 3.1 Device Record

Keyed by `device_public_key`.

**Fields:**

- `device_public_key`
- `enrolled_at`
- `last_epoch_id`
- `continuity_score`
- `credits_balance`
- `grace_remaining`
- `bleed_active` (boolean)
- `cliff_deadline_epoch_id`
- `last_receipt_hash` (optional)
- `status` (`active` or `abandoned`)
- `updated_at`

### 3.2 Nonce Record

Keyed by `nonce`.

**Fields:**

- `nonce`
- `device_public_key`
- `epoch_id`
- `issued_at`
- `expires_at`
- `used` (boolean)

Nonce records MAY be stored in a fast cache if replay resistance is preserved.

### 3.3 Receipt Record

Keyed by `receipt_id`.

**Fields:**

- `receipt_id`
- `receipt_hash`
- `receipt_signature`
- `device_public_key`
- `epoch_id`
- `site_origin`
- `verifier_key_id`
- `created_at`

Receipts are append-only truth artifacts.

---

## 4. Core Services

### 4.1 API Gateway

**Responsibilities:**

- TLS termination
- Authentication of relying parties (if needed)
- Rate limiting and abuse controls
- Request validation and normalization

Endpoints are split into:

- Client endpoints
- Relying party endpoints
- Admin and operations endpoints

### 4.2 Nonce Service

**Responsibilities:**

- Define epoch boundaries
- Issue epoch-bound nonces
- Prevent replay through nonce uniqueness and single use
- Enforce strict window parameters

Nonce MUST be bound to:

- `device_public_key`
- `epoch_id`
- `verifier_base_url`
- `site_origin` (when used)

Nonce expiry MUST be short. Typical: 60 seconds.

### 4.3 Verification Engine

**Responsibilities:**

- Validate request shape
- Verify device signature
- Validate nonce freshness and binding
- Enforce strict window rules
- Apply continuity calculus deterministically
- Produce an accept or reject decision

**Verification steps:**

1. Parse submission
2. Look up nonce record
3. Ensure nonce is unused and unexpired
4. Verify signature against `device_public_key`
5. Validate `epoch_id` matches current epoch
6. Enforce strict window on timestamps
7. Apply continuity calculus
8. Mark nonce as used
9. Update device record
10. Generate receipt

If any step fails, reject and issue a rejection receipt.

### 4.4 Continuity Store

**Responsibilities:**

- Store device records
- Apply increment, grace, bleed, and cliff logic
- Ensure atomic updates

**Recommended storage:**

- PostgreSQL or equivalent ACID-compliant database for device records
- Redis or equivalent for nonce cache (with TTL-based expiry)

**Scaling:**

- Shard by `device_public_key` hash
- Read replicas for query endpoints
- Write path is low-frequency (one Pulse per device per day)

### 4.5 Receipt Service

**Responsibilities:**

- Construct canonical receipt string
- Compute `receipt_hash`
- Sign with verifier private key
- Store receipt record
- Return receipt to client

Receipts are the audit trail. They MUST be append-only.

### 4.6 Query Service

**Responsibilities:**

- Answer status queries for clients
- Answer threshold queries for relying parties
- Enforce site origin binding on queries

Query endpoints are read-heavy and can be served from read replicas.

---

## 5. Key Management

- Verifier signing keys stored in HSM or cloud KMS
- Key rotation per KEYS.md
- Key manifest published at `/v1/keys`
- Receipts include `verifier_key_id` for key selection

---

## 6. Epoch Management

- Epochs are UTC-day-aligned by default (86400 seconds)
- Epoch boundaries are server-authoritative
- Client clocks are not trusted
- Verifier exposes `/v1/health` with current `verifier_time` and `epoch`

---

## 7. Decay Processing

Decay can be computed lazily or eagerly:

**Lazy (recommended):** Compute decay at query time or next Pulse submission. No background jobs needed for most deployments.

**Eager:** Background job scans device records and applies decay. Required only at very large scale or if real-time score accuracy is needed for external queries.

---

## 8. Audit and Telemetry

**Recommended events to log:**

- Enrollment success/failure
- Nonce issuance
- Pulse accept/reject (with reason)
- Burn accept/reject
- Threshold query
- Key rotation events
- Decay applied
- Epoch cliff reset

**Privacy rule:** No biometric data in logs. No identity fields. Device public keys are pseudonymous.

---

## 9. Scalability Profile

HPP has a favorable scaling profile:

- **Write frequency:** At most one Pulse per device per day
- **Read frequency:** Threshold queries from relying parties (potentially high)
- **Storage growth:** One device record + one receipt per day per device

For 1 billion devices:

- ~1 billion device records
- ~1 billion receipts per day (append-only, archivable)
- Write QPS: ~12,000 (1B / 86400)
- Read QPS: depends on relying party query volume

This is well within the capabilities of sharded PostgreSQL + Redis.

---

## 10. Deployment Recommendations

- Containerized deployment (Docker/Kubernetes)
- Horizontal scaling via stateless API nodes
- Database sharding by device key hash
- HSM or cloud KMS for signing keys
- Geographic distribution for latency (optional)

---

## 11. Summary

The verifier is simple by design. Six components, one write per device per day, append-only receipts.

Complexity lives in the protocol rules, not in the infrastructure. That is intentional.
