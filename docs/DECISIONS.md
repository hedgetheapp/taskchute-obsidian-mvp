# Design Decisions Observed in Code

## 文書方針

ここにはコードまたは現行guardから明確に確認できる判断だけを記載する。理由がcomment・docs・処理から確認できない場合は「理由: 要確認」とする。

## D-001: Vault Markdownを業務データの正本とする

- 判断: 日付、section、order、entry位置、task definitionはVault Markdownを正とする。
- 根拠: `parseTasks()`、各inbound applyの保存後再読込、`buildTaskchuteIndex()`。
- 理由: コード上、Sync到着後の物理ファイルを再確認し、cacheだけではAckしない。詳細な採用経緯は要確認。

## D-002: index.jsonは再構築可能cacheである

- 判断: `Taskchute/_system/index.json`単独の不一致で物理TaskMovedを止めない。
- 根拠: `main.js:29121`のcomment、TaskMoved diagnostics。
- 理由: Markdownとの競合でfalse stopしないためとコードcommentから読める。

## D-003: Task identityは`task_id + entry_id`

- 判断: task_idは定義、entry_idはboard occurrence / placementを表す。
- 根拠: TaskCreated / Moved / Deleted guards、TaskMoved v4。
- 理由: 同一task_idの複数entryを安全に区別するため。

## D-004: Bridge Ackは保存後検証成功時だけ行う

- 判断: apply成功返却だけでAckせず、Vault・runtimeを再検証する。
- 根拠: event registry (`main.js:16253`)、`verifyBridgeInboundRegistryAfterApply()`。
- 理由: applied_eventsだけ進み物理実体が未更新となるfalse-appliedを防ぐため。

## D-005: cursorは失敗イベントを跨がない

- 判断: failed_unacked、unsupported、unknown、verification failureで連続cursor進行を止める。
- 根拠: inbound registryとauto apply safe stop。
- 理由: 後続イベントだけ適用して因果関係を壊さないため。

## D-006: 値変更と位置変更を別eventにする

- 判断: TaskUpdatedは値、TaskMovedはdate / section / order / entry位置を担当する。
- 根拠: start_plan変更でTaskUpdatedとTaskMovedを別enqueueする処理。
- 理由: coalesceやapply責務の混同を避けるため。

## D-007: TaskMoved v4はentry orderを正とする

- 判断: v4の物理並び順は`target_order_entry_ids` / `source_order_entry_ids`で表す。
- 根拠: `reorderTaskSectionByEntryIds()`、`applyBridgeInboundTaskMovedEvent()`。
- 理由: 同一task_id複数entryをtask_id配列では区別できないため。

## D-008: v4不正payloadをlegacyへ降格しない

- 判断: entry配列が欠落・重複・集合不一致なら未Ack停止する。
- 根拠: `applyBridgeInboundTaskMovedEvent()`のv4 validation。
- 理由: task_id fallbackによる誤並び替えを防ぐため。

## D-009: lifecycleのRoutine identityは明示根拠から分類する

- 判断: normal / routine_occurrence / identity_conflictの3状態で判定し、task_idからRoutine identityを推定しない。
- 根拠: `classifyBridgeLifecycleIdentity()`とv0.6.49 commit。
- 理由: 通常taskへ`routine_id=task_id`等が漏れた回帰を防ぐため。

## D-010: Routine occurrence keyは日付に対して安定させる

- 判断: 現行keyは`routine:{routine_id}:{YYYY-MM-DD}`。
- 根拠: `buildRoutineOccurrenceKey()` (`main.js:23526`)。
- 理由: title、time、section、estimate変更でidentityを変えないため。旧仕様書の時刻入り形式は現行判断ではない。

## D-011: Routine定義変更から実績を保護する

- 判断: 生成済みRoutine entryのうち、完了・実行・中断・実績あり等は自動再整合・削除から保護する。
- 根拠: `reconcileGeneratedRoutineInstancesForDefinition()`と関連guard。
- 理由: 実績履歴をmaster変更で巻き戻さないため。

## D-012: Rotation RoutineはBridge同期対象外

