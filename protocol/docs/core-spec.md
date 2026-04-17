# Human Presence Protocol (HPP) — Core Specification (Layer 8)

**Version 1.0**

---

## Abstract

The Human Presence Protocol (HPP) specifies a hardware-rooted method for establishing verifiable biological continuity in digital systems. HPP defines a cryptographic primitive called a **Pulse**, generated only after successful biometric verification inside trusted hardware and bound to a server-defined time epoch. Pulses accumulate into a **Continuity Score**, a monotonically increasing measure of sustained human presence over time. HPP introduces deterministic decay mechanics that ensure trust is perishable and must be continuously maintained.

HPP operates as a foundational network layer (Layer 8) that provides proof of presence, not identity.

---

## 1. Goals

- Provide cryptographic proof that a real human is operating a device over time
- Make large-scale synthetic presence economically prohibitive
- Preserve privacy by avoiding biometric transmission
- Remain identity-agnostic
- Be implementable across platforms and jurisdictions

---

## 2. Non-Goals

HPP does NOT attempt to:

- Establish legal identity
- Provide authentication or authorization frameworks
- Detect intent, morality, or behavior
- Prevent coercion

HPP proves presence only.

---

## 3. Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119.

- **Pulse:** A cryptographically signed attestation generated after successful biometric verification inside trusted hardware.
- **Epoch:** A verifier-defined UTC time window during which at most one Pulse may be credited.
- **Continuity Score:** A non-negative integer representing the number of unique epochs in which valid Pulses were accepted.
- **Grace Buffer:** A finite number of missed epochs during which the score does not decay.
- **Bleed:** Deterministic decrement of Continuity Score after Grace Buffer exhaustion.
- **Epoch Cliff:** The final inactivity threshold after which continuity is reset.
- **Primary Device:** The single device authorized to generate Pulses for a continuity record.

---

## 4. System Model

HPP consists of three roles:

- **Client Device**
- **Verifier Service**
- **Relying Party**

The Verifier Service is authoritative for continuity state.

---

## 5. Cryptographic Primitives

- Secure hardware key pair generated inside TEE / Secure Enclave
- SHA-256 hashing
- Verifier signature scheme (e.g., Ed25519 or equivalent)

Private device keys MUST be non-exportable.

---

## 6. Pulse Construction

A Pulse MUST contain:

- `device_public_key`
- `epoch_id`
- `verifier_nonce`
- `client_confirmed_at` timestamp
- `issued_at` timestamp
- `biometric_success` flag

The device signs a canonical Pulse string with its private key.

---

## 7. Pulse Acceptance Rules

The Verifier MUST:

- Validate signature using `device_public_key`
- Validate nonce freshness and single use
- Validate `epoch_id`
- Enforce strict window timing
- Enforce one Pulse per device per epoch

If any check fails, the Pulse is rejected.

---

## 8. Continuity Calculus

Let:

- `S` = Continuity Score
- `E(n)` = current epoch

### 8.1 Increment

If a valid Pulse is accepted in `E(n)` and last accepted Pulse was in `E(n-1)`:

```
S = S + 1
```

### 8.2 Grace

If no Pulse is received: system enters Grace state. `S` remains unchanged. Grace length is verifier-defined.

### 8.3 Bleed

After Grace exhaustion, for each empty epoch:

```
S = max(S − 1, 0)
```

### 8.4 Epoch Cliff

After a verifier-defined number of consecutive empty epochs:

```
S = 0
```

Device binding is considered abandoned.

---

## 9. Monotonic Property

`S` can increase only through valid Pulses. `S` MUST NOT increase through any other mechanism.

---

## 10. Credits (Optional Extension)

Verifiers MAY issue non-transferable credits alongside Pulses.

Credits are:

- Accrued on accepted Pulses
- Burned for relying party actions
- Not transferable between users

Credits are orthogonal to Continuity Score.

---

## 11. Privacy Requirements

- Raw biometric data MUST NOT leave the device
- Verifier receives only cryptographic attestations
- No identity fields are required

---

## 12. Device Binding

Each continuity record has exactly one Primary Device.

- Only the Primary Device may generate Pulses
- Device migration requires explicit protocol (see RECOVERY.md)
- Parallel device operation is prohibited

---

## 13. Receipt Model

The Verifier MUST issue a signed receipt for every Pulse submission (accepted or rejected).

Receipts MUST follow the canonical format defined in CANONICAL_SIGNING_STRINGS.md.

Receipts enable:

- Client-side verification
- Relying party verification
- Audit trails
- Tamper detection

---

## 14. Failure Modes

- Device offline → no Pulse → decay begins after Grace
- Verifier unavailable → Pulse submission fails → decay
- Clock skew → nonce rejection
- Biometric failure → no Pulse generated

Failures bias toward loss of continuity rather than false continuity.

---

## 15. Security Considerations

- TEE isolation is the primary trust anchor
- Biometric gating prevents remote key use
- Epoch binding prevents replay
- Nonce binding prevents pre-computation
- Economic cost of sustained presence prevents farming at scale

See THREAT_MODEL.md for detailed analysis.

---

## 16. Extensibility

Future versions may add:

- Zero-knowledge threshold proofs
- Multi-device continuity
- Federated verifiers
- Cryptographic agility negotiation

All extensions MUST preserve the core invariant: **one human, one device, one Pulse per epoch.**

---

## 17. Conformance

An implementation conforms to HPP if it:

- Generates Pulses only after biometric verification in secure hardware
- Signs Pulses with non-exportable device keys
- Submits Pulses to a Verifier that enforces epoch and nonce rules
- Implements the Continuity Calculus as defined in Section 8
- Issues receipts following the canonical format

---

## 18. References

- CANONICAL_SIGNING_STRINGS.md — Deterministic encoding rules
- RECEIPT_CANONICALIZATION.md — Receipt format specification
- KEYS.md — Verifier key management and Genesis Epoch
- RECOVERY.md — Device migration and recovery
- THREAT_MODEL.md — Security analysis
- ARCHITECTURE.md — System architecture overview
