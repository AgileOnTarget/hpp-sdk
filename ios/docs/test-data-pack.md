**HPP iOS CLIENT**

**TEST DATA PACK**

*Human Presence Protocol*

|                    |                                              |
|--------------------|----------------------------------------------|
| **Document ID**    | 03-28                                        |
| **Title**          | HPP iOS Client Test Data Pack                |
| **Version**        | 1.0                                          |
| **Status**         | Canonical                                    |
| **Scope**          | MVP iOS Client — Deterministic Test Fixtures |
| **Date**           | February 2026                                |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward     |

**CONFIDENTIAL**

**1. Purpose and Usage**

This document provides the canonical set of deterministic sample data used across unit tests, integration tests, and acceptance tests for the HPP iOS client MVP. Every test fixture in this document is a known-good reference value that all test suites share.

Deterministic test data eliminates randomness as a source of test flakiness. When a test fails, the failure is in the code under test, not in the test data. Every value in this pack is chosen to be obviously synthetic (recognizable UUID patterns, round timestamps, placeholder Base64 strings) so that test data can never be confused with production data.

|  |
|----|
| **Rule:** No test in the HPP iOS client may generate its own random test data for protocol-level fields. All tests must reference values from this pack. This ensures reproducibility across test runs, developers, and CI environments. |

**1.1 Fixture Naming Convention**

All test fixtures use a consistent naming pattern to make them instantly recognizable:

|  |  |
|----|----|
| **Convention** | **Example** |
| **UUIDs** | Repeating digit patterns: 11111111-1111-..., 22222222-2222-..., etc. Except device_id which uses the RFC 4122 example UUID. |
| **Timestamps** | Round Unix epoch values: 1700000000, 1700000100, 1700000200. Incrementing by 100s. |
| **String IDs** | Prefixed with test domain: pk_test_01, attest_key_01, session_test_01. |
| **Cryptographic values** | Placeholder strings: BASE64_PUBLIC_KEY_SAMPLE, BASE64_SIGNATURE_SAMPLE. Replaced with real values in integration tests only. |
| **URLs** | Non-routable test domains: https://verifier.hpp.dev, https://demo.hpp. |

**1.2 Test Tiers and Data Usage**

|  |  |  |
|----|----|----|
| **Test Tier** | **Data Source** | **Cryptographic Values** |
| **Unit tests** | This document. All values used as-is, including placeholder cryptographic strings. | Placeholder strings (BASE64\_\*). Signature validation is mocked. |
| **Integration tests** | This document for structure. Cryptographic values replaced with real SE-generated values at test setup. | Real SE-generated keys and signatures. Verified end-to-end. |
| **Acceptance tests** | This document for IDs and structure. Live verifier generates receipts and validates burns. | Real values throughout. Full protocol execution. |

**2. Sample Device**

The sample device represents a registered HPP client with a valid Secure Enclave key pair and App Attest token. This is the canonical device identity used across all test suites.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-1** | Hardware-bound key: device identity is anchored to a Secure Enclave key pair that never leaves the hardware. |

**2.1 Device Identity Fixture**

|  |  |  |  |
|----|----|----|----|
| **Field** | **Test Value** | **Type** | **Constraints** |
| **device_id** | 550e8400-e29b-41d4-a716-446655440000 | UUID v4 | RFC 4122 example UUID. Unique per device. |
| **public_key_id** | pk_test_01 | String | Identifier referencing the SE public key. |
| **public_key** | BASE64_PUBLIC_KEY_SAMPLE | Base64 | ECDSA P-256 public key. Placeholder in unit tests. |
| **app_attest_key_id** | attest_key_01 | String | Apple App Attest key identifier. |
| **registered_at** | 1699999900 | Unix epoch | 100 seconds before first pulse. Device registered. |

**2.2 Device State Variants**

Tests requiring different device states should use the following variants, all derived from the base device fixture:

|  |  |  |
|----|----|----|
| **Variant** | **device_id suffix** | **Use Case** |
| **Registered, no pulses** | ...440000 (base) | Fresh device. Balance = 0. No history. |
| **Active, has balance** | ...440001 | Device with 5 pulses and balance = 5. Ready to burn. |
| **Queued pulses (offline)** | ...440002 | Device with 3 queued pulses awaiting submission. |
| **Expired credits** | ...440003 | Device with credits past expiration window. Balance = 0 effective. |
| **Pending burn recovery** | ...440004 | Device with incomplete burn record. Tests crash recovery (03-26 §7). |

**3. Sample Pulse**

