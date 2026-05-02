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

/// Builds an HPP-Proof ES256 JWT.
///
/// Header:    `{"alg":"ES256","kid":"<compact-fingerprint>","typ":"HPP-Proof"}`
/// Payload:   sorted-key JSON: assurance, challenge_id, epoch, exp, hpp_ver:"2.0",
///            iat, nonce, pub_key, site (plus optional age fields).
/// Signature: raw IEEE P1363 64-byte R‖S over ASCII `headerB64u.payloadB64u` (RFC 7518 §3.4).
enum JWTBuilder {

    static func build(
        challenge: ChallengeResponse,
        assurance: BiometricAssurance,
        publicKeyB64URL: String,
        keyFingerprint: String,
        sign: (Data) throws -> Data,
        now: Date = Date()
    ) throws -> String {
        let headerJSON = "{\"alg\":\"ES256\",\"kid\":\"\(keyFingerprint)\",\"typ\":\"HPP-Proof\"}"
        let headerB64 = Data(headerJSON.utf8).base64URLEncoded()

        let nowSec = Int(now.timeIntervalSince1970)
        let payload: [String: Any] = [
            "assurance":    assurance.rawValue,
            "challenge_id": challenge.challenge_id,
            "epoch":        challenge.epoch,
            "exp":          nowSec + 300,
            "hpp_ver":      "2.0",
            "iat":          nowSec,
            "nonce":        challenge.nonce,
            "pub_key":      publicKeyB64URL,
            "site":         challenge.site,
        ]
        let payloadData = try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
        let payloadB64 = payloadData.base64URLEncoded()

        let signingInput = Data((headerB64 + "." + payloadB64).utf8)
        let signature = try sign(signingInput)
        let sigB64 = signature.base64URLEncoded()

        return headerB64 + "." + payloadB64 + "." + sigB64
    }
}