- 判断: Rotation Routineはlocal behaviorを維持し、v6.6 Bridge eventへ載せない。
- 根拠: AGENTS先頭、README、Routine Bridge helperの対象範囲。
- 理由: 要確認。現行scope外であることだけは明確。

## D-013: safe rekeyは限定条件でのみ許可する

- 判断: 同じoccurrence key・異なるentry_idは自動Ackしない。未実行・未参照等を確認できた場合だけpayload entry_idへrekeyする。
- 根拠: `inspectTaskCreatedRoutineRekeySafety()`とTaskCreated apply。
- 理由: local materializeとsource採番の差を修復しつつ、実績identityを書き換えないため。

## D-014: explicit continuationは同じoccurrence keyの別entryを許可する

- 判断: `creation_source=interrupt-continuation`等はRoutine duplicate抑止の例外とする。
- 根拠: `applyBridgeInboundTaskCreatedEvent()`の`isContinuation`判定。
- 理由: 割り込み後の後続entryは同じRoutine occurrence内の別実行entryだからである。

## D-015: 実行LogはLogとLogDailyの両方へ保存する

- 判断: running / interrupted / doneを日付noteの2 sectionへ記録し、terminal applyで両方を検証する。
- 根拠: TaskStarted / Stopped / Completed applyとverify。
- 理由: Logと日別集計を同時に維持するためと読める。二重sectionを採用した経緯は要確認。

## D-016: running cleanupは強いidentityから行う

- 判断: exec_id、occurrence key、entry_id、task_idの順で一致させ、task_id fallbackの複数一致は停止する。
- 根拠: execution log helperとv0.6.51修正。
- 理由: 同一task_id複数entryの誤削除を防ぐため。

## D-017: mobile hidden中はBridge applyしない

- 判断: hidden中のpending fetch / apply / Ackを延期し、visible復帰後にdrainする。
- 根拠: `runMobileResumeInboundDrain()`とhidden guards。
- 理由: mobile WebView / network lifecycleが不安定な状態での部分適用を避けるため。

## D-018: plugin data saveを直列化する

- 判断: `data.json`保存をqueue化する。
- 根拠: `pluginDataSaveQueue`と`savePluginData()`周辺。
- 理由: 並行saveの古いsnapshotでoutbox・cursor・runtimeを巻き戻さないため。

## D-019: 端末固有UI状態はlocalStorageへ分離する

- 判断: filter・collapse等をSync対象の`data.json`ではなくlocalStorageへ保存する。
- 根拠: `buildSyncedPluginDataForSave()`とlocal UI storage helper。
- 理由: 端末ごとの表示設定を他端末へ伝播させないため。

## D-020: Vault index遅延にadapter fallbackで対応する

- 判断: Vault APIでfileが見えない場合、adapter.exists / read / writeを試す。
- 根拠: `readFileText()`、`writeFileText()`。
- 理由: Obsidian Sync直後やmobileで、物理fileとVault indexの到着に差があるため。

## D-021: 変更前Board snapshotを保存する

- 判断: 日付note変更前に`.taskchute/board-history`へsnapshotを作る。関連task noteもpayloadへ含める。
- 根拠: `createTaskchuteBoardHistorySnapshot()`。
- 理由: restore可能な履歴を提供するため。

## D-022: 診断情報は上限・TTL・保護対象を持つ

- 判断: diagnosticsをsize、TTL、entry countでpruneし、critical / unresolved情報を保護する。
- 根拠: `BRIDGE_DIAGNOSTICS_RETENTION_V1`。
- 理由: `data.json`肥大化を抑えつつ調査に必要な失敗を残すため。

## D-023: 配布物は単一main.jsを維持する

- 判断: source分割やbuild設定を配布前提にせず、`main.js`、`manifest.json`、`styles.css`を配る。
- 根拠: repository構成、AGENTS、release docs。
- 理由: 現行Obsidian / BRAT導入方式との互換性。将来bundle方式へ移る条件は要確認。

## D-024: Repairはbackup-firstで曖昧な競合を自動修復しない

- 判断: one-click repairはbackupとreportを作成し、安全に確定できる項目だけ変更する。
- 根拠: `runTaskchuteOneClickRepair()`。
- 理由: 重複identityやBridge競合で破壊的な自動修復を避けるため。