A pulse is a biometrically-gated attestation signed by the device’s SE key, timestamped with server-authoritative time. The sample pulse represents a single successful daily attestation.

|               |                                                     |
|---------------|-----------------------------------------------------|
| **Invariant** | **Relevance**                                       |
| **I-1**       | Signature generated inside Secure Enclave.          |
| **I-2**       | Biometric authentication preceded signing.          |
| **I-3**       | Timestamp from server-authoritative /time endpoint. |

**3.1 Pulse Fixture**

|  |  |  |  |
|----|----|----|----|
| **Field** | **Test Value** | **Type** | **Constraints** |
| **pulse_id** | 11111111-1111-1111-1111-111111111111 | UUID v4 | Unique per pulse. Repeating-1 pattern. |
| **device_id** | 550e8400-e29b-41d4-a716-446655440000 | UUID v4 | References sample device (Section 2). |
| **timestamp** | 1700000000 | Unix epoch | Server-authoritative time. Nov 14, 2023 22:13:20 UTC. |
| **epoch_id** | epoch_2023_318 | String | Day-of-year epoch identifier. Derived from timestamp. |
| **nonce** | aaaa-bbbb-cccc-dddd-eeee | String | CSPRNG-generated. Unique per pulse. Never reused. |
| **signature** | BASE64_SIGNATURE_SAMPLE | Base64 | ECDSA P-256 over (device_id + timestamp + nonce). |
| **biometric_method** | faceID | Enum | faceID \| touchID. Records which gate was used. |

**3.2 Pulse Sequence (Multi-Day)**

For tests requiring pulse history (continuity chain, balance accumulation), use the following sequence. Each pulse increments the timestamp by 86,400 seconds (one day).

|  |  |  |  |  |
|----|----|----|----|----|
| **Day** | **pulse_id** | **timestamp** | **epoch_id** | **Balance After** |
| **1** | 11111111-...-111111111111 | 1700000000 | epoch_2023_318 | 1 |
| **2** | 11111111-...-111111111112 | 1700086400 | epoch_2023_319 | 2 |
| **3** | 11111111-...-111111111113 | 1700172800 | epoch_2023_320 | 3 |
| **4** | 11111111-...-111111111114 | 1700259200 | epoch_2023_321 | 4 |
| **5** | 11111111-...-111111111115 | 1700345600 | epoch_2023_322 | 5 |

**4. Sample Burn**

A burn is an atomic credit-spend operation. The sample burn represents a single-credit spend against the sample device’s balance, triggered by scanning a QR code from the sample Relying Party.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-4** | Credits are non-transferable: burn originates from the device that earned the credits. |
| **I-5** | Credits have bounded lifetime: timestamp must fall within credit validity window. |
| **I-6** | Burns are atomic: complete success or complete rollback. |
| **I-7** | Idempotency: burn_id is globally unique and processed exactly once. |

**4.1 Burn Fixture**

|  |  |  |  |
|----|----|----|----|
| **Field** | **Test Value** | **Type** | **Constraints** |
| **burn_id** | 22222222-2222-2222-2222-222222222222 | UUID v4 | Unique per burn. Repeating-2 pattern. |
| **device_id** | 550e8400-e29b-41d4-a716-446655440000 | UUID v4 | References sample device (Section 2). |
| **session_id** | session_test_01 | String | Matches QR payload session_id (Section 6). |
| **credits** | 1 | Integer | Number of credits spent. Minimum 1. |
| **timestamp** | 1700000100 | Unix epoch | 100 seconds after first pulse. |
| **previous_burn_hash** | 0000...0000 (32 hex zeros) | Hex string | First burn in chain. Genesis hash. |
| **nonce** | ffff-eeee-dddd-cccc-bbbb | String | CSPRNG-generated. Unique per burn. |
| **signature** | BASE64_SIGNATURE_SAMPLE | Base64 | ECDSA P-256 over burn payload. |

**4.2 Burn Edge Case Variants**

|  |  |  |
|----|----|----|
| **Variant** | **burn_id suffix** | **Use Case** |
| **Standard burn** | ...222222222222 (base) | Normal single-credit burn. Happy path. |
| **Duplicate submission** | ...222222222222 (same) | Same burn_id submitted twice. Tests idempotency rejection (I-7). |
| **Insufficient balance** | ...222222222223 | credits = 10 against balance of 5. Tests balance check. |
| **Expired session** | ...222222222224 | session_id = session_expired_01. Tests session TTL rejection. |
| **Multi-credit burn** | ...222222222225 | credits = 3. Tests multi-credit deduction. |
| **Crash recovery** | ...222222222226 | Pending burn record with no receipt. Tests atomicity recovery (03-26 §7). |

