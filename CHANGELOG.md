# Changelog

This file summarizes release-level changes for TaskChute Obsidian MVP.

For current behavior, see [`docs/SPEC.md`](docs/SPEC.md).
For current implementation status, see [`docs/CURRENT.md`](docs/CURRENT.md).
For current verification status, see [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md).

Historical verification recorded below is evidence for that release only. It is not automatically promoted to the current release.

## v0.6.70 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- TaskBoard row / section-container / empty-section / mobile quick dropを共通`dispatchTaskBoardTaskDrop()` gatewayへ接続し、mutation前からrouteを診断する。
- legacy section-target D&D helperへoperation-scoped TaskMoved Undo lifecycleを追加し、最初のwrite前にbatchを開始する。
- row / section helperのsemantic build、attachment、exact commit、history-top検証、failure barrierを共通finalizerへ集約した。
- route diagnosticsへhandler、source / target、selection、classification、dispatch method、operation、result、failure reasonを追加した。
- `manifest.json`を`0.6.70`へ更新した。

### Verification

- actual `dropTaskBoardDrag()` row / section target、entry-like selection、single enqueue、failure barrier: synthetic PASS
- v0.6.69 direct handoff、v0.6.68 shortcut routing、v0.6.67 lifecycle: PASS
- TMV4、interrupt continuation、rename、insert-below focused regressions: PASS
- targeted BRAT device PASS: section target T-0653 / E-20260816-0029（forward / Undo / Redo seq 2404〜2406）、row target T-0654 / E-20260816-0030（seq 2409〜2411）、empty night target T-0655 / E-20260816-0031（seq 2414〜2416）。各chainはremote / mobile applied、exact semantic history topとdev / remote physical・mobile UI収束を確認。
- `TMV4-BASIC-01` current Forward device PASS: A T-0659 / E-20260817-0007、B T-0660 / E-20260817-0008、moved C T-0661 / E-20260817-0009をafternoon内でA/B/C→C/A/BへD&D。seq 2436 / event `79ddc578-ec96-4ba1-b416-9c8728c9fe5d` / source=`task-drag-reorder-confirmed-markdown-v4`はremote / mobile applied、entry order authorityと三端末Forward収束を確認した。このPASSはForward seq 2436を直接根拠とし、Undo / Redoを前提にしない。
- `TMV4-CROSS-SECTION-01` current Forward device PASS: T-0654 / E-20260816-0030をrow-target routeでafternoon→morningへD&D。seq 2409 / event `180c1b3d-d38e-41ff-b048-803d4155ec47` / source=`confirmed-markdown-v2`はremote / mobile applied、destination morningへ三端末が収束した。このPASSはForward seq 2409を直接根拠とし、Undo / Redoを前提にしない。
- same-section Undo / Redo device PASS: A T-0659 / E-20260817-0007、B T-0660 / E-20260817-0008、moved C T-0661 / E-20260817-0009。afternoon内でA/B/C→C/A/B、UndoでA/B/C、RedoでC/A/Bとなり、forward / Undo / Redo seq 2436〜2438はremote / mobile applied、三端末が最終C/A/Bへ収束した。Ctrl+Z前のexact semantic history topは確認済みだが、この試験固有のroute diagnosticsは取得されていない。
- `TMV4-MULTI-ENTRY-01` current Forward device PASS: original T-0662 / E-20260817-0010とcontinuation T-0662 / E-20260817-0012が同一task_idでnightに共存し、continuationだけをD&Dした。seq 2451 / event `6d679449-b1b1-4070-b020-8edefd8f0eef`はduplicate task ID orderとexact entry orderを保持してremote / mobile applied、三端末Forward順が収束し、original E-0010は位置を維持した。この判定はForward seq 2451を直接根拠とし、後続Undo / Redo証跡とは分離する。
- multi-entry Undo / Redo device PASS: original T-0662 / E-20260817-0010、continuation T-0662 / E-20260817-0012、control T-0664 / E-20260817-0013。baseline 2450後のseq 2451〜2455は全5件がcontinuation E-0012だけを対象にremote / mobile appliedとなり、original E-0010のTaskMoved countは0。seq 2451〜2453が最初のForward / Undo / Redo chain、2454〜2455は追加のUndo / Redo確認cycleで、重複enqueue defectとは推定しない。三端末は各状態で収束した。
- v0.6.70 plugin全体 / full matrix: `NOT_VERIFIED`
- Delivery state: Integrated=Yes / Prereleased-Test-distributed=Yes / Verified=No / Released=No