## D-025: release-level summaryとしてCHANGELOGを維持する

- 判断: release/versionごとの変更要約をroot `CHANGELOG.md`へ記録する。
- 根拠: repositoryの文書運用ルールとrelease checklist。
- 理由: Git履歴は完全な技術履歴だが、人がversion間の主要差分を短時間で把握する用途とは分けるため。CHANGELOGはGit履歴や現行仕様、TEST_MATRIXの代替にはしない。

## D-026: Integrated / Prereleased / Verified / Releasedを分離する

- 判断: main反映、BRAT試験配布、実機検証、安定配布を別状態として管理する。
- 根拠: `DEVELOPMENT_WORKFLOW.md`と`TEST_MATRIX.md`の運用ルール。
- 理由: BRAT試験には固定配布物が先に必要だが、公開だけで実機保証済みと誤認してはならないため。Prereleaseのtag / Release / assetsはimmutableとし、不具合は次versionで修正する。

## D-027: 意味論を変える判断はユーザー承認を必要とする

- 判断: ユーザー挙動、identity、sync、Ack、lifecycle、destructive migrationの意味変更をCodexが独断で決めない。
- 根拠: canonical docsと開発フローの仕様権限ルール。
- 理由: 軽微な内部実装と、製品・データ互換性に関わる設計判断を分離するため。未決定または矛盾がある場合は推測で実装せず停止して報告する。

## D-028: server Ackとlocal cursor persistenceを別結果として扱う

- 判断: applied endpointのHTTP 2xx後はserver Ack成功を保持し、local cursor保存失敗だけでAck失敗へ戻さない。
- 根拠: `ackBridgeInboundEvent()`、`persistBridgeInboundCursorTrusted()`、`reconcileBridgeInboundAckCursor()`。
- 理由: D1 applied済みなのにclientだけsafe-stopし、後続drainが停止するfalse-negativeを防ぐため。

## D-029: Ack済みeventの復旧ではMarkdownを再適用しない

- 判断: server Ack済みを確認できるeventはAck recovery recordまたは検証済みlegacy evidenceからcursorだけをreconcileする。
- 根拠: inbound Ack recovery helpersとmobile rescue path。
- 理由: terminal lifecycleやTaskMoved等を二重適用せず、cursor gapだけを解消するため。server状態を確認できないcold legacy caseは推測で進めない。

## D-030: D&D reorderは操作境界でTaskMovedへhandoffする

- 判断: 同一sectionのtask-row D&Dは、移動前entry順と保存後entry順が異なる場合だけ、保存後検証後にD&D専用sourceのTaskMoved v4を1件enqueueする。
- 根拠: `buildBridgeTaskMovedV4ReorderDraft()`と`moveTaskByDrag()`。
- 理由: Markdown change watcher全体をTaskMoved化すると他のmove経路と二重送信するため。D&D操作境界で明示的に捕捉し、no-opと他経路を分離する。

## D-031: in-flight TaskCreatedへrenameをmergeしない

- 判断: flush送信snapshot対象のTaskCreatedは、元outboxがpending表示でもrename merge対象外とし、同一`task_id + entry_id`のTaskUpdatedを追加する。flush対象外のpending / retry可能failedだけをmergeする。
- 根拠: `buildBridgeTaskCreatedRenameHandoffPlan()`、`mergeBridgePendingTaskCreatedRename()`、`testBridgeOutboxFlush()`のtarget ID追跡。
- 理由: flushはoutboxから送信snapshotを作るため、snapshot refresh後に元eventだけを書き換えても送信payloadへ反映されない。merge成功扱いでTaskUpdatedを省略すると旧titleだけがD1へ到達するため。

## D-032: explicit insert-belowをprotected top insertionから分離する

- 判断: ユーザーが明示的に「下にタスクを追加」または「下にコピー」を選んだ場合、通常targetをtarget指定だけでprotected keyへ昇格させず、物理Markdownをtarget直下へ保存する。targetが実際にcompleted / running / pausedなら既存protected insertionを維持する。
- 根拠: `insertTaskAfterKey()`の`insertPlacement="explicit-below"`、`insertTaskBelowCurrent()`、`copyCurrentTaskBelow()`。
- 理由: target指定そのものをprotected扱いすると、section先頭scannerが通常Aの手前を返し、A / Bの下へCを追加した物理順がC / A / Bになる一方、visualだけA / B / Cとなるため。作成orderはTaskMovedで後補正せず、最初のMarkdown保存から一致させる。

