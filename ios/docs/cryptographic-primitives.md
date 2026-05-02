**HPP iOS CLIENT**

**CRYPTOGRAPHIC PRIMITIVES**

*Human Presence Protocol*

|                    |                                               |
|:-------------------|:----------------------------------------------|
| **Document ID**    | 03-24                                         |
| **Title**          | HPP iOS Client Cryptographic Primitives       |
| **Version**        | 2.0                                           |
| **Status**         | Canonical                                     |
| **Scope**          | MVP iOS Client — Cryptographic Specifications |
| **Date**           | February 2026                                 |
| **Author**         | Agile On Target LLC, Protocol Architect & Steward      |

**CONFIDENTIAL**

**1. Purpose**

This document defines the exact cryptographic primitives, algorithms, parameters, and API bindings used by the HPP iOS client. Every cryptographic operation in the protocol traces to a specific entry in this document. No cryptographic decision is left to implementation discretion.

These primitives are chosen for three reasons: hardware support (Secure Enclave natively supports P-256), interoperability (ECDSA P-256 and SHA-256 are universally supported by verifiers and relying parties), and provable security (well-analyzed constructions with known security bounds).

|  |
|----|
| **Design Constraint:** The cryptographic primitive set is intentionally minimal. HPP uses exactly 4 cryptographic operations: key generation, signing, hashing, and HMAC. No symmetric encryption of user data. No key exchange. No complex protocols. Simplicity is a security property. |

**Cryptographic Primitive Set Version: v1.0**

**2. Primitive Overview**

|  |  |  |  |  |
|:---|:---|:---|:--:|:---|
| **Primitive** | **Algorithm** | **iOS API** | **Hardware** | **Invariants** |
| **Key Generation** | ECDSA P-256 | SecureEnclave.P256 | **SE Required** | I-1, I-2 |
| **Signing** | ECDSA / SHA-256 | SE.P256.Signing | **SE Required** | I-1, I-5 |
| **Hashing** | SHA-256 | SHA256.hash() | **Software** | I-4, I-7 |
| **HMAC** | HMAC-SHA256 | HMAC\<SHA256\> | **Software** | I-9 |
| **Randomness** | CSPRNG | SecRandomCopyBytes | **Hardware RNG** | I-5, I-7 |
| **App Attest** | Apple proprietary | DCAppAttestService | **SE Required** | I-1 |

**3. Asymmetric Key Generation**

|  |  |
|:---|:---|
| **Algorithm** | Elliptic Curve Digital Signature Algorithm (ECDSA) over NIST P-256 (secp256r1) |
| **Key Size** | 256-bit private key, 512-bit uncompressed public key (65 bytes including 0x04 prefix) |
| **iOS Framework** | CryptoKit (Swift) |
| **iOS Class** | SecureEnclave.P256.Signing.PrivateKey |
| **Key Storage** | Secure Enclave. Private key is hardware-bound and non-exportable. |
| **Access Control** | Biometric-gated: .privateKeyUsage + .biometryCurrentSet. No passcode fallback. |
| **Public Key Export** | ANSI X9.63 uncompressed format (0x04 \|\| x \|\| y). Also available as SEC1 compressed (0x02/0x03 \|\| x). |
| **Key Lifetime** | Persists until biometric enrollment changes or device wipe. Not transferable between devices. |
| **Fallback** | None. If SE is unavailable, key generation fails. No software fallback. This is by design (I-1). |

**3.1 CryptoKit API**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>import CryptoKit</p>
<p>// Generate SE-bound signing key with biometric access control</p>
<p>let accessControl = SecAccessControlCreateWithFlags(</p>
<p>kCFAllocatorDefault,</p>
<p>kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,</p>
<p>[.privateKeyUsage, .biometryCurrentSet],</p>
<p>nil</p>
<p>)!</p>
<p>let privateKey = try SecureEnclave.P256.Signing.PrivateKey(</p>
<p>accessControl: accessControl</p>
<p>)</p>
<p>// Export public key (X9.63 uncompressed)</p>
<p>let publicKeyData = privateKey.publicKey.x963Representation</p>
<p>// Export public key (SEC1 compressed)</p>
<p>let compressedKey = privateKey.publicKey.compressedRepresentation</p></td>
</tr>
</tbody>
</table>

