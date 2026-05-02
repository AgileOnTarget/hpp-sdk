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

/// Connection settings for an `HPPClient`.
///
/// The `verifierURL` is the HPP verifier deployment your relying party trusts.
/// `site` is the canonical site identifier the verifier issued you (typically the
/// hostname your users see in the QR code).
public struct HPPConfiguration: Sendable {

    public let verifierURL: URL
    public let site: String
    public let hppVersion: String
    public let challengeTimeout: TimeInterval
    public let verifyTimeout: TimeInterval
    public let relayTimeout: TimeInterval
    public let keychainService: String
    public let keychainAccount: String

    /// Creates a configuration.
    ///
    /// - Parameters:
    ///   - verifierURL: Base URL of the HPP verifier (e.g. `https://hpp-verifier.onrender.com`).
    ///     No trailing slash.
    ///   - site: Site identifier baked into the signed attestation. Must match the
    ///     `site` field issued by the verifier in the challenge response.
    ///   - hppVersion: Protocol version sent with `/challenge`. Default `"1.0"`. The
    ///     proof JWT itself is `hpp_ver: "2.0"` on the wire — that's a fixed protocol
    ///     constant, not configurable.
    ///   - challengeTimeout: Seconds to wait on `POST /challenge`. Default 10.
    ///   - verifyTimeout: Seconds to wait on `POST /verify`. Default 30 (verifier
    ///     cold-starts can take up to ~25s on Render).
    ///   - relayTimeout: Seconds to wait on `POST /relay/:id`. Default 10.
    ///   - keychainService: Keychain `kSecAttrService` for the device-bound key.
    ///     Override only if you ship multiple SDK instances in one app and need
    ///     separate keys.
    ///   - keychainAccount: Keychain `kSecAttrAccount` for the device-bound key.
    public init(
        verifierURL: URL,
        site: String,
        hppVersion: String = "1.0",
        challengeTimeout: TimeInterval = 10,
        verifyTimeout: TimeInterval = 30,
        relayTimeout: TimeInterval = 10,
        keychainService: String = "com.hpp.sdk",
        keychainAccount: String = "se-signing-key-v1"
    ) {
        self.verifierURL = verifierURL
        self.site = site
        self.hppVersion = hppVersion
        self.challengeTimeout = challengeTimeout
        self.verifyTimeout = verifyTimeout
        self.relayTimeout = relayTimeout
        self.keychainService = keychainService
        self.keychainAccount = keychainAccount
    }
}