## D-033: same-section D&Dでは欠落row section metadataだけをphysical headingから補完する

- 判断: same-section D&Dのmoved rowで`section_id`が欠落している場合、物理Markdown見出しを正として`section` / `section_id`を補完する。明示`section_id`が物理sectionと一致する場合に限り、欠落・古いsection labelも正規化する。保存後に同じ`entry_id`を再読込してからTaskMovedへhandoffし、明示`__no_section__`や別section IDとの矛盾は補正せずblockする。
- 根拠: `resolveTaskLineSectionIdentityForPhysicalHeading()`、`moveTaskByDrag()`、`inspectBridgeTaskMovedVaultState()`。
- 理由: 空row metadataを`getSectionByNameOrId()`へ渡すとfallback `__no_section__`となり、物理見出しが正しくてもTaskMoved guardでblockされる。一方、`__no_section__`をwildcard化するとgenuine mismatchを見逃すため、欠落と明示値をraw metadataで区別する必要がある。

## D-034: D&D section contextはexact entryの物理見出しから構築する

- 判断: row dropのsource/targetをcurrent Markdownからexact `entry_id`で一意解決し、両方の物理見出しをsection contextの正とする。reload後のview/runtime section fieldsはsame-section判定に使わない。generic `addTask()`を含む新規通常行には作成時からsection metadataを保存する。
- 根拠: `collectTaskBoardPhysicalOccurrences()`、`resolveTaskDragPhysicalContext()`、`moveTaskByDrag()`、`addTask()`。
- 理由: row metadata欠落後のreloadではruntime sectionも空になり得る。物理Markdownに一意なentryと見出しが残っているのにview stateをhandoffすると、正当なD&Dを`physical_section_unresolved`で停止できるため。明示row conflictの補正禁止と一般guardはD-033のまま維持する。

## D-035: 日付移動ではboard occurrence identityをdestination dateへrekeyする

- 判断: `task_id`とtask noteは維持する一方、日付移動後のboard occurrenceにはdestination date用の新`entry_id`を割り当て得る。TaskMoved date-changeはfrom / beforeに旧ID、to / afterとtop-levelに新IDを持たせ、各dateのentry orderは物理Markdownを正とする。
- 根拠: `bulkMoveTasksToDate()`、`enqueueBridgeTaskMoved()`、`applyBridgeInboundTaskMovedEvent()`、`inspectBridgeTaskMovedDateChangeVaultState()`、v0.6.63 TMV4-DATE-MOVE-01。
- 理由: `entry_id`はdate note上のboard occurrence / placement identityであり、destination dateへ移った配置はsource dateの旧identityに固定しない。受信側は旧IDでsourceを特定し、新IDでdestinationを検証する必要がある。このdate-move rekeyはRoutine occurrence collisionを扱うD-013のsafe rekeyとは別の通常TaskMoved semanticsである。

## D-036: interrupt continuationはinterrupting taskの最終physical placement確定後に作成する

- 判断: TaskStopped時はcontinuation identityだけを予約し、interrupting taskのtask-start section moveが保存・検証・TaskMoved handoffまで確定した後、final interrupt entry直後へcontinuation行を作る。最終placementが未確認なら行作成自体を抑止する。保存後のexact identity、同section、隣接順、row metadata検証に成功した場合だけTaskCreatedをenqueueする。Inboundの明示continuationはanchor entry IDを必須とし、payload date上のexact anchorを一意検証してから直後へ配置し、同じ検証後だけAckする。
- 根拠: `closeRunningTaskForInterrupt()`、`finalizeInterruptContinuationAfterStartPlacement()`、`buildInterruptContinuationPlacement()`、`inspectInterruptContinuationPlacement()`、v0.6.63 T-0635 / T-0636 failure evidence。
- 理由: continuationを開始前のinterrupt task直後へ先に作ると、その後のtask-start section moveがinterrupt taskだけを移動し、continuationが旧sectionへ残る。TaskCreated後に補正TaskMovedを追加するより、最終配置を正として1回だけ作成する方が中間不整合と二重eventを避けられるため。

