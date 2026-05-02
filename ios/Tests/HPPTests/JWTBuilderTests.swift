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

final class JWTBuilderTests: XCTestCase {

    func testJWTHasThreeBase64URLSegments() throws {
        let challenge = ChallengeResponse(
            nonce: String(repeating: "a", count: 64),
            epoch: 1_700_000_000,
            site: "example.com",
            challenge_id: "ch-abc123"
        )

        let jwt = try JWTBuilder.build(
            challenge: challenge,
            assurance: .faceID,
            publicKeyB64URL: "AAA",
            keyFingerprint: "8037cbe0",
            sign: { _ in Data(repeating: 0x42, count: 64) },
            now: Date(timeIntervalSince1970: 1_700_000_000)
        )

        let parts = jwt.split(separator: ".")
        XCTAssertEqual(parts.count, 3)
        for part in parts {
            // base64url alphabet — no padding, no +, no /
            XCTAssertFalse(part.contains("="), "JWT segment contains padding")
            XCTAssertFalse(part.contains("+"), "JWT segment contains '+'")
            XCTAssertFalse(part.contains("/"), "JWT segment contains '/'")
        }
    }

    func testHeaderIsCanonical() throws {
        let challenge = ChallengeResponse(
            nonce: "deadbeef", epoch: 1, site: "example.com", challenge_id: "ch-1"
        )
        let jwt = try JWTBuilder.build(
            challenge: challenge,
            assurance: .touchID,
            publicKeyB64URL: "AAA",
            keyFingerprint: "abcd1234",
            sign: { _ in Data(repeating: 0x00, count: 64) }
        )

        let headerB64 = String(jwt.split(separator: ".")[0])
        let headerData = Data(base64URLDecoded: headerB64)!
        let header = String(data: headerData, encoding: .utf8)!
        // Field order MUST be alg, kid, typ — alphabetical, matches reference iOS impl.
        XCTAssertEqual(header, "{\"alg\":\"ES256\",\"kid\":\"abcd1234\",\"typ\":\"HPP-Proof\"}")
    }

    func testPayloadHasSortedKeys() throws {
        let challenge = ChallengeResponse(
            nonce: "n1", epoch: 100, site: "example.com", challenge_id: "ch-1"
        )
        let jwt = try JWTBuilder.build(
            challenge: challenge,
            assurance: .passcode,
            publicKeyB64URL: "PUB",
            keyFingerprint: "deadbeef",
            sign: { _ in Data(repeating: 0x00, count: 64) },
            now: Date(timeIntervalSince1970: 1_700_000_000)
        )

        let payloadB64 = String(jwt.split(separator: ".")[1])
        let payloadData = Data(base64URLDecoded: payloadB64)!
        let payloadJSON = String(data: payloadData, encoding: .utf8)!

        // JSONSerialization with .sortedKeys produces alphabetical key order.
        let expected = "{\"assurance\":\"PASSCODE\",\"challenge_id\":\"ch-1\",\"epoch\":100,\"exp\":1700000300,\"hpp_ver\":\"2.0\",\"iat\":1700000000,\"nonce\":\"n1\",\"pub_key\":\"PUB\",\"site\":\"example.com\"}"
        XCTAssertEqual(payloadJSON, expected)
    }

    func testSignerReceivesHeaderDotPayloadAsAscii() throws {
        let challenge = ChallengeResponse(
            nonce: "n1", epoch: 1, site: "example.com", challenge_id: "ch-1"
        )

        var observedSigningInput: Data?
        _ = try JWTBuilder.build(
            challenge: challenge,
            assurance: .faceID,
            publicKeyB64URL: "PUB",
            keyFingerprint: "deadbeef",
            sign: { input in
                observedSigningInput = input
                return Data(repeating: 0x00, count: 64)
            }
        )

        let observed = String(data: observedSigningInput!, encoding: .ascii)!
        XCTAssertTrue(observed.contains("."), "Signing input must be header.payload")
        XCTAssertEqual(observed.filter { $0 == "." }.count, 1)
    }
}

private extension Data {
    init?(base64URLDecoded string: String) {
        var s = string.replacingOccurrences(of: "-", with: "+")
                      .replacingOccurrences(of: "_", with: "/")
        let pad = (4 - s.count % 4) % 4
        s += String(repeating: "=", count: pad)
        guard let data = Data(base64Encoded: s) else { return nil }
        self = data
    }
}
