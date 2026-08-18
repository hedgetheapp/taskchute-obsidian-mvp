# Architecture

調査基準: v0.6.75 candidateのworking tree。最新immutable試験配布はv0.6.74 BRAT Prerelease（peeled target `037975902f5aac1f938c0bf71b167d118815170c`）であり、公開済みtag / Release / assetsは差し替えない。v0.6.75はvisible dependency invalidationを実装しsyntheticはPASSしたが、実Vault試験とplugin full matrixは`NOT_VERIFIED`で、Verified / Releasedではない。

## 1. 概要

このprojectはObsidian Community Plugin形式のJavaScript applicationである。build systemやpackage manifestをrepositoryに持たず、配布物は`main.js`、`manifest.json`、`styles.css`の3ファイルである。

```text
Obsidian UI / commands
        |
        v
TaskchutePlugin + ItemViews (main.js)
        |
        +--> Vault Markdown --------> Obsidian Sync / filesystem
        |
        +--> plugin data.json ------> settings / runtime / outbox / cursor
        |
        +--> localStorage ----------> device-local UI state / device ID
        |
        +--> Bridge HTTP API -------> events / pending / applied
```

## 2. Repository構成

| Path | 役割 |
|---|---|
| `main.js` | 全application logic。CommonJSで`TaskchutePlugin`をexport。 |
| `styles.css` | PC / mobile / views / modal / settingsのstyle。約15,032行。 |
| `manifest.json` | Obsidian plugin metadata。version `0.6.75`。 |
| `README.md` | current releaseと正本文書への入口。 |
| `AGENTS.md` | versionごとの開発guardと過去判断。現行・旧記述が併存する。 |
| `docs/` | Bridge仕様、release、regression、運用資料。 |
| `tests/tmv4-basic-v0659.js` | Node標準機能だけで実行するTaskMoved v4同一section D&Dのfocused synthetic test。 |
| `tests/taskcreated-rename-handoff-v0660.js` | pending / in-flight / sent相当のTaskCreated rename handoffを検証するfocused synthetic test。 |
| `tests/taskcreated-placement-v0671.js` | ordinary TaskCreated v1のpost-save neighbor capture、exact inbound placement、legacy/unknown/idempotency/rename preservationを検証するfocused standalone test。 |
| `tests/taskchute-visible-dependency-invalidation-v0675.js` | current visible dependencyのexplicit present/absent state、duplicate create burst、genuine create/modify/delete/rename、Bridge coalescingを検証するfocused standalone test。 |
| `tests/insert-below-order-v0661.js` | explicit insert-belowの物理/visual順、refresh、rename、protected target、task-copy scopeを検証するfocused synthetic test。 |
| `tests/tmv4-section-handoff-v0662.js` | same-section D&Dの欠落row section meta補完、保存後identity、strict conflict block、TaskMoved 1件を検証するfocused synthetic test。 |
| `tests/tmv4-physical-context-v0663.js` | reload後runtime section空、exact physical headings、missing meta補完、strict conflict、no-op、generic add metadataを検証するfocused synthetic test。 |
| `tests/interrupt-continuation-placement-v0664.js` | interrupt taskの最終section、continuation隣接順、entry identity、metadata mismatch block、lifecycle handoff構造を検証するfocused synthetic test。 |
| `tests/interrupt-continuation-taskmoved-preflight-v0665.js` | 後続continuationによるTaskMoved v4 send-preflight order projectionとstrict fallbackを検証するfocused synthetic test。 |
| `tests/undo-redo-taskmoved-bridge-v0666.js` | same-date D&D Undo / Redoのsemantic movement、multi-entry、outbox race、negative guardを検証するfocused synthetic test。 |
| `tests/dnd-semantic-undo-handoff-v0669.js` | 実際の`moveTaskByDrag()`からhistory commit、shortcut gateway、Undo / Redo inverse enqueueまでを通し、handoff失敗barrierも検証するfocused integration test。 |
| `tests/taskboard-dnd-route-integration-v0670.js` | 実際のTaskBoard `dropTaskBoardDrag()` callbackからrow / section targetをdispatchし、semantic lifecycle、exact entry selection、single enqueue、failure barrierを検証するroute integration test。 |