## D-037: interrupt lifecycleのTaskMoved send-preflightはexact continuationだけを投影する

- 判断: generic TaskMoved v4のexact-order検証は維持する。`taskmoved_payload_source=task-start-section-move-confirmed-markdown-v3`であるTaskMovedについて、より後のlogical clockに、同一date / target section、exact anchor / continuation entry / task identity、物理隣接、送信可能statusを満たすinterrupt-continuation TaskCreatedが1件だけある場合に限り、current orderからそのcontinuation entryだけを一時除外したprojected orderをpayload orderとstrict比較する。TaskMoved payloadは変更しない。
- 根拠: `projectBridgeTaskMovedTargetOrderForInterruptContinuation()`、`validateBridgeOutboxTaskMovedEvent()`、v0.6.64 T-0638 / T-0639 failure evidence。
- 理由: TaskMovedはreceiverにcontinuationが存在しないintermediate stateを先に届ける必要がある。payloadへ未来entryを足すとv4 identity contractを破り、current Markdownをそのまま比較すると正しいintermediate eventをstaleとして拒否するため。

## D-038: cross-device Undo / Redoは明示TaskMoved意味論に限定する

- 判断: same-dateの単一task D&Dだけ、履歴へexact before / after section・entry/task orderを保存し、snapshot復元前後のMarkdown検証成功後に既存TaskMoved v4でUndo / Redoを同期する。arbitrary snapshot diffからeventを推定しない。
- 判断: 未送信かつactive flush snapshot外で、task / entry / from-to / entry-task orderが完全な逆関係にある候補1件だけをnet-zeroとしてsend対象外にする。非exact・複数候補・active / sent / failed / retried forwardは変更せず、inverseを後続eventとしてenqueueする。
- 判断: Undo snapshotはplugin-data save queue内でcurrent Bridge namespaceを再mergeし、outbox / cursor / logical clock / Ack・retry・Auto Flush stateを巻き戻さない。復元後のBridge handoff失敗時はcounterpart snapshotでlocal stateとhistory stackを操作前へrollbackし、意味論を履歴へ付与できないD&Dはlocal-only Undo履歴を残さない。
- 理由: local snapshot restoreとcross-device event semanticsを分離し、identity誤推定、in-flight event消失、ping-pongを避けながら既存TaskMoved v4 strict guardを再利用するため。
- 根拠: `buildTaskMovedUndoBridgeSemantic()`、`syncRestoredTaskMovedUndoRedo()`、`appendBridgeTaskMovedCoalescedEvent()`、v0.6.65 UNDO-BRIDGE-CROSS-SECTION-01 failure evidence。

## D-039: TaskMoved D&D Undo batchはoperation-scoped semantic commitにする

- 判断: supported D&Dは最初のfile write前にoperation ID / batch ID付き専用Undo batchを作り、exact task / entryとbefore / after fingerprintを検証したsemantic attachment後に限って、そのoperation自身がcommitする。
- 判断: scheduled commit、履歴表示、Undo / Redo開始、別操作captureは専用batchをcommit・merge・discardできない。semantic attachmentまたはcommitが失敗した場合はexact operationのbatchだけを無効化し、無関係な既存履歴を維持する。
- 理由: v0.6.66では`taskMovedUndoCaptureInProgress`がtimer callbackだけを延期し、同期的な通常commitはpending D&D snapshotをsemantic付与前に確定できた。mouse release直後のCtrl+Zなどawait中の介入でsemanticless actionが消費され、local snapshotだけが戻る可能性があったため。
- 根拠: v0.6.66 T-0648 / E-20260816-0025 device failure、`decideTaskMovedUndoSemanticAttachment()`、`decideTaskMovedUndoBatchCommit()`、`beginTaskMovedUndoOperation()`、`tests/taskmoved-undo-semantic-lifecycle-v0667.js`。

## D-040: TaskBoardのUndo / Redo shortcutだけをcapture-phaseで所有する

