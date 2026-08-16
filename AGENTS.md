# TaskChute Obsidian MVP Development Guard

## Current Baseline

- Current implementation and immutable test distribution: `v0.6.68` BRAT Prerelease (tag target `2c33fdaaf5f990d0045120502094934eb195bb20`). v0.6.68 is Integrated=Yes / Prereleased-Test-distributed=Yes / Verified=No / Released=No.
- v0.6.67 real-device `UNDO-BRIDGE-CROSS-SECTION-01` failed because TaskBoard Ctrl+Z could pass through the generic editable/button guard into Obsidian local Undo before the semantic TaskChute route owned it. v0.6.68 routes TaskBoard non-text Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z through one capture-phase gateway while editor/input contexts remain native. Synthetic tests pass; real Vault / remote / mobile evidence remains `NOT_VERIFIED`.
- Distribution remains `main.js`, `manifest.json`, and `styles.css`.
- Keep the single-file `main.js` runtime unless the user explicitly approves a packaging change.

## Canonical Documentation

Use these documents as the current source of truth, in this order when relevant:

1. `docs/CURRENT.md`
2. `docs/FEATURES.md`
3. `docs/SPEC.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DECISIONS.md`
6. `docs/TEST_MATRIX.md`

Historical files under `docs/archive/` preserve old decisions and test evidence. They are not authoritative for current implementation work. If an archive document conflicts with canonical documentation or current code, do not apply the historical rule.

## Data And Identity

- Vault Markdown is the source of truth for TaskBoard date, section, order, entry position, task definition, and persisted execution state.
- `Taskchute/_system/index.json` is a rebuildable cache. Do not treat index-only disagreement as authoritative over Markdown.
- Task identity is `task_id + entry_id`. An event with `entry_id` must not resolve or Ack a different entry using `task_id` alone.
- Current Routine occurrence identity is `routine:{routine_id}:{YYYY-MM-DD}`. Do not include title, scheduled time, section, or estimate in the key.
- Do not infer Routine identity from `task_id` alone.

## Bridge Safety

- Ack only after saving and re-reading the physical Vault state, then verifying the expected result.
- Never mark an event applied when the physical state was not verified.
- Never advance the contiguous cursor past failed, unknown, unsupported, unresolved, or unverified events.
- `TaskMoved v4` uses `target_order_entry_ids` and `source_order_entry_ids` as the ordering authority. Do not silently downgrade an invalid v4 payload to task-id ordering.
- Explicit interrupt continuations, such as `creation_source=interrupt-continuation`, may create a different `entry_id` for the same Routine occurrence key. Preserve the continuation-specific duplicate exception.
- Rotation Routine is local-only and outside the Bridge synchronization scope.

## Safe Rekey

For the same Routine occurrence key with a different `entry_id`, do not Ack or rekey by default. Rekey is allowed only when all applicable checks prove that:

- the existing occurrence is not started, running, paused, interrupted, stopped, completed, or deleted;
- no Log, LogDaily, runtime, or execution-history reference depends on the old entry identity;
- the payload `entry_id` is unused by another task;
- the rekeyed Markdown can be re-read and verified for `task_id`, `entry_id`, and `routine_occurrence_key`.

Otherwise leave the event unacked and record a diagnostic such as identity conflict or `entry_id_collision`.

## Change And Test Discipline

- Do not weaken post-save verification, false-applied prevention, cursor safety, mobile hidden drain guards, or identity collision guards.
- A successfully synchronized supported TaskMoved D&D must not enter Undo history without exact `bridgeTaskMovedSemantic`. Scheduled or unrelated commits must not finalize its operation-scoped batch.
- Runtime or Bridge changes require reviewing the affected rows in `docs/TEST_MATRIX.md` and recording real verification state. Do not promote historical PASS results to the current release without current evidence.
- Keep `PASS`, `FAIL`, `BLOCKED`, and `NOT_VERIFIED` distinct. Unknown or mixed test data is not PASS.
- Update root `CHANGELOG.md` for every release/version change. Keep it to release-level summaries; it does not replace Git history, and historical docs must not be copied into it wholesale.
- Treat `docs/TEST_MATRIX.md` as the authority for current test state, including when writing CHANGELOG verification notes.
- Keep Integrated, Prereleased / Test-distributed, Verified, and Released distinct. Main integration and Prerelease publication do not prove device verification.
- Do not mark TEST_MATRIX rows PASS from implementation completion, syntax checks, or local helper tests. PASS requires user device verification and recorded current evidence; use FAIL, BLOCKED, or NOT_VERIFIED otherwise.
- Do not independently change user-visible behavior, identity/sync/Ack/lifecycle semantics, or destructive migration policy. Stop and report when such a product or data-semantics decision is not already authorized by the user and canonical docs.
- Do not modify tags, releases, D1 data, Cloudflare resources, or real Vault data unless the user explicitly requests it.

Minimum runtime syntax check:

```powershell
node --check .\main.js
```

## Git And Pull Request Workflow

- Work and commit on `feature/v6.6-routine-sync`; do not create implementation commits directly on `main`.
- After checks pass, push feature, create a PR to `main`, and review its base/head, files, diff, and checks.
- When the PR is clean and fast-forward integration is possible, continue through main integration in the same task instead of leaving the PR open for routine user approval.
- Prefer `--ff-only`; do not rebase, force push, squash, or create an unnecessary merge commit.
- Return to `feature/v6.6-routine-sync` after main integration and confirm both remote branches and a clean worktree.
- Runtime, UI, or Bridge changes may be integrated into main and published as an immutable BRAT Prerelease before device verification when BRAT is required to distribute the test build. Record that state as Prereleased / Test-distributed, keep affected TEST_MATRIX rows `NOT_VERIFIED`, and test the exact published assets.
- After publication, never move the tag or replace the GitHub Release assets for the same version. If testing finds a defect, fix and publish the next version.
- Follow `docs/DEVELOPMENT_WORKFLOW.md` for the complete procedure.
