# HPP Protocol — Canonical Reference

This folder is the **protocol-agnostic core** of the HPP SDK. Everything here is implementation-language-neutral: schemas, the OpenAPI surface, formal model documents, and crypto test vectors. The iOS, Website, and Chrome-extension surfaces (siblings of this folder) all conform to what's specified here.

## Contents

| File | Purpose |
|---|---|
| [`openapi.yaml`](openapi.yaml) | Canonical Verifier API v1.0 (OpenAPI 3.1.0). 16 endpoint definitions + extension blocks for versioning, error codes, and rate limits. |
| [`schemas/presence-receipt.json`](schemas/presence-receipt.json) | JSON Schema for the canonical presence receipt. |
| [`test-vectors.json`](test-vectors.json) | Deterministic crypto test vectors (canonical strings + SHA-256 digests + Ed25519 signatures over the digests) with the exact verification procedure documented inline. |
| [`docs/core-spec.md`](docs/core-spec.md) | Formal model: HPP-PRES, NPHT, Biometric Burn, CCM (the four formal notions) + H-Constant (the physical assumption). |
| [`docs/architecture.md`](docs/architecture.md) | System architecture: phone, verifier, relay, browser, receipt chain. |
| [`docs/canonical-signing.md`](docs/canonical-signing.md) | Canonical-string construction rules. UTF-8, LF newlines, fixed field order, final newline. Single-byte change MUST cause verification failure. |
| [`docs/receipt-canon.md`](docs/receipt-canon.md) | Receipt structure, hash linkage, GENESIS marker, chain integrity rules. |
| [`docs/threat-model.md`](docs/threat-model.md) | Adversarial games + assumptions. Defines what HPP defends against and what it explicitly does not. |
| [`docs/verifier-api.md`](docs/verifier-api.md) | Endpoint-by-endpoint API documentation matching the OpenAPI spec. |
| [`docs/relying-party-guide.md`](docs/relying-party-guide.md) | How to integrate HPP into an external platform without using the Website SDK. Step-by-step manual integration pattern. |

## Versioning

The protocol is at **canonical version v1.0**. The OpenAPI spec uses a `/v1/` base-path convention; semver applies to backward-compatible evolutions of v1, with the deprecation policy documented in `openapi.yaml`'s `x-versioning-strategy` block.

## Production reference vs canonical spec — important note

The **canonical v1.0 spec** in this folder is the design target. The **reference verifier** currently running at `https://hpp-verifier.onrender.com` (open source at [`github.com/AgileOnTarget/hpp-verifier`](https://github.com/AgileOnTarget/hpp-verifier)) was built before the v1.0 spec was finalized and uses **slightly different endpoint naming** (no `/v1/` prefix; `POST /challenge` instead of `POST /v1/nonce`; etc.). That production verifier currently exposes **30 endpoints** vs. the **16 in the canonical spec** — production is a superset including downstream consumer-app endpoints (RDM.1 roadmap voting, MSG.1 messaging) that are out of HPP-protocol scope but bundled in the same backend for delivery convenience.

If you're writing a new implementation against the canonical spec, follow `openapi.yaml`. If you're writing an integration that needs to talk to the live reference verifier today, see the production endpoint table in the parent project's System Reality §7 (`HPP_00_02_STR_System_Reality_v1_7.md` in the parent monorepo).

The next minor version of the verifier will reconcile these (rename to the canonical `/v1/` paths, deprecate the bare-path versions for one major version per the policy in the OpenAPI spec).

## Conformance

A future conformance test suite (Phase 3) will let any HPP verifier implementation prove it correctly handles the test vectors in `test-vectors.json`. Until then, the test vectors document the exact bytes that must reconstruct, hash, and verify under any compliant implementation.

## Security

See [`../SECURITY.md`](../SECURITY.md) for the disclosure policy and [`docs/threat-model.md`](docs/threat-model.md) for the adversarial scope.