**5. Sample Receipt**

A receipt is the verifier’s cryptographic confirmation that a burn was processed. The Relying Party uses the receipt to confirm content should be unlocked. The sample receipt corresponds to the sample burn in Section 4.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-7** | Idempotency: one receipt per burn_id. No duplicate receipts. |
| **I-3** | Server-authoritative time: receipt issued_at is verifier-stamped. |

**5.1 Receipt Fixture**

|  |  |  |  |
|----|----|----|----|
| **Field** | **Test Value** | **Type** | **Constraints** |
| **receipt_id** | 33333333-3333-3333-3333-333333333333 | UUID v4 | Unique per receipt. Repeating-3 pattern. |
| **burn_id** | 22222222-2222-2222-2222-222222222222 | UUID v4 | References sample burn (Section 4). |
| **device_id** | 550e8400-e29b-41d4-a716-446655440000 | UUID v4 | References sample device (Section 2). |
| **session_id** | session_test_01 | String | Matches burn and QR payload session_id. |
| **credits_burned** | 1 | Integer | Matches burn credits field. |
| **verifier_signature** | BASE64_VERIFIER_SIGNATURE | Base64 | Verifier’s signature over receipt payload. |
| **issued_at** | 1700000200 | Unix epoch | 200 seconds after first pulse. 100 after burn. |
| **site_origin** | https://demo.hpp | URL | Relying Party origin. Non-routable test domain. |
| **receipt_hash** | SHA256_RECEIPT_HASH_SAMPLE | Hex string | SHA-256 of the canonical receipt payload. |

**5.2 Receipt Validation Rules**

The following conditions must hold for a receipt to be considered valid. Test suites assert all conditions against the sample receipt:

|  |  |
|----|----|
| **Condition** | **Assertion** |
| **burn_id matches** | receipt.burn_id == burn.burn_id |
| **session_id matches** | receipt.session_id == burn.session_id |
| **issued_at ≥ burn timestamp** | receipt.issued_at \>= burn.timestamp |
| **issued_at within age limit** | (now - receipt.issued_at) \< max_receipt_age |
| **Verifier signature valid** | verify(verifier_pub_key, receipt_payload, verifier_signature) == true |
| **No duplicate receipt_id** | receipt_id not in local receipt store |

**6. Sample QR Payload**

The QR payload is generated by the Relying Party and scanned by the HPP client to initiate a burn. It contains the verifier URL, session identifier, required credit amount, and callback information.

|  |  |
|----|----|
| **Invariant** | **Relevance** |
| **I-6** | Atomic burn: QR payload defines the burn parameters that the client must validate before initiating. |
| **I-14** | RP integration: QR is the interface between Relying Party and HPP client. |

**6.1 QR Payload Fixture**

|  |  |  |  |
|----|----|----|----|
| **Field** | **Test Value** | **Type** | **Constraints** |
| **verifier_url** | https://verifier.hpp.dev | URL | Non-routable test domain. Verifier endpoint. |
| **session_id** | session_test_01 | String | Matches burn and receipt session_id. |
| **required_credits** | 1 | Integer | Minimum credits required for unlock. ≥ 1. |
| **rp_id** | rp_demo_01 | String | Relying Party identifier. |
| **callback_url** | https://demo.hpp/callback | URL | RP polling endpoint for burn confirmation. |
| **created_at** | 1700000050 | Unix epoch | QR generation time. Used for session TTL. |
| **ttl_seconds** | 300 | Integer | Session validity: 5 minutes from created_at. |

**6.2 QR Payload JSON**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>{</p>
<p>"verifier_url": "https://verifier.hpp.dev",</p>
<p>"session_id": "session_test_01",</p>
<p>"required_credits": 1,</p>
<p>"rp_id": "rp_demo_01",</p>
<p>"callback_url": "https://demo.hpp/callback",</p>
<p>"created_at": 1700000050,</p>
<p>"ttl_seconds": 300</p>
<p>}</p></td>
</tr>
</tbody>
</table>

**6.3 Invalid QR Payloads for Negative Testing**