Release notes: [`docs/release/v0.6.70.md`](docs/release/v0.6.70.md)

---

## v0.6.69 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- synchronized D&DのUndo batch commit後に、exact operation ID / batch ID / semantic fingerprintを持つactionがUndo stack topに1件だけ存在することを検証する。
- semantic build / attach / commit / history invariantを証明できない場合、exact pre-D&D Markdownを持つunsafe generic snapshotだけを除去し、明示barrierでlocal-only Undoを停止する。
- generic snapshotの遅延duplicateを短いoperation guardで拒否し、semantic付きactionをhistory topから押し下げない。
- lifecycle diagnosticへcapture count、history length、history check、commit resultを追加し、Undo snapshot復元後もBridge diagnostic namespaceを維持する。
- actual `moveTaskByDrag()`、shortcut gateway、Undo / Redo inverse enqueueまで通すfocused integration testを追加した。
- `manifest.json`を`0.6.69`へ更新した。

### Verification

- `dnd-semantic-undo-handoff-v0669.js`: actual cross-section / same-section D&D、Undo / Redo inverse、capture / attach / fingerprint / commit failure barrier、duplicate rejection: PASS
- v0.6.68 routing、v0.6.67 semantic lifecycle、v0.6.66 Undo / Redo、TMV4、interrupt continuation、rename、insert-below focused tests: PASS
- v0.6.69 real Vault / remote / mobile: `NOT_VERIFIED`
- post-prerelease `UNDO-BRIDGE-CROSS-SECTION-01`: `FAIL`。fixture `undo-v069-cross-normal`、observed entry E-20260816-0028。D&D直後・Ctrl+Z前にactive operation / pending batchがnull、top generic snapshotはoperation / batch / fingerprint / semanticなし、lifecycle / drag diagnosticsも空。Ctrl+Zは実行していない。
- Delivery state: Integrated=Yes / Prereleased-Test-distributed=Yes / Verified=No / Released=No

Release notes: [`docs/release/v0.6.69.md`](docs/release/v0.6.69.md)

---

## v0.6.68 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- TaskBoard Ctrl+Z / Ctrl+Y / Ctrl+Shift+Zのownership判定を、汎用editable/button filterより前のcapture-phase gatewayへ移した。
- TaskBoard内の非テキストcontrolはTaskChute Undo / Redoをexactly onceで実行し、text input / textarea / select / contenteditableとTaskBoard外modal / editorはnative操作へpass-throughする。
- TaskMoved semantic lifecycle中はshortcutをconsumeしたままblockし、Obsidian local UndoによるMarkdownだけの変更を防ぐ。
- command paletteのTaskChute Undo / Redoも共通invocation gatewayを使用する。
- shortcut、context、routing decision、top semantic、inverse enqueue結果をbounded diagnosticへ記録する。
- `manifest.json`を`0.6.68`へ更新した。

### Verification

- `ctrlz-bridge-undo-routing-v0668.js`: TaskBoard ownership、exactly-once、Redo 2種、editor/input/modal passthrough、lifecycle block、command gateway: PASS
- v0.6.67 semantic lifecycle、v0.6.66 Undo / Redo、TMV4、interrupt continuation、rename、insert-below focused tests: PASS
- v0.6.68 real Vault / remote / mobile: `NOT_VERIFIED`
- post-publication `UNDO-BRIDGE-CROSS-SECTION-01`: `FAIL`。T-0651 / E-20260816-0027のforward D1 seq 2396はremote / mobile applied。Ctrl+Z routingはTaskChute-ownedだったがtop action semantic=false、inverse TaskMoved 0件でdevだけafternoonへ戻った。
- Delivery state: Integrated=Yes / Prereleased-Test-distributed=Yes / Verified=No / Released=No

Release notes: [`docs/release/v0.6.68.md`](docs/release/v0.6.68.md)

---

## v0.6.67 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- TaskMoved D&D Undo captureへoperation ID / batch IDを追加し、semantic未付与の専用batchをtimer・履歴表示・Undo / Redo開始などの通常commitから保護した。
- semantic attachmentを現在の任意pending batchではなく、exact operation / batch、task / entry identity、before / after physical order fingerprintへ束縛した。
- exact semantic attachment後のD&D経路だけが専用batchをcommitできる。失敗時は該当batchだけを無効化し、無関係な既存Undo履歴を維持する。
- D&D内のdate note、task note、plugin-data captureへ同じoperation IDを渡し、別操作captureのmerge / stealを拒否する。
- operation確定中のCtrl+Z / Redoを停止し、semanticless D&D snapshotや背後の古い履歴を誤って消費しない。
- lifecycle phase / operation / batch / rejection reasonをTaskMoved diagnosticsへ追加した。
- `manifest.json`を`0.6.67`へ更新した。

