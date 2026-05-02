**HPP iOS CLIENT**

**DATA MODEL SCHEMAS**

*Human Presence Protocol*

|                    |                                          |
|:-------------------|:-----------------------------------------|
| **Document ID**    | 03-23                                    |
| **Title**          | HPP iOS Client Data Model Schemas        |
| **Version**        | 2.0                                      |
| **Status**         | Canonical                                |
| **Scope**          | MVP iOS Client — Local Data Structures   |
| **Date**           | February 2026                            |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward |

**CONFIDENTIAL**

**1. Purpose**

This document defines the canonical local data schemas used by the HPP iOS client. These schemas are implementation-neutral: they specify the logical structure, types, constraints, and validation rules that any conforming implementation must follow exactly. Deviation from these schemas produces a non-conforming client.

Every schema maps to Protocol Invariants (02-02), patent families (01-02 through 01-12), and related VDR documents. Every field has a defined type, a required/optional designation, and constraints that enforce protocol guarantees at the data layer.

|  |
|----|
| **Design Rule:** Every schema includes a schema_version field as the first logical field. This field is read before any other field. If the version is unrecognized, the client refuses to parse the remaining data. This prevents silent reinterpretation under changed semantics (see 03-22 Backward Compatibility Policy). |

**2. Schema Overview**

|  |  |  |  |  |
|:---|:--:|:--:|:---|:---|
| **Schema** | **Version** | **Fields** | **Storage** | **Key Invariants** |
| **Device Identity** | 1 | 8 | Keychain (SE-bound) | I-1, I-2 |
| **Pulse Record** | 1 | 9 | Keychain (encrypted) | I-1, I-2, I-3, I-5 |
| **Burn Record** | 1 | 11 | Keychain (encrypted) | I-4, I-5, I-7 |
| **Receipt** | 1 | 8 | Keychain (encrypted) | I-6, I-7 |
| **Credits Ledger** | 1 | 8 | Keychain (HMAC-signed) | I-9, I-13 |
| **Offline Queue Entry** | 1 | 7 | Keychain (encrypted) | I-10 |
| **Hash Chain Entry** | 1 | 6 | Keychain (encrypted) | I-4, I-7 |

**3. Device Identity Record**

The device identity record is created once during initial registration and persists for the lifetime of the device-app-biometric enrollment tuple. It is the root of trust for all other schemas.

|  |  |
|:---|:---|
| **Storage** | Keychain: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly. Non-migratable. Non-exportable. |
| **Invariants** | I-1 (Hardware Binding), I-2 (Biometric Gating) |
| **Patents** | Family A (Hardware-Bound Presence Attestation), Family H (Cross-Platform Attestation Bridging) |
| **VDR Refs** | 03-05, 03-06, 03-24, 01-02-A |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. Unknown version → refuse to parse. |
| **device_id** | UUID v4 | **Yes** | Generated once at registration. Never changes. Not derived from hardware identifiers. |
| **public_key_id** | String | **Yes** | Identifier for the SE keypair. Used to reference the key in CryptoKit operations. |
| **public_key** | Base64 | **Yes** | SEC1 compressed P-256 public key. Exported from SE for registration with verifier. |
| **app_attest_key_id** | String | **Yes** | DCAppAttestService key identifier. Used for attestation and assertion. |
| **attestation_object** | Base64 | **Yes** | App Attest attestation object from initial key attestation. Sent to verifier at registration. |
| **created_at** | Int64 | **Yes** | Unix epoch seconds. Timestamp of initial registration. |
| **biometric_generation** | Int | **Yes** | Increments when biometric enrollment changes. SE key invalidated on change (Apple behavior). |

|  |
|----|
| **Invariant Enforcement:** The SE private key never appears in this schema. It exists only inside the Secure Enclave and is referenced by public_key_id. If the private key were exportable, I-1 (Hardware Binding) would be violated. |

**4. Pulse Record**

A pulse record represents a single biometric-gated presence attestation. Each pulse is signed by the Secure Enclave and submitted to the verifier. Pulses are the atomic unit of presence accumulation.

