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

/// Wire format of `POST /challenge` response.
struct ChallengeResponse: Decodable {
    let nonce: String
    let epoch: Int
    let site: String
    let challenge_id: String
}

/// Wire format of a successful `POST /verify` response.
struct VerifySuccess: Decodable {
    let status: String
    let session_token: String
    let receipt_id: String
    let assurance: String
}

/// Wire format of a failed `POST /verify` response.
struct VerifyFailure: Decodable {
    let status: String
    let reason: String
}