### Verification

- `taskmoved-undo-semantic-lifecycle-v0667.js`: async / timer race、wrong batch、invalid semantic、unrelated history、same-task multi-entry: PASS
- existing Undo / Redo TaskMoved、TMV4、interrupt continuation、rename handoff、insert-below focused tests: PASS
- `node --check .\main.js`: PASS
- v0.6.67 `UNDO-BRIDGE-CROSS-SECTION-01`: `FAIL`。T-0650 / E-20260816-0026のforward D1 seq 2392 / event `806ddfc4-fc55-47fa-b3dd-0d5ea1f1d676`はremote / mobile appliedだが、Ctrl+Z後のinverseは0件でdevだけafternoonへ戻った。
- v0.6.67 plugin全体 / full matrix: `NOT_VERIFIED`
- Delivery state: Integrated=Yes / Prereleased-Test-distributed=Yes / Verified=No / Released=No
- v0.6.66 `UNDO-BRIDGE-CROSS-SECTION-01`: `FAIL`。T-0648 / E-20260816-0025のforward D1 seq 2386はremote / mobile appliedだが、Ctrl+Z後のinverseは0件で、消費された履歴は`hasSemantic:false`だった。

Release notes: [`docs/release/v0.6.67.md`](docs/release/v0.6.67.md)

---

## v0.6.66 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- same-date D&D履歴へexact `task_id + entry_id`、before / after section、entry/task orderを意味論metadataとして保存する。
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Zのsnapshot復元前後に物理Markdownを再読込し、exact identity、section、row metadata、entry/task orderを検証してから逆向きまたは再実行のTaskMoved v4をenqueueする。
- 未送信のexact forward / inverse pairだけをnet-zeroとしてsend対象外にし、active flush snapshot中のforwardはsupersedeせず後続inverseを保持する。
- Undo snapshot復元時にcurrent Bridge / outbox / cursor keysを維持し、古いplugin data snapshotによる送信状態の巻き戻しを防ぐ。
- commit前reviewで、非exactな同一entry moveまでUndo / Redo coalesce候補になり得る問題を修正した。net-zeroはtask / entry / from-to / entry-task orderの完全一致かつ候補1件に限定し、それ以外の既存eventを保持する。
- commit前reviewで、復元後のTaskMoved enqueue失敗時にlocal snapshotだけが確定する問題を修正した。counterpart snapshotとhistory stackをrollbackし、plugin-data restoreはsave queue内で最新Bridge stateをmergeする。
- arbitrary snapshot diff、TaskCreated / Deleted、lifecycle、Routine definition、date-move rekeyの逆操作は対象外とした。
- `manifest.json`を`0.6.66`へ更新した。

### Verification

- Undo / Redo cross-section、same-section、same-task multi-entry、AUTO-FLUSH-RACE、snapshot Bridge-state、logical-clock、rollback、negative guards focused synthetic: PASS
- existing TMV4、interrupt continuation、rename handoff、insert-below focused tests: PASS
- v0.6.66 real Vault / remote / mobile: `FAIL` for UNDO-BRIDGE-CROSS-SECTION-01; overall `NOT_VERIFIED`
- v0.6.66 T-0648 / E-20260816-0025: forward D1 seq 2386 / event `c2863685-ada9-4fb8-8090-7c0661e16741` applied、Ctrl+Z後inverse 0件、redoStack action `hasSemantic:false`
- v0.6.65 `UNDO-BRIDGE-CROSS-SECTION-01`: `FAIL`。T-0647 / E-20260816-0024のforward D1 seq 2383はremote / mobile appliedだが、Ctrl+Z後にreverse TaskMovedがなくdevだけafternoonへ戻りremote / mobileはnightに残った。

Release notes: [`docs/release/v0.6.66.md`](docs/release/v0.6.66.md)

---

