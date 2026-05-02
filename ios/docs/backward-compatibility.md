**HPP iOS CLIENT**

**BACKWARD COMPATIBILITY POLICY**

*Human Presence Protocol*

|                    |                                               |
|:-------------------|:----------------------------------------------|
| **Document ID**    | OSI8_04B_13                                   |
| **Title**          | HPP iOS Client Backward Compatibility Policy  |
| **Version**        | 3.0                                           |
| **Status**         | Canonical                                     |
| **Scope**          | MVP iOS Client — Protocol and Data Versioning |
| **Date**           | April 2026                                    |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward      |

**CONFIDENTIAL**

**1. Purpose**

This document defines how the HPP iOS client maintains compatibility with previous protocol versions, verifier API versions, and persisted local data formats while preserving all security guarantees and Protocol Invariants.

Backward compatibility in a cryptographic protocol is not a convenience feature. It is a safety constraint. A compatibility failure can silently degrade security properties, violate invariants, or strand users with unrecoverable state. This policy ensures that every version transition is deterministic, testable, and auditable.

**2. Compatibility Principles**

Four non-negotiable principles govern all compatibility decisions:

|  |  |
|:---|:---|
| **Never Silently Reinterpret Data** | If a data format changes between versions, the client must detect the version mismatch and handle it explicitly. Silent reinterpretation of old data under new semantics is a protocol violation. This is the most dangerous class of compatibility bug because it passes all tests while producing wrong results. |
| **Old Clients Must Fail Safe** | A client running version N that encounters version N+1 data or API responses must fail cleanly: display an upgrade-required message, refuse to process the data, and preserve existing state. It must never crash, corrupt local data, or silently drop attestations. |
| **New Clients Must Read Old Data** | A client running version N+1 must correctly read, validate, and (if necessary) migrate data created by version N. No user loses accumulated credits, attestation history, or device keys due to an app update. |
| **Verifier Is Source of Truth** | The verifier defines the canonical protocol version. The client advertises its version; the verifier accepts or rejects. Version negotiation is server-authoritative, consistent with INV-3 (Server-Time Authority). |

|  |
|----|
| **Invariant Constraint:** No backward compatibility accommodation may weaken any Protocol Invariant (INV-1 through INV-14). If maintaining compatibility with an old format would require violating an invariant, the old format is deprecated with a forced migration. Invariants always win. |

**3. Version Signaling**

HPP uses explicit version signaling at three layers: protocol, API, and data. Each layer is versioned independently.

**3.1 Protocol Version (HPP-Version Header)**

- **Every request** to the verifier includes an HPP-Version header.

- **Format:** Major.Minor (e.g., 1.0, 1.1, 2.0).

- **Major version change:** breaking protocol change. Old clients cannot interoperate.

- **Minor version change:** additive capability. Old clients continue to function.

- **Verifier response:** includes HPP-Version header indicating the version it processed the request under.

**3.2 API Version**

- **Endpoint versioning:** API paths include version prefix (e.g., /v1/register, /v1/verify-receipt).

- **Parallel support:** verifier may support /v1/ and /v2/ simultaneously during transition.

- **Sunset header:** deprecated endpoints return Sunset header with retirement date.

**3.3 Version Negotiation Flow**

|  |  |  |
|:--:|:---|:---|
| **1** | **Client → Verifier** | Client sends request with HPP-Version: 1.0 and API path /v1/verify-receipt. |
| **2** | **Verifier checks** | Verifier compares client version against minimum_supported_version and current_version. |
| **3a** | **Version accepted** | Verifier processes request normally. Response includes HPP-Version: 1.0. |
| **3b** | **Version deprecated** | Verifier processes request but includes Deprecation: true header and Sunset date. Client should display upgrade notice. |
| **3c** | **Version unsupported** | Verifier returns HTTP 426 (Upgrade Required) with error code UNSUPPORTED_VERSION and minimum_required_version in body. Client displays upgrade-required screen. |

**4. Local Data Versioning**

All persisted data structures include an explicit version field. The client checks this field before reading any data. Unknown versions trigger fail-safe behavior, not silent parsing.

|  |  |  |  |
|:---|:--:|:---|:---|
| **Data Structure** | **Version** | **Storage** | **Versioned Fields** |
| **Pulse Record** | 1 | Keychain (encrypted) | nonce, timestamp, epoch, device_binding, signature, format_version |
| **Burn Record** | 1 | Keychain (encrypted) | session_id, nonce, epoch, signature, hash_chain_prev, format_version |
| **Credits Ledger** | 1 | Keychain (HMAC-signed) | balance, last_pulse_epoch, last_burn_epoch, decay_state, format_version |
| **Offline Queue** | 1 | Keychain (encrypted) | queue_entries\[\], max_age_days, format_version |
| **Device Identity** | 1 | Keychain (SE-bound) | device_uuid, public_key_ref, attestation_key_id, format_version |
| **Hash Chain** | 1 | Keychain (encrypted) | entries\[\], chain_head_hash, format_version |

