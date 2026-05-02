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
import LocalAuthentication

/// Runs the HPP biometric fallback chain:
///   1. Face ID   → assurance: `BIOMETRIC_FACE`
///   2. Touch ID  → assurance: `BIOMETRIC_TOUCH`
///   3. Passcode  → assurance: `PASSCODE`
///
/// Declared as `actor` so `LAContext` is never touched from concurrent contexts.
actor BiometricAuthManager {

    func authenticate(reason: String) async throws -> BiometricAssurance {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"

        var nsError: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &nsError) {
            let biometricType = context.biometryType
            do {
                let success = try await context.evaluatePolicy(
                    .deviceOwnerAuthenticationWithBiometrics,
                    localizedReason: reason
                )
                guard success else {
                    throw HPPError.biometricFailed("Policy returned false.")
                }
                switch biometricType {
                case .faceID:  return .faceID
                case .touchID: return .touchID
                default:       return .faceID  // matches reference behavior on .none
                }
            } catch let laError as LAError {
                switch laError.code {
                case .userCancel, .appCancel, .systemCancel:
                    throw HPPError.biometricCancelled
                case .biometryNotAvailable, .biometryNotEnrolled, .biometryLockout:
                    break  // fall through to passcode
                default:
                    break
                }
            }
        }

        // Priority 3: Device Passcode
        let passcodeContext = LAContext()
        passcodeContext.localizedCancelTitle = "Cancel"

        var passcodeError: NSError?
        guard passcodeContext.canEvaluatePolicy(.deviceOwnerAuthentication, error: &passcodeError) else {
            throw HPPError.biometricNotAvailable(
                passcodeError?.localizedDescription ?? "No authentication method available"
            )
        }

        do {
            let success = try await passcodeContext.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
            guard success else {
                throw HPPError.biometricFailed("Passcode authentication returned false.")
            }
            return .passcode
        } catch let laError as LAError {
            switch laError.code {
            case .userCancel, .appCancel, .systemCancel:
                throw HPPError.biometricCancelled
            case .authenticationFailed:
                throw HPPError.biometricFailed("Authentication failed.")
            default:
                throw HPPError.biometricFailed(laError.localizedDescription)
            }
        }
    }
}