## v0.6.65 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- `taskmoved_payload_source=task-start-section-move-confirmed-markdown-v3`のinterrupt lifecycle TaskMoved v4 send-preflightに限定して、exact continuation order projectionを追加した。
- TaskMovedより後のlogical clockにあるsendableなinterrupt-continuation TaskCreatedが、date、target section、anchor、entry/task identity、物理隣接をすべて満たし1件だけ一致する場合、current target orderからそのcontinuation entryだけを一時除外してpayload intermediate orderとstrict比較する。
- TaskMoved payloadの`target_order_entry_ids`自体は変更せず、generic D&D / section move / date moveのstrict validationも維持する。
- index rebuild後にもprojectionを再計算し、候補やcurrent physical orderが変化した場合は送信をblockする。
- reproducer、不一致、重複、clock逆転、event順、generic / inbound / Routine不変を検証するfocused synthetic testを追加した。
- `manifest.json`を`0.6.65`へ更新した。

### Verification

- INTERRUPT-TMV4-PREFLIGHT-01から10 focused synthetic: PASS
- INTERRUPT-CONTINUATION-01から10 regression: PASS
- existing TMV4、rename handoff、insert-below focused tests: PASS
- INTERRUPT-CONTINUATION-FINAL-PLACEMENT-01: `PASS`。T-0641 / E-20260816-0016、T-0642 / E-20260816-0017、continuation E-20260816-0018がafternoonで隣接し、D1 seq 2358〜2361はremote / mobile applied、三端末が収束した。
- TMV4-MULTI-ENTRY-01: `PASS`。同一task_id T-0641のoriginal E-20260816-0016を維持したままcontinuation E-20260816-0018だけを移動し、D1 seq 2364 TaskMoved v4がremote / mobile applied、三端末順が一致した。
- Routine occurrence interrupt continuation: `PASS`。T-0644のoriginal E-20260816-0020とcontinuation E-20260816-0022が同じoccurrence metadataを保持し、D1 seq 2373〜2376はremote / mobile applied。再評価後もoccurrence rowは2件で、unexpected duplicateはなかった。
- 明示interrupt continuationの同一key・別entry作成: `PASS`。同じ`routine_occurrence_key=routine:T-0644:2026-08-16`で別entryを作成し、三端末でmetadata・配置・重複抑止を確認した。
- v0.6.65の上記targeted scopeはcurrent device evidenceでPASS。plugin全体 / full matrixは引き続き`NOT_VERIFIED`。

Release notes: [`docs/release/v0.6.65.md`](docs/release/v0.6.65.md)

---

## v0.6.64 - 2026-08-16

Type: Runtime BRAT Prerelease for device testing

### Changed

- interrupt stop時はcontinuation `entry_id`だけを予約し、provisionalなcontinuation行とTaskCreatedを作らないようにした。
- interrupting taskのtask-start section moveとTaskMoved handoff確定後、final physical entry直後へcontinuationをsection metadata付きで保存する。
- 保存後にexact entry identity、同一physical section、隣接順、row metadataを再検証し、成功時だけinterrupt-continuation TaskCreatedをenqueueする。
- inboundの明示continuationはanchor entry IDを必須とし、payload date上のexact anchor identity / sectionを保存前に確認してから直後へ保存し、同じ配置検証後だけAckする。
- task-start placement未確定時はcontinuation行の作成自体を抑止し、TaskCreatedも送信しない。
- placement不一致、保存失敗、検証失敗、TaskCreated enqueue失敗を`interrupt-continuation` structured diagnosticsへ記録する。
- section移動なし／あり、同一task_id別entry、metadata mismatch block、lifecycle handoff構造のfocused synthetic testを追加した。
- `manifest.json`を`0.6.64`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- INTERRUPT-CONTINUATION-01から10 focused synthetic: PASS
- existing TMV4、rename handoff、insert-below focused tests: PASS
- 実Vault / 実mobile: `NOT_VERIFIED`
- TMV4-MULTI-ENTRY-01: `NOT_VERIFIED`

### Post-prerelease device evidence

- INTERRUPT-CONTINUATION-FINAL-PLACEMENT-01: `FAIL`。original T-0638 / E-20260816-0012、interrupt T-0639 / E-20260816-0013、continuation T-0638 / E-20260816-0014。local final placementとmetadata検証は成功したが、TaskMoved logical clock 1021のintermediate target order `[E-0012,E-0013]`が、後続TaskCreatedによるcurrent order `[E-0012,E-0013,E-0014]`とsend-preflightで不一致になりfailed。TaskCreated 1022とTaskStarted 1023もpendingに残った。
- TMV4-MULTI-ENTRY-01: `NOT_RUN`。
- v0.6.64 overall: `NOT_VERIFIED`。

### v0.6.63 failure evidence