- 判断: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Zは、active TaskBoard内の非テキストtargetまたはneutral workspace focusに限り、汎用editable/button filterより先に単一gatewayがconsumeする。TaskBoard内でもtext input、textarea、select、contenteditableはnative/editorへpass-throughし、TaskBoard外のmodal / menu / editorも奪わない。
- 判断: TaskMoved semantic lifecycleがactiveな場合はshortcutをconsumeしたままblockし、Obsidian local Undoへfall-throughさせない。command paletteのTaskChute Undo / Redoも同じinvocation gatewayを使用する。
- 理由: v0.6.67のcapture handlerは存在したが、shortcut判定より前の`isEditableEventTarget()`がbuttonを含んでいた。TaskBoard controlへfocusがあるCtrl+ZはpreventDefault前にreturnし、Obsidian local Undoがdev Markdownだけを戻してinverse TaskMovedを生成しなかったため。
- 根拠: v0.6.67 T-0650 / E-20260816-0026、D1 seq 2392 / event `806ddfc4-fc55-47fa-b3dd-0d5ea1f1d676`、`routeTaskchuteUndoRedoShortcut()`、`handleTaskchuteUndoRedoShortcut()`、`tests/ctrlz-bridge-undo-routing-v0668.js`。

## D-041: 同期済みD&Dはsemantic付きhistory topを証明できる場合だけUndo可能にする

- 判断: forward TaskMovedをenqueueしたsupported D&Dは、exact operation ID / batch ID / fingerprintを持つsemantic actionがUndo stack topに1件だけcommitされたことを検証してから通常成功とする。
- 判断: semantic build / attach / commit / history invariantのいずれかを証明できない場合、操作開始後に追加された保存前Markdownと完全一致するsemanticless snapshotだけを除去し、明示barrierでlocal-only Undoを拒否する。操作開始前の履歴、generic TaskMoved v4、shortcut routingは緩和・削除しない。
- 理由: v0.6.68ではshortcut routingはTaskChute-ownedだったが、top actionがsemanticlessのままdevだけを復元し、inverse TaskMovedを生成しなかった。失敗stageを観測できない状態で通常成功を返すこと自体がunsafeだったため。
- 根拠: v0.6.68 T-0651 / E-20260816-0027、D1 seq 2396 / event `3a69bd85-bdc3-4858-8ddc-35245b1beb17`、`inspectCommittedTaskMovedUndoHistory()`、`neutralizeUnsafeTaskMovedUndoHistory()`、`tests/dnd-semantic-undo-handoff-v0669.js`。

## D-042: TaskBoard D&DのUI routeを共通gatewayで所有する

- 判断: rendered TaskBoardのrow drop、section-container / empty-section drop、mobile quick dragは、source / target / position / selection modeを`dispatchTaskBoardTaskDrop()`で分類・診断してから既存mutation helperへdispatchする。single-task same-date routeはhelperの違いにかかわらず、最初の永続変更前にoperation-scoped lifecycleを開始し、forward TaskMoved後に共通semantic finalizerを通る。
- 判断: section-target helperを単純にrow helperへ置換せず、各helperの物理配置規則は維持する。group D&Dは現行の別helperを明示分類し、今回のsingle-task semantic contractの保証対象へ推測で含めない。
- 理由: v0.6.69実機ではD&D直後・Ctrl+Z前にoperation / batch / semantic / lifecycle diagnosticが全て存在しなかった。source traceでrow targetは`moveTaskByDrag()`へ入る一方、section targetはlegacy `moveTaskToSectionByDrag()`がMarkdownとTaskMovedを更新しながらsemantic lifecycleを開始しないことを確認したため。
- 根拠: `TaskchuteView.dispatchTaskBoardTaskDrop()`、`moveTaskByDrag()`、`moveTaskToSectionByDrag()`、`finalizeTaskMovedUndoSemanticHandoff()`、`tests/taskboard-dnd-route-integration-v0670.js`、v0.6.69 entry E-20260816-0028 device evidence。

## D-043: ordinary TaskCreated placementはpost-save physical neighborを正とする

