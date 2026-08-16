# Feature Inventory

## 基準

この一覧はmain統合済み・未配布v0.6.70の現行feature inventoryである。配布済みv0.6.69では実TaskBoard D&D直後にoperation / batch / semantic / diagnosticが作られないroute bypassが確認された。v0.6.70はrow / section-container dropを共通gatewayからdispatchし、single-task same-date routeへ同一semantic lifecycleを要求する。synthetic PASS、実機`NOT_VERIFIED`で、full matrixも`NOT_VERIFIED`である。

## ステータス定義

- **実装済み**: 現行コードに主要な操作経路と保存処理が存在する。
- **一部実装**: 中核はあるが、対象範囲が限定される、または現行版の試験・運用が未完了。
- **未実装**: コード上に対象機能の本体がない。
- **要確認**: コードだけでは運用上の完成判定ができない。

「実装済み」は「v0.6.70で実機試験済み」を意味しない。実機保証状態は`TEST_MATRIX.md`、開発状況は`CURRENT.md`を参照する。

## TaskBoard

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| 日付別TaskBoard | 実装済み | `TaskchuteView`。前日・翌日・カレンダー指定日を表示する。 |
| セクション表示 | 実装済み | section別にtask行を表示し、開閉状態を管理する。 |
| PC表形式UI | 実装済み | 列幅、列順、表示列、row height、右サイドペインを持つ。 |
| モバイルカードUI | 実装済み | quick add、running bar、カード詳細、quick dragを持つ。 |
| summary / filter / sort | 実装済み | project等のfilter、開始予定sort、完了表示切替。 |
| キーボード操作 | 実装済み | 開始・完了、追加、移動、削除、選択、undo / redo、hint mode。 |

## Task管理

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| Task作成 | 実装済み | 通常追加、section先頭、現在行の下、割り込み追加。全通常作成行へ`section` / `section_id`を保存する。explicit insert-belowは通常target直下へ物理保存し、completed / running / paused保護時だけ既存top-insert規則を使う。`addTask()`、`insertTaskAfterKey()`、`insertTaskBelowCurrent()`。 |
| Task編集 | 実装済み | title、estimate、start/end plan、actual、各属性を更新。 |
| Task削除 | 実装済み | 単体・複数・全件系。削除前snapshotとBridge guardを持つ。 |
| Taskコピー | 実装済み | task noteとboard entryを別IDで複製し、通常targetでは物理行も選択行直下へ保存する。 |
| Task移動 | 実装済み | 上下、D&D、section、日付変更、複数選択移動。TaskBoardのrow / section-container dropは共通gatewayでrouteを記録し、single-task same-date D&Dは最初の永続変更前からoperation-scoped semantic lifecycleへ入る。same-section D&Dはexact source/target `entry_id`の物理見出しを正として、runtime section fieldsが空でも保存後entryを再検証し、欠落metaを補完する。明示section ID不一致はblockする。 |
| title / task note filename同期 | 実装済み | title、YAML、heading、リンクalias、必要時renameを扱う。 |
| entry identity | 実装済み | 原則`task_id + entry_id`。同一task_id複数entryを許容する。 |
| undo / redo | 実装済み | 操作snapshotをmemory stackで保持。最大20。 |

## 実行管理

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| 開始 | 実装済み | runtime.running、TaskBoard、Log、LogDailyを更新。 |
| 完了 | 実装済み | checkbox、実績時刻、done log、runtimeを更新。 |
| 中断・再開 | 実装済み | runtime.pausedとlifecycle logを扱う。 |
| 割り込み | 実装済み | 実行中taskをinterruptedにする。continuation identityは停止時に予約し、interrupting taskのtask-start section移動確定後、final physical entry直後へsection metadata付きで保存・再検証してからTaskCreatedへhandoffする。v0.6.65で開始割り込みchainと三端末最終配置はPASS。resume / completionを含むfull lifecycleは要確認。 |
| running cleanup | 実装済み | exec_id、occurrence key、entry_id、task_idの優先順でrunning行を閉じる。 |
| 実績時刻手入力 | 実装済み | start_actual / end_actualとLog / LogDailyを再整合する。 |
| 同一task_id複数entry | 一部実装 | TaskMoved v4・lifecycle cleanupはentry-safe化済み。v0.6.65の同一sectionD&Dは三端末PASSだが、全経路の現行回帰は要確認。 |