|  |
|----|
| **CRITICAL:** The access control flags must include .biometryCurrentSet, not .biometryAny. The difference: .biometryCurrentSet invalidates the key if biometric enrollment changes (new fingerprint added, Face ID re-enrolled). .biometryAny would allow a compromised biometric database to unlock old keys. This distinction enforces I-2 (Biometric Gating). |

**4. Digital Signatures**

|  |  |
|:---|:---|
| **Algorithm** | ECDSA P-256 as implemented by Secure Enclave via CryptoKit. Determinism properties are implementation-defined and not relied upon by protocol logic. |
| **Curve** | NIST P-256 (secp256r1) |
| **Hash Function** | SHA-256 (applied to message before signing) |
| **Signature Encoding** | DER-encoded ASN.1 (r, s) pair. Variable length: typically 70–72 bytes. |
| **iOS API** | privateKey.signature(for: data) returns P256.Signing.ECDSASignature |
| **Verification API** | publicKey.isValidSignature(signature, for: data) returns Bool |
| **Wire Format** | Base64-encoded DER signature. Transmitted in receipt and pulse payloads. |

**4.1 Signature Payloads**

Each protocol operation signs a specific payload. The payload is the canonical byte concatenation of fields in the order specified:

|  |  |
|:---|:---|
| **Operation** | **Signed Payload (field concatenation order)** |
| **Pulse** | pulse_id \| epoch \| timestamp \| nonce \| device_id |
| **Burn** | burn_id \| session_id \| credits_spent \| epoch \| nonce \| previous_burn_hash |
| **Registration** | device_id \| public_key \| app_attest_key_id \| created_at |

|  |
|----|
| **Canonicalization:** Fields are concatenated as UTF-8 strings separated by the pipe character (\|). This is the canonical serialization. Any deviation in field order or delimiter produces a different hash and an invalid signature. The verifier uses the identical concatenation order. |

**4.2 CryptoKit Signing API**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>// Sign a pulse payload</p>
<p>let payload = "\(pulseId)|\(epoch)|\(timestamp)|\(nonce)|\(deviceId)"</p>
<p>let payloadData = Data(payload.utf8)</p>
<p>// Biometric prompt triggered automatically by SE access control</p>
<p>let signature = try privateKey.signature(for: payloadData)</p>
<p>// Export as Base64 for transmission</p>
<p>let signatureBase64 = signature.derRepresentation.base64EncodedString()</p></td>
</tr>
</tbody>
</table>

**5. Hashing**

|  |  |
|:---|:---|
| **Algorithm** | SHA-256 (FIPS 180-4) |
| **Output** | 256 bits (32 bytes). Hex-encoded for storage and display (64 hex characters). |
| **iOS API** | SHA256.hash(data: Data) returns SHA256Digest |
| **Collision Resistance** | 128-bit security level. Sufficient for all HPP use cases. |

**5.1 Hash Usage**

|  |  |  |
|:---|:---|:---|
| **Context** | **Input** | **Purpose** |
| **Burn Hash Chain** | chain_index \| burn_id \| previous_hash \| timestamp | Tamper-evident append-only log. Enforces I-4, I-7. |
| **Offline Queue Integrity** | Serialized pulse or burn payload | Detect corruption before submission. Enforces I-10. |
| **Signature Pre-hash** | Concatenated payload fields | Input to ECDSA sign. SHA-256 applied by CryptoKit internally. |
| **Nonce Generation** | Random bytes from SecRandomCopyBytes | Generate unique nonces. Hex-encoded output. |

**5.2 Hash Chain Construction**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>// Compute hash chain entry</p>
<p>let input = "\(chainIndex)|\(burnId)|\(previousHash)|\(timestamp)"</p>
<p>let hash = SHA256.hash(data: Data(input.utf8))</p>
<p>let hexHash = hash.map { String(format: "%02x", $0) }.joined()</p>
<p>// Genesis entry: previousHash = String(repeating: "0", count: 64)</p></td>
</tr>
</tbody>
</table>

**6. HMAC**

