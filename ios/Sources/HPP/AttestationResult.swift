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

/// The outcome of a successful HPP attestation.
///
/// Send `sessionToken` to your relying-party backend; it is a server-signed token
/// the HPP verifier will validate via `GET /session/:token` (or its receipt at
/// `GET /receipt/:receipt_id`).
public struct AttestationResult: Sendable, Equatable {

    /// Server-issued session token (HMAC, opaque to the client).
    public let sessionToken: String

    /// Receipt UUID the verifier will retain in its public chain.
    public let receiptId: String

    /// Authentication assurance the user provided.
    public let assurance: BiometricAssurance

    /// Compact 8-character hex fingerprint of the device's Secure Enclave public key.
    /// Stable across attestations until `deleteKey()` is called.
    public let publicKeyFingerprint: String
}

/// What level of authentication the user passed.
public enum BiometricAssurance: String, Sendable, Codable {
    case faceID = "BIOMETRIC_FACE"
    case touchID = "BIOMETRIC_TOUCH"
    case passcode = "PASSCODE"
}