|  |  |
|:---|:---|
| **Storage** | Keychain: encrypted at rest. Retained for audit trail. Pruned after configurable retention window. |
| **Invariants** | I-1 (Hardware Binding), I-2 (Biometric Gating), I-3 (Server-Time Authority), I-5 (Non-Parallelizable) |
| **Patents** | Family A, Family B (Server-Time Authoritative Epochs), Family D (Non-Transferable Continuity) |
| **VDR Refs** | 03-03, 03-05, 03-24, 02-05 |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. |
| **pulse_id** | UUID v4 | **Yes** | Unique per pulse. Generated client-side. |
| **device_id** | UUID v4 | **Yes** | FK → Device Identity Record. Must match registered device. |
| **epoch** | Int64 | **Yes** | Server-issued epoch number. Obtained from /time endpoint. Client clock not used. |
| **timestamp** | Int64 | **Yes** | Unix epoch seconds. Server-authoritative. Obtained alongside epoch. |
| **nonce** | String | **Yes** | Cryptographic nonce. Unique per pulse. Prevents replay. |
| **public_key_id** | String | **Yes** | FK → Device Identity Record. Identifies signing key. |
| **signature** | Base64 | **Yes** | ECDSA P-256 signature over (pulse_id \| epoch \| timestamp \| nonce \| device_id). Signed by SE. |
| **submitted** | Bool | **Yes** | False until verifier acknowledges. Used by offline queue logic. |

**5. Burn Record**

A burn record represents a single presence-credit expenditure bound to a relying party session. Burns are atomic, non-reversible, and hash-chained for provenance.

|  |  |
|:---|:---|
| **Storage** | Keychain: encrypted at rest. Retained permanently (audit trail). Hash chain provides tamper evidence. |
| **Invariants** | I-4 (Non-Transferability), I-5 (Non-Parallelizable), I-7 (Replay Resistance), I-9 (Monotonic Accumulation) |
| **Patents** | Family A, Family E (Presence-Gated Access Control), Family F (Offline Queue) |
| **VDR Refs** | 03-03, 03-04, 03-15, 03-24, 02-05 |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. |
| **burn_id** | UUID v4 | **Yes** | Unique per burn. Generated client-side. |
| **device_id** | UUID v4 | **Yes** | FK → Device Identity Record. |
| **session_id** | String | **Yes** | From QR payload. Binds burn to specific RP session. Prevents cross-session replay. |
| **verifier_url** | String (URL) | **Yes** | From QR payload. HTTPS required. Validated before use. |
| **credits_spent** | Int | **Yes** | Number of credits consumed. Must be ≥ 1. Debited atomically from ledger. |
| **epoch** | Int64 | **Yes** | Server-issued epoch at time of burn. |
| **timestamp** | Int64 | **Yes** | Server-authoritative timestamp. |
| **nonce** | String | **Yes** | Unique per burn. Prevents replay at verifier. |
| **previous_burn_hash** | Hex (SHA-256) | **Yes** | SHA-256 of previous burn record. Genesis burn uses zero hash. Creates tamper-evident chain. |
| **signature** | Base64 | **Yes** | ECDSA P-256 over (burn_id \| session_id \| credits_spent \| epoch \| nonce \| previous_burn_hash). SE-signed. |

**6. Receipt**

A receipt is the verifier’s confirmation that a burn was valid. It is the terminal artifact in the burn › receipt › verify › unlock flow. Receipts are opaque to the relying party — they contain no PII.

|  |  |
|:---|:---|
| **Storage** | Keychain: encrypted at rest. Short-lived. Pruned after confirmation displayed to user. |
| **Invariants** | I-6 (Deterministic Output), I-7 (Replay Resistance), I-11 (Confidentiality) |
| **Patents** | Family E (Presence-Gated Access Control) |
| **VDR Refs** | 03-03, 03-10, 02-05 |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. |
| **receipt_id** | UUID v4 | **Yes** | Unique per receipt. Assigned by verifier. |
| **burn_id** | UUID v4 | **Yes** | FK → Burn Record. Links receipt to the burn it validates. |
| **session_id** | String | **Yes** | Must match burn’s session_id. Cross-validated. |
| **result** | Bool | **Yes** | Deterministic: true (human present) or false (validation failed). No confidence scores. |
| **verifier_signature** | Base64 | **Yes** | Verifier’s ECDSA signature over receipt payload. Allows independent verification. |
| **issued_at** | Int64 | **Yes** | Server-authoritative timestamp of verification. |
| **site_origin** | String | **Yes** | Relying party origin (e.g., example.com). For display and audit only. |

**7. Credits Ledger**

