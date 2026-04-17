# Threat Model — Human Presence Protocol (HPP)

This document provides a detailed threat model for the Human Presence Protocol (HPP).

HPP establishes verifiable biological presence as a network primitive by binding biometric verification to secure hardware and time. The protocol does not attempt to solve all security problems. It explicitly targets scalable synthetic presence.

---

## 1. Assets

The following assets require protection:

- Integrity of Pulse attestations
- Integrity of device private keys
- Correctness of Epoch boundaries
- Accuracy of Continuity Score
- Privacy of biometric material
- Availability of Verifier Service

---

## 2. Adversary Classes

### A1: Automated Software Adversary

**Controls:** Commodity compute, botnets, cloud infrastructure

**Goal:** Generate large numbers of apparently human accounts.

### A2: Human-Assisted Farmer

**Controls:** Many low-cost devices, paid labor or coercion

**Goal:** Maintain many real-looking accounts.

### A3: Malware Operator

**Controls:** Compromised devices, privilege escalation

**Goal:** Extract keys, forge Pulses.

### A4: Hardware-Level Adversary

**Controls:** Physical device access, chip probing equipment

**Goal:** Break TEE isolation.

### A5: Network Attacker

**Controls:** Packet capture, replay, injection

**Goal:** Reuse Pulses, bypass verifier.

---

## 3. Trust Assumptions

HPP assumes:

- TEEs enforce non-exportable keys
- OS biometric APIs perform liveness checks
- Cryptographic primitives are secure
- Verifier Service is hardened

HPP does not assume:

- Tamper-proof hardware
- Spoof-proof biometrics
- Honest users

---

## 4. Attack Surfaces

- Enrollment
- Nonce issuance
- Pulse signing
- Pulse submission
- Continuity storage
- Query APIs

---

## 5. Threat Analysis

### 5.1 Key Extraction

Adversary attempts to extract device private key.

**Mitigation:** TEE non-exportable keys, hardware isolation.

**Residual Risk:** Advanced hardware attacks possible.

**Impact:** Single-device compromise, not scalable.

### 5.2 Replay Attacks

Adversary captures valid Pulse and resubmits.

**Mitigation:** Epoch-bound nonces, one Pulse per Epoch.

**Residual Risk:** Minimal.

### 5.3 Pulse Forgery

Adversary forges signature without TEE.

**Mitigation:** Strong cryptography, verifier signature validation.

**Residual Risk:** Cryptographic break required.

### 5.4 Multi-Device Farming

Adversary maintains many devices.

**Mitigation:** Hardware cost, daily biometric labor, slow accumulation, decay mechanics.

**Residual Risk:** Possible, but economically bounded.

### 5.5 Biometric Spoofing

Adversary fools biometric sensor.

**Mitigation:** Platform liveness detection, hardware sensor security.

**Residual Risk:** Platform-dependent.

### 5.6 Coercion

Adversary forces user to authenticate.

**Mitigation:** None. Out of scope.

### 5.7 Verifier Compromise

Adversary alters continuity state.

**Mitigation:** Hardened infrastructure, logging, monitoring, backups.

**Residual Risk:** Centralized trust point.

### 5.8 Denial of Service

Adversary floods verifier.

**Mitigation:** Rate limiting, caching, DDoS protection.

**Residual Risk:** Availability loss.

---

## 6. Privacy Threats

### Correlation Across Applications

**Mitigation:** Optional per-app keys, access controls.

### Biometric Leakage

**Mitigation:** Never transmitted, never stored outside device.

---

## 7. Security Properties

HPP provides:

- Proof of human presence
- Time-based continuity
- Economic resistance to scale

HPP does not provide:

- Identity
- Authorization
- Intent verification

---

## 8. Design Philosophy

HPP shifts the problem from:

> "Can we perfectly detect bots?"

To:

> "Can we make large-scale synthetic presence expensive?"

Security emerges from cost.

---

## 9. Recommendations for Implementers

- Do not weaken TEE requirements for convenience
- Do not allow silent biometric fallback to passcode
- Do not cache Pulses client-side beyond retry windows
- Do not trust client-reported time
- Do not expose Continuity Score to the client as authoritative

---

## 10. Open Questions

- Federation trust model under adversarial conditions
- Cross-platform TEE equivalence guarantees
- Long-term cryptographic agility path

These are active areas of research and will be addressed in future revisions.