## Task詳細

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| コメント | 実装済み | task noteのComments thread、PC右pane・mobile UI・Bridge追加同期。 |
| 関連リンク | 実装済み | URL / wiki linkの編集・表示・open menu。 |
| サブタスク | 実装済み | 追加、rename、delete、reorder、check。 |
| Routine日別サブタスク | 実装済み | templateはtask note、当日状態はRoutineLogへ保存。 |
| task note | 実装済み | YAML、heading、Notes、Comments、Subtasksを保持する。 |

## 定義・分類

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| Project | 実装済み | 設定view、note、ID、archive、Bridge定義同期。 |
| Mode | 実装済み | 設定view、note、ID、色・icon、Bridge定義同期。 |
| Category | 実装済み | note-based定義とBridge Created / Updated / Deleted。 |
| Area | 実装済み | note-based定義とBridge Created / Updated / Deleted。 |
| Client | 実装済み | note-based定義とBridge Created / Updated / Deleted。 |
| Section | 実装済み | name、time range、color、icon、order、Bridge同期。 |
| Priority | 実装済み | task属性として編集・保存。独立定義同期はない。 |
| `project_id`全面正規化 | 未実装 | name-key互換層が残る。移行要否は要確認。 |

## Routine

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| 通常Routine定義 | 実装済み | repeat条件、期間、time、section、属性、subtask template。 |
| Routine自動生成 | 実装済み | 表示日へ生成し、occurrence keyで重複防止。 |
| 生成済み行再整合 | 実装済み | 未実行・未保護の当日以降行へmaster変更を反映。 |
| 今回のみ操作 | 実装済み | skip / cancel / deleteをRoutineHistoryとBridgeへ記録。 |
| Routine occurrence override | 実装済み | title等の個別変更をoccurrence keyで解決する。 |
| Routine実行lifecycle | 実装済み | occurrence key主キーで開始・完了・Logを同期する。 |
| interrupt continuation | 実装済み | Routine metadata継承とcontinuation-aware duplicate guardあり。v0.6.65で同一occurrence key・別entry、三端末metadata、再評価後の重複なしを確認。resume / completionを含むfull regressionは要確認。 |
| safe rekey | 一部実装 | 未実行等の安全条件下でentry_idをrekey。実Vault回帰は保留。 |
| Rotation Routine | 実装済み（ローカル） | menu rotation、preview、生成、履歴。Bridge同期は対象外。 |
| RoutineHistory全体Bridge同期 | 未実装 | occurrence操作に必要な状態だけ同期する。 |

## 履歴・保守

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| Board履歴 | 実装済み | `.taskchute/board-history/{date}`へsnapshot、preview・restore・delete。 |
| 操作Undo / Redo | 一部実装 | local snapshot restoreに加え、same-date cross-section / same-sectionの単一task D&DだけをTaskMoved v4としてBridge同期する。operation-scoped semantic batchとcapture-phase shortcut gatewayを維持し、v0.6.70では実UI row / section drop gatewayからexact semantic actionがhistory topにあることまで検証する。成立しない同期済みD&Dはunsafe generic snapshotを除去してlocal-only Undoをblockする。create/delete、lifecycle、Routine定義、date moveはcross-device undo対象外。実機未確認。 |
| 設定backup / restore | 実装済み | `.taskchute/backups`系へ設定と関連ファイルを保存。 |
| index再構築 | 実装済み | `Taskchute/_system/index.json`をMarkdownから再構築。 |
| 整合性診断 | 実装済み | folder、ID、frontmatter、duplicate、runtime等を検査。 |
| one-click repair | 実装済み | backupとreportを作り、安全と判断した項目だけ修復。 |
| error log管理 | 実装済み | Taskchute由来logの保存・cleanup・診断表示。 |
| 自動テスト | 一部実装 | `tests/`にv0.6.59からv0.6.70のTaskMoved、rename、insert-below、section handoff、physical context、interrupt continuation、Undo / Redo lifecycle / keyboard routing / actual UI D&D route focused testsがある。汎用test runnerと広範な自動回帰は未実装。 |