The credits ledger tracks the client’s accumulated presence balance. It is HMAC-signed for tamper evidence and enforces monotonic accumulation (credits can only increase via valid pulses or decrease via valid burns).

|  |  |
|:---|:---|
| **Storage** | Keychain: HMAC-signed with device-bound key. Encrypted at rest. Single instance per device. |
| **Invariants** | I-9 (Monotonic Accumulation), I-13 (Decay Enforcement) |
| **Patents** | Family D (Non-Transferable Continuity), Family E (Presence-Gated Access Control) |
| **VDR Refs** | 03-03, 02-02, 02-05 |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. |
| **balance** | Int | **Yes** | Current credit count. ≥ 0. Incremented by verified pulse, decremented by burn. |
| **total_earned** | Int | **Yes** | Lifetime credits earned. Monotonically increasing. Never decremented. |
| **total_spent** | Int | **Yes** | Lifetime credits burned. Monotonically increasing. balance = total_earned − total_spent − decay. |
| **last_pulse_epoch** | Int64 | **Yes** | Epoch of most recent verified pulse. Used for decay calculation. |
| **last_burn_epoch** | Int64 | **Yes** | Epoch of most recent burn. Zero if no burns. |
| **decay_applied** | Int | **Yes** | Total credits lost to absence decay. Monotonically increasing. |
| **ledger_signature** | Base64 | **Yes** | HMAC-SHA256 over all fields. Key derived from SE. Tamper detection. |

|  |
|----|
| **Validation Rule:** balance must always equal total_earned − total_spent − decay_applied. If this invariant fails, the ledger is corrupted and the client must refuse all operations until re-sync with verifier. |

**8. Offline Queue Entry**

Offline queue entries represent attestation intents (pulses or burns) that were created while the device had no network connectivity. They are signed at creation time and submitted when connectivity returns. Entries expire after 7 days.

|  |  |
|:---|:---|
| **Storage** | Keychain: encrypted at rest. Pruned on successful submission or expiration. |
| **Invariants** | I-10 (Graceful Degradation) |
| **Patents** | Family F (Offline Queue and Temporal Tolerance) |
| **VDR Refs** | 03-03, 03-06, 02-05 |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. |
| **entry_id** | UUID v4 | **Yes** | Unique per queue entry. |
| **entry_type** | Enum | **Yes** | "pulse" or "burn". Determines processing path on submission. |
| **payload** | Base64 | **Yes** | Serialized and signed pulse or burn record. Opaque blob until submission. |
| **payload_hash** | Hex (SHA-256) | **Yes** | Integrity check. Computed at enqueue time. Verified before submission. |
| **created_at** | Int64 | **Yes** | Unix epoch seconds when entry was enqueued. |
| **expires_at** | Int64 | **Yes** | created_at + (7 \* 86400). Entry is pruned if not submitted before expiry. |

**9. Hash Chain Entry**

The hash chain provides tamper-evident provenance for burn records. Each entry links to the previous entry via SHA-256 hash, creating an append-only log that cannot be rewritten without detection.

|                |                                                         |
|:---------------|:--------------------------------------------------------|
| **Storage**    | Keychain: encrypted at rest. Append-only. Never pruned. |
| **Invariants** | I-4 (Non-Transferability), I-7 (Replay Resistance)      |
| **Patents**    | Family D (Non-Transferable Continuity)                  |
| **VDR Refs**   | 03-03, 02-05                                            |

|  |  |  |  |
|:---|:---|:--:|:---|
| **Field** | **Type** | **Required** | **Constraints / Notes** |
| **schema_version** | Int | **Yes** | Current: 1. Read first. |
| **chain_index** | Int | **Yes** | Sequential index. 0-based. Monotonically increasing. |
| **burn_id** | UUID v4 | **Yes** | FK → Burn Record. One chain entry per burn. |
| **entry_hash** | Hex (SHA-256) | **Yes** | SHA-256 of (chain_index \| burn_id \| previous_hash \| timestamp). |
| **previous_hash** | Hex (SHA-256) | **Yes** | Hash of prior entry. Genesis entry uses 64 zero bytes. |
| **timestamp** | Int64 | **Yes** | Server-authoritative timestamp of the burn. |

**10. Cross-Schema Validation Rules**

The following validation rules span multiple schemas and must be enforced at every read and write operation:

