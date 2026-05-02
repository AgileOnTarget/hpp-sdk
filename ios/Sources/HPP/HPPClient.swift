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

/// The public entry point for the HPP iOS SDK.
///
/// `HPPClient` is an actor — every method is `async` and is safe to call from
/// any context. The same client instance can (and should) be reused across the
/// app's lifetime; it caches a single Secure Enclave key.
///
/// ```swift
/// import HPP
///
/// let client = HPPClient(configuration: HPPConfiguration(
///     verifierURL: URL(string: "https://hpp-verifier.onrender.com")!,
///     site: "example.com"
/// ))
///
/// let result = try await client.attest(reason: "Verify your presence to log in")
/// // Send result.sessionToken to your backend.
/// ```
public actor HPPClient {

    private let configuration: HPPConfiguration
    private let urlSession: URLSession
    private let keyManager: SecureEnclaveKeyManager
    private let biometric: BiometricAuthManager

    public init(configuration: HPPConfiguration, urlSession: URLSession = .shared) {
        self.configuration = configuration
        self.urlSession = urlSession
        self.keyManager = SecureEnclaveKeyManager(
            service: configuration.keychainService,
            account: configuration.keychainAccount
        )
        self.biometric = BiometricAuthManager()
    }

    // MARK: - Public surface

    /// `true` iff a Secure Enclave key handle exists in the device Keychain for
    /// this `keychainService` / `keychainAccount` pair.
    public var keyExists: Bool {
        keyManager.keyExists
    }

    /// `true` iff this device has a Secure Enclave (i.e. is a physical iPhone or iPad,
    /// not the Simulator and not a Mac).
    public var isSecureEnclaveAvailable: Bool {
        keyManager.isSecureEnclaveAvailable
    }

    /// 8-character hex fingerprint of the device's HPP public key, or `nil` if no key
    /// has been generated yet. Stable across attestations until `deleteKey()` is called.
    public func publicKeyFingerprint() throws -> String? {
        guard let key = try keyManager.loadKeyIfExists() else { return nil }
        return keyManager.compactFingerprint(for: key)
    }

    /// X9.63 base64url public key, or `nil` if no key has been generated yet.
    /// Use this when you want to register the device with your backend ahead of
    /// the first attestation.
    public func publicKeyB64URL() throws -> String? {
        guard let key = try keyManager.loadKeyIfExists() else { return nil }
        return keyManager.publicKeyB64URL(for: key)
    }

    /// Run a full HPP attestation round-trip:
    ///   `POST /challenge` → biometric → SE sign → `POST /verify` → return result.
    ///
    /// - Parameter reason: User-facing string shown in the system biometric prompt.
    /// - Returns: An `AttestationResult` containing the session token to forward
    ///   to your relying-party backend.
    /// - Throws: `HPPError`. See its cases for what callers should distinguish.
    public func attest(reason: String) async throws -> AttestationResult {
        // 1. Challenge
        let challenge = try await fetchChallenge()

        // 2. Biometric — also unblocks the SE key for signing in this session
        let assurance = try await biometric.authenticate(reason: reason)

        // 3. SE key
        let key: SecureEnclave.P256.Signing.PrivateKey
        do {
            key = try keyManager.getOrCreateKey()
        } catch let error as HPPError {
            throw error
        } catch {
            throw HPPError.signingFailed(error.localizedDescription)
        }
        let fingerprint = keyManager.compactFingerprint(for: key)
        let pubKeyB64 = keyManager.publicKeyB64URL(for: key)

        // 4. Build proof JWT
        let jwt: String
        do {
            jwt = try JWTBuilder.build(
                challenge: challenge,
                assurance: assurance,
                publicKeyB64URL: pubKeyB64,
                keyFingerprint: fingerprint,
                sign: { [keyManager] data in
                    try keyManager.signRaw(data, using: key)
                }
            )
        } catch let error as HPPError {
            throw error
        } catch {
            throw HPPError.signingFailed(error.localizedDescription)
        }

        // 5. Submit to /verify
        let verify = try await postVerify(jwt: jwt)

        return AttestationResult(
            sessionToken: verify.session_token,
            receiptId: verify.receipt_id,
            assurance: assurance,
            publicKeyFingerprint: fingerprint
        )
    }

    /// After a successful `attest(...)`, deposit the session token into a relay
    /// slot so a waiting browser (e.g. one that rendered the QR via the verifier's
    /// `/qr?relay_id=...` endpoint) can pick it up via its 2-second poll on
    /// `GET /relay/:id`.
    ///
    /// This method is best-effort. It returns silently on a 404 (relay expired)
    /// or 401 (the verifier didn't accept the token). It only throws on transport
    /// errors so the caller can decide whether to retry.
    public func depositToRelay(_ result: AttestationResult, relayId: String) async throws {
        guard let url = URL(string: "\(configuration.verifierURL.absoluteString)/relay/\(relayId)") else {
            throw HPPError.network("Invalid relay URL")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = configuration.relayTimeout
        request.httpBody = try JSONSerialization.data(withJSONObject: ["session_token": result.sessionToken])

        let (_, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw HPPError.network("No HTTP response from relay endpoint")
        }
        // 200 = ok, 404 = relay gone, 401 = token rejected. Don't surface 401/404 — those
        // are normal "user took too long" outcomes. Anything else is unexpected.
        if http.statusCode == 200 || http.statusCode == 401 || http.statusCode == 404 { return }
        throw HPPError.relayFailed(status: http.statusCode, message: nil)
    }

    /// Removes the device's HPP key from the Keychain. The next call to
    /// `attest(...)` will generate a fresh key.
    public func deleteKey() {
        keyManager.deleteKey()
    }

    // MARK: - Private

    private func fetchChallenge() async throws -> ChallengeResponse {
        guard let url = URL(string: "\(configuration.verifierURL.absoluteString)/challenge") else {
            throw HPPError.network("Invalid verifier URL")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = configuration.challengeTimeout
        request.httpBody = try JSONSerialization.data(withJSONObject: ["hpp_ver": configuration.hppVersion])

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await urlSession.data(for: request)
        } catch {
            throw HPPError.network(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw HPPError.network("No HTTP response from challenge endpoint")
        }
        if http.statusCode == 502 || http.statusCode == 503 {
            throw HPPError.verifierColdStart
        }
        guard http.statusCode == 200 else {
            let message = String(data: data, encoding: .utf8)
            throw HPPError.challengeFailed(status: http.statusCode, message: message)
        }
        return try JSONDecoder().decode(ChallengeResponse.self, from: data)
    }

    private func postVerify(jwt: String) async throws -> VerifySuccess {
        guard let url = URL(string: "\(configuration.verifierURL.absoluteString)/verify") else {
            throw HPPError.network("Invalid verifier URL")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = configuration.verifyTimeout
        request.httpBody = try JSONSerialization.data(withJSONObject: [:] as [String: Any])

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await urlSession.data(for: request)
        } catch {
            throw HPPError.network(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw HPPError.network("No HTTP response from verify endpoint")
        }
        if http.statusCode == 502 || http.statusCode == 503 {
            throw HPPError.verifierColdStart
        }
        if http.statusCode == 200 {
            return try JSONDecoder().decode(VerifySuccess.self, from: data)
        }
        // The verifier returns structured failures for protocol-level rejections.
        if let failure = try? JSONDecoder().decode(VerifyFailure.self, from: data) {
            throw HPPError.verificationRejected(code: failure.reason, reason: failure.reason)
        }
        throw HPPError.verifyFailed(status: http.statusCode, message: String(data: data, encoding: .utf8))
    }
}
