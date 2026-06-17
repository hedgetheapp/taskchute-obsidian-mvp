# TaskChute Settings Cleanup v0.6.22 Inventory

This inventory was created before reorganizing the `TaskchuteSettingTab` settings UI.
Persisted keys are intentionally preserved unless noted.

| Current label / control | Previous location | Key / action | Class | Decision | Reason |
| --- | --- | --- | --- | --- | --- |
| Obsidian起動時にTaskBoardを開く | top | `openTaskBoardOnStartup` | user-facing | keep visible in Basic | Normal startup behavior. |
| Taskchuteノートフォルダ | top | `taskchuteFolder` | user-facing | keep visible in Basic | Root folder must stay discoverable. |
| タスクノートフォルダ | top | `tasksFolder` | user-facing | keep visible in Basic | Required folder path. |
| カレンダーフォルダ | top | `calendarsFolder` | user-facing | keep visible in Basic | Calendar path setting. |
| Bridge有効化 | Bridge API | `bridgeEnabled` | user-facing | keep visible in Bridge | Main cloud sync switch. |
| API Base URL | Bridge API | `bridgeApiBaseUrl` | user-facing | keep visible in Bridge | Required endpoint. |
| API Token | Bridge API | `bridgeApiToken` | user-facing/sensitive | keep visible in Bridge | Required auth, password field retained. |
| User ID | Bridge API | `bridgeUserId` | user-facing | keep visible in Bridge | Required Bridge identity. |
| Device ID | Bridge API | `bridgeDeviceId` | user-facing/safety-critical | keep visible in Bridge | Must be stable and unique per device. |
| API疎通テスト / 最終テスト結果 | Bridge API | `testBridgeApiConnection`, `bridgeLastTest*` | safe diagnostic | keep visible in Bridge | Safe connectivity check. |
| 手動送信テスト / 最終手動送信結果 / 最終送信 event_id | Bridge API | `testBridgeManualSend`, `bridgeLastManualSend*` | developer/debug | move to Developer/Debug | Sends dummy events; not daily user flow. |
| pending取得テスト / 最終pending取得結果 / 件数 / event_id | Bridge API | `testBridgePendingFetch`, `bridgeLastPendingFetch*` | developer/debug | move to Developer/Debug | Superseded for normal users by Repair pending dry-run. |
| ack/既読化テスト / 最終ack結果 / ack event_id | Bridge API | `testBridgeAck`, `bridgeLastAck*` | dangerous/developer | move to Developer/Debug | Low-level ack must not be adjacent to safe controls. |
| 受信dry-run取得 / dry-run表示クリア | Bridge inbound dry-run | `fetchBridgeInboundDryRunEvents`, `clearBridgeInboundDryRunEvents` | diagnostic | move to Developer/Debug; safe duplicate added in Repair | Existing low-level view remains hidden; safe pending check added. |
| 全イベント自動反映 | inbound auto apply | `bridgeInboundAutoApplyEnabled` | advanced/sync | move to Developer/Debug | Can affect apply behavior; keep out of normal flow. |
| 全イベント自動反映 実行間隔 | inbound auto apply | `bridgeInboundAutoApplyIntervalSec` | advanced/sync | move to Developer/Debug | Tuning only. |
| 全イベント自動反映 対象イベント | inbound auto apply | `bridgeInboundAutoApplyEventTypes` | diagnostic | move to Developer/Debug | Internal event list. |
| Bridge user id / Bridge device id status | inbound diagnostics | read-only | diagnostic | move to Developer/Debug | Duplicates visible Bridge fields. |
| Inbound auto apply enabled/runtime/last status rows | inbound diagnostics | `bridgeInboundAutoApply*` read-only | diagnostic | move to Developer/Debug | Low-level state. |
| Pending count / fetched / applied / failed status rows | inbound diagnostics | `bridgeInboundDryRun*`, `bridgeInboundAutoApply*` | diagnostic | move to Developer/Debug | Low-level state. |
| Bridge health summary, mobile resume timeline, pending/apply event log | inbound diagnostics | structured diagnostics | developer/debug | move to Developer/Debug | Verbose debug display. |
| 構造化diagnostics debugログ | inbound diagnostics | `bridgeStructuredDiagnosticsDebugEnabled` | developer/debug | move to Developer/Debug | Verbose logging toggle. |
| Mobile診断ログ操作 buttons | inbound diagnostics | copy/export/clear/refresh diagnostics | developer/debug | move to Developer/Debug | Raw diagnostic tools. |
| Bridge diagnosticsを整理 / diagnostics保持上限を今すぐ適用 | inbound diagnostics | `pruneBridgeDiagnosticsManually` | advanced/developer | move to Developer/Debug | Maintenance/debug action. |
| 状態を再読み込み | inbound diagnostics | `fetchBridgeInboundDryRunEvents` | diagnostic | move to Developer/Debug | Low-level duplicate of Repair pending check. |
| 受信を1回だけ確認/反映 | inbound diagnostics | `runBridgeInboundAutoApplyOnce` | sync action | move to Developer/Debug | Applies events; not a simple report-only action. |
| Inbound auto apply enable/disable buttons | inbound diagnostics | `bridgeInboundAutoApplyEnabled` | advanced/sync | move to Developer/Debug | Low-level state switch duplicate. |
| 停止理由をクリアして再有効化 | inbound diagnostics | clears stopped reason | risky recovery | move to Developer/Debug | Replaced for normal flow by One-click Repair. |
| token抜き診断情報をコピー | inbound diagnostics | sanitized copy | diagnostic | move to Developer/Debug | Useful for support but verbose. |
| 安全イベントだけ自動反映を1回実行 | inbound diagnostics | `applyBridgeInboundSafeEventsOnce` | sync action | move to Developer/Debug | Applies events. |
| TaskCreated/TaskMoved/TaskUpdated/TaskDeleted/TaskStarted/TaskStopped/TaskCompleted/TaskCommentAddedを手動反映 | inbound diagnostics | event-specific apply actions | dangerous/developer | move to Developer/Debug | Manual apply/ack flow; hidden by default. |
| Inbound dry-run result/status/event id rows | inbound diagnostics | `bridgeInboundDryRun*` | diagnostic | move to Developer/Debug | Verbose state. |
| Event-specific manual apply result rows | inbound diagnostics | `bridgeInboundApplyTask*` | diagnostic | move to Developer/Debug | Verbose state. |
| TaskUpdated(project/mode)受信診断 | inbound diagnostics | `bridgeInboundTaskUpdated*Diagnostics` | diagnostic | move to Developer/Debug | Debug-only. |
| 受信候補イベント一覧 | inbound diagnostics | `bridgeInboundDryRunEvents` | developer/debug | move to Developer/Debug | Raw event preview. |
| Bridge / auto flush status | outbound diagnostics | read-only | diagnostic | move to Developer/Debug | Low-level outbound state. |
| logical clock / batch / outbox logical_clock範囲 | outbound diagnostics | `bridgeLogicalClock`, outbox | internal | move to Developer/Debug | Internal cursor/clock state. |
| outbox event_type別件数 / retry / last_error / 最終drain / D1 logical_clock | outbound diagnostics | outbox diagnostics | developer/debug | move to Developer/Debug | Low-level support data. |
| token/API URL/payload抜き送信診断JSONをコピー | outbound diagnostics | sanitized copy | diagnostic | move to Developer/Debug | Support/debug tool. |
| outbox状態 / TaskMoved最小検証 / burst/coalesce/merge/project/mode/category/section diagnostics | outbound diagnostics | many `bridge*Diagnostics` keys | developer/debug | move to Developer/Debug | Verbose diagnostics. |
| outbox最大バッチ件数 | outbound tuning | `bridgeOutboxMaxBatchSize` | advanced/developer | move to Developer/Debug | Sync tuning. |
| outbox最大retry回数 | outbound tuning | `bridgeOutboxMaxRetryCount` | advanced/developer | move to Developer/Debug | Sync tuning. |
| outbox drain最大batch数 | outbound tuning | `bridgeOutboxDrainMaxBatches` | advanced/developer | move to Developer/Debug | Sync tuning. |
| 自動flush有効 | outbound tuning | `bridgeAutoFlushEnabled` | advanced/sync | move to Developer/Debug | Changes outbound behavior. |
| 起動時自動flush有効 | outbound tuning | `bridgeAutoFlushOnStartup` | advanced/sync | move to Developer/Debug | Changes outbound behavior. |
| 起動時自動flush delay ms / debounce ms / min interval ms | outbound tuning | `bridgeAutoFlushDelayMs`, `bridgeAutoFlushDebounceMs`, `bridgeAutoFlushMinIntervalMs` | developer/debug | move to Developer/Debug | Tuning only. |
| outboxテストイベント追加 | outbound diagnostics | `addBridgeOutboxTestEvent` | test/developer | move to Developer/Debug | Test data creation. |
| outboxを1 batch送信 / 空になるまで送信 | outbound actions | `testBridgeOutboxFlush`, `drainBridgeOutbox` | sync action | move to Developer/Debug | Sends events. |
| outbox flush / auto flush result rows | outbound diagnostics | `bridgeOutboxLast*`, `bridgeAutoFlushLast*` | diagnostic | move to Developer/Debug | Verbose state. |
| lifecycle / TaskUpdated / TaskDeleted / TaskMoved enqueue result rows | outbound diagnostics | `bridgeLast*` | diagnostic | move to Developer/Debug | Verbose state. |
| ユーザー属性 | advanced | `userAttributes` | advanced | move to Advanced | Affects metadata/log output; not daily setup. |
| 日付またぎ許容時間 | advanced | `manualOvernightLimitHours` | advanced | move to Advanced | Advanced execution-time rule. |
| エラーログ自動削除 | error log | `errorLogAutoDeleteEnabled` | diagnostic maintenance | move to Repair/Diagnostics | Recovery/diagnostic maintenance. |
| エラーログ保存期間 | error log | `errorLogRetentionDays` | diagnostic maintenance | move to Repair/Diagnostics | Recovery/diagnostic maintenance. |
| プロジェクト設定 | management | `activateProjectSettingsView` | user-facing navigation | keep visible in Basic | Main configuration area. |
| セクション設定 | management | `activateSectionSettingsView` | user-facing navigation | keep visible in Basic | Main board setup. |
| モード設定 | management | `activateModeSettingsView` | user-facing navigation | keep visible in Basic | Main metadata setup. |
| ルーティン設定 | management | `activateRoutineSettingsView` | user-facing navigation | keep visible in Basic | Main routine setup. |
| 履歴管理 | management | `activateHistoryManagementView` | advanced/user-facing navigation | keep visible in Basic | Important recovery/history screen. |
| 休日カレンダー | management | `activateHolidayCalendarView` | user-facing navigation | keep visible in Basic | Routine/business-day setup. |
| 初期セットアップ/診断 | management | `activateSetupDiagnosticView` | diagnostic navigation | keep visible in Repair and Basic link | Important recovery screen. |
| 設定バックアップ/復元 | management | `activateSettingsBackupView` | repair/navigation | keep visible in Repair and Basic link | Important recovery screen. |
| TaskChute修復 | newly added in v0.6.21 | `runTaskchuteOneClickRepair`, command `taskchute-one-click-repair` | repair | keep visible in Repair and command palette | Required one-click repair entry. |
| Taskchute indexを再構築 | newly promoted | `rebuildTaskchuteIndex` | repair | keep visible in Repair | Safe derived-cache rebuild. |
| Bridge pending dry-run | newly promoted | `fetchBridgeInboundDryRunEvents` report-only | repair | keep visible in Repair | Safe report-only Bridge check. |
| Developer/debug toggle | newly added | `settingsShowDeveloperDebug` | developer visibility | keep visible in Advanced | Explicit opt-in before low-level controls appear. |

No persisted setting keys were removed. No existing sync/apply/ack semantics were changed.