`src/`、`package.json`、bundler設定、汎用test runnerは存在しない。`tests/`にはv0.6.59以降のfocused standalone testだけがある。

## 3. 使用技術

- JavaScript / CommonJS。
- Obsidian Plugin API (`require("obsidian")`)。
- Obsidian Vault APIとadapter API。
- DOM APIによるUI構築。
- CSS。
- Obsidian `requestUrl()`を利用するBridge HTTP client。
- Markdown、YAML/frontmatter、Obsidian wiki link、HTML comment metadata。
- browser `localStorage`。

外部npm runtime dependencyはコード上`obsidian`以外に見つからない。

## 4. main.js内の責務区分

`main.js`はcommentで16 sectionに分けられている。

| Section | 行付近 | 役割 |
|---|---:|---|
| 00 | 1 | constants、default settings、table定義 |
| 01 | 632 | date、time、holiday、calendar helper |
| 02 | 2107 | path、ID、name、value normalization |
| 03 | 2996 | Markdown、YAML、text section helper |
| 04 | 3285 | Routine rule helper |
| 05 | 4908 | comment parse / serialize |
| 06 | 5390 | Vault I/O、folder、history、backup helper |
| 07 | 6391 | comment等のmodal UI |
| 08 | 8318 | Routine settings modal UI |
| 09 | 10397 | plugin lifecycle、storage、Bridge、mutation |
| 09-A | 29121 | index生成、integrity、repair |
| 10 | 38502 | Main TaskBoard UI |
| 11 | 46376 | Project / Section / Mode settings views |
| 12 | 47226 | Routine management view |
| 13 | 50526 | setup、diagnostics、maintenance views |
| 14 | 50919 | settings backup / restore view |
| 15 | 51066 | plugin settings tab |
| 16 | 53145 | CommonJS export |

これは論理区分であり、module境界ではない。

## 5. 主要クラス

### Core

- `TaskchutePlugin` (`main.js:10401`): plugin lifecycle、settings/runtime、Vault mutation、Bridge、history、repairの中心。
- `TaskchuteView` (`main.js:38507`): main TaskBoard。PC tableとmobile cardsを描画する。

### ItemViews

- `ProjectSettingsView`: project一覧、archive、note導線。
- `SectionSettingsView`: section CRUD、time、color、icon、order。
- `ModeSettingsView`: mode CRUDと定義note。
- `RoutineManagementView`: Routine一覧、inline edit、row / column D&D、Rotation panel。
- `BoardHistoryManagementView`: snapshot一覧、preview、restore、delete。
- `HolidayCalendarSettingsView`: user holiday、exception business day。
- `SetupDiagnosticView`: folder・data・integrity・repair状態。
- `SettingsBackupView`: backup一覧、create、restore、delete。
- `TaskchuteSettingTab`: general、display、Bridge、diagnostics settings。

### Modals

task edit/add、comments、confirm、Routine rule picker、Routine history / calendar / heatmap、shortcut help等がある。`TaskLinksModal`は定義以外の参照がなく未使用候補。

## 6. データモデルと保存先

### 正本Markdown

| Data | 既定path | 内容 |
|---|---|---|
| 日付TaskBoard | `Taskchute/YYYY-MM-DD Taskchute.md` | Tasks、Log、LogDaily、Comments |
| Task定義 | `Taskchute/Tasks/*.md` | YAML、heading、Notes、Comments、Subtasks、Routine定義 |
| Project | Taskchute配下のproject note folder | project_id、name、archive、本文 |
| Mode | Taskchute配下のmode note folder | mode_id、name、color、icon、order |
| Category / Area / Client | definition note folders | definition IDと表示属性 |
| RoutineLog | `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` | 当日コメント・subtask presentation |

一部folder名はsettingsまたはhelperで生成されるため、固定pathの詳細は要確認。

### plugin data.json