|  |  |  |  |
|:--:|:---|:---|:---|
| **ID** | **Rule** | **Enforcement** | **Invariant** |
| **V-01** | **burn.device_id must match identity.device_id** | Reject burn if mismatch. Prevents cross-device replay. | I-1, I-4 |
| **V-02** | **burn.credits_spent ≤ ledger.balance** | Reject burn if insufficient credits. Atomic check. | I-9 |
| **V-03** | **burn.epoch ≥ ledger.last_burn_epoch** | Reject burn if epoch regression. Time moves forward. | I-3 |
| **V-04** | **burn.previous_burn_hash matches chain head** | Reject burn if hash chain broken. Tamper detection. | I-7 |
| **V-05** | **pulse.epoch ≥ ledger.last_pulse_epoch** | Reject pulse if epoch regression. | I-3, I-9 |
| **V-06** | **queue.expires_at \> current server time** | Prune expired entries before submission. | I-10 |
| **V-07** | **ledger.balance = total_earned − total_spent − decay** | Fail-stop if ledger arithmetic fails. | I-9, I-13 |
| **V-08** | **receipt.session_id = burn.session_id** | Reject receipt if session mismatch. | I-7 |
| **V-09** | **All signatures verify against public_key** | Reject any record with invalid signature. | I-1 |
| **V-10** | **schema_version recognized before parsing** | Refuse to parse unknown versions. | Compat |
| **V-11** | **No PII in any field of any schema** | Automated scan. No name, email, phone, IDFA. | I-11, I-12 |
| **V-12** | **chain.chain_index is monotonically increasing** | Reject chain entry if index regression. | I-4 |

**11. Migration Rules**

- **Forward-only:** Older schema_version must be migrated forward. No downgrade supported.

- **Atomic:** Migration completes fully or rolls back entirely. No partial state.

- **Tested:** Every migration has unit tests with real v(N) data fixtures from 03-28 (Test Data Pack).

- **Key-preserving:** SE keys are never migrated. They are hardware-bound and immutable.

- **Logged:** Migration events emitted to telemetry (03-14). No PII in migration logs.

Full migration policy and procedures are defined in 03-22 (Backward Compatibility Policy).

**12. Storage Security Summary**

|  |  |  |
|:---|:---|:---|
| **Schema** | **Keychain Protection** | **Integrity Mechanism** |
| **Device Identity** | kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly | SE key binding. Non-exportable. |
| **Pulse Record** | kSecAttrAccessibleAfterFirstUnlock | ECDSA signature (SE-signed). |
| **Burn Record** | kSecAttrAccessibleAfterFirstUnlock | ECDSA signature (SE-signed) + hash chain. |
| **Receipt** | kSecAttrAccessibleAfterFirstUnlock | Verifier ECDSA signature. |
| **Credits Ledger** | kSecAttrAccessibleAfterFirstUnlock | HMAC-SHA256 with SE-derived key. |
| **Offline Queue** | kSecAttrAccessibleAfterFirstUnlock | Payload hash (SHA-256). |
| **Hash Chain** | kSecAttrAccessibleAfterFirstUnlock | Chained SHA-256 hashes. |

**13. VDR Cross-Reference Index**

|  |  |  |
|:---|:---|:---|
| **Doc ID** | **Document** | **Relationship** |
| **01-02-A** | Keystone Patent (Family A) | Hardware binding claims governing Device Identity and signatures |
| **02-02** | Protocol Invariants Specification | Invariants mapped to every schema |
| **02-05** | System Architecture | Epoch, receipt, ledger lifecycle definitions |
| **03-03** | iOS Client Product Requirements | Functional requirements driving schema design |
| **03-05** | iOS Client Security Model | Keychain protection classes and SE constraints |
| **03-06** | iOS Platform Integration | CryptoKit, App Attest, Keychain API specifics |
| **03-14** | Telemetry Events | Migration event logging |
| **03-15** | MVP State Machine Diagrams | Burn state machine consuming these schemas |
| **03-22** | iOS Backward Compatibility Policy | schema_version rules and migration policy |
| **03-24** | iOS Cryptographic Primitives | ECDSA P-256, HMAC-SHA256, SHA-256 specifications |
| **03-28** | iOS Test Data Pack | Test fixtures for schema validation and migration |
| **05-07** | HPP Privacy Architecture | Zero-PII constraints (V-11) |

**END OF DOCUMENT**
