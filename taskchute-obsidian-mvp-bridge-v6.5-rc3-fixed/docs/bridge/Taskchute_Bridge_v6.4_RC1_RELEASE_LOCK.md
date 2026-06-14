# TaskChute Bridge v6.4 RC1 Release Lock

Status: RC1 fixed candidate  
Fixed date: 2026-06-14 JST  
Scope: Obsidian TaskChute Bridge / Cloudflare Worker / D1 / Obsidian plugin

## Fixed state

Bridge v6.4 RC1 is fixed as a release candidate after completing the Task-related major sync tests and reflecting the RC1 source-of-truth references into README / AGENTS / docs/bridge.

## Source-of-truth documents

The following external documents are the source-of-truth candidates for v6.4 RC1:

- `Taskchute_Bridge_統合設計仕様書_v6.4_RC1_整理版.md`
- `Taskchute_Bridge_引継ぎ_v6.4_RC1_仕様整理後.md`
- `Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`
- `Taskchute_Bridge_仕様整理マップ_v6.4_RC1.md`

Do not duplicate these documents into divergent copies. Repository documents should reference these fixed filenames.

## Confirmed scope

- README / AGENTS / docs/bridge reflected.
- Implementation files are unchanged for this release-lock operation.
- `main.js` single-file operation continues.
- `node --check .\main.js` passes.

## Non-negotiable invariants

- Taskchute date Markdown is the source of truth.
- `Taskchute/_system/index.json` is a rebuildable cache.
- Ack only after save, reload, and verification.
- false-applied is forbidden.
- Cursor skipping is forbidden.
- TaskUpdated and TaskMoved v3 have separate responsibilities.
- start_plan-derived TaskMoved must not be removed by coalescing.
- TaskDeleted must delete only the current target entry resolved from current Markdown.
- safe_stopped is separate from the user setting for inbound full-event apply ON/OFF.

## RC1 focus checks before promotion

Before promoting from RC1 to a final v6.4 release, re-check:

- start_plan-derived TaskMoved v3
- index stale warning
- safe_stopped recovery
- no false-applied
- no cursor skip

## Not included in RC1 finalization

- diagnostics retention limit design
- mobile resume / offline / long-running operation tests
- UI wording cleanup
- snapshot / R2 recovery design
- comment update/delete