- original T-0635 / E-20260816-0008、interrupt T-0636 / E-20260816-0009、continuation T-0635 / E-20260816-0010。
- continuation TaskCreated seq 2325は午後で生成され、その後TaskMoved seq 2326がinterrupt taskだけを午前へ移動したため、三端末でcontinuationだけ午後へ残った。

Release notes: [`docs/release/v0.6.64.md`](docs/release/v0.6.64.md)

---

## v0.6.63 - 2026-08-15

Type: Runtime BRAT Prerelease for device testing

### Changed

- same-section row D&Dのsource/targetをcurrent Markdownからexact `entry_id`で一意解決し、各物理見出しからsection contextを構築するようにした。
- reload後のruntime task `section` / `sectionId`が空でも、source/destination physical section一致時はmissing row metadataを正規化してD&Dを続行する。
- 画面add formが通るgeneric `addTask()`でも、新規rowへ`section` / `section_id`を保存するようにした。
- source/target physical heading、physical context source、exact entry不一致をD&D diagnosticsへ追加した。
- explicit `__no_section__` / wrong section ID block、一般`markdown_section_mismatch` guard、TaskMoved v4 / Ack / cursor semanticsは維持した。
- reload runtime空、missing metadata、TaskMoved 1件、wrong ID block、no-op、generic add metadataを検証するfocused synthetic testを追加した。
- `manifest.json`を`0.6.63`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- TMV4 physical context focused synthetic: PASS
- v0.6.62 section handoff regression: PASS
- existing TMV4 synthetic / no-op / duplicate prevention: PASS
- v0.6.60 rename handoff regression: PASS
- v0.6.61 insert-below order regression: PASS
- v0.6.63 release全体の実Vault / 実mobile Verified判定: `NOT_VERIFIED`。TMV4-BASIC-01、TMV4-SECTION-HANDOFF-01、TMV4-CROSS-SECTION-01、TMV4-EMPTY-SOURCE-01、TMV4-DATE-MOVE-01だけcurrent device evidenceで`PASS`。

### v0.6.62 device evidence

- TMV4-BASIC-01はC `T-0624 / E-20260815-0042`でdev enqueue succeededまで確認。remote / mobile / D1最終確認未完了のためPASS確定なし。
- TMV4-SECTION-HANDOFF-01はB `T-0623 / E-20260815-0041`で`physical_section_unresolved`、`enqueue_attempted=false`となりFAIL。試験前backupでもrow metadataは欠落していた。

### Post-prerelease device evidence

- TMV4-BASIC-01: `PASS`。A `T-0625 / E-20260815-0043`、B `T-0626 / E-20260815-0044`、C `T-0627 / E-20260815-0045`。午後sectionでCをAの上へD&Dし、dev物理Markdownと三端末UIはC/A/B。D1 seq 2284 / event `465fc34f-a559-4cc5-afdd-9b355abe63f3`はremote / mobile applied。
- TMV4-SECTION-HANDOFF-01: `PASS`。B rowのsection metadataだけを欠落させてreload後にD&Dし、`section=午後 section_id=afternoon`へ自動補完。dev物理Markdownと三端末UIはB/C/A。D1 seq 2285 / event `7aa1ac1a-d13d-4b74-a691-252502c7e4a3`はremote / mobile applied。
- TMV4-CROSS-SECTION-01: `PASS`。T-0628 / E-20260816-0001を午後→午前へD&Dし、dev物理rowは`section=午前 section_id=morning`、三端末UIは午前。D1 seq 2298 / event `6ce13f31-c1bd-418b-bb85-46aa0d6a7036`はfrom=`afternoon`、to=`morning`でremote / mobile applied。
- TMV4-EMPTY-SOURCE-01: `PASS`。T-0629 / E-20260816-0002を夜（`night`）→午後（`afternoon`）へD&Dし、dev / remoteの夜task countは0。D1 seq 2301 / event `c346e9aa-d15f-451f-a375-cebcc774e8f1`は`source_order_entry_ids=[]`、remote / mobile applied。
- TMV4-DATE-MOVE-01: `PASS`。T-0630を2026-08-16 / E-20260816-0003から2026-08-17 / E-20260817-0001へ移動。task_idとtask noteを維持し、board entryをdestination date用identityへrekeyした。D1 seq 2303 / event `bf7d8eaf-7d1f-45df-8f1a-4a6d2c53fb77`はfrom/before=旧ID、to/after/top-level=新IDでremote / mobile applied。
- TASK-ADD-SECTION-META-01: dev partial evidence。T-0628 / E-20260816-0001をgeneric add formから午後へ作成し、dev physical rowの`section=午後 section_id=afternoon`を確認。remote / mobile physical metadata未確認のためoverall `NOT_VERIFIED`。
- このdocs-only追記は公開済みv0.6.63 tag / Release / assetsを変更せず、他の`NOT_VERIFIED`を昇格しない。