|  |
|----|
| **Design Rule:** format_version is the first field read from any persisted structure. If the version is unrecognized, the client refuses to parse the remaining bytes. This prevents silent reinterpretation under changed semantics. |

**5. Upgrade Rules**

When a user updates the HPP app to a new version, the following rules are enforced at first launch:

|  |  |  |
|:---|:--:|:---|
| **Rule** | **Enforcement** | **Rationale** |
| **App upgrade must not reset SE keys** | **Mandatory** | SE keys are hardware-bound and non-exportable. Resetting them orphans the device identity and breaks INV-1 (Hardware Binding). The device would need to re-register with the verifier. |
| **App upgrade must not reset credits** | **Mandatory** | Credit balance represents accumulated presence. Resetting violates INV-9 (Monotonic Accumulation). Users cannot re-earn time that has already passed. |
| **App upgrade must not reset hash chain** | **Mandatory** | Hash chain provides provenance continuity. Breaking the chain violates INV-4 (Non-Transferability) and creates an audit gap. |
| **App upgrade must not reset offline queue** | **Mandatory** | Queued attestations represent valid presence intents. Dropping them violates INV-10 (Graceful Degradation). |
| **App upgrade may require verifier handshake** | **Conditional** | If the new version introduces protocol changes, a handshake confirms the verifier supports the new version before the client begins operating under new semantics. |
| **App upgrade may trigger data migration** | **Conditional** | If local data format versions change, the migration function runs at first launch. Migration is atomic: it completes fully or rolls back entirely. |
| **App upgrade must preserve biometric enrollment state** | **Mandatory** | If the user’s biometric enrollment has changed since last launch, the client detects this via LAContext and invalidates the SE key (per Apple’s security model). This is correct behavior, not a compatibility bug. |

**6. Breaking Change Handling**

A breaking change is any modification that prevents a client running version N from interoperating with a verifier running version N+1 (or vice versa). Breaking changes require coordinated deployment.

**6.1 Examples of Breaking Changes**

- Receipt signature algorithm change (e.g., P-256 → P-384).

- Epoch format change (e.g., integer → ISO 8601).

- Nonce generation algorithm change.

- Addition of a required field to the receipt payload.

- Removal of a currently-required API endpoint.

- Change to the QR payload structure that old clients cannot parse.

**6.2 Breaking Change Procedure**

|  |  |  |
|:--:|:---|:---|
| **1** | **Announce** | Document the breaking change in the changelog. Set a sunset date for the old version (minimum 90 days from announcement). |
| **2** | **Dual Support** | Verifier supports both old and new versions simultaneously. Old clients continue to function under old semantics. |
| **3** | **Client Update** | New client version ships with support for new protocol version. Old data is migrated at first launch. |
| **4** | **Deprecation Warning** | Old clients receive Deprecation: true header on every response. Client displays non-blocking upgrade notice. |
| **5** | **Sunset** | After sunset date, verifier stops accepting old version. Old clients receive HTTP 426 (Upgrade Required). No silent degradation. |
| **6** | **Cleanup** | Remove old version support from verifier codebase. Document removal in changelog. |

**7. Deprecation Policy**

|  |  |
|:---|:---|
| **Minimum deprecation window** | 90 days from announcement to sunset. No exceptions. |
| **Version floor** | Verifier maintains a minimum_supported_version. Clients below this floor receive HTTP 426. |
| **Deprecation signal** | Deprecation: true response header on every request from a deprecated client. |
| **Client behavior on deprecation** | Non-blocking upgrade notice in the app. Full functionality preserved until sunset. |
| **Client behavior on sunset** | Upgrade-required screen. No attestation, burn, or sync operations permitted. Existing local data preserved. |
| **Emergency deprecation** | If a security vulnerability is discovered in an old version that cannot be mitigated server-side, the deprecation window may be shortened to 14 days with explicit notification. |
| **Notification channel** | Deprecation announcements via the verifier’s /status endpoint and in-app messaging. |

**8. Data Migration**

When a local data format version changes, the client executes a deterministic migration function at first launch. Migration is the most dangerous operation in backward compatibility. It touches persisted state, cryptographic material, and accumulated trust.

**8.1 Migration Rules**

- **Atomic:** Migration completes fully or rolls back entirely. No partial state.

- **Idempotent:** Running migration twice on the same data produces the same result.

- **Tested:** Every migration function has unit tests with real v(N) data fixtures (from OSI8_04B_19).

- **Logged:** Migration events emitted to telemetry (OSI8_03C_14) with: source version, target version, success/failure, duration. No PII.

- **Reversible (where possible):** If migration fails, the client preserves original data and displays a support message. Irreversible migrations (e.g., crypto algorithm upgrade) require explicit user acknowledgment.

- **Key-preserving:** SE keys are never migrated. They are hardware-bound and immutable. If a key must change (biometric re-enrollment), this is a device lifecycle event (OSI8_04B_24), not a migration.

**8.2 Migration Matrix**

The following table defines migration paths for each data structure. As new versions are released, rows are appended.

