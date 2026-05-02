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

final class Base64URLTests: XCTestCase {

    func testKnownVector() {
        // Standard test vector: "subject" → c3ViamVjdA  (RFC 4648 §10)
        let input = Data("subject".utf8)
        XCTAssertEqual(input.base64URLEncoded(), "c3ViamVjdA")
    }

    func testStripsPaddingEquals() {
        // A 1-byte input would normally produce "AQ==" in base64.
        let input = Data([0x01])
        let encoded = input.base64URLEncoded()
        XCTAssertFalse(encoded.contains("="))
        XCTAssertEqual(encoded, "AQ")
    }

    func testReplacesPlusAndSlash() {
        // 0xFB 0xFF -> base64 "+/8=" -> base64url "-_8"
        let input = Data([0xFB, 0xFF])
        XCTAssertEqual(input.base64URLEncoded(), "-_8")
    }

    func testEmptyData() {
        XCTAssertEqual(Data().base64URLEncoded(), "")
    }
}