- settings。
- runtime.running / paused。
- Bridge outbox、cursor、known / used IDs、applied cache、Ack recovery records、diagnostics。
- Rotation Routine定義。
- UI共有設定の一部。

saveはqueueで直列化され、古い並行snapshotによる巻き戻しを防ぐ (`main.js:14779`付近)。

### localStorage

- device-local表示状態、filter、collapse等。
- startup open setting cache。
- 生成されたdevice ID。

端末固有UI状態をObsidian Syncされる`data.json`から分離する。

### 履歴・保守データ

- `.taskchute/board-history/{date}/*.md`: boardと関連task note snapshot。
- `.taskchute/routine-history/{YYYY-MM}.json`: Routine occurrence history。
- `Taskchute/SettingsBackups/*.json`: 現行のsettings backup。旧`/.taskchute/settings-backups`も読込対象。
- `.taskchute/repair-reports/{run_id}`: repair backups / reports。
- `Taskchute/ErrorLogs/YYYY-MM-DD.jsonl`: error logs。

### index

`Taskchute/_system/index.json`はMarkdownから再構築するlookup cache。task、project、mode、category、area、client、section、board、warningを収録する。正本ではなく、単独不一致でTaskMovedを止めない。

## 7. データフロー

### Local operation

```text
UI / command
  -> ensureDeviceWriteGuard
  -> current Markdown / dataを再読込
  -> mutation
  -> Vaultへ保存
  -> 保存後状態を確認
  -> runtime / index / viewを更新
  -> Bridge eventをoutboxへenqueue
  -> optional auto flush
  -> active flush中ならpending wake-upを保持
  -> flush終了後に送信可能eventが残る場合だけ再schedule
```

操作により順番は異なる。Bridge event payloadは可能な限り保存後Markdownからrefreshする。

explicit insert-belowと「下にコピー」は`insertTaskAfterKey()`へ`insertPlacement=explicit-below`を渡す。これにより通常targetをprotected集合へ自動追加せず、物理Markdownをtarget直下へ保存してから同じanchorでvisual rowを追加する。実際のcompleted / running / paused keyは既存protected集合とstatus判定に残る。default top insertionはこのoptionを使わない。Inboundの明示interrupt continuationも、exact `continuation_after_entry_id`を保存前検証した後に限り同じoptionでanchor直下へ保存する。source側continuationは専用builderがexact final interrupt entry直後へ直接挿入する。

同一sectionのtask-row D&Dは、操作前Markdownからsource entry orderを保存し、移動後Markdownを書き込み、再読込したtarget entry orderとの一致を確認してからD&D専用TaskMoved v4を1件enqueueする。no-op orderは保存・enqueue前に除外する。

v0.6.70ではrendered TaskBoardの`dropTaskBoardDrag()`、`dropTaskRowDrag()`、`dropTaskToSection()`、mobile quick dragが`TaskchuteView.dispatchTaskBoardTaskDrop()`へsource / target / position / selection modeを渡す。gatewayはroute診断を永続化し、row targetを`moveTaskByDrag()`、section-container / empty-section targetを`moveTaskToSectionByDrag()`へdispatchする。両single-task helperは最初の永続変更前に`beginTaskMovedUndoOperation()`を呼び、forward TaskMoved後に`finalizeTaskMovedUndoSemanticHandoff()`を共有する。group helperは別routeとして明示分類される。

v0.6.67では`moveTaskByDrag()`が最初のD&D file write前にoperation ID / batch ID付きの専用Undo batchを作る。`captureTaskchuteUndoFileBefore()`とD&D内plugin-data captureは同じoperation IDだけを受け入れる。`scheduleCommitTaskchuteUndoBatch()`と通常`commitPendingTaskchuteUndoBatch()`は専用batchを確定せず、forward enqueue成功後にexact task / entry、before / after state、fingerprintを検証したD&D経路だけがforce commitする。失敗時は該当batchだけをfinallyで無効化する。