|  |  |  |  |  |
|:---|:--:|:--:|:---|:--:|
| **Data Structure** | **From** | **To** | **Migration Action** | **Risk** |
| **Pulse Record** | 1 | 1 | No migration required (current version). | None |
| **Burn Record** | 1 | 1 | No migration required (current version). | None |
| **Credits Ledger** | 1 | 1 | No migration required (current version). | None |
| **Offline Queue** | 1 | 1 | No migration required (current version). | None |
| **Device Identity** | 1 | 1 | No migration required (current version). | None |
| **Hash Chain** | 1 | 1 | No migration required (current version). | None |

**Note:** All data structures are currently at version 1 (MVP). This matrix will be populated as protocol versions evolve. The structure is established now so that the first real migration has a defined path.

**9. Compatibility Test Matrix**

Every release must pass the following compatibility tests before shipping. These tests verify that the four compatibility principles hold across version boundaries.

|  |  |  |  |
|:--:|:---|:---|:---|
| **ID** | **Test** | **Expected** | **Principle** |
| **BC-01** | **Install v(N+1) over v(N) with existing data** | All local data readable. Credits preserved. Keys intact. | New reads old |
| **BC-02** | **v(N) client against v(N+1) verifier** | Client functions normally or receives deprecation notice. | Old fails safe |
| **BC-03** | **v(N+1) client against v(N) verifier** | Client functions normally under v(N) semantics. | New reads old |
| **BC-04** | **Data created by v(N), read by v(N+1)** | Data parsed correctly. format_version check passes. | Never reinterpret |
| **BC-05** | **Data created by v(N+1), read by v(N)** | v(N) refuses to parse. Upgrade notice shown. | Old fails safe |
| **BC-06** | **Migration function: v(N) → v(N+1)** | Migration completes atomically. All data intact. | New reads old |
| **BC-07** | **Migration failure: power loss mid-migration** | Original data preserved. Migration retried on next launch. | Never reinterpret |
| **BC-08** | **Unsupported version from verifier** | HTTP 426 handled. Upgrade screen shown. No crash. | Verifier is truth |
| **BC-09** | **SE key survives app update** | Key reference valid after update. Signing succeeds. | New reads old |
| **BC-10** | **Biometric re-enrollment after update** | SE key invalidated (correct Apple behavior). Re-registration triggered. | Old fails safe |

**10. iOS Platform Considerations**

iOS platform updates introduce their own backward compatibility constraints that interact with HPP’s versioning.

|  |  |
|:---|:---|
| **iOS Minimum Deployment Target** | iOS 17.0. Devices running iOS 16 or earlier cannot install the HPP client. This is a hard floor — CryptoKit SecureEnclave.P256 APIs required. |
| **iOS Major Version Upgrades** | When Apple releases a new iOS version, test all compatibility tests (BC-01 through BC-10) on the new OS before certifying support. SE behavior changes between iOS versions are documented in Apple’s release notes. |
| **Keychain Persistence** | Keychain items with kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly persist across app updates but are deleted if the user removes their device passcode. This is Apple’s security model, not an HPP bug. |
| **App Attest Key Lifecycle** | App Attest keys generated via DCAppAttestService persist across app updates. If Apple changes App Attest behavior in a future iOS release, this is a platform-level breaking change requiring a new patent family H (Cross-Platform Attestation Bridging) response. |
| **Background Task Changes** | iOS 18 introduced more aggressive BGTaskScheduler throttling. Offline queue drain logic must account for reduced background execution time. See OSI8_04B_10 risk R16. |
| **Biometric API Evolution** | If Apple introduces new biometric modalities (e.g., vein pattern), HPP’s biometric gate remains compatible as long as LAContext.evaluatePolicy continues to work. HPP does not depend on the biometric modality, only on the TEE gate. |

**11. VDR Cross-Reference Index**

|  |  |  |
|:---|:---|:---|
| **Doc ID** | **Document** | **Relationship** |
| **OSI8_02A_02** | Protocol Invariants Specification | Invariants governing compatibility decisions |
| **OSI8_02A_05** | System Architecture | Data model and lifecycle definitions |
| **OSI8_02B_05** | Core Protocol Internet Draft | HPP-Version header and API versioning spec |
| **OSI8_02B_10** | Error Code Registry | UNSUPPORTED_VERSION error code definition |
| **OSI8_04B_03** | iOS Client Security Model | SE key lifecycle and biometric constraints |
| **OSI8_04B_04** | iOS Platform Integration | iOS 17/18 API surface and SE behavior |
| **OSI8_03C_14** | Telemetry Events | Migration event logging |
| **OSI8_04B_10** | iOS Implementation Risk Register | R16 (BGTaskScheduler), R17 (App Attest migration) |
| **OSI8_04B_12** | iOS Release Runbook | Pre-release compatibility test gate |
| **OSI8_04B_14** | iOS Data Model Schemas | Data structure definitions versioned here |
| **OSI8_04B_19** | iOS Test Data Pack | v(N) data fixtures for migration testing |
| **OSI8_04B_24** | iOS End of Life Policy | Device lifecycle events (key invalidation) |

**END OF DOCUMENT**