## Bridge

| 機能 | 状態 | 概要・根拠 |
|---|---|---|
| outbound outbox | 実装済み | `data.json`へpending / failed / sent / supersededを保持。 |
| TaskCreated直後rename handoff | 実装済み・実機未試験 | flush対象外のpending TaskCreatedへtitleをmergeする。送信snapshot対象中またはTaskCreated不在なら同一`task_id + entry_id`のTaskUpdatedを追加し、旧titleだけの送信を防ぐ。 |
| auto flush | 実装済み・実機未試験 | debounce、batch、retry上限、startup option。実行中のenqueue要求を保持し、終了後に送信可能eventが残る場合だけ再scheduleする。 |
| pending pull | 実装済み | `server_sequence` cursorから昇順取得する。 |
| inbound registry | 実装済み | eventごとにapply・verify・Ack guardを登録。 |
| post-save verification | 実装済み | Markdownやruntimeを再読込してからAckする。 |
| safe stop | 実装済み | failed_unackedでAck・cursor進行を止める。 |
| Ack / cursor result separation | 実装済み・実機未試験 | server Ack成功とlocal cursor保存結果を別状態で返し、cursor保存失敗をserver Ack失敗と表示しない。 |
| trusted cursor persistence | 実装済み・実機未試験 | inbound Ack cursorだけに限定した保存経路で最新data.jsonへmonotonic mergeする。 |
| cursor-only reconciliation | 一部実装 | server Ack済みeventをMarkdownへ再適用せずcursorへ反映する。現行client記録またはlegacy cache / diagnostic証跡を使う。cold cacheでの任意server照会はAPI未実装。 |
| TaskMoved v4 | 実装済み | `target_order_entry_ids` / `source_order_entry_ids`を正とする。v0.6.63でbasic / section handoff / cross-section / empty-source / date move、v0.6.65でsame-task multi-entry D&Dが三端末PASS。現行versionでの全組合せ回帰は未完了。 |
| TaskMoved Undo / Redo Bridge | 実装済み・実機未試験 | D&D専用Undo batchへoperation / batch identityを付け、exact task / entryとbefore / after fingerprintを検証後だけsemantic付き履歴としてcommitする。commit後はexact semantic actionがhistory topに1件だけあることも検証する。復元前後のMarkdown検証後に`task-undo-confirmed-markdown-v4` / `task-redo-confirmed-markdown-v4`をenqueueする。v0.6.69実UI routeはlifecycle未開始でFAILし、v0.6.70でrow / section routeを共通gatewayへ統合した。実機再試験待ち。 |
| lifecycle classifier | 実装済み | normal / routine_occurrence / identity_conflict。 |
| mobile resume drain | 実装済み・実機未試験 | hidden延期、visible recovery、watch window、retryに加え、recoverable Ack / cursor停止のreconcile後復帰を行う。 |
| オフライン復帰 | 一部実装 | network error分類と再試行はある。長時間実機試験は要確認。 |
| D1 schema管理 | 要確認 | clientはHTTP APIのみ利用。Worker / D1 schemaはこのrepoにない。 |

## 将来機能

| 機能 | 状態 | 備考 |
|---|---|---|
| Androidアプリ専用機能 | 未実装 | Obsidian Android UI対応はあるが、独立アプリではない。 |
| Android Widget | 未実装 | 既存v6.6仕様で対象外。 |
| Pixel Watch / Watch | 未実装 | 将来候補。 |
| 外部カレンダー連携 | 未実装 | 内蔵休日カレンダーとは別。 |
| MCP / external command API | 未実装 | indexと設計準備のみ。 |