|  |  |
|:---|:---|
| **Algorithm** | HMAC-SHA256 (RFC 2104) |
| **Key Derivation** | Derived via HKDF-SHA256 from SE public key fingerprint and app-specific salt. Not the SE private key itself. Stored in Keychain alongside ledger. |
| **Output** | 256 bits (32 bytes). Base64-encoded for storage. |
| **iOS API** | HMAC\<SHA256\>.authenticationCode(for: data, using: key) |
| **Usage** | Credits ledger tamper detection. Computed over all ledger fields. |
| **Invariant** | I-9 (Monotonic Accumulation). HMAC prevents client-side ledger tampering. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>// Compute ledger HMAC</p>
<p>let ledgerData = "\(balance)|\(totalEarned)|\(totalSpent)|\(lastPulseEpoch)|\(lastBurnEpoch)|\(decayApplied)"</p>
<p>let code = HMAC&lt;SHA256&gt;.authenticationCode(</p>
<p>for: Data(ledgerData.utf8),</p>
<p>using: symmetricKey</p>
<p>)</p>
<p>let hmacBase64 = Data(code).base64EncodedString()</p></td>
</tr>
</tbody>
</table>

**7. Randomness**

|  |  |
|:---|:---|
| **Source** | SecRandomCopyBytes (Security.framework). Hardware-seeded CSPRNG. |
| **Backing** | Apple’s Secure Enclave hardware random number generator on devices with SE. |
| **Nonce Length** | 32 bytes (256 bits). Hex-encoded to 64-character string. |
| **UUID Generation** | UUID() (Foundation). UUID v4 random. Uses SecRandomCopyBytes internally. |
| **Fallback** | None. If SecRandomCopyBytes fails (returns errSecFailure), the operation aborts. No /dev/urandom fallback. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>// Generate cryptographic nonce</p>
<p>var bytes = [UInt8](repeating: 0, count: 32)</p>
<p>let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &amp;bytes)</p>
<p>guard status == errSecSuccess else { throw HPPError.randomGenerationFailed }</p>
<p>let nonce = bytes.map { String(format: "%02x", $0) }.joined()</p></td>
</tr>
</tbody>
</table>

|  |
|----|
| **Why this matters:** Nonce uniqueness is the foundation of replay resistance (I-7). If two pulses or burns share a nonce, the verifier’s nonce registry will reject the second. If the CSPRNG is compromised, nonce collisions become possible and replay resistance degrades. Hardware-seeded randomness mitigates this. Verifier maintains a per-device nonce registry with rejection on reuse, ensuring replay resistance is enforced server-side and not dependent on client-side honesty alone. |

**8. App Attest Integration**

|  |  |
|:---|:---|
| **Framework** | DeviceCheck (DCAppAttestService) |
| **Purpose** | Certify that the signing app is genuine and unmodified, running on a real Apple device. |
| **Key Type** | Device-bound attestation key managed by Apple’s attestation service. |
| **Attestation** | One-time attestation object generated at key creation. Sent to verifier at registration. |
| **Assertion** | Per-request assertion proving the app making the request holds the attested key. |
| **iOS Minimum** | iOS 14.0+ (API availability). iOS 17+ recommended for full SE integration. |
| **Simulator Behavior** | DCAppAttestService.shared.isSupported returns false in Simulator. Test with mock. |
| **Rate Limiting (iOS 18)** | Apple throttles attestation requests. Implement exponential backoff on 429 responses. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr>
<td><p>// Generate App Attest key</p>
<p>let service = DCAppAttestService.shared</p>
<p>guard service.isSupported else { throw HPPError.appAttestUnsupported }</p>
<p>let keyId = try await service.generateKey()</p>
<p>// Attest key (one-time, at registration)</p>
<p>let clientDataHash = SHA256.hash(data: challengeData)</p>
<p>let attestation = try await service.attestKey(</p>
<p>keyId, clientDataHash: Data(clientDataHash)</p>
<p>)</p>
<p>// Generate assertion (per-request)</p>
<p>let assertion = try await service.generateAssertion(</p>
<p>keyId, clientDataHash: Data(requestHash)</p>
<p>)</p></td>
</tr>
</tbody>
</table>

**9. Transport Security**

|  |  |
|:---|:---|
| **Protocol** | TLS 1.2 minimum. TLS 1.3 preferred. HTTP (plaintext) connections rejected. |
| **Certificate Validation** | Standard iOS ATS (App Transport Security) validation. System trust store. |
| **Certificate Pinning** | Recommended for production. Pin verifier’s leaf or intermediate certificate. Configured in Config.plist. |
| **HSTS** | Verifier must send Strict-Transport-Security header. Client respects HSTS. |
| **Cipher Suites** | iOS default ATS cipher suites. Minimum: ECDHE_ECDSA_AES_256_GCM_SHA384 or equivalent. |
| **Mutual TLS** | Not required for MVP. Client authenticates via signed receipts, not mTLS. |

