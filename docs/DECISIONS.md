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

## D-026: Integrated / Verified / Releasedを分離する

- 判断: main反映、実機検証、配布公開を別状態として管理する。
- 根拠: `DEVELOPMENT_WORKFLOW.md`と`TEST_MATRIX.md`の運用ルール。
- 理由: 実装またはmain反映だけで、実機保証や配布済みと誤認することを防ぐため。runtime、UI、Bridge releaseはユーザー実機確認とcurrent evidence記録後に行い、docs-onlyはruntime影響なしを確認できた場合だけ例外とする。

## D-027: 意味論を変える判断はユーザー承認を必要とする

- 判断: ユーザー挙動、identity、sync、Ack、lifecycle、destructive migrationの意味変更をCodexが独断で決めない。
- 根拠: canonical docsと開発フローの仕様権限ルール。
- 理由: 軽微な内部実装と、製品・データ互換性に関わる設計判断を分離するため。未決定または矛盾がある場合は推測で実装せず停止して報告する。

## Legacy観測（設計判断ではない）

- 観測: 到達不能な旧Routine duplicate guardと参照のない`TaskLinksModal`が残る。
- 残置理由: 要確認。互換性保留、調査用残置、単なるcleanup漏れのいずれかはコードから確定できない。