`undoLastTaskchuteAction()` / `redoLastTaskchuteAction()`はoperation確定中の実行を停止し、確定済みsemantic actionだけを復元前source state検証へ進める。`restoreTaskchuteActionSnapshot()`でlocal snapshotを戻した後、`syncRestoredTaskMovedUndoRedo()`がtarget stateを再読込検証して通常の`enqueueBridgeTaskMoved()`へ渡す。意味論を持たない通常履歴は従来のlocal restoreだけを行う。Inbound TaskMoved writeは`skipTaskchuteUndo`で履歴化しない。

v0.6.68ではwindow capture-phase `keydown`が`normalizeTaskchuteUndoRedoShortcut()`でUndo / Redoを先に識別し、`getTaskchuteUndoRedoShortcutContext()`と`decideTaskchuteUndoRedoShortcutRoute()`でownershipを決める。TaskBoard内の非テキストtargetは`routeTaskchuteUndoRedoShortcut()`が同期的にeventをconsumeし、`invokeTaskchuteUndoRedo()`へexactly onceで渡す。text input / textarea / select / contenteditable、TaskBoard外overlayはnative/editorへpass-throughする。active semantic lifecycleはeventをconsumeしたままblockするため、local-only Undoへfall-throughしない。command paletteも同じinvocation gatewayを使う。

v0.6.69では`commitPendingTaskchuteUndoBatch()`がactionへoperation ID / batch ID / semantic fingerprintを保持し、push後に`inspectCommittedTaskMovedUndoHistory()`でexact matching actionが1件だけstack topにあることを確認する。`moveTaskByDrag()`もcommit結果を再検証し、semantic handoffを証明できない場合は`neutralizeUnsafeTaskMovedUndoHistory()`が操作開始後に追加された保存前Markdownと完全一致するgeneric snapshotだけを除去して`task-moved-undo-blocked` markerを積む。操作開始前の履歴はmarkerの下に維持する。`undoLastTaskchuteAction()`はこのmarkerを復元せず拒否する。これによりforward event送信済みのD&Dをlocal-only snapshotで戻す経路を閉じる。

Undo snapshot内のplugin dataはplugin-data save queue内でcurrent Bridge namespaceとorder diagnosticsを再mergeしてから適用し、outbox / cursor / logical clock / Ack・retry・Auto Flush状態を過去へ戻さない。`appendBridgeTaskMovedCoalescedEvent()`はactive flush snapshot eventをcoalesce候補から除外する。active外の未送信forwardと、task / entry / from-to / entry-task orderが完全な逆関係にある候補1件だけはnet-zeroとして両方を`superseded`にする。非exact・複数候補・active / sent / failed / retried forwardは変更せず、inverseを別eventとして保持する。復元後検証またはenqueue失敗時はcounterpart snapshotでlocal stateとhistory stackをrollbackし、rollback不能時は未同期状態を明示する。

same-section D&Dでは、moved rowのraw `section` / `section_id`を物理見出しと比較する。`section_id`欠落は物理見出しから補完し、IDが物理sectionを確定している場合に限って欠落・古いlabelも正規化して同じMarkdown保存へ含める。UI refresh後のMarkdownから対象`entry_id`を一意再解決し、`task_id`、physical section、row section IDが揃った後だけ既存`enqueueBridgeTaskMoved()`へ渡す。明示section IDの不一致は補正せず一般guardへ到達する前にも停止する。

v0.6.63では、D&D開始時にも`resolveTaskDragPhysicalContext()`がcurrent Markdownからsource/target `entry_id`を一意解決し、各行の物理見出しを取得する。same-section判定とrow metadata補完はこのcontextを使い、view/runtime taskの空sectionをhandoffしない。画面add formが通る`addTask()`も行作成時にsection metadataを保存する。

