# Contributing to HPP

Thank you for considering a contribution. HPP is an evolving protocol; the SDK is the surface where adopters meet the spec, so even small clarifications matter.

## How to file an issue

- Reproduce on `main` first
- Include OS, browser, language version, exact reproduction steps
- For protocol-level questions, link the relevant section of [`protocol/openapi.yaml`](protocol/openapi.yaml) or [`protocol/docs/`](protocol/docs/)
- For security-sensitive issues, do **not** file a public issue — see [`SECURITY.md`](SECURITY.md)

## How to propose a change

1. Open an issue first describing the proposed change and rationale
2. Wait for maintainer ack before opening a PR for non-trivial work
3. Branch from `main`; one logical change per PR
4. Match the existing code style (Apache 2.0 file headers; no third-party deps without explicit discussion)
5. Update tests, docs, and `CHANGELOG.md` in the same PR

## Scope of contributions

| Welcome | Discuss first | Out of scope |
|---|---|---|
| Bug fixes | Spec changes | New features that materially change the protocol invariants |
| Doc clarifications | New endpoints in OpenAPI | Anything that loosens privacy guarantees |
| Test vector additions | New language SDKs | Vendor-specific implementations |
| Chrome extension polish | iOS Swift Package surface | Centralized identity binding |
| Integration examples | Cross-cutting refactors | Telemetry, analytics, surveillance hooks |

The protocol invariants (HPP-PRES, NPHT, Biometric Burn, CCM, H-Constant) are the **load-bearing security claims**. Changes that affect them require a formal review against the threat model in [`protocol/docs/threat-model.md`](protocol/docs/threat-model.md).

## Code style

- Apache 2.0 header on new source files
- Two-space indent for JSON / YAML; language conventions for code (Swift, JavaScript)
- No emojis in source code or commit messages
- No marketing language in code comments — be honest about what proves what
- Every public-facing claim should have a citation: code reference, EVD entry ID, or patent application number

## Review process

- Maintainers review on a best-effort basis (this is a small project)
- Sub-trivial changes: 1 maintainer approval
- Spec changes: at least 2 maintainer approvals + cite the threat model
- Security-relevant changes: see [`SECURITY.md`](SECURITY.md) for the disclosure-coordination process

## Code of conduct

Be technical, be honest, be brief. Disagree about engineering decisions on the merits, with citations. Do not personalize disagreements. The maintainers reserve the right to remove contributions or contributors that do not adhere to this norm.

## Patent / commercial licensing

Contributions are accepted under [Apache 2.0](LICENSE), which includes a contributor patent grant for the contribution itself. Commercial use of the broader HPP architecture is governed separately — see [`PATENT-NOTICE.md`](PATENT-NOTICE.md).

## Questions

Open an issue tagged `question`. For commercial / licensing inquiries, see [`PATENT-NOTICE.md`](PATENT-NOTICE.md).