|  |  |  |
|----|----|----|
| **Variant** | **Modification** | **Expected Behavior** |
| **Missing session_id** | Remove session_id field entirely | BRN_QR_INVALID. Reject before biometric. |
| **Zero credits** | required_credits: 0 | BRN_QR_INVALID. Credits must be ≥ 1. |
| **Negative credits** | required_credits: -1 | BRN_QR_INVALID. Reject negative values. |
| **Expired session** | created_at: 1699000000, ttl_seconds: 300 | BRN_SESSION_EXPIRED. TTL exceeded. |
| **Malformed JSON** | Truncated or invalid JSON string | BRN_QR_INVALID. Parse failure. |
| **Wrong verifier_url** | verifier_url: https://evil.example.com | BRN_QR_INVALID. URL not in allowlist. |

**7. Sample Verifier Responses**

Test suites that mock verifier responses should use the following canonical response payloads. Each response corresponds to a specific endpoint and outcome.

**7.1 Success Responses**

|  |  |  |
|----|----|----|
| **Endpoint** | **Status** | **Key Fields** |
| **POST /register** | 201 | device_id, public_key_id, registered_at |
| **GET /time** | 200 | server_time (Unix epoch), epoch_id |
| **POST /pulse** | 200 | pulse_id, accepted: true, balance (updated) |
| **POST /burn** | 200 | receipt_id, burn_id, verifier_signature, issued_at |
| **GET /burn/status/{id}** | 200 | status: "completed" \| "not_found", receipt (if completed) |

**7.2 Error Responses**

|  |  |  |
|----|----|----|
| **Endpoint** | **Status** | **Key Fields** |
| **POST /register (dup)** | 409 | error: "device_already_registered", device_id |
| **POST /pulse (bad sig)** | 401 | error: "signature_invalid" |
| **POST /pulse (epoch)** | 400 | error: "epoch_expired", current_epoch_id |
| **POST /burn (idemp.)** | 409 | error: "burn_already_processed", burn_id |
| **POST /burn (session)** | 400 | error: "session_expired", session_id |
| **POST /burn (balance)** | 400 | error: "insufficient_balance", available, required |
| **Any (server error)** | 500 | error: "internal_error", request_id (for tracing) |

**8. Sample Offline Queue Entries**

For tests covering offline queue behavior (enqueue, drain, expiration), use the following pre-built queue entries. All entries reference device variant ...440002 (Section 2.2).

|  |  |  |  |  |
|----|----|----|----|----|
| **Entry** | **pulse_id** | **queued_at** | **Status** | **Age (days)** |
| **1** | 44444444-...-444444444441 | 1700000000 | pending | 0 |
| **2** | 44444444-...-444444444442 | 1700086400 | pending | 1 |
| **3** | 44444444-...-444444444443 | 1700172800 | pending | 2 |
| **4 (expired)** | 44444444-...-444444444444 | 1699395200 | expired | 8 |

|  |
|----|
| **Expiration Rule:** Queue entries older than 7 days are expired and must be pruned during drain. Entry 4 tests this boundary. The drain operation should process entries 1–3 and discard entry 4. |

**9. Test Configuration Constants**

The following configuration values are used in test environments. They mirror Config.plist values but with test-appropriate settings.

|  |  |  |
|----|----|----|
| **Constant** | **Test Value** | **Notes** |
| **verifier_base_url** | https://verifier.hpp.dev | Non-routable. Mocked in unit tests. |
| **max_receipt_age_seconds** | 300 | 5 minutes. Matches QR ttl_seconds. |
| **max_clock_skew_seconds** | 30 | Server-client clock tolerance. |
| **queue_max_age_days** | 7 | Entries older than this are pruned. |
| **queue_max_depth** | 100 | Maximum pending queue entries. |
| **connection_timeout_seconds** | 10 | Network connection timeout. |
| **request_timeout_seconds** | 15 | Full request timeout. |
| **retry_count** | 2 | Max retries after initial attempt. |
| **credit_validity_days** | 90 | Credits expire after this window. |

**10. VDR Cross-Reference Index**

|  |  |  |
|----|----|----|
| **Doc ID** | **Document** | **Relationship** |
| **02-02** | Protocol Invariants Specification | Invariants mapped to every test fixture |
| **03-08** | iOS Client Acceptance Tests | Test suite consuming these fixtures |
| **03-12** | Demo Website Security Model | QR payload format and session management |
| **03-14** | Telemetry Events | Event names referenced in test assertions |
| **03-19** | Demo Website Acceptance Tests | Website-side tests using matching session data |
| **03-26** | iOS Debugging Guide | Error codes validated against test edge cases |
| **03-27** | iOS Performance Budgets | Performance assertions using these fixtures |

**END OF DOCUMENT**
