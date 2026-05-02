// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Agile On Target LLC
//
// This file is part of the Human Presence Protocol SDK
// (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
// License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
// PATENT-POLICY.md for the scope of the patent grant. All trademarks
// and patent rights reserved by Agile On Target LLC
// (USPTO Customer No. 224891).

import Foundation

/// All errors thrown by `HPPClient`.
public enum HPPError: Error, Sendable {

    /// The Secure Enclave is not present on this hardware (e.g. running in the
    /// Simulator or on a Mac). HPP requires a physical iPhone or iPad with an SE.
    case secureEnclaveUnavailable

    /// Face ID / Touch ID and the device passcode are both unavailable.
    case biometricNotAvailable(String)

    /// The user dismissed the biometric prompt.
    case biometricCancelled

    /// Biometric evaluation returned failure (e.g. too many failed attempts).
    case biometricFailed(String)

    /// `POST /challenge` returned a non-200 response.
    case challengeFailed(status: Int, message: String?)

    /// The verifier returned 502/503 — likely a Render cold-start. Retry after a few seconds.
    case verifierColdStart

    /// `POST /verify` returned a structured rejection (e.g. NONCE_USED, REPLAY_DETECTED).
    case verificationRejected(code: String, reason: String)

    /// `POST /verify` returned an unexpected status.
    case verifyFailed(status: Int, message: String?)

    /// `POST /relay/:id` returned a non-200 response. Best-effort step; usually safe to ignore.
    case relayFailed(status: Int, message: String?)

    /// A network or transport failure occurred.
    case network(String)

    /// A keychain operation failed. The associated value is the `OSStatus`.
    case keychainFailure(OSStatus)

    /// Signing in the Secure Enclave failed.
    case signingFailed(String)
}

extension HPPError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .secureEnclaveUnavailable:
            return "Secure Enclave unavailable. HPP requires a physical iPhone or iPad."
        case .biometricNotAvailable(let reason):
            return "Biometrics not available: \(reason)"
        case .biometricCancelled:
            return "Biometric authentication cancelled."
        case .biometricFailed(let reason):
            return "Biometric authentication failed: \(reason)"
        case .challengeFailed(let status, let message):
            return "Challenge failed (\(status))\(message.map { ": \($0)" } ?? "")"
        case .verifierColdStart:
            return "Verifier is starting up. Try again in a few seconds."
        case .verificationRejected(let code, let reason):
            return "Verification rejected (\(code)): \(reason)"
        case .verifyFailed(let status, let message):
            return "Verify failed (\(status))\(message.map { ": \($0)" } ?? "")"
        case .relayFailed(let status, let message):
            return "Relay failed (\(status))\(message.map { ": \($0)" } ?? "")"
        case .network(let reason):
            return "Network error: \(reason)"
        case .keychainFailure(let status):
            return "Keychain failure (OSStatus \(status))."
        case .signingFailed(let reason):
            return "Signing failed: \(reason)"
        }
    }
}
