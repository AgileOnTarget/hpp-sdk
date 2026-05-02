// swift-tools-version: 5.9
//
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Agile On Target LLC
//
// This file is part of the Human Presence Protocol SDK
// (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
// License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
// PATENT-POLICY.md for the scope of the patent grant. All trademarks
// and patent rights reserved by Agile On Target LLC
// (USPTO Customer No. 224891).

import PackageDescription

let package = Package(
    name: "HPP",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "HPP",
            targets: ["HPP"]
        ),
    ],
    targets: [
        .target(
            name: "HPP",
            path: "Sources/HPP"
        ),
        .testTarget(
            name: "HPPTests",
            dependencies: ["HPP"],
            path: "Tests/HPPTests"
        ),
    ]
)