|  |
|----|
| **Defense in Depth:** TLS protects the transport channel. But HPP does not rely on TLS alone for security. Every receipt is signed by the SE and verifiable by any party with the public key. Integrity and authenticity remain intact even if transport confidentiality fails. TLS is a belt. The signature is the suspenders. |

**10. Temporal Encoding**

|  |  |
|:---|:---|
| **Epoch Format** | Unix epoch seconds (Int64). Seconds since 1970-01-01T00:00:00Z. |
| **Precision** | Seconds. No sub-second precision required or used. |
| **Source** | Server-authoritative. Client fetches epoch from verifier /time endpoint. |
| **Client Clock** | Not trusted. Not used for any protocol decision. Client clock is informational only. |
| **Skew Tolerance** | Maximum \|server_time − client_time\| before operations are rejected: 30 seconds (configurable). |
| **Epoch Encoding** | Int64 in JSON payloads. String in signature payloads (decimal ASCII). |

|  |
|----|
| **INVARIANT I-3 ENFORCEMENT:** The client must never use Date() or CFAbsoluteTimeGetCurrent() for any timestamp that enters a signature payload or is compared against an epoch window. All temporal values in protocol operations must originate from the verifier’s /time response. Using the client clock would violate Server-Time Authority. |

**11. Data Encoding**

|  |  |  |
|:---|:---|:---|
| **Data Type** | **Encoding** | **Specification** |
| **Signatures** | Base64 (standard, with padding) | RFC 4648 Section 4. DER-encoded ASN.1 input. |
| **Public Keys** | Base64 (standard, with padding) | X9.63 uncompressed (65 bytes) or SEC1 compressed (33 bytes). |
| **Hashes** | Hexadecimal (lowercase) | 64-character string for SHA-256. |
| **Nonces** | Hexadecimal (lowercase) | 64-character string (32 random bytes). |
| **UUIDs** | Lowercase with hyphens | RFC 4122 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| **Timestamps** | Decimal ASCII (Int64) | Unix epoch seconds. No ISO 8601 in wire format. |
| **JSON Payloads** | UTF-8 | RFC 8259. No BOM. No trailing commas. |
| **Attestation Objects** | Base64 (standard, with padding) | Apple-defined CBOR structure. Opaque to HPP. |

**12. Prohibited Primitives**

The following cryptographic operations are explicitly prohibited in the HPP iOS client. Their presence in any code path is a protocol violation.

|  |  |
|:---|:---|
| **Prohibited** | **Reason** |
| **Symmetric encryption of user data** | HPP stores no user data. There is nothing to encrypt symmetrically. If you need AES, you are storing something you should not be. |
| **RSA** | Not supported by Secure Enclave. P-256 is the only SE-supported curve for signing. |
| **MD5 or SHA-1** | Broken hash algorithms. SHA-256 is the only permitted hash. |
| **Software-generated signing keys** | Violates I-1 (Hardware Binding). All signing keys must be SE-bound. |
| **Key derivation via PBKDF2/scrypt** | No passwords in HPP. No key derivation from user input. Keys are SE-generated. |
| **Diffie-Hellman / ECDH** | No key exchange. HPP is a signing protocol, not an encryption protocol. |
| **Custom cryptographic constructions** | No roll-your-own crypto. All primitives are standard, well-analyzed constructions. |

**13. VDR Cross-Reference Index**

|  |  |  |
|:---|:---|:---|
| **Doc ID** | **Document** | **Relationship** |
| **01-02-A** | Keystone Patent (Family A) | Hardware-bound key generation claims |
| **02-02** | Protocol Invariants Specification | Invariants enforced by each primitive |
| **02-05** | System Architecture | Signing payload definitions, epoch lifecycle |
| **02-10** | Core Protocol Internet Draft | Wire format, signature encoding, API contracts |
| **03-05** | iOS Client Security Model | SE access control, biometric gating policy |
| **03-06** | iOS Platform Integration | CryptoKit, DeviceCheck, Keychain API bindings |
| **03-23** | iOS Data Model Schemas | Field types and signature fields defined here |
| **03-22** | iOS Backward Compatibility Policy | Primitive versioning and algorithm migration |
| **03-17** | iOS Implementation Risk Register | R1 (SE divergence), R8 (deepfake liveness) |
| **05-07** | HPP Privacy Architecture | Zero-PII constraints on cryptographic payloads |

**END OF DOCUMENT**
