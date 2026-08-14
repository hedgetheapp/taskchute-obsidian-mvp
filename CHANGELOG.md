# Changelog

This file summarizes release-level changes for TaskChute Obsidian MVP.

For current behavior, see [`docs/SPEC.md`](docs/SPEC.md).
For current implementation status, see [`docs/CURRENT.md`](docs/CURRENT.md).
For current verification status, see [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md).

Historical verification recorded below is evidence for that release only. It is not automatically promoted to the current release.

## v0.6.60 - 2026-08-15

Type: Runtime BRAT Prerelease for device testing

### Changed

- flush送信snapshot対象のTaskCreated event IDをruntimeで追跡するようにした。
- create直後renameで、flush対象外のpending / retry可能failed TaskCreatedだけをtitle/file merge対象にした。
- in-flight TaskCreatedまたはTaskCreated不在では、同一`task_id + entry_id`のTaskUpdatedを追加して旧titleだけの送信を防ぐようにした。
- pending TaskCreatedへのrename merge後も既存Auto Flushをwakeするようにした。
- rename handoffのplan、merge、TaskUpdated enqueue / failureをdiagnosticsへ追加した。
- pending / in-flight / sent相当、3件連続identity、manual flush非依存のfocused synthetic testを追加した。
- `manifest.json`を`0.6.60`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- TC-RENAME focused synthetic: PASS
- TMV4-BASIC-01 synthetic: PASS
- v0.6.60実Vault create→rename / TMV4-BASIC-01: `NOT_VERIFIED`

Tag: `v0.6.60`
GitHub Release: [v0.6.60 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.60)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.60.md`](docs/release/v0.6.60.md)

---

## v0.6.59 - 2026-08-15

Type: Runtime BRAT Prerelease for device testing

### Changed

- 同一sectionのtask-row D&DでMarkdownだけが更新されTaskMovedが生成されない経路を修正した。
- D&D前後のentry/task orderを明示取得し、保存後Markdown検証後にTaskMoved v4を1件enqueueするようにした。
- 同一section D&D payloadへsource / targetのentry ID順とtask ID順、正しいfrom / to index、専用payload sourceを保持するようにした。
- order不変のdropではTaskMovedを生成せず、D&D 1操作の専用enqueue siteを1箇所へ限定した。
- drag detection、before / after order、enqueue attempt / skip / resultのdiagnosticsを追加した。
- `manifest.json`を`0.6.59`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- TMV4-BASIC-01 synthetic: PASS
- TMV4 no-op / duplicate prevention synthetic: PASS
- TC-RENAME-SECTION-TOP-01: `FAIL`。T-0593 / E-20260815-0011のTaskCreated（seq 2184、旧title）だけがD1へ到達し、TaskUpdatedは0件。比較のinsert-below B/CはTaskUpdatedまでremote / mobile applied。
- 実Vault TMV4-BASIC-01再試験: create/rename前提FAILのため`BLOCKED`。v0.6.60で再試験する。
- AF-LWU-01 / TaskUpdated / inbound TaskMoved v4 / empty-source / Routine identity実機回帰: `NOT_VERIFIED`

Tag: `v0.6.59`
GitHub Release: [v0.6.59 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.59)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.59.md`](docs/release/v0.6.59.md)

---

## v0.6.58 - 2026-08-15

Type: Runtime BRAT Prerelease for device testing

### Changed

