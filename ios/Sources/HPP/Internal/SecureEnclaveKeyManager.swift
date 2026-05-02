// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Agile On Target LLC
//
// This file is part of the Human Presence Protocol SDK
// (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
// License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
// PATENT-POLICY.md for the scope of the patent grant. All trademarks
// and patent rights reserved by Agile On Target LLC
// (USPTO Customer No. 224891).

import CryptoKit
import Foundation
import Security

/// Manages a Secure Enclave-backed P-256 signing key.
///
/// Lifecycle:
///   - First use: a key is generated inside the Secure Enclave; its opaque
///     `dataRepresentation` handle is stored in the Keychain.
///   - Subsequent uses: the handle is read from Keychain and used to reconstruct
///     a key reference. The raw private key bytes never leave the Secure Enclave.
///   - The key is device-bound and cannot be exported or moved to another device.
final class SecureEnclaveKeyManager {

    private let keychainService: String
    private let keychainAccount: String

    init(service: String, account: String) {
        self.keychainService = service
        self.keychainAccount = account
    }

    var isSecureEnclaveAvailable: Bool {
        SecureEnclave.isAvailable
    }

    var keyExists: Bool {
        loadKeyData() != nil
    }

    func getOrCreateKey() throws -> SecureEnclave.P256.Signing.PrivateKey {
        if let data = loadKeyData() {
            return try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: data)
        }
        return try createAndPersistKey()
    }

    func loadKeyIfExists() throws -> SecureEnclave.P256.Signing.PrivateKey? {
        guard let data = loadKeyData() else { return nil }
        return try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: data)
    }

    /// Returns a raw IEEE P1363 ECDSA signature (64-byte R‖S) — required for ES256 JWTs.
    func signRaw(_ data: Data, using key: SecureEnclave.P256.Signing.PrivateKey) throws -> Data {
        do {
            return try key.signature(for: data).rawRepresentation
        } catch {
            throw HPPError.signingFailed(error.localizedDescription)
        }
    }

    /// 8-character lowercase hex fingerprint: first 4 bytes of SHA-256(rawPublicKey).
    func compactFingerprint(for key: SecureEnclave.P256.Signing.PrivateKey) -> String {
        SHA256.hash(data: key.publicKey.rawRepresentation)
            .prefix(4)
            .map { String(format: "%02x", $0) }
            .joined()
    }

    /// X9.63 uncompressed public key, base64url encoded — what the verifier expects.
    func publicKeyB64URL(for key: SecureEnclave.P256.Signing.PrivateKey) -> String {
        key.publicKey.x963Representation.base64URLEncoded()
    }

    func deleteKey() {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Private

    private func createAndPersistKey() throws -> SecureEnclave.P256.Signing.PrivateKey {
        guard SecureEnclave.isAvailable else {
            throw HPPError.secureEnclaveUnavailable
        }
        let key = try SecureEnclave.P256.Signing.PrivateKey()
        try persistKeyData(key.dataRepresentation)
        return key
    }

    private func persistKeyData(_ data: Data) throws {
        let deleteQuery: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount,
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let addQuery: [CFString: Any] = [
            kSecClass:          kSecClassGenericPassword,
            kSecAttrService:    keychainService,
            kSecAttrAccount:    keychainAccount,
            kSecValueData:      data,
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw HPPError.keychainFailure(status)
        }
    }

    private func loadKeyData() -> Data? {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount,
            kSecReturnData:  true,
            kSecMatchLimit:  kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return data
    }
}
