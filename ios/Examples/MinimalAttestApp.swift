// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Agile On Target LLC
//
// This file is part of the Human Presence Protocol SDK
// (https://github.com/AgileOnTarget/hpp-sdk). Licensed under the Apache
// License, Version 2.0; see LICENSE, NOTICE, PATENT-NOTICE.md, and
// PATENT-POLICY.md for the scope of the patent grant. All trademarks
// and patent rights reserved by Agile On Target LLC
// (USPTO Customer No. 224891).

// A minimal SwiftUI example showing how to embed HPP attestation in a button.
//
// This file is illustrative — it is NOT compiled by the package. To use it,
// drop into your own iOS 17+ Xcode project that depends on the HPP package.

import SwiftUI
import HPP

struct AttestButton: View {
    @State private var status: String = "Tap to verify presence"
    @State private var isWorking: Bool = false

    private let client = HPPClient(configuration: HPPConfiguration(
        verifierURL: URL(string: "https://hpp-verifier.onrender.com")!,
        site: "example.com"
    ))

    var body: some View {
        VStack(spacing: 16) {
            Text(status)
                .font(.body)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button {
                Task { await runAttestation() }
            } label: {
                Text(isWorking ? "Working…" : "Verify Presence")
                    .font(.headline)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(isWorking ? Color.gray : Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(isWorking)
            .padding(.horizontal)
        }
    }

    private func runAttestation() async {
        isWorking = true
        defer { isWorking = false }
        do {
            let result = try await client.attest(reason: "Verify your presence to log in")
            status = "Verified · \(result.assurance.rawValue) · \(result.publicKeyFingerprint)"
            // → forward result.sessionToken to your backend.
        } catch let error as HPPError {
            status = error.localizedDescription ?? "Failed"
        } catch {
            status = error.localizedDescription
        }
    }
}