- inbound server Ackとlocal cursor persistenceの結果を分離した。
- Ack 2xx後のcursor保存をinbound専用trusted persistenceへ限定し、latest `data.json`へのmonotonic mergeを追加した。
- server Ack済みeventをMarkdownへ再適用しないcursor-only reconciliationとrecoverable mobile rescueを追加した。
- ambiguous Ack responseへbounded retry / reconciliationを追加し、401 / 403等のhard failureと分離した。
- diagnosticsへAck HTTP、server commit、cursor保存、device guard、reconcile、failure kindを追加した。
- delivery stateをIntegrated / Prereleased or Test-distributed / Verified / Releasedの4状態へ整理した。
- `manifest.json`を`0.6.58`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- ACK-CURSOR-GUARD-01 / ACK-AMBIG-01 / ACK-AUTH-01 / CURSOR-GAP-01 / CURSOR-MERGE-01 / MOBILE-RESCUE-01相当のsynthetic / structural check: OK
- 実Vault / 実mobile Ack / cursor recovery: `NOT_VERIFIED`
- AF-LWU-01実Vault回帰: `PASS`。T-0586 / E-20260815-0004、seq 2162-2164、remote / mobile applied、手動flushなし、3端末UI一致。
- TMV4-BASIC-01実Vault回帰: `FAIL`。T-0589 / E-20260815-0007の同一section D&D後、devだけ更新され、対象TaskMovedは0件。
- TMV4-EMPTY-SOURCE-01実Vault回帰: `NOT_VERIFIED`

Tag: `v0.6.58`
GitHub Release: [v0.6.58 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.58)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.58.md`](docs/release/v0.6.58.md)

---

## v0.6.57 - 2026-08-14

Type: Runtime BRAT Prerelease for device testing

### Changed

- Auto Flush実行中に到着したflush要求をpending wake-upとして保持するようにした。
- 現在のflush終了後、送信可能なpending eventが残る場合だけdebounce / min intervalを守って再scheduleするようにした。
- reschedule requested / executed / not-neededをdiagnosticsへ追加した。
- max retry到達済みfailed eventやsuperseded eventだけでは再scheduleしない。
- `manifest.json`を`0.6.57`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- scheduler helperによるAF-LWU-01 / AF-LWU-02 / AF-LWU-03相当のsynthetic check: OK
- 実Vault端末間試験とAF-LWU-01実機確認: `NOT_VERIFIED`

Tag: `v0.6.57`
GitHub Release: [v0.6.57 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.57)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.57.md`](docs/release/v0.6.57.md)

---

## v0.6.56 - 2026-08-14

Type: Docs-only BRAT Prerelease

### Changed

- Canonical documentation baselineを6文書体制として固定。
- `docs/TEST_MATRIX.md`をcurrent verification sourceとして追加。
- root READMEとdocs indexを現行入口へ整理。
- `manifest.json`を`0.6.56`へ更新。

### Runtime

- `main.js`と`styles.css`はv0.6.55から変更なし。
- Bridge/runtime logicはv0.6.54と同一。

### Verification

- Release記録: `node --check .\main.js` OK、`git diff --check` OK。
- Release時のTEST_MATRIX: PASS 0、FAIL 0、NOT_VERIFIED 21、BLOCKED 2。