Tag: `v0.6.63`
GitHub Release: [v0.6.63 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.63)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.63.md`](docs/release/v0.6.63.md)

---

## v0.6.62 - 2026-08-15

Type: Runtime BRAT Prerelease for device testing

### Changed

- same-section D&D時、moved rowのsection metadata欠落だけを物理見出しから補完するようにした。
- 明示`__no_section__`または別section IDと物理見出しの不一致は上書きせず従来どおりblockする。row `section_id`が物理sectionと一致する場合に限り、欠落・古いsection labelを正規化する。
- D&D保存後に対象`entry_id`をMarkdownから一意再解決し、`task_id`、physical heading、row `section_id`を再検証してからTaskMoved v4をenqueueするようにした。
- `task-insert-below`で新規作成する行へ`section` / `section_id`を保存するようにした。
- TaskMoved section diagnosticでraw row metadata、parsed identity、resolved section、identity source、normalization、final guard resultを区別した。
- 欠落meta、stale view identity、明示collision、no-op、TaskMoved 1件を検証するfocused synthetic testを追加した。
- `manifest.json`を`0.6.62`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- TMV4 section handoff focused synthetic: PASS
- TMV4 existing synthetic / no-op / duplicate prevention: PASS
- v0.6.60 rename handoff regression: PASS
- v0.6.61 insert-below order regression: PASS
- v0.6.62実Vault TMV4-BASIC-01: `NOT_VERIFIED`

### v0.6.61 device evidence

- TMV4-BASIC-01: `FAIL`。T-0614 / E-20260815-0032のD&D detection、保存、保存後order検証、enqueue attemptまでは成功したが、`enqueueBridgeTaskMoved()`が`markdown_section_mismatch`でfalse。
- expected / physical / index sectionは`morning`、row section resolutionは`__no_section__`。remote / mobileへTaskMovedは伝播しなかった。

Tag: `v0.6.62`
GitHub Release: [v0.6.62 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.62)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.62.md`](docs/release/v0.6.62.md)

---

## v0.6.61 - 2026-08-15

Type: Runtime BRAT Prerelease for device testing

### Changed

- `insertTaskAfterKey()`へexplicit insert-below placementを追加し、通常targetを人工的なprotected keyへ加えないようにした。
- `task-insert-below`と「下にコピー」で、通常taskの選択target直下へ物理Markdownを保存するようにした。
- completed / running / paused targetの既存protected top-insert判定は維持した。
- 作成時点から物理順を正し、order補正用TaskMovedは生成しない。
- A/B/C連続insert、refresh、rename、物理/UI一致、protected target、task-copy scopeを確認するfocused synthetic testを追加した。
- `manifest.json`を`0.6.61`へ更新した。

### Verification

- `node --check .\main.js`: OK
- `git diff --check`: OK
- INSERT-BELOW-ORDER focused synthetic: PASS
- v0.6.60 rename handoff focused synthetic: PASS
- TMV4-BASIC-01 synthetic: PASS
- v0.6.61実Vault insert-below order / TMV4-BASIC-01: `NOT_VERIFIED`

### v0.6.60 device evidence

- TC-RENAME-SECTION-TOP-01: `PASS`。
- TC-RENAME-SEQUENCE-01: rename伝播、`task_id + entry_id` identity、remote / mobile appliedは`PASS`。A `T-0602 / E-20260815-0020`、B `T-0603 / E-20260815-0021`、C `T-0604 / E-20260815-0022`。
- insert-below physical order: `FAIL`。D&D前のdev物理MarkdownがC / A / B、remote / mobileはA / B / C。
- TMV4-BASIC-01: `BLOCKED`。D&Dは未開始。

Tag: `v0.6.61`
GitHub Release: [v0.6.61 BRAT Prerelease](https://github.com/hedgetheapp/taskchute-obsidian-mvp/releases/tag/v0.6.61)
Assets: `main.js`, `manifest.json`, `styles.css`
Release notes: [`docs/release/v0.6.61.md`](docs/release/v0.6.61.md)

---

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
