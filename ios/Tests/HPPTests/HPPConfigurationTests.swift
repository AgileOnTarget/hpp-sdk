// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Agile On Target LLC
//
// This file is part of the Human Presence Protocol SDK
// (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
// License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
// PATENT-POLICY.md for the scope of the patent grant. All trademarks
// and patent rights reserved by Agile On Target LLC
// (USPTO Customer No. 224891).

import XCTest
@testable import HPP

final class HPPConfigurationTests: XCTestCase {

    func testDefaults() {
        let config = HPPConfiguration(
            verifierURL: URL(string: "https://hpp-verifier.onrender.com")!,
            site: "example.com"
        )
        XCTAssertEqual(config.hppVersion, "1.0")
        XCTAssertEqual(config.challengeTimeout, 10)
        XCTAssertEqual(config.verifyTimeout, 30)
        XCTAssertEqual(config.relayTimeout, 10)
        XCTAssertEqual(config.keychainService, "com.hpp.sdk")
        XCTAssertEqual(config.keychainAccount, "se-signing-key-v1")
    }

    func testCustomValues() {
        let config = HPPConfiguration(
            verifierURL: URL(string: "https://verifier.example")!,
            site: "example.com",
            hppVersion: "1.0",
            challengeTimeout: 5,
            verifyTimeout: 20,
            relayTimeout: 5,
            keychainService: "com.example.app",
            keychainAccount: "key-v2"
        )
        XCTAssertEqual(config.challengeTimeout, 5)
        XCTAssertEqual(config.verifyTimeout, 20)
        XCTAssertEqual(config.keychainService, "com.example.app")
    }
}