Tag: `v0.6.56`
Release commit: `5f8e0e2c7f9fa605f945622262c40cc7eee31cb6`
GitHub Release: [v0.6.56 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.56)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.56.md`](docs/release/v0.6.56.md)

---

## v0.6.55 - 2026-08-14

Type: Documentation consolidation BRAT Prerelease

### Changed

- 現在地、機能、仕様、構成、設計判断を整理するcanonical文書5本を追加。
- `manifest.json`を`0.6.55`へ更新。

### Runtime

- `main.js`と`styles.css`はv0.6.54から変更なし。
- Bridge/runtime logicはv0.6.54と同一。

### Verification

- Release記録: `node --check .\main.js` OK、`git diff --check` OK。
- safe rekeyの実Vault端末間回帰は、過去データ混在のため保留。

Tag: `v0.6.55`
Release commit: `ef857645f149158a9fa2021e9e7c2fe0ac160daf`
GitHub Release: [v0.6.55 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.55)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.54 - 2026-07-30

Type: Runtime BRAT Prerelease

### Changed

- Routine TaskCreatedの重複判定を`routine_occurrence_key + entry_id`へ厳格化。
- 同一occurrence key・異なるentry IDを限定条件下で補正するsafe rekeyを追加。
- payload entry IDの衝突と通常TaskCreatedのtask ID不一致を未Ack停止するguardを追加。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- Release記録: syntax/diff checkとrekey helper behavior testはOK。
- 実Vault端末間スモークは未実施。

Tag: `v0.6.54`
Release commit: `f8842d0b5c73129c6eefcd4f0516db381fc15fc9`
GitHub Release: [v0.6.54 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.54)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.53 - 2026-07-06

Type: Runtime BRAT Prerelease

### Changed

- Routine interrupt continuationのTaskCreatedへRoutine occurrence metadataを継承。
- 保存後MarkdownをTaskCreated payloadの正として再同期。
- inbound duplicate guardをcontinuation-aware化し、明示continuationの別entryを許可。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- Release記録: syntax/diff check、Routine field helper test、protected path比較はOK。
- 実Vault端末間スモークは未実施。

Tag: `v0.6.53`
Release commit: `9b3c36fc4ed846712c88e89a17ee42a2db07f906`
GitHub Release: [v0.6.53 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.53)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.52 - 2026-07-06

Type: Runtime BRAT Prerelease

### Changed

- TaskMoved v4受信でsource sectionが空になるsection変更を許可。
- `source_order_entry_ids=[]`を正当なempty-source caseとして処理。
- v4ではentry orderを正とし、legacy duplicate task ID guardはv3以前に限定。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- Release記録: syntax/diff checkとTaskMoved v4 helper testはOK。
- 実Vault端末間スモークは未実施。

Tag: `v0.6.52`
Release commit: `8e4e0d599a476bef45515eff3216da5b1edd6a25`
GitHub Release: [v0.6.52 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.52)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.51 - 2026-07-06

Type: Runtime BRAT Prerelease

### Changed

- 割り込みLifecycle payloadへinterrupt metadataを追加。
- Log / LogDaily双方へterminal metadataを保存。
- payload `exec_id`優先のrunning cleanup、重複running停止、保存後検証を追加。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- Release記録: syntax/diff checkとlifecycle helper testはOK。
- 実Vault端末間スモークは未実施。

Tag: `v0.6.51`
Release commit: `c6bedae5f267bcbe13e71a0d19c2325a9250fed1`
GitHub Release: [v0.6.51 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.51)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.50 - 2026-07-01

Type: Runtime BRAT Prerelease

### Changed

- 割り込み時の同一task ID・複数entry問題を修正。
- TaskMoved v4へsource/targetのentry ID順序を追加し、entry単位の検証・並べ替えへ変更。
- continuation UIを保存後Markdownの物理sectionへ統一。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- Release記録: syntax/diff checkはOK。
- 実Vault端末間スモークは未実施。

Tag: `v0.6.50`
Release commit: `fcb854375780b3b3f0bdc632527cec84bf2ba817`
GitHub Release: [v0.6.50 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.50)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.49 - 2026-06-27

Type: Runtime BRAT Prerelease

### Changed

- 通常taskのlifecycle eventへRoutine metadataが混入する問題を修正。
- lifecycle専用のnormal / routine_occurrence / identity_conflict classifierを追加。
- source payload生成とinbound applyを明示identity優先へ変更。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- Release記録: syntax/diff checkはOK。
- 実Vault端末間スモークは未実施。

Tag: `v0.6.49`
Release commit: `0a53b6a6cff39fe5bbd1b810a2afaa289232ca85`
GitHub Release: [v0.6.49 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.49)
Assets: `main.js`, `manifest.json`, `styles.css`

---

## v0.6.48 - 2026-06-27

Type: Runtime Release

### Changed

- 通常TaskUpdatedがRoutine occurrence pathへ誤流入する問題を修正。
- date note alias、task note YAML title、heading、rename後pathを物理再読込で検証。
- 実体更新の検証成功時だけAckするようfalse-applied guardを強化。

### Runtime

- `main.js`と`manifest.json`を変更。`styles.css`は変更なし。

### Verification

- GitHub Releaseには実装内容が記録されているが、独立したcurrent test保証としては扱わない。

Tag: `v0.6.48`
Release commit: `611e4f5b91d45196abf7e6c9b2e7f1f0eef91bbb`
GitHub Release: [v0.6.48](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.48)
Assets: `main.js`, `manifest.json`, `styles.css`