interrupt開始は二段階で保存する。`closeRunningTaskForInterrupt()`はoriginal taskをterminal化し、Log / LogDaily cleanup、TaskStopped enqueue、continuation `entry_id`予約までを行うが、provisionalなcontinuation行やTaskCreatedは作らない。`startTask()`がinterrupting taskのtask-start section moveとTaskMoved handoffを確定した後、`finalizeInterruptContinuationAfterStartPlacement()`がcurrent Markdownのfinal interrupt `entry_id`直後へcontinuationを挿入する。最終placementが未確認ならfinalizerは行作成前に停止する。`buildInterruptContinuationPlacement()`は物理見出しからrow section metadataを構築し、保存後は`inspectInterruptContinuationPlacement()`がexact identity、同section、隣接順、metadata一致を検証する。検証成功後だけTaskCreatedをenqueueし、失敗は`interrupt-continuation` structured diagnosticとして記録する。Inbound TaskCreatedも明示continuationに限ってanchor entry IDを必須とし、保存前のexact anchor identity / date / section検証後に`insertPlacement=explicit-below`を使用し、同じinspectorで保存後配置を検証してからAckする。

このevent chainのTaskMovedはcontinuation作成前のintermediate target orderを保持する。`validateBridgeOutboxTaskMovedEvent()`はgeneric v4 strict comparisonを変えず、`taskmoved_payload_source=task-start-section-move-confirmed-markdown-v3`で、outboxに後続するsendableなinterrupt-continuation TaskCreatedがexact条件で1件だけ一致する場合に限り、`projectBridgeTaskMovedTargetOrderForInterruptContinuation()`でcurrent physical orderからそのcontinuation entryだけを一時除外する。projectionはpayloadを書き換えず、最初のpreflightとindex rebuild後の最終guardで再計算・strict比較する。不一致、候補重複、余分なrowは従来どおり送信をblockする。

日付移動は`bulkMoveTasksToDate()`がsource date noteから旧entryを除去し、destination date noteで`nextUniqueEntryId()`を使って新entryを採番する。`enqueueBridgeTaskMoved()`には旧identityを`from` / `before`、新identityを`to` / `after`およびtop-level `entry_id`として渡し、source / target orderも各date noteの保存後Markdownから構築する。inboundは`applyBridgeInboundTaskMovedEvent()`が旧entryでsourceを解決し、destination行を新entryへ書き換え、`inspectBridgeTaskMovedDateChangeVaultState()`で旧entry消失、新entry存在、両dateのentry orderとtarget sectionを再読込検証してからAckへ進む。task note link targetと`task_id`は変更しない。

TaskCreated送信時はoutboxからHTTP用snapshotを作り、そのevent ID集合をflush終了までruntimeで保持する。create直後renameは同一identityのTaskCreatedがこの集合に含まれなければoutboxへmergeし、含まれる場合またはTaskCreated不在ならTaskUpdatedをappendする。flush完了mutationは新規TaskUpdatedを保持したまま送信済みTaskCreatedだけを除去する。

ordinary TaskCreated v1のsender flowは、local create保存、date note再読込、exact `task_id + entry_id`とphysical section解決、同sectionの直前entry優先・次entry・only-rowの順でplacement構築、TaskCreated snapshot enqueueである。`enqueueBridgeTaskCreatedFromSavedMarkdown()`がこのhandoffを所有し、refresh / renameはpayloadのplacement fieldsを再計算しない。placement captureをexactに証明できなければmalformed v1やlegacy downgradeを送らず、structured diagnosticを残す。

inbound TaskCreated v1は`normalizeBridgeTaskCreatedPlacementContract()`でversion/mode/anchor shapeを検証し、`inspectBridgeTaskCreatedPlacementTargetBeforeInsert()`がexact anchorまたはempty section preconditionを確認する。before/afterは`insertTaskRelativeToEntryId()`でanchorへ直接挿入し、保存後に`inspectBridgeTaskCreatedPlacement()`がexact new row、physical/row section、immediate neighborまたはonly-rowを再読込検証する。registry verificationもplacementを再確認してからAckへ進む。legacy payloadだけは従来のgeneric insertionを維持し、未知versionは書込前に停止する。interrupt-continuationは専用final-placement / exact-anchor flowを継続する。

### Inbound Bridge

```text
timer / mobile resume / manual action
  -> GET pending(cursor)
  -> normalize + sort by server_sequence
  -> event registry validate
  -> target resolve
  -> apply to Markdown / data
  -> Vault再読込によるverify
  -> before-Ack guards
  -> POST applied
  -> server Ack resultを確定
  -> trusted persistenceでcontiguous cursorをlatest dataへmerge
  -> 必要時はMarkdown再applyなしでAck-only reconcile
```

