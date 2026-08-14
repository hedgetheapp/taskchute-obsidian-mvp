# Documentation Index

Current baseline: v0.6.58 BRAT Prerelease. It separates inbound server Ack from local cursor persistence and adds cursor-only reconciliation. Synthetic and structural checks passed; real Vault and mobile verification remain pending.

## Current Canonical

Use these documents as the current source of truth. Implementation presence and current verification status remain separate.

- [Current status](CURRENT.md)
- [Feature inventory](FEATURES.md)
- [Behavior specification](SPEC.md)
- [Architecture](ARCHITECTURE.md)
- [Design decisions](DECISIONS.md)
- [Test matrix](TEST_MATRIX.md)

These documents describe current behavior and current status. They do not serve as the version-by-version release history.

## Current Detail

- [Task Identity and Delete Semantics](bridge/Task_Identity_and_Delete_Semantics_v6.5_RC1.md)

Current detail documents supplement the canonical set. They do not override it.

## Regression

- [Current test matrix](TEST_MATRIX.md)
- [Archived regression procedures](archive/README.md#v66-routine-sync)

An unchecked procedure is not PASS evidence. Do not promote historical results to the current release without current verification.

## Release

- [Changelog](../CHANGELOG.md): release/version単位の変更要約
- [Development workflow](DEVELOPMENT_WORKFLOW.md)
- [v0.6.58 BRAT Prerelease](release/v0.6.58.md)
- [BRAT release operation](brat-release-operation.md)
- [Release checklist](release-checklist.md)

GitHub Releases preserve the distribution history. Git history remains the complete technical history.

## Archive

- [Historical documentation index](archive/README.md)

Archive documents preserve prior specifications, guards, test evidence, drafts, and plans. They are not authoritative for current implementation decisions.