- 判断: v0.6.71以降に生成するordinary TaskCreatedは、senderがlocal保存後Markdownを再読込し、exact `task_id + entry_id`の同section内直前entryを優先、次entry、section内唯一の順でversion 1 placement contractをsnapshot化する。`creation_source`は操作・診断metadataでありplacement authorityにしない。
- 判断: inbound v1はexact anchorまたはempty-section preconditionを満たす場合だけ書き込み、保存後にidentity、physical/row section、immediate adjacencyまたはsection内唯一性を再検証してからAckする。未知versionや不成立contractをlegacyへ降格せず、既存rowのplacement不一致も自動移動しない。
- 判断: versionなしlegacy payloadだけは従来互換のgeneric insertionを維持する。初期orderを補正するTaskMoved、既Ack済みhistorical rowのmigration、task ID anchor fallbackは行わない。interrupt-continuationのspecialized exact-anchor contractは変更しない。
- 理由: Markdown physical orderがboard positionの正であり、protected blockを含むlocal insertion規則をreceiverへ複製するとdriftする。同一task IDの複数entryを区別し、TaskCreated自身でcreation-time orderを確定させるには、実保存結果のexact entry neighborが必要である。
- 制限: anchorがreceiverで未到達・削除・別section化した場合や、empty-sectionへ複数writerが競合した場合はv1を満たせず未Ack停止する。serverがoptional fieldsを透過保持することはBRAT round-tripで要確認である。
- 根拠: `buildBridgeTaskCreatedPlacementFromSavedMarkdown()`、`enqueueBridgeTaskCreatedFromSavedMarkdown()`、`applyBridgeInboundTaskCreatedEvent()`、`inspectBridgeTaskCreatedPlacement()`、`tests/taskcreated-placement-v0671.js`、v0.6.70 T-0667 / E-20260817-0015 device failure evidence。

## D-044: elapsed idle timeではなくactual data changeをUI invalidation authorityにする

- 判断: focus、visibility復帰、resume、first interactionでは経過時間だけを理由にTaskBoardをreloadしない。relevant Vault / Bridge stateのactual invalidationだけが自動refreshを要求できる。
- 根拠: `handleTaskchuteIdleResumeFreshnessCheck()`、`markTaskchuteDataInvalidated()`、external Vault watcher。
- 理由: no-changeの復帰操作でscroll / selectionを壊すreloadを防ぎながら、Obsidian Sync等の実変更は取りこぼさないため。

## D-045: Bridge inboundの表示更新はlogical drain単位でcoalesceする

- 判断: event apply / verify / Ack / cursorは個別に維持し、plugin-requested TaskBoard refreshだけをstartup / interval / focus / resumeと複数passを含むsessionの最後へ集約する。
- 根拠: `beginBridgeInboundUiRefreshSession()`、`requestBridgeInboundUiRefresh()`、`finalizeBridgeInboundUiRefreshSession()`。
- 理由: backlog catch-up中のreload stormを止めつつ、safe-stop前に正しく適用されたprefixを一度だけ表示し、UI例外をdata correctnessから分離するため。

## D-046: plugin data通知は表示影響を比較してからUI invalidationにする

- 判断: `data.json`のexternal notification自体をTaskChute表示変更の証拠にしない。load前後の表示対象subsetを比較し、差がある場合だけgenerationを進める。cursor、outbox、diagnostics等の非表示系writeは自動reload authorityにしない。初回renderはcurrent generationとして記録し、遅延refreshは実行時にもgeneration差を再確認する。
- 根拠: `decideTaskchuteExternalInvalidation()`、`getTaskchuteVisiblePluginDataSignature()`、`decideTaskchuteDelayedRefresh()`、`flushExternalRefresh()`、`reloadTaskchuteSyncDataFromDisk()`。
- 理由: v0.6.72実機試験で、意図的なTaskChute data changeがないidle後でも最初のinteractionが1回reloadしたため。Bridge / cursorの内部bookkeepingをvisible mutationと混同せず、実Markdown・定義変更は従来どおり反映する必要がある。

## Legacy観測（設計判断ではない）

- 観測: 到達不能な旧Routine duplicate guardと参照のない`TaskLinksModal`が残る。
- 残置理由: 要確認。互換性保留、調査用残置、単なるcleanup漏れのいずれかはコードから確定できない。