apply失敗、verification失敗、hard Ack失敗ではcursorを跨がない。server Ack成功後のcursor persistence失敗とambiguous network responseはrecoverableとして記録し、同じMarkdownを再適用せずreconcileする。

v0.6.72以降はinbound data pipelineとUI refreshを分離する。`beginBridgeInboundUiRefreshSession()`がstartup / interval / focus / resume kickoffをactive sessionへjoinし、複数pending passの各eventは従来どおり個別にapply / verify / Ackする。成功したvisible mutationは`requestBridgeInboundUiRefresh()`でdirtyとして集計し、中間の`patchTaskchuteViewsFromExternalSync()`要求はsession内で抑止する。`finalizeBridgeInboundUiRefreshSession()`はpending zero、safe-stop、error等のterminal stateで、openかつvisibleなviewを最大1回だけ描画する。refresh例外はdiagnosticに閉じ、data/Ack/cursorをrollbackしない。

`taskchuteDataGeneration`と`lastRenderedTaskchuteGeneration`はactual relevant changeと最後に描画した世代を表すruntime-only counterである。focus / visibility / first interactionはこの差だけをfreshness根拠とし、経過時間をreload authorityにしない。`data.json`は表示対象fieldのfingerprintをload前後で比較する。v0.6.75の`taskchuteVisibleDependencyBaselines`はwhole-Vault scanを行わず、open viewが実際に参照するboard / Routine history / loaded task definition集合だけを収集し、existence、stat key、bounded content fingerprint、categoryを持つ。initial/full/partial render、Bridge final render、manual reload、追跡中pathのinternal write後にbaselineをcurrentにする。Vault eventはこのbaselineに対してだけvisible invalidation authorityを持つ。

### External Vault change

Vault create / modify / delete / renameをwatchし、内部write markerを除外する。Obsidian Sync到着後の短いsettleと遅着関連fileを待つ。関連Markdownはphysical changeをinvalidationにし、`data.json`はload前後のvisible subsetが変わった場合だけinvalidationにする。Bridge session中にlistenerが受けた関連changeは同sessionのdirty stateへjoinし、feedback loopを作らない。

## 8. Bridge境界

Bridge serverはこのrepositoryの外部依存である。clientは以下を利用する。

- `POST /events`
- `GET /events/pending`
- `POST /events/{event_id}/applied`

user ID、device ID、API base URL、tokenはsettingsから取得する。tokenやpayload全文をdiagnosticsへ出さないguardがある。

## 9. 画面構成

```text
TaskBoard
  - compact header / date navigation / summary
  - task table (desktop)
  - task cards + running bar + quick add (mobile)
  - desktop right pane

Management Views
  - Project
  - Section
  - Mode
  - Routine + Rotation Routine
  - Board History
  - Holiday Calendar
  - Setup / Diagnostics
  - Settings Backup / Restore

Plugin Setting Tab
  - general / folders / display
  - Bridge connection / send / receive
  - repair / developer diagnostics
```

## 10. 主要依存関係

- `TaskchuteView`は`TaskchutePlugin`のmutation APIへ依存する。
- 全management viewも同じplugin instanceのsettingsとVault helperへ依存する。
- Bridge applyはMarkdown parser / serializer、Vault I/O、runtime、definition helperへ横断的に依存する。
- Routine生成はtask note definition、RoutineHistory、holiday calendar、section設定へ依存する。
- indexとdiagnosticsはすべてのMarkdown schemaへ依存する。
- stylesはclass nameによって全view / modalと密結合している。

## 11. 構造上の注意

- 単一ファイルのためprivate module境界はなく、関数名とsection commentが主な構造化手段。
- manual Markdown / frontmatter parserが多く、format変更の影響範囲が広い。
- Obsidian Vault indexとadapterの到着差を吸収するfallbackがある。
- `main.js`分割計画docsはあるが、現行配布方針は単一`main.js`維持。分割の再開可否は要確認。
