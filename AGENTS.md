# TaskChute Bridge v6.6 Routine Sync Test 2 Guard

- Bridge前`main.js`の通常Routine生成・再整合・無効化挙動を維持する。
- 通常Routine無効化・条件変更時は、完了済み・実行済み・実行中・中断中を保護し、当日以降の未実行生成済み行を削除・再整合する。
- occurrence keyは`routine:{routine_id}:{occurrence_date}`とし、タイトル・開始予定・section・見積を含めない。
- 今回のみ操作は`RoutineOccurrenceSkipped` / `RoutineOccurrenceCancelled` / `RoutineOccurrenceDeleted`で同期する。
- Routine定義受信applyから派生したTask更新・移動・削除をBridgeへ再enqueueしない。
- Rotation Routineはv6.6同期対象外。`rotationRoutines`のローカル挙動を変更しない。

v6.6 Routine同期の設計判断は`docs/bridge/Taskchute_Bridge_v6.6_Routine同期_仕様書_v1.md`を最優先する。

- Routine定義イベントは`RoutineCreated / RoutineUpdated / RoutineDeleted / RoutineReordered`とし、`routine_id`を正とする。
- Routine生成タスクは`routine_occurrence_key = routine:{routine_id}:date:{YYYY-MM-DD}:time:{scheduled_time_or_empty}`で冪等化する。
- 同一occurrence keyのローカル生成と受信TaskCreatedは重複作成しない。
- Routine削除・無効化で既存生成タスクを削除しない。
- 未知の`section_id`を持つRoutine定義は未Ack停止せず保存し、診断を残す。
- v6.5 RC3 FIXEDのMarkdown正、`task_id + entry_id`、保存後検証Ack、false-applied禁止、cursor飛ばし禁止、mobile hidden drain制御を弱めない。
- `main.js`単一ファイル運用を維持する。

# Taskchute Bridge v6.5 RC3 FIXED Release Guard

Taskchute Bridge v6.5 RC3 FIXEDは、dev / remote / mobileの三端末起点最終スモーク通過済みの固定状態として扱う。

- RC3本体の同期ロジックを変更しない。変更が必要な場合はRC3.1またはRC4候補として扱う。
- 正本は`docs/bridge/Taskchute_Bridge_v6.5_RC3_RELEASE_LOCK.md`、`docs/bridge/Taskchute_Bridge_仕様メモ_v6.5_RC3_FIXED.md`、`docs/bridge/Taskchute_Bridge_引継ぎ_v6.5_RC3_FIXED.md`とする。
- Markdown正、`task_id + entry_id` identity、保存後検証Ack、false-applied禁止、cursor飛ばし禁止を維持する。
- `TaskStarted / TaskStopped / TaskCompleted`のappend-only保護を弱めない。
- TaskDeletedは削除後Markdown検証成功時のみ送信し、完了済み削除では`delete_context=completed-task-delete` / `is_completed=1`を維持する。
- mobile hidden中にpending fetch / apply / Ackを開始しない。visible復帰後のdeferred drain制御を変更しない。
- Ack条件、cursor進行条件、保存後検証条件、inbound apply本体、D1 schema、Task系payload意味論を変更しない。
- `main.js`単一ファイル運用を維持する。

# TaskChute Bridge v6.5 RC2 Development Guard

## RC2 TaskStarted Start-Section Rule

v6.5 RC2では、RC1固定後のPC 2 Vault運用試験で見つかったTaskStarted開始時セクション不整合を修正済みの仕様として扱う。

Codex実装時の注意:

- TaskStarted payloadのsection情報を古いtask/cache/occurrenceから作らないこと。
- タスク開始時は`started_at`のUTC ISOをローカル時刻へ変換してセクション判定すること。
- 開始時セクション移動が発生する場合は、保存後Markdownを再読込してentry_idの物理位置を確定すること。
- `task-start-section-move-confirmed-markdown-v3` のTaskMovedをTaskStartedより先にenqueueすること。
- 行コメントの `section` / `section_id` と物理見出しをズラさないこと。
- false-applied禁止、cursor飛ばし禁止、保存後検証Ackを守ること。

# TaskChute Bridge v6.5 RC1 Development Guard

## Source of Truth

TaskChute Bridgeでは、Obsidian Vault上のMarkdownを正とする。

- `Taskchute/YYYY-MM-DD Taskchute.md`が日付・セクション・順序・実行状態の正
- `Taskchute/Tasks/*.md`がタスク定義の正
- `Taskchute/_system/index.json`は再構築可能キャッシュ
- `data.json`は設定・runtime・outbox・cursor・diagnostics保持
- D1 `events`はイベントログ
- D1 `applied_events`は端末ごとの適用済み管理

## Identity Rule

Task identityは原則`task_id + entry_id`とする。

禁止:

- `entry_id`があるpayloadで、`task_id`だけを根拠に同一task扱いする
- 同一`task_id`の別`entry_id`を既知扱いしてAckする
- TaskDeleted missing targetを`knownTaskIds.has(taskId)`だけで`skipped_applied`にする

許可:

- `entry_id`がない旧payloadのみ、後方互換として`task_id` fallbackを使う

## Ack / Cursor Safety

Bridge applyでは、以下を必ず守る。

- 保存後検証が成功した場合のみAckする
- false-appliedを禁止する
- apply失敗イベントをapplied扱いにしない
- apply失敗時にcursorだけ進めない
- `verified=false`相当のdiagnosticsを保護する
- unknown_event / failed_unacked / safe_stopped系diagnosticsを安易に削らない

## TaskDeleted Rules

TaskDeleted applyでは、missing targetを安全側に判定する。

- payloadに`entry_id`がある場合: `knownEntryIds.has(entryId)`のみ既知扱い
- payloadに`entry_id`がない旧payloadの場合のみ: `knownTaskIds.has(taskId)` fallback可
- task_idだけ既知・entry_id未知の場合: `missing_target_task_id_only_rejected_entry_id_required`として未Ack側に回す

全件削除/一括削除では、削除前Markdown snapshotからTaskDeletedをenqueueする。削除後のlive entries / DOM / runtime rows反復に依存してはいけない。

## TaskCreated Guard

新規作成直後の高速更新・削除・移動では、TaskCreatedなしの後続Taskイベントを送信してはいけない。

- 新規作成pending identityは`task_id + entry_id`単位で管理する
- TaskCreated未確定の新規entryに対するTaskUpdated / TaskMoved等は送信しない
- 既存タスクを、既知集合未登録だけで停止してはいけない
- `task_id`単独で別entryを既知扱いしない

## TaskStarted Rules

TaskStartedは`started_at` payloadを正とする。

受信applyでは以下が揃った場合のみAckする。

- TaskBoard row更新
- Log開始ログ
- LogDaily開始ログ
- runtime.running
- 保存後再読込検証成功

通常開始とresume系は分離する。通常開始ログ必須条件をresumeへ誤適用してはいけない。

## Reset to Not Started

Uキー開始前戻し/手動開始時刻クリアは専用イベントを増やさずTaskUpdatedで扱う。

正規化値:

- `start_actual`空
- `end_actual`空
- `run_state=not_started`
- `is_running=false`
- `is_completed=false`

remote applyではTaskBoard row、runtime.running、Log / LogDaily整合を保存後検証し、成功時のみAckする。

## Diagnostics Retention

diagnostics保持上限を実装・修正する場合は、protected-aware pruneを守る。

削ってはいけないもの:

- outbox
- cursor
- API設定
- applied event ID履歴
- failed_unacked
- unknown_event
- `verified=false`相当
- safe_stopped系

## Required Checks

Bridge関連の修正後は最低限以下を実施する。

```powershell
node --check .\main.js
```

変更内容に応じて、通常削除、create直後delete、全件削除、TaskStarted受信、Uキー開始前戻し、手動開始時刻クリア、TaskDeleted missing target、diagnostics pruneを確認する。

# TaskChute Bridge v6.4 RC1 開発ルール

## 参照優先順位

Bridgeの実装・レビュー・診断では、次を正本として上から順に優先する。

1. `Taskchute_Bridge_統合設計仕様書_v6.4_RC1_整理版.md`
2. `Taskchute_Bridge_引継ぎ_v6.4_RC1_仕様整理後.md`
3. `Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`
4. `Taskchute_Bridge_仕様整理マップ_v6.4_RC1.md`

- 旧追補、診断メモ、過去Codex指示は履歴扱いとし、整理版仕様書と矛盾する場合は整理版を優先する。
- Bridge運用文書は`docs/bridge/README.md`から参照する。

## 実装境界

- `main.js`単一ファイル運用を維持する。Bridge対応を理由に`src/`分割、esbuild前提化、TypeScript化を行わない。
- `data.json`と`Taskchute/_system/index.json`は端末固有・再構築可能な状態を含むため、Vault間コピーや正データ扱いをしない。
- API token、Authorization header、API URL全文、payload_json全文、data.json全文をNotice、console、ログ、診断UI、コピー診断情報へ出さない。

## Bridge不変条件

- Taskchute日付MarkdownをTaskBoardの日付・section・order・entry位置の正データとする。
- `Taskchute/_system/index.json`は再構築可能キャッシュ。index.json単独不一致ではTaskMovedを止めず、warning diagnosticsを残す。
- Pull順序は`server_sequence ASC, event_id ASC`。`logical_clock`を端末間cursorや後勝ち判定に使わない。
- Ackは保存後にMarkdownを再読込し、期待状態を検証できた場合だけ行う。
- `verified=false`、`failed_unacked`、unknown event、unsupported payload version、missing prerequisite、Ack失敗ではAckせず、cursorを進めない。
- cursorは連続してAck成功済みの最大`server_sequence`までとし、失敗・未検証イベントを跨がない。
- applied_eventsに記録済みなのにMarkdown未反映となるfalse-appliedを禁止する。

## Taskイベント責務

- 値変更は`TaskUpdated`、TaskBoard上のdate・section・order・entry位置変更は`TaskMoved v3`で同期する。
- `start_plan`変更でsectionが変わる場合、`TaskUpdated(start_plan)`と`TaskMoved v3(section-change)`の両方を送る。
- `TaskUpdated(start_plan)`と`TaskMoved(section-change)`、start_plan由来TaskMovedと通常TaskMoved、日付変更TaskMovedをcoalesceやsupersededで互いに潰さない。
- TaskMoved v3は`from`、`to`、`before`、`after`、`target_order_task_ids`を持ち、保存後Markdownの確定位置・順序から生成する。
- start_plan由来TaskMovedのsourceは`start-plan-section-move-confirmed-markdown-v3`とする。
- TaskDeleted受信applyでは古いlineIndexや古い`occurrence.markdown`を保存に使わず、現在Markdownを再読込して対象entryだけ削除する。他entryが変化した場合は未Ackで安全停止する。

## 安全停止とdiagnostics

- ユーザー設定の全イベント反映ON/OFFとruntime `safe_stopped`を分離する。安全停止時にユーザー設定を勝手にOFFへ戻さない。
- 失敗、skip、warningには、安全化済みの理由、decision、reason_code、対象IDをdiagnosticsへ残す。
- 重複対象、対象解決不能、保存後検証失敗、prerequisite不足では未Ackで停止する。UI操作で失敗イベントを勝手にAckしない。

## 最低確認

Bridge関連文書・実装変更後は最低限、次を確認する。

```powershell
node --check .\main.js
```

- 実装変更時は`Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`から影響項目を再試験する。
- 文書のみの変更では、実装ファイルが変更されていないことと、README / AGENTS / docsが整理版仕様書と矛盾しないことを確認する。

# v0.6.10 ルーティン設定ページの行D&D並び替え

## v0.6.12 実績時刻候補プルダウンUI修正

- v0.6.11で追加した開始時間/終了時間の候補UIを、入力欄に紐づくプルダウン風の縦リストへ変更した。
- 開始時間候補は「直前の終了時間」「現在時刻」、終了時間候補は「見積通り」を維持する。
- 候補選択は `pointerdown` で処理し、入力欄の `blur` 保存より先に候補値を適用する。
- 候補適用中は `blur` による二重commitを抑止し、ボタンを押しても保存処理が走らない問題を防ぐ。
- PC版TaskBoardのインライン実績時刻入力、モバイル版カード内の実績時刻入力の両方に適用する。
- 保存処理は既存の `updateTaskActualTimeField()` を通し、同期ガード・保存失敗時停止・Log/LogDaily更新方針は変更しない。


- v0.6.10では、ルーティン設定ページの「登録中ルーティン」一覧で、各行左端のドラッグハンドルから上下入れ替えできるようにする。
- 並び替え結果は各ルーティンタスクノートの frontmatter `routine_order` に保存する。
- D&D後は表示順を手動順（`routine_order` 昇順）へ切り替え、次回表示・今後のルーティン生成順にも反映しやすくする。
- 入力欄、select、ボタン、列幅リサイズ、列D&Dとは干渉しないよう、行D&Dは左端の専用ハンドルを主導線にする。
- 保存が同期ガード等で停止した場合は、並び替え成功Noticeや表示更新へ進まない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

# v0.6.09 サブタスクチェック時の右サイドペインスクロール保持

- v0.6.09では、PC右サイドペインのサブタスクチェック/解除時にペインが最上部へスクロールされる問題を修正した。
- サブタスクチェック保存の `await` 前に右サイドペインのスクロール位置を退避し、再描画後に複数タイミングで復元する。
- `updateDesktopRightPane({ preserveScroll: true })` は、呼び出し元から渡された `scrollSnapshot` を優先して使えるようにする。
- サブタスク保存形式、RoutineLog、Log / LogDaily / actual、チェックボックスの見た目は変更しない。
- 修正版ZIP作成時は毎回バージョンを上げ、`main.js` 単一ファイル運用を継続する。

﻿## v0.6.04 追加ルール（TaskBoard日付移動時の同期表示サイレント化）

- v0.6.04では、v0.6.03をベースに、TaskBoardで前日/翌日/カレンダー指定日へ表示日を移動したとき、同期データの再読み込みは行いつつ、中央の「同期中」オーバーレイを出さないようにする。
- 日付移動はユーザーにとって表示日の切替であり、Vault到着済みデータの読み直し・短い安定待ちは内部処理としてサイレントに行う。
- 手動の「同期データを再読み込み」や外部同期反映では、従来どおり同期中表示を出してよい。
- `reloadTaskchuteSyncDataFromDisk()` は、`showStatus: false` のときに `externalSyncEditLockUntil` 由来の同期表示を出さない。明示的に表示/編集ロックしたい場合は `showStatus: true` または `blockEditingDuringReload: true` を使う。
- `changeBoardDate()` では `silentUi: true` を渡し、前日/翌日/指定日移動時の再読み込みをサイレント扱いにする。
- 同期ガード、外部同期後full refresh方針、手動再読み込み、ルーティン/ローテーション生成、保存形式は変更しない。
- `manifest.json` は `0.6.04`。
- main.js単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.99 追加ルール（ローテーションルーティンのメニュー手入力化）

- v0.5.99では、v0.5.98のローテーションルーティンMVPをベースに、メニュー設定を「既存タスクを選択」ではなく「1行1メニュー名の手入力」に変更する。
- ローテーション設定モーダルでは、メニュー順をtextareaで入力する。1行が1メニューで、上から順にローテーション順とする。
- 保存時に各メニュー名から必要なタスクノートを自動作成する。既に同じタイトルのタスクノートがある場合は新規作成せず再利用する。
- 編集時に既存行のタイトルを変えずに保存した場合は、既存の `task_id` / `file_base` を維持する。行名を変更した場合は、同名既存タスクの再利用または新規作成として扱う。
- 自動作成するローテーションメニュー用タスクノートは `routine: false` とし、通常ルーティン一覧には出さない。ローテーション設定が生成制御の正とする。
- 生成されたTaskBoard行は従来どおり `is_routine=true` / `routine_type=rotation` / `rotation_id` / `rotation_name` / `rotation_index` / `rotation_pattern` を持つ。
- サブタスクテンプレートは自動作成された各タスクノートの `## Subtasks` を使える。
- v0.5.98の予定プレビュー、休み日の非生成、重複生成防止、Log/LogDaily記録方針は維持する。
- `manifest.json` は `0.5.99`。
- main.js単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.97 追加ルール（ルーティン設定ページのサブタスクテンプレート表示修正）

- v0.5.97では、v0.5.96をベースに、TaskBoard側のタスク一覧からルーティン設定したサブタスクテンプレートが、ルーティン設定ページ側で「なし」と表示される問題を修正する。
- ルーティン設定ページで使う `getAllRoutineTaskDefinitions()` は、タスクノートの `## Subtasks` を読み取り、未チェックテンプレートとして `task.subtasks` に入れる。
- ルーティン生成で使う `getRoutineDefinitions()` でも同じく `## Subtasks` を読み取り、ルーティンタスク定義として保持する。
- ルーティン設定ページのサブタスク編集モーダルを開く直前にもタスクノートを読み直し、古いtaskオブジェクトにサブタスクが入っていない場合でも、最新の `## Subtasks` を表示する。
- ルーティン設定ページで新規ルーティンを作成する場合は、空の `## Subtasks` セクションを初期作成し、サブタスクテンプレート欄の保存先を明確にする。
- 通常タスクのサブタスク保存仕様、ルーティン生成行の日別RoutineLog保存仕様、モバイルカード内サブタスクUI、PC右サイドペインUI、同期ガード方針は変更しない。
- `manifest.json` は `0.5.97`。
- ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.96 追加ルール（空セクションIキー追加の表示反映修正）

- v0.5.96では、v0.5.95をベースに、タスクがないセクションを選択して `I` キーでセクション先頭へタスクを追加した直後、保存は成功しているのにTaskBoardへ即時表示されず、リロード後にだけ表示される問題を修正する。
- 原因は、ローカル操作後の差分反映 `applyExternalTaskPatch()` が `refresh()` 内ローカル関数 `isCurrentRefresh()` を参照しており、`refresh()` の外から呼ばれると未定義参照で例外になる可能性があったこと。
- `applyExternalTaskPatch()` にはメソッド内専用の世代チェック `isCurrentPatch()` を持たせ、差分反映中に別refreshが走った場合のみ安全に中断する。
- `insertTaskAtSelectedSectionTop()` では、Taskchuteノートとruntime保存が成功した後の表示パッチ失敗を「追加失敗」として扱わない。パッチ失敗時はログに記録し、full refreshへフォールバックする。
- `insertTaskAtSelectedSectionTop()` で追加するTaskBoard行の `tc` メタには `section` / `section_id` も出力し、空セクションへの追加直後の差分反映・フィルタ・後続のセクション判定が見出し推定だけに依存しないようにする。
- これにより、空セクションへの `I` キー追加で「セクション先頭にタスクを追加できませんでした」Noticeが出る一方、リロード後にはタスクが存在する、という保存済み/表示失敗の混同を避ける。
- 保存停止時にUIだけ進めないv0.5.91〜v0.5.95方針は維持する。今回は保存失敗ではなく、保存成功後の表示反映失敗を正しく分離する修正とする。
- v0.5.90の外部同期後full refresh方針、v0.5.89のちらつき抑制ロジック不採用、main.js単一ファイル運用、配布ZIPから `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を除外する方針は継続する。

## v0.5.86 ルール（既に完了済み検出時の実行中UI掃除）

- v0.5.86では、v0.5.85をベースに、PCで完了済みになった実行中タスクがモバイル側で実行中表示のまま残るケースへの表示復旧を補強する。
- モバイル側で古い下部フローティング実行中バーやタスク行の「実行中」表示が残っていても、完了ボタン押下時にTaskchuteノート上で既に `[x]` または同じ `exec_id` の `[status::done]` を検出した場合、完了ログは追加しない。
- 既に完了済みと検出した時点で `runtime.running` を解除し、モバイル下部フローティング実行中バーを即時削除し、対象行を完了状態へ局所更新してからTaskBoard再読み込みを行う。
- `runtime.running` が存在しないのに画面上だけ実行中UIが残っている場合も、完了ボタン押下時にフローティングバーを即時削除し、TaskBoard表示を再読み込みする。
- 目的は、PC側の完了結果が到着しているのにモバイルUIだけ古く残る状態で、Noticeだけ出て表示が直らない事故を防ぐこと。
- 完了ログの二重追加防止、対象行0件/複数件停止、同期関連v0.5.50〜v0.5.65、起動時表示、サブタスク/ルーティン設定仕様は維持する。
- `manifest.json` は `0.5.86`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.75 ルール（モバイル版サブタスクUI微調整）

- v0.5.75では、v0.5.74をベースに、モバイル版TaskBoardのカード内サブタスクUIだけを微調整する。
- サブタスク進捗ピルを表示したときに「詳細」ボタンの文字が右側で見切れないよう、モバイルカード操作行の幅配分とボタンサイズを調整する。
- サブタスクのチェック/チェック解除ではTaskBoard全体を再描画せず、該当サブタスク行、完了時刻、進捗カウント、進捗ピルだけを局所更新する。サブタスク追加は新規行生成が必要なため従来どおり再描画してよい。
- サブタスクが0件の場合、詳細内に「サブタスクはまだありません。」の空メッセージを表示しない。
- モバイルのサブタスク欄だけ背景色が浮かないよう、サブタスクパネル/行の背景を透明寄りにし、親カードに自然に馴染ませる。
- ルーティンタスクの日別リセット仕様、通常タスクの `## Subtasks` 保存仕様、Log/LogDaily/actual、同期関連v0.5.50〜v0.5.65、PC右サイドペインUI、起動時表示v0.5.69〜v0.5.72には影響させない。
- `manifest.json` は `0.5.75`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.74 ルール（モバイル版サブタスク展開UI）

- v0.5.74では、v0.5.73をベースに、モバイル版TaskBoardのタスクカード内でサブタスクを展開・チェックできるUIを追加する。
- モバイル版では右サイドペインを使わないため、タスクカードの「詳細」展開内にサブタスク欄を表示する。
- サブタスクがあるタスクでは、詳細ボタン横に `完了数/総数` の進捗ピルを表示し、タップで詳細を開閉できる。
- 詳細展開内のサブタスク欄では、チェック/チェック解除とサブタスク追加を直接行える。編集・削除・並び替えは従来どおり右サイドペイン/既存導線側を主とし、今回のモバイルカード内UIでは主導線にしない。
- ルーティンタスクのサブタスクはv0.5.73の日別リセット仕様を使い、当日のチェック状態はRoutineLog側へ保存する。通常タスクは従来どおり親タスクノート `## Subtasks` に保存する。
- サブタスクチェック/追加は `Log` / `LogDaily` / `actual` には影響させない。実績時間は親タスクの開始/終了だけで集計する。
- 同期関連v0.5.50〜v0.5.65、PC右サイドペインUI、起動時表示v0.5.69〜v0.5.72には影響させない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.70 ルール（モバイル起動時TaskBoard自動表示の開き方改善）
- v0.5.70では、v0.5.69の「Obsidian起動時にTaskBoardを開く」設定を維持したまま、モバイル起動時のTaskBoard自動表示だけ挙動を改善する。
- 設定キー `openTaskBoardOnStartup` は1つのままとし、PC/モバイル別トグルは追加しない。
- 既定値は引き続き `true` とする。
- PCでは従来通り、ワークスペース復元後にTaskBoardを前面表示する。
- モバイルでは、起動直後に復元された現在のノートleafを `getLeaf(false)` で直接TaskBoardへ差し替えない。
- 既にTaskBoard leafがある場合は新規タブを増やさず、そのleafを `revealLeaf` して必要に応じてrefreshする。
- TaskBoard leafがない場合、モバイル起動時のみ `getLeaf("tab")` / `getLeaf(true)` を優先してTaskBoard用leafを用意し、前回ノートが一瞬TaskchuteノートからTaskBoard UIへ切り替わるように見える挙動を減らす。
- コマンドパレット、リボン、設定系ビュー内ボタンからの通常 `activateView()` は従来通り現在leaf再利用を許可する。今回の変更は起動時自動表示専用の `activateViewForStartup()` に限定する。
- 同期関連v0.5.50〜v0.5.65、右サイドペイン/サブタスクv0.5.66〜v0.5.68、TaskBoard保存形式、Log/LogDaily/actualには影響させない。

## v0.5.69 ルール（Obsidian起動時にTaskBoardを自動表示）

- v0.5.69では、v0.5.68をベースに、Obsidian起動時にTaskBoardを自動で前面表示する設定を追加する。
- 設定キーは `openTaskBoardOnStartup` とし、既定値は `true` とする。ユーザーは設定タブの「Obsidian起動時にTaskBoardを開く」トグルでOFFにできる。
- 自動表示は `workspace.onLayoutReady` 後に実行し、Obsidianのワークスペース復元やデイリーノート自動表示の直後にTaskBoardを前面へ出す。
- 既にTaskBoardのleafが開いている場合は新規タブを増やさず、そのleafを `revealLeaf` して必要に応じてrefreshする。開いていない場合のみ既存の `activateView()` でTaskBoardを開く。
- 起動時自動表示はUI起動導線だけの変更とし、同期関連v0.5.50〜v0.5.65、右サイドペイン/サブタスクv0.5.66〜v0.5.68の挙動、TaskBoard保存形式、Log/LogDaily/actualには影響させない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.54 同期中表示UI巻き戻しルール

- v0.5.54では、v0.5.51〜v0.5.53で行った同期中表示の中央寄せ/縦積み調整を不採用とし、同期中表示UIをv0.5.50相当へ戻す。
- v0.5.50で追加したTaskBoard表示時・日付切替時・Obsidian復帰時・長時間未操作後の同期データ再読み込み機能は維持する。
- 同期中表示はv0.5.50時点の既存CSS/DOM構成を正とし、スピナー、同期中文字列、解除ボタンの追加位置調整は行わない。
- v0.5.51〜v0.5.53の `--tc-sync-center-x` / `--tc-sync-label-top` による座標補正、横3列グリッド化、リング下ラベル化は採用しない。
- 今後、同期中表示を再調整する場合は、まずスクリーンショットまたは現状DOM/CSSを確認し、既存のPC用/モバイル用ラベルが重複表示されないことを確認してから行う。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.50 表示時・復帰時の同期データ再読み込みルール

- v0.5.50では、書き込み前ガードだけでなく、TaskBoard表示時・日付切替時・Obsidian復帰時・長時間未操作後のTaskBoard再操作時にも、表示中Taskchuteノートと `data.json` を短く安定待ちして読み直す。
- 目的は、別端末で完了したタスクの変更がPC側に到着済みなのに、起動しっぱなしのTaskBoard表示へ反映されない状態を減らすこと。
- Obsidian Sync本体の完了を保証するものではない。あくまでVaultへ到着済みのファイルを再読込し、古い内部状態のまま表示・書き込みしにくくする対応とする。
- 入力欄・セレクト・コメント・サブタスクなどを編集中の場合、自動の表示再読み込みは入力中DOMを壊さないためスキップする。手動の「同期データを再読み込み」は強制実行できる。
- コマンドパレットとTaskBoard設定メニューに「同期データを再読み込み」を追加し、表示中日付のTaskchuteノート、RoutineHistory、`data.json` を再確認してTaskBoardをスクロール維持で再描画/差分反映する。
- 既存の外部同期イベント反映、`lastWriterDeviceId` 比較、起動/復帰/長時間未操作後の書き込み前ガードは維持する。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.48 起動/復帰/長時間未操作後の操作前同期確認ルール

- v0.5.45の `lastWriterDeviceId` 比較による別端末書き込み検知は維持する。
- ただし、`lastWriterDeviceId` 自体がまだ同期で届いていない可能性があるため、起動直後・アプリ復帰後・長時間未操作後の初回書き込み前にも短い同期猶予を入れる。
- 対象はPC版・モバイル版共通。開始/完了/中断/追加/削除/移動/コメント/サブタスク/設定保存など、既存の `ensureDeviceWriteGuard()` を通る書き込み操作の直前に確認する。
- 起動直後は初回書き込み前に必ず確認する。アプリが30秒以上バックグラウンド/非アクティブだった後も初回書き込み前に確認する。最後のTaskchute書き込みから60分以上経過している場合も確認対象にする。
- 確認中は `data.json` と表示中TaskBoard関連ファイルを短く安定待ちし、到着済みのデータを読み直してから、保留していた操作を続行する。
- Obsidian Sync本体の完了を100%保証するものではない。プラグインからは、到着済みファイルの再読み込みと短い安定待ちによって競合リスクを下げる。
- 確認に失敗しても操作不能にはせず、Noticeを出して操作を続行する。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.47 PC右サイドペインのサブタスクD&Dグリップ表示ルール

- PC版右サイドペインのサブタスク欄では、上下入替え専用ボタン（↑/↓）を表示しない。
- サブタスク行自体にフォーカスできるようにする。
- サブタスク行の `Alt+↑` / `Alt+↓` による並び替えは採用しない。
- サブタスク行はドラッグ&ドロップで並び替え可能にする。
- ドラッグ可能と分かるよう、サブタスク行の左側にグリップ表示を出す。
- 編集ボタン、削除ボタン、チェックボックスは維持する。
- サブタスクの保存形式、RoutineLog保存方針、actual/Log/LogDailyへの影響なしルールは変更しない。
- モバイル版右サイドペインは存在しないため対象外。TaskBoard本体のD&D/Alt+上下移動挙動は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。


## v0.5.44 モバイル日付移動の差分反映ルール

- モバイル版でタスクを「前日へ移動」「翌日へ移動」「日付を選択」で別日に移動した後、TaskBoard全体を再描画しない。
- 日付移動のMarkdown保存・移動先Taskchuteノートへの追加は従来通り行い、表示中のTaskBoardからは移動対象タスク行だけを差分削除する。
- セクション件数、サマリ、選択状態、モバイル実行中表示などは既存の部分更新処理で反映する。
- 反映のために `refreshViews({ preserveScroll: true })` を呼ばない。スクロール位置保持ではなく、全体再描画自体を避ける。
- PC版、タスク移動の対象条件、保存形式、v0.5.42のモバイルセクションヘッダーコンパクト化、v0.5.41相当のタスクカード密度は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。


## v0.5.41 モバイルカード超圧縮差し戻しルール

- v0.5.40のモバイル版TaskBoard通常タスクカードの超コンパクト化は、レイアウト崩れが確認されたため不採用とする。
- v0.5.41では、モバイル版通常タスクカードのスタイルをv0.5.39相当へ戻す。
- v0.5.39までの強コンパクト化は維持するが、v0.5.40で行った時刻チップラベル非表示、1行省略強制、操作行の過度な低背化などの追加圧縮は採用しない。
- PC版、ルーティン設定ページ、保存形式、D&D、タスク追加処理、v0.5.36までのモバイル追加シート挙動は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。


## v0.5.39 モバイル版タスクカード強コンパクト化ルール

- v0.5.39では、v0.5.38をベースにモバイル版TaskBoardの通常タスクカードをさらに強くコンパクト化する。
- 対象はモバイル版TaskBoardの通常タスクカードのみ。PC版、ルーティン設定ページ、保存形式、D&D、タスク追加処理は変更しない。
- 情報項目と主要操作は残したまま、カード内余白、カード間余白、タイトル行高、時刻チップ、コメントボタン、詳細ボタン、三点メニュー、開始/完了ボタン、チェックボックス周辺をさらに低背化する。
- 誤タップが増える場合は、カード全体を戻さず、開始/完了ボタン・三点メニュー・チェックボックスなど操作部品単位で戻す。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

# v0.5.38 追加ルール: モバイル通常タスクカードの追加コンパクト化

- v0.5.37よりさらに、モバイル版TaskBoardの通常タスクカードだけを追加でコンパクト化する。
- 情報項目や操作導線は削除せず、余白・行間・時刻チップ・ボタン/チェックボックス寸法を小さくする。
- 対象は通常タスクカードのみ。PC版、ルーティン設定ページ、保存形式、D&D、タスク追加処理は変更しない。
- もし誤タップが増える場合は、カード全体ではなく開始/完了ボタン・三点メニュー・チェックボックスだけを戻す方針で調整する。

# AGENTS.md — Taskchute Obsidian MVP

## v0.5.34 モバイルタスク追加シートのキーボード表示時サイズ安定化ルール（2026-05-12）

- モバイル版のタスク追加ボトムシートは、表示直後にタスク名入力欄へ自動フォーカスしない。
- これにより、シートを開いた直後にソフトウェアキーボードが自動表示され、シート高さが変わって見える挙動を避ける。
- モバイル版のタスク追加ボトムシートは、開いた時点の画面高さから安定用の高さを算出し、`data-stable-mobile-height` と `--tc-quick-sheet-height` で固定寄りに扱う。
- キーボード表示前後でボトムシートの見た目の高さが大きく変わらないことを優先する。
- PC版の追加フォーム、タスク追加処理、セクション初期選択、保存データ形式は変更しない。

## v0.5.33 モバイルタスク追加の初期セクションルール（2026-05-12）

- モバイル版のタスク追加ボトムシートでは、開いた時点の現在時刻に該当するセクションを初期選択する。
- 判定は既存の `getSectionForStartPlan(settings, HH:mm)` を使い、セクション開始/終了時刻の既存ルールに従う。
- 現在時刻に対応する通常セクションが取得できない場合は、従来通り未選択にする。
- ユーザーがボトムシート内でセクションを変更した場合は、その選択を優先する。
- PC版の追加フォーム、既存タスク編集、開始予定入力、Alt+上下移動、D&D挙動は変更しない。

## v0.5.32 select挙動差し戻しルール（2026-05-12）

- v0.5.31で試したTaskBoardプルダウンの独自候補ポップアップ化は不採用とする。
- v0.5.32ではv0.5.30相当のネイティブselect + showPicker方式へ戻す。
- プロジェクト/モード/セクション等のプルダウンでは、左右キーで選択値を変更しない。
- 上下キー/Enter/Spaceでネイティブ候補一覧を開く挙動を維持する。
- 独自ポップアップ用のCSS/JSを再導入しない。
- 表示位置やスクロールはOS/Electron標準挙動に任せる。

このファイルは Codex / Claude / MCP などのAIエージェント向け開発ルールです。
MarkdownはUTF-8で保存してください。Windows PowerShellで読む場合は `Get-Content -Encoding utf8 .\AGENTS.md` を使ってください。

## 基本ルール

- 返答、レビュー、コメントは日本語で行う。
- ユーザーが指定した最新版ZIPを必ずベースにする。
- 既存実装をゼロから作り直さず、最新版に対する差分修正で進める。
- 修正版ZIPを作成する場合は、必ず `manifest.json` の `version` を上げる。
- ZIP名にもバージョンを含める。例: `taskchute-obsidian-mvp-<summary>-v0.4.73.zip`
- `node --check main.js` を必ず実行する。失敗した場合は修正してから報告する。
- 実機確認できない場合は、静的確認済み/未確認を分けて報告する。
- 不明点を推測で決めない。実装判断が必要な場合は「確認事項」または「TODO」として明記する。


## v0.5.30 TaskBoardプルダウンの矢印キー操作ルール

- TaskBoard上のプロジェクト・モード・セクションなどのプルダウンでは、左右キーで選択値を変更させない。
- プルダウンにフォーカスがある状態で `ArrowLeft` / `ArrowRight` を押した場合は、値変更もTaskBoard側ショートカット処理も行わない。
- プルダウンにフォーカスがある状態で `ArrowUp` / `ArrowDown` を押した場合は、値を直接変更せず、ネイティブの候補一覧を開く。
- `Enter` / `Space` で候補一覧を開く挙動は維持する。
- このルールは、TaskBoardの行移動・列移動・セクション開閉のショートカット感覚と、selectの値変更が競合しないようにするためのもの。

## 現在の重要設計方針

- 人間向けにはObsidianリンクを重視する。
- プラグイン内部ではIDを主キーとして扱う。
- 将来のAI/Codex/Claude/MCP連携では、Markdown直接編集ではなく、index/API/コマンド経由の安全な操作を優先する。
- `Taskchute/_system/index.json` はAI向けの再構築可能なキャッシュであり、正データではない。
- アーカイブはまず論理アーカイブから始める。ノートファイルの物理移動は後回し。


## 現在有効な右サイドペイン仕様（v0.5.22時点）

- 右サイドペインはPC版のみ表示し、モバイルでは描画しない。
- クイックアクションは置かない。タブUIも置かない。
- 現行の表示順は「タスク概要」→「ノート」→「リンク」→「コメント」→「サブタスク」。
- ノート欄にはプロジェクトノートのみ表示する。右サイドペインからタスクノートを開く導線は表示しない。
- プロジェクトノートの `.md` 拡張子や冗長な説明文は表示しない。
- プロジェクトノートを開くボタンは1行で「左で開く」「右で開く」「タブで開く」とする。`通常タブで開く` は右サイドペイン上では使わない。
- リンク欄は、関連リンクがない場合は「リンクを追加」ボタンのみ表示する。関連リンクがある場合はリンクボタンの右隣に削除ボタンを置き、一覧の下に「リンクを追加」を置く。
- コメント欄は右サイドペインから直接追加でき、`Ctrl+Enter` / `Cmd+Enter` で送信する。IME変換中は `isComposing` と `keyCode === 229` の両方で送信抑止する。
- サブタスク欄は `## Subtasks` のチェックリスト型サブタスクを表示し、追加・チェック・チェック解除に対応する。
- 右サイドペイン幅はPC版のみ左端ドラッグで変更でき、`desktopRightPaneWidthPx` に保存する。


## 現在有効なサブタスク仕様（v0.5.14時点）

- 通常タスクのサブタスクはチェックリスト型で、親タスクノートの `## Subtasks` に保存する。
- ルーティンタスクのタスクノート `## Subtasks` はテンプレートとして扱い、その日のチェック状態はRoutineLogへ保存する。
- 未完了は `- [ ] サブタスク名`、完了は `- [x] サブタスク名 ✅ YYYY-MM-DD HH:mm` とする。
- 右サイドペインのサブタスク欄から、追加・チェック・チェック解除・名前編集・削除・上下並び替えができる。
- 名前編集ではチェック状態と完了時刻を保持する。
- 削除では対象サブタスク行のみ削除し、他のサブタスクやコメント、Log/LogDaily は変更しない。
- 上下並び替えでは `## Subtasks` 内のチェックリスト行だけを入れ替える。完了時刻は保持する。
- サブタスクのチェック時刻は actual には加算しない。親タスクの開始〜完了が時間計測単位で、サブタスクは作業内チェックポイントとして扱う。



## 現在有効なルーティンログ仕様（v0.5.15時点）

- ルーティンタスクのコメント・サブタスク状態は、通常タスクと保存先を分ける。
- 通常タスクのコメントは従来どおりタスクノート `## Comments`、通常タスクのサブタスクはタスクノート `## Subtasks` に保存する。
- ルーティンタスクのコメント・サブタスク状態は、日別RoutineLogノート `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` に保存する。
- RoutineLogノートのfrontmatterは最小構成とし、`type: taskchute-routine-log` と `date: YYYY-MM-DD` のみを持つ。`version` は持たせない。
- RoutineLogノート内では、1ルーティン行を1ブロックとして `<!-- tc:routine_detail ... -->` から `<!-- /tc:routine_detail -->` で囲む。
- ルーティンブロックの主キーは `entry_id` とする。ブロックメタには `entry_id` / `task_id` / `routine_id` / `date` / `status` / `completed_at` を持たせる。
- RoutineLogの `status` は `active` / `done` のみを使う。`skipped` / `cancelled` はv0.5.15では使わない。
- ルーティンタスクの「やらない」は、スキップ/キャンセルではなく「削除」に寄せる。削除時の当日再生成防止は既存の `.taskchute/routine-history/YYYY-MM.json` の `deleted` 記録を継続利用する。
- ルーティンタスク削除時は、対応するRoutineLogブロックがあれば削除する。RoutineLogにコメントまたは実質的なサブタスク変更がある場合は削除確認を出す。
- RoutineLogは、コメント追加/編集/削除、サブタスク追加/チェック/解除/名前編集/削除/上下移動、ルーティンタスク完了時に作成/更新する。
- TaskBoardを開いただけ、右サイドペインで表示しただけ、ルーティンが自動生成されただけではRoutineLogを作成しない。
- ルーティンタスク完了時にRoutineLogが未作成の場合でも、RoutineLogを作成し、タスクノート `## Subtasks` テンプレートを未完了状態で展開して `status=done` / `completed_at=HH:mm` を保存する。
- ルーティンタスクのタスクノート `## Subtasks` はサブタスクテンプレートとして扱う。右サイドペインはその日の実行分を編集する場所であり、テンプレート編集はルーティン設定ページまたはタスクノート側で行う。



## 現在有効な完了タスク表示切替仕様（v0.5.16時点）

- 完了タスク非表示状態では、CSS非表示だけでなく、外部同期差分パッチ時に完了行DOMが削除される場合がある。
- そのため、`showCompletedTasks` を `false` から `true` へ切り替えるときは、CSSクラス解除だけでなくTaskBoardを `preserveScroll` 付きで再描画し、DOMから消えていた完了行を復元する。
- `true` から `false` へ切り替えるときは、従来通りCSSクラス反映を主とし、不要な全体再描画は避ける。
- Obsidian Sync等でA端末が完了・B端末が完了タスク非表示中に差分反映した後、B端末で完了タスク表示へ戻した場合も、再ロードなしで完了行を描画する。

## 現在有効な端末別表示設定仕様（v0.5.17時点）

- TaskBoardの表示設定・フィルターは端末ごとに保持し、Obsidian Syncで他端末へ同期しない。
- 対象は、完了タスク表示/非表示、開始予定順フィルター、列表示、列幅、列順、行高、サマリ表示/簡易表示、右サイドペイン開閉/幅、セクション折りたたみ、ルーティン設定ページの列幅/列順などのUI表示状態。
- 端末別表示設定は、Vault名を含む `localStorage` キーに保存する。初回は既存の保存値を取り込み、その後は端末ごとに独立して変化する。
- `saveData()` で保存する同期対象の `data.json` からは、上記の端末別表示設定を除外する。実行中/中断中などのタスク実行状態は従来通り同期対象として扱う。
- 外部同期で `data.json` を再読み込みしても、端末別表示設定は localStorage 側の値を再適用する。
- 開始予定順フィルターのON/OFF状態は端末別だが、フィルターON時に実行するMarkdown上の並び替え結果はタスクデータ変更として同期対象になる。
- 右サイドペインのヘッダーには「選択中タスクのノート導線」の補助文言を表示しない。

## 現在有効なセクション自動展開仕様（v0.5.18時点）

- PC版・モバイル版共通で、閉じているセクションにタスクが追加される場合、そのセクションを自動で開く。
- PC版・モバイル版共通で、タスク移動・ドラッグ＆ドロップ・一括移動・セクション変更などにより、閉じている移動先セクションへタスクが入る場合、その移動先セクションを自動で開く。
- 自動展開は端末別の表示状態として扱う。開いた状態はlocalStorage側の端末別表示設定へ保存し、他端末へ同期しない。
- タスクのMarkdown上の並び順・所属セクション変更は従来通り同期対象とする。表示上の折りたたみ状態だけを端末別に扱う。
- 外部同期で受け取っただけの表示再描画では、原則としてセクションを勝手に開かない。ユーザー操作で追加・移動先になったセクションを開く。

## 現在有効なセクション自動展開表示同期仕様（v0.5.19時点）

- v0.5.19では、v0.5.18のセクション自動展開後に、セクション本文は開いているのに左側の開閉ボタンが閉じた表示のまま残る問題を修正する。
- 自動展開対象になったセクションは、`collapsedSections` の端末別状態だけでなく、DOM上の `.is-collapsed`、`aria-expanded`、見出しtitle、`.tc-toggle` の表示文字/aria-label/title も必ず開いた状態へ同期する。
- 差分パッチで既存セクションにbodyだけ作成する場合も、見出しと開閉ボタンの表示を開いた状態へ同期する。
- セクション自動展開は引き続き端末別表示状態として扱い、他端末へ同期しない。



## 現在有効なタスクD&Dドロップ判定仕様（v0.5.20時点）

- v0.5.20では、v0.5.18/v0.5.19のセクション自動展開対応後に、開いているセクションでもタスクD&D移動ができなくなる場合がある問題を修正する。
- タスク行ごとの `dragover/drop` に加え、TaskBoard全体 `.tc-board-scroll` にもD&Dフォールバックを持たせる。
- 行上にドロップした場合は従来通りタスク行の before/after 判定を優先する。
- 行以外のセクション領域や閉じているセクション見出し上にドロップした場合は、そのセクションへの移動として扱う。
- 閉じているセクションへD&D移動した場合は、移動先セクションを端末ローカルで自動展開し、開閉ボタン表示も開いた状態へ同期する。
- タスクのMarkdown上の並び順・所属セクション変更は従来通り同期対象とし、セクション開閉状態は端末別表示状態として扱う。


## 現在有効なモバイルコメントボタン仕様（v0.5.24時点）

- v0.5.24では、モバイル版TaskBoardのコメント欄で、横に広いコメントボタン全体がタップ対象になり誤タップしやすい問題を修正する。
- モバイル版では、コメント追加/編集は左側の小さなコメントアイコンボタンをタップして行う。
- コメント本文プレビューがある場合は、ボタン右側に非クリックのプレビューとして表示する。プレビュー本文自体はタップ対象にしない。
- PC版のコメント列・コメントモーダル・コメント保存形式は変更しない。
- モバイル版でもコメントがある場合は、コメントアイコンのアクセント表示で視認性を保つ。


## 現在有効なモバイルノート導線仕様（v0.5.25時点）

- v0.5.25では、モバイル版のタスク三点メニューから「タスクノートを開く」導線を削除する。
- モバイル版のタスク三点メニューには、プロジェクトが設定されているタスクに限り「プロジェクトノートを開く」を表示する。
- プロジェクト未設定タスクでは「プロジェクトノートを開く」を表示しない。
- 「プロジェクトノートを開く」は通常タブで開く。プロジェクトノートが未作成の場合は既存の `ensureProjectNoteForName()` 経由で作成してから開く。
- PC版のタスクメニューに残っている「タスクノートを開く」導線、PC右サイドペインのプロジェクトノート導線、コマンドパレット等の既存導線はこの修正では変更しない。


## v0.5.22 右サイドペインのタスクノート導線削除ルール

- v0.5.22では、タスクノート活用方針が保留中であるため、右サイドペインからタスクノートを開く導線を削除する。
- 右サイドペインの「ノート」セクションにはプロジェクトノートの導線のみ残す。
- 右サイドペインの空状態説明からも「タスクノート」への言及を削除する。
- コマンドパレットや既存メニューなど、右サイドペイン以外のタスクノートを開く導線はこの修正では変更しない。
- `manifest.json` は0.5.22。

## IDの責務

- `task_id`
  - タスクマスタID。
  - 例: `T-0001`
  - 1タスクノートに対応する。
  - 同じタスク名が複数あっても、`task_id` で区別する。

- `entry_id`
  - 日別TaskBoard上の1行ID。
  - 同じタスクを同じ日や別日に複数配置できるため、行操作は `entry_id` 単位で行う。
  - `task_id` 単独でTaskBoard上の行を特定しない。
  - 日付移動で新しい `entry_id` を発行する場合は、旧ID/新IDの対応を壊さない。

- `exec_id`
  - 実行セッションID。
  - 開始、中断、再開、完了、日付またぎログと関係する。
  - 中断/再開時に同じ `exec_id` を維持するかどうかは仕様上重要なので、変更時は明記する。

- `project_id`
  - プロジェクトの内部ID。
  - 例: `P-0001`
  - プロジェクト名は表示名であり、将来的な主キーにしない。

## ノート命名

- タスクノート: `Taskchute/Tasks/T-xxxx_タスク名.md`
- プロジェクトノート: `Taskchute/Projects/P-xxxx_プロジェクト名.md`
- プロジェクトノートのパスは `project_id + プロジェクト名` から生成する。
- `note_path` はfrontmatter正データにしない。
- 既存の `note_path` / `notePath` はlegacyフォールバックとして読むだけに留める。

## 正データとキャッシュ

- タスクマスタ: タスクノートfrontmatter。
- 今日/日別のTaskBoard行: 日別Taskchuteノート。
- 実行ログ: 日別Taskchuteノートの `## Log` / `## LogDaily`。
- 通常タスクコメント: タスクノートの `## Comments`。
- ルーティンタスクコメント/サブタスク状態: `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md`。
- 実行中コメント: 日別Taskchuteノートの `## Comments`。
- プロジェクト定義: `data.json` の `projects` と `projectNoteMeta`、およびプロジェクトノートfrontmatter。
- `Taskchute/_system/index.json`: 再構築可能なキャッシュ。AIが直接編集してはいけない。

## コメント仕様

- 表示名は「コメント」に寄せる。
- 内部的には次を区別する。
  - `task_comment`: タスクそのものへのコメント。保存先はタスクノート `## Comments`。
  - `execution_comment`: 実行中の気づき・作業メモ。保存先は日別Taskchuteノート `## Comments`。
- タスクノートの `## Comments` は余計な空行を入れない。
- タスクノートの `## Comments` に保存する `task_comment` は、v0.5.11時点の実装に合わせ、通常保存形式を `YYYY-MM-DD HH:mm`（秒なし）とする。
- `task_comment` を秒ありへ変更する場合は、`main.js` の保存・表示・parse処理と、この `AGENTS.md` のルールを同時に更新する。
- 日別Taskchuteノートの `execution_comment` や実行ログの日時形式は既存のISO/秒付き形式を維持し、タスクノートコメントの形式と混同しない。

## プロジェクト論理アーカイブ

- `projectNoteMeta[projectName].archived` を正として扱う。
- 可能ならプロジェクトノートfrontmatterの `archived` も同期する。
- アーカイブ時もノートファイルは移動しない。
- タスク追加/編集/一括変更/ルーティン設定の候補からアーカイブ済みプロジェクトを除外する。
- 既存タスクに設定済みのアーカイブ済みプロジェクトは表示維持する。
- タスク一覧・モバイル詳細では、既存値としてのアーカイブ済みプロジェクトは表示するが、新しい変更先としては選べないようにする。
- 既存タスクからアーカイブ済みプロジェクトを一度外した場合、そのプロジェクトへ再設定することはできない。再設定が必要な場合は、先にプロジェクト設定ページで復元してから選択する。
- 更新処理側でも、アーカイブ済みプロジェクトへの新規変更/再設定を拒否する。UI候補から隠すだけにしない。
- 右サイドペインではアーカイブ済みプロジェクトでもノートボタンを表示する。
- index再構築時は `archived` を反映し、frontmatterとの不一致はwarningsに出す。

## UI / 操作

- PC版とモバイル版の挙動差に注意する。
- 右サイドペインはPC版のみ。
- 右サイドペインは概要/操作パネルであり、ノート本文編集はObsidianの右分割ペインに任せる。
- hit-a-hint対象を追加する場合は、TaskBoard本体だけでなく右サイドペイン、モーダル、メニューも考慮する。
- ESC、モーダル、hint、D&D、スクロール抑止は干渉しやすいため、イベント伝播に注意する。

## Obsidian API / 保存

- frontmatter更新は可能な限り専用関数または `processFrontMatter` へ寄せる。
- Markdown本文の文字列置換を使う場合は、対象セクションを限定する。
- イベントリスナーを追加する場合は、unload時の解除漏れに注意する。
- Obsidian Syncや外部編集との競合を考慮し、内部書き込みマーカーや再構築コマンドを壊さない。

## 実装チェックリスト

- `manifest.json` のversionを上げたか。
- ZIP名にもversionを含めたか。
- `node --check main.js` を通したか。
- `AGENTS.md` をZIPに含めたか。
- 日本語MarkdownをUTF-8で保存したか。
- 実機未確認の項目を未確認として明記したか。
- 既存データ互換性を壊していないか。
- `note_path` を新規正データとして復活させていないか。
- `index.json` を正データとして扱っていないか。

## プロジェクトノートID同期ルール

- 新規プロジェクト作成時、同名の既存プロジェクトノート `P-xxxx_プロジェクト名.md` がVault内にある場合は、そのノートの `project_id` を採用する。
- `projectNoteMeta` 側で新しいIDを採番し、同名の既存プロジェクトノートが別IDとして残る状態を作らない。
- `project_duplicate_name` warning は、実際に同名プロジェクトが複数IDで残っている場合にのみ出す。新規プロジェクト作成だけで必ず出る状態は不具合として扱う。
- 既存ノート検出は `note_path` を正データに戻さず、`project_id + プロジェクト名` とVault内の既存ノート検出で行う。

## 整合性診断ルール

- `Taskchute整合性チェックを実行` コマンドと初期セットアップ/診断ページの整合性チェックは、データ不整合の検出専用であり、自動修復は行わない。
- 診断対象には `project_id` / `task_id` / `entry_id` の欠落・重複、legacy `note_path`、プロジェクトノートの標準パス不一致、`archived` 不一致、TaskBoard行から参照するタスクノート欠落を含める。
- `Taskchute/_system/index.json` は再構築可能なキャッシュであり、診断で warning が出ても正データとして直接編集しない。
- 整合性修正を行う場合は、必ずどのデータを正とするかを確認してから、専用関数/API経由で修正する。



## main.js単一ファイル運用ルール

- 当面、Obsidianへ配置するランタイムは `main.js` 単一ファイル構成を維持する。
- `main.js` から `./src/...` などのローカル分割ファイルを直接 `require` しない。
- `src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` などの分割/ビルド用構成は、ユーザーが明示的に依頼するまで追加しない。
- ファイル分割ではなく、まずは `main.js` 内のセクションコメント、docs、関数境界の整理で保守性を上げる。
- 将来どうしても分割する場合は、Obsidianへ配置する前に単一 `main.js` へバンドルする方式を別途検証し、実環境で有効化確認を完了してから採用する。
- `node --check main.js` は必須だが、それだけでは十分ではない。読み込みに関わる変更ではObsidian実環境でプラグインが有効化できるか確認する。
- v0.4.85のような `src/date-calendar.js` への直接分割は、実環境で読み込めない原因になったため、当面は採用しない。
## main.js セクションコメント運用

- `main.js` には責務別の大見出しコメントを置き、実分割前の地図として使う。
- 大見出しコメントは実行挙動を変えないための目印であり、関数移動やリネームの代替ではない。
- 大規模分割前には `docs/main-js-split-map.md` と `main.js` のセクションコメントを両方確認する。
- セクションコメントを追加・修正した場合も、`node --check main.js` を実行する。

## v0.4.82 YAML/frontmatter safety rule

- タスクノートfrontmatterのユーザー属性（project / section / category / area / client / mode / priority等）は、YAMLとして安全なスカラー値で出力すること。
- `category: area:` のように、別のYAMLキーが値として混入した不正frontmatterを生成してはいけない。
- 空のユーザー属性は `key: ""` のように明示的に空文字として保存する。
- 既存ノートに不正なユーザー属性frontmatterがある場合は、`Taskchute不正タスクfrontmatterを修復` コマンドで修復する。
- 整合性チェックでは、不正なタスクfrontmatterを検出した場合に `malformed_task_user_frontmatter` として報告する。
- `index.json` は引き続き正データではなく再構築可能なキャッシュであり、重複プロジェクト名などの確認事項は warnings に出す。

## v0.4.86 読み込み復旧ルール

- Obsidianへ直接配置する `main.js` は、当面は自己完結した単一ファイルとして扱う。
- `src/` へ関数を切り出す場合でも、実配布前にバンドル済みの単一 `main.js` を生成して配置する。
- `main.js` から `./src/...` を直接 `require` する変更は、Obsidian実環境で読み込み確認が済むまで採用しない。
- 構文確認は `node --check main.js` に加え、Obsidianでの有効化確認を必須にする。



## v0.4.87 単一ファイル復帰ルール

- v0.4.87では、v0.4.85/v0.4.86で残っていた `src/`、`package.json`、`esbuild.config.mjs` を削除した。
- 今後の修正ZIPには、実行に不要な分割/ビルド用ファイルを含めない。
- Codex/Claude/MCPへ依頼する場合も、明示指示がない限りファイル分割やビルド構成追加を行わない。
- `main.js` は自己完結した単一ファイルとして維持し、保守性改善はまずコメント・docs・小さな局所修正で行う。


## v0.4.88 projectNoteMeta孤立項目クリーンアップルール

- `projectNoteMeta` は `projects` 配列に存在するプロジェクトの補助メタ情報だけを保持する。
- プロジェクト削除・リネーム後に `projects` へ存在しない `projectNoteMeta` キーが残った場合は、孤立項目として自動削除する。
- 孤立した `projectNoteMeta` はユーザーが直接修正しづらく、整合性チェックのノイズになるため、保存時・起動時の正規化対象とする。
- 修正版ZIPにはユーザー環境の `data.json` を同梱しない。配布ZIPで既存設定を上書きしないこと。


## v0.4.89 エラーログ分類ルール
- `window.error` / `window.unhandledrejection` はObsidian全体のグローバルエラーを拾うため、Taskchute由来の痕跡がないエラーはTaskchute本体エラーとして保存しない。
- `plugin:metadata-menu` など外部プラグインIDだけが含まれるエラーは `external-plugin` 扱いで除外する。
- Taskchute内部の `console.error("Taskchute ...")` と明示的な `logTaskchuteError()` 呼び出しは従来通り保存する。
- 修正版ZIPには引き続き `data.json`、`src/`、`package.json`、`esbuild.config.mjs` を含めない。


## v0.4.90 外部プラグイン由来エラーログの再発防止

- `window.error` / `window.unhandledrejection` は Obsidian 全体のグローバルエラーを拾うため、`logTaskchuteError()` 保存直前にも最終分類を行う。
- `plugin:metadata-menu` など Taskchute 由来の痕跡がない外部プラグインエラーは保存しない。
- v0.4.89以前に保存済み、または Obsidian Sync で復元された外部プラグイン由来ログは `cleanupNonTaskchuteGlobalErrorLogEntries()` で削除する。
- コマンドパレットに「外部プラグイン由来エラーログを削除」を用意する。
- 起動後にも外部プラグイン由来ログの自動掃除を行う。


## v0.4.91 グローバルエラーログ記録停止ルール

- `window.error` / `window.unhandledrejection` の常時監視は行わない。
- Obsidian本体・外部プラグイン由来の未処理エラーがTaskchute本体エラーとして見えることを避ける。
- Taskchute内部エラーは、明示的な `logTaskchuteError()` と `console.error("Taskchute ...")` のみで記録する。
- 過去に保存済みの `window.error` / `window.unhandledrejection` 由来ログは、起動時掃除およびコマンド「グローバル由来エラーログを削除」で削除対象にする。
- `main.js` 単一ファイル運用を継続し、`src/` / `package.json` / `esbuild.config.mjs` / `data.json` は配布ZIPへ含めない。

## v0.4.92 診断画面のグローバル由来エラーログ除外ルール

- `window.error` / `window.unhandledrejection` 由来のログは、Taskchute本体の整合性エラーとして扱わない。
- 診断/整合性チェックの実行前にも `cleanupNonTaskchuteGlobalErrorLogEntries()` を実行し、過去ログやObsidian Syncで復元されたグローバル由来ログを掃除する。
- `collectTaskchuteDataStats()` では、グローバル由来ログだけを含むJSONLファイルを「内部エラーログ」件数に含めない。
- 診断画面では「エラーログ」ではなく「内部エラーログ」として表示し、外部プラグイン由来の未処理エラーとTaskchute内部エラーを混同しない。
- `plugin:metadata-menu` 等、Taskchute由来の痕跡がない外部プラグインスタックは、保存済みであっても掃除対象にする。
- `main.js` 単一ファイル運用、配布ZIPから `data.json` / `src/` / `package.json` / `esbuild.config.mjs` を除外する方針は継続する。


## v0.4.93 不正frontmatter修復導線

- 整合性チェックに出る `category: area:` などのエラーは、エラーログではなくタスクノートfrontmatterの不正YAMLである。
- グローバル由来ログ掃除ボタンでは消えない。
- 診断/整合性チェック画面に「不正frontmatter修復」ボタンを用意し、`repairMalformedTaskFrontmatter()` 実行後に `rebuildTaskchuteIndex()` と診断再描画を行う。
- この修復では `data.json` を配布ZIPに含めない。`main.js` 単一ファイル運用を継続し、`src/`、`package.json`、`esbuild.config.mjs` は追加しない。


## v0.4.94 整合性チェック画面の導線整理

- v0.4.93で確認した通り、整合性チェックに表示された `category: area:` はグローバル由来ログではなく、タスクノートfrontmatterの不正YAMLである。
- ユーザーが誤って押しやすいため、整合性チェック画面から「グローバル由来ログ掃除」ボタンは外す。
- グローバル由来ログの新規記録停止・自動掃除・コマンドパレットからの削除コマンドは保守用として残す。
- 整合性チェック画面では「再チェック」「不正frontmatter修復」「index再構築」を主導線とする。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json` / `src/` / `package.json` / `esbuild.config.mjs` を含めない。


## v0.4.95 タスク名/ファイル名同期ルール
- タスク名変更時は、frontmatter の `title`、ノート見出し、`T-xxxx_タスク名.md` 形式のファイル名、TaskBoard 上の内部リンク先を同期する。
- TaskBoard 行の表示名（リンクエイリアス）は、旧タスク名または旧ファイル名由来の表示名だった場合のみ新しい正規タイトルへ更新し、ユーザーが当日だけ手動変更した表示名は極力保持する。
- 整合性チェックでは、frontmatter `title` とファイル名のタイトル部分が一致しないタスクノートを warning として検出する。
- 修復導線として、コマンド `Taskchuteタスク名/ファイル名を同期` と、整合性チェック画面の `タスク名/ファイル名同期` ボタンを用意する。
- 同期処理は frontmatter `title` を正とし、同名ファイル衝突時は上書きせずスキップして Notice/結果に含める。


## v0.4.96 生成済みルーティンのマスター同期ルール
- ルーティンマスター（タスクノート）のタスク名・プロジェクト・モード・カテゴリ・エリア・クライアント・優先度・見積・開始予定・終了予定・セクションなどを変更した場合、当日以降の生成済みルーティン行にも自動同期する。
- ユーザーに毎回コマンドパレットで「タスク名/ファイル名同期」を実行させる運用にしない。同期コマンドは保守用に残す。
- 同期対象は `routine_id` / `task_id` が一致する生成済みルーティン行。`entry_id`、実行ログ、コメント、実績時刻は保持する。
- 開始予定またはセクション変更により所属セクションが変わる場合、未完了・未実行・実行中でない当日以降の生成済み行だけを移動する。完了済みや実行中/中断中の行は実績保護を優先する。
- `main.js` 単一ファイル運用を継続し、`src/` / `package.json` / `esbuild.config.mjs` は明示指示がない限り追加しない。


## v0.4.97 ルーティンマスター再変更同期ルール
- ルーティンマスターの変更を生成済みルーティン行へ反映する際は、呼び出し元の task オブジェクトだけを信頼せず、可能な限りタスクノートの最新frontmatterから同期元定義を読み直す。
- 1回目の変更後にさらにルーティン名・プロジェクト・見積・開始予定・終了予定・モード・ユーザー属性等を再変更しても、当日以降の生成済みルーティン行は最新のマスター状態へ追従させる。
- 生成済みルーティン行のリンクエイリアスは、マスター同期時は最新のタスク名へ揃える。過去の旧タイトル由来のエイリアスを保持して同期漏れにしない。
- 完了済みルーティン行も、表示名・リンク先・プロジェクト等のマスター情報は同期してよい。ただし実績保護のため、完了済み/実行中/中断中の行はセクション移動せず、Log / LogDaily も書き換えない。
- main.js単一ファイル運用を継続し、明示指示がない限り src/、package.json、esbuild.config.mjs、tsconfig.json は追加しない。


## v0.4.98 ルーティン完了行同期ルール
- 生成済みルーティン同期では、完了済みTaskBoard行の表示名・リンク先・プロジェクト等のマスター属性を過去日でも同期してよい。
- ただし、Log / LogDaily は実績履歴として扱い、自動書き換えしない。
- 過去日の未完了行は、古い計画履歴を壊さないため自動同期対象外とする。
- タスクノートfrontmatterで project / mode / category / area / client / priority 等が空欄に変更された場合も、古い画面オブジェクトの値へフォールバックせず空欄として同期する。


## v0.4.99 実装済み範囲の整理

- TaskBoard上部UIのコンパクト化は実装済みとして扱う。左上ナビは「←」「本日」「カレンダー」「→」「デイリーノート」を基本導線にし、本日表示中の「本日」ボタンは無効化して現在日であることを示す。
- フィルタはアイコンボタンからメニューを開く方式、設定は歯車アイコンから開く方式を維持する。表示メニューは別導線として扱う。
- 同期中ステータスはヘッダー内で常時スペースを取る表示ではなく、中央スピナー付近のオーバーレイ表示を基本とする。モバイルでタスク追加や軽い保存のたびに目立ちすぎる表示へ戻さない。
- `Taskchute/_system/index.json`、`docs/main-js-split-plan.md`、`docs/main-js-split-map.md`、AGENTS.md により、AI/Codex/MCP向けの前準備と設計ルールは実施済みとして扱う。ただし、専用MCPサーバー/APIツール群の本実装は未実装であり、「index/API/AI連携」は「読み取り用indexと設計ルールは済み、外部操作APIは今後」と区別する。
- ルーティン機能は、MVP範囲の自動生成、重複防止、有効/無効、日付条件判定、生成済み行のマスター同期まで実装済みとして扱う。今後は新規実装ではなく、実使用で見つかった例外やUX改善を差分で直す。
- 生成済みルーティンの同期では、完了済み行の表示名・リンク先・プロジェクト等のマスター属性は同期してよいが、Log / LogDaily / 実績時刻は履歴として保持する。過去日の未完了行は古い計画履歴保護のため原則自動同期しない。
- 上記の実装済み範囲を再実装し直さない。修正する場合は、既存仕様を維持したうえで小さな差分修正にする。

## v0.5.01 右サイドペインのノート/リンク導線ルール

- v0.5.01では、v0.4.99をベースにPC版右サイドペインのノート/リンク導線を改善する。
- 以前作成した未採用版v0.5.00は採用しない。v0.5.01は、ユーザーと仕様確認した「クイックアクションなし・タブなし・ノート/リンク縦並び」UIを採用する。
- 右サイドペインには、タスク概要の下に「ノート」「リンク」「コメント」を縦並びで表示する。
- 「クイックアクション」セクションは置かない。タスク開始/中断/完了/前日移動/翌日移動などの操作はTaskBoard本体側に残す。
- 「ノート」セクションには「タスクノート」と「プロジェクトノート」をカード表示する。
- ノート表示名では `.md` 拡張子を表示しない。タスクノートはタスクタイトル、プロジェクトノートはプロジェクト名を表示する。
- タスクノート/プロジェクトノートの開き方は「左分割で開く」「右分割で開く」「通常タブで開く」の3つを用意する。
- 「リンク」セクションには関連リンクをまとめ、リンク表示名でも `.md` 拡張子を表示しない。リンクが未設定でも「リンクを追加」導線を表示する。
- モバイルでは従来通り右サイドペインを描画しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。


## v0.5.02 右サイドペインの表示調整ルール

- v0.5.02では、v0.5.01の右サイドペインUIを小調整する。
- タスク詳細の開始/終了は、ISO文字列や秒付きではなく `HH:mm` 表示に統一する。
- ノート欄では、タスクノートカード内にタスク名・「このタスク専用のノート」・「作業内容やメモを記録します。」の補助文言を表示しない。
- プロジェクトノートカードでは、「プロジェクトの文脈」および「プロジェクトの文脈や背景、ルールを確認します。」の補助文言を表示しない。プロジェクト名はヘッダー補足としてのみ表示し、同じカード内で重複表示しない。
- ノートの開き方は引き続き「左分割で開く」「右分割で開く」「通常タブで開く」を維持する。左分割はTaskBoard基準で左側に開くことを優先し、Obsidian APIで利用可能な場合は `createLeafBySplit(..., before=true)` を優先する。

## v0.5.03 右サイドペインの関連リンク表示ルール

- v0.5.03では、右サイドペインの「リンク」セクションを簡潔にする。
- 関連リンクがない場合は、説明文や空状態メッセージを出さず、「リンクを追加」ボタンのみ表示する。
- 関連リンクがある場合は、各行にリンクを開くボタンを配置し、その右隣に「削除」ボタンを配置する。
- 関連リンク一覧の下に「リンクを追加」ボタンを配置する。リンク追加は既存の関連リンク編集ポップオーバーを開く。
- 右サイドペインの削除ボタンは対象リンクのみを削除し、削除後は右サイドペイン表示を更新する。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.04 右サイドペインのコメント入力ルール

- v0.5.04では、右サイドペインの「コメント」セクションから直接コメントを追加できるようにする。
- コメント入力欄は「コメント」セクションの上部に配置し、`Ctrl+Enter` または「コメントを追加」ボタンで保存する。
- 保存形式は既存の `## Comments` と同じ形式を使い、最新コメントを一番上に追加する。コメント保存形式を新しく増やさない。
- 既存のコメント一覧/編集モーダルは「一覧/編集」ボタンから開けるように残す。
- コメント追加後は右サイドペインを再描画し、TaskBoard行のコメント表示も更新する。
- モバイルでは従来通り右サイドペインを描画しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.05 右サイドペイン幅変更ルール

- 右サイドペインはPC版のみ、左端ドラッグで幅変更できる。
- 幅は `runtime.desktopRightPaneWidthPx` / `settings.desktopRightPaneWidthPx` に保存し、再起動後も維持する。
- 幅の安全範囲は 260px〜640px とし、CSS側では最大 `min(640px, 48vw)` を目安にする。
- タスクノート/プロジェクトノートの開き方ボタン文言は「左で開く」「右で開く」「通常タブで開く」に統一する。
- モバイルでは右サイドペインを描画しない既存方針を維持する。


## v0.5.06 右サイドペイン狭幅ボタンルール

- 右サイドペイン最小幅でも、タスクノート/プロジェクトノートの開き方ボタン文字がカード外へはみ出さないようにする。
- 開き方ボタンは2列構成を基本とし、「左で開く」「右で開く」は小さめボタンで1行目に並べる。
- 「通常タブで開く」は横幅を取りやすいように2列分を使って表示する。
- 狭幅時でも `src/` 分割やビルド構成は追加せず、`main.js` 単一ファイル運用と `styles.css` の範囲で調整する。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.07 hit-a-hintクリック解除ルール

- hit-a-hint表示中にユーザーのクリック/タップ（pointerdown）が入った場合は、hint表示を解除する。
- Escで閉じる既存挙動、入力済みプレフィックス絞り込み、hint選択による疑似クリック挙動は維持する。
- TaskBoard本体hint、Obsidianメニューhint、設定系ビューhintでは、pointerdown監視をhint表示中だけ登録し、hint解除時に必ず解除する。
- クリック解除は通常のマウス操作を妨げないため、preventDefault/stopPropagationは行わない。

## v0.5.08 チェックリスト型サブタスクMVPルール

- サブタスクは1タスク=1ノートにはせず、親タスクノート内の `## Subtasks` にMarkdownチェックリストとして保存する。
- 未完了は `- [ ] サブタスク名`、完了は `- [x] サブタスク名 ✅ YYYY-MM-DD HH:mm` とする。
- 右サイドペインに「サブタスク」欄を追加し、追加・チェック・チェック解除を行えるようにする。
- チェック時は現在日時を自動追記し、チェック解除時は日時を削除して未完了形式へ戻す。
- 表示上は今日のチェック時刻なら `HH:mm`、別日なら `YYYY-MM-DD HH:mm` を表示する。
- サブタスクのチェック時刻は実績時間actualには加算しない。親タスクの開始〜完了を時間計測単位とし、サブタスクは作業内チェックポイントとして扱う。
- 並び替え、チェック履歴保持、サブタスクごとの実行ログ化はMVP後回し。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.09 右サイドペインのノートボタン1行表示ルール

- v0.5.09では、タスクノート/プロジェクトノートの開き方ボタンを1行に収める。
- ボタン文言は「左で開く」「右で開く」「タブで開く」に統一する。「通常タブで開く」は右サイドペイン上では長いため使わない。
- 「タブで開く」のツールチップ/aria-labelでは、意味が分かるように「通常タブで開く」を残してよい。
- 右サイドペイン最小幅でも3ボタンがカード外へはみ出さないよう、grid 3列・小さめpadding/font-sizeで調整する。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。


## v0.5.10 コメント列アイコン強調ルール

- v0.5.10では、TaskBoardのコメント列でコメントがある行のアイコンをリンク列と同じ考え方で強調表示する。
- コメントありの場合は、アクセント色・薄い背景・枠線を付け、コメントなしの場合は従来通り控えめな空状態にする。
- 判定は既存の `renderTaskMemoCellContent()` の `has-comments` / `is-empty` クラスを正とし、コメント本文の保存形式やコメントスレッド仕様は変更しない。
- PC/モバイルとも、コメントありの視認性を上げるが、actual/log/TaskBoard保存データには影響させない。


## v0.5.11 右サイドペインコメントCtrl+Enter送信ルール

- v0.5.11では、右サイドペインのコメント入力欄で `Ctrl+Enter` / `Cmd+Enter` によるコメント追加を確実に扱う。
- コメント入力欄のplaceholder/aria-labelには `Ctrl+Enterで追加` の意味を明示する。
- `keydown` と `keyup` の両方を補足し、Obsidian側のショートカット干渉があっても送信しやすくする。ただし短時間の二重発火は抑止する。
- 日本語入力中（IME composition中）のEnterは送信しない。
- 保存形式は既存の `## Comments` / コメントスレッド仕様を維持し、新しいコメントを最新順で先頭に追加する。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.12 コメント日時仕様のAGENTS整合ルール

- v0.5.12では、`AGENTS.md` に残っていた古い「コメント日時は秒あり」方針を、v0.5.11実装に合わせて修正する。
- タスクノート `## Comments` に保存する通常のタスクコメントは `YYYY-MM-DD HH:mm`（秒なし）を正とする。
- 日別Taskchuteノートの実行中コメントや `## Log` / `## LogDaily` の日時形式は、既存のISO/秒付き形式を維持する。
- 今回は運用ルールの整合修正のみで、`main.js` のランタイム挙動は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.13 右サイドペインコメントIME安全性・現行仕様明文化ルール

- v0.5.13では、右サイドペインのコメント入力欄で `Ctrl+Enter` / `Cmd+Enter` 送信する際、IME変換中の誤送信をさらに避けるため `evt.keyCode === 229` も送信抑止条件に追加する。
- v0.5.13では、過去バージョンの履歴と現在有効な右サイドペイン仕様を混同しないよう、AGENTS上部に「現在有効な右サイドペイン仕様」を追記する。
- ランタイム挙動変更は右サイドペインコメント送信のIME安全性強化のみとし、コメント保存形式や右サイドペインの表示順は変更しない。


## v0.5.21 D&D移動先セクション自動展開ルール

- D&Dでタスクを別セクションへ移動した場合、移動先セクションが閉じているときは必ずその端末上で自動展開する。
- 対象はPC/Mobile共通とし、タスク行へのD&D、セクション見出し/本文へのD&D、複数選択D&D、空セクションへのD&Dを含む。
- 自動展開は端末別表示状態として扱い、`runtime.collapsedSections[section_id] = false` をローカル表示設定に反映する。タスクのMarkdown上の並び順・所属セクション変更は従来通り同期対象。
- D&D経路では、Markdown書き込み後の差分パッチ/ソート再描画より前に移動先セクションを開く。再描画後に閉じた状態へ戻らないよう、`ensureSectionExpandedForIncomingTask()` をD&Dの各移動経路から呼ぶ。
- 開閉ボタンの表示、`aria-expanded`、`is-collapsed`、セクション本文も開いた状態へ同期する。

## v0.5.23 プロジェクトノート編集時の同期中表示抑制ルール

- v0.5.23では、プロジェクトノート本文を左/右/通常タブで編集するたびにTaskBoard側が中央の「同期中」状態になる問題を修正する。
- `Taskchute/Projects/*.md` の `modify` イベントは、通常の本文編集として扱い、外部同期反映キュー・中央同期中オーバーレイ・TaskBoard即時再描画の対象にしない。
- プロジェクト設定ページなどプラグインUI経由のプロジェクト名・アーカイブ状態・projectNoteMeta等の変更は、従来通り `data.json` の同期や内部保存処理で反映する。
- プロジェクトノートの `create` / `delete` / `rename` イベントはこの抑制対象に含めない。本文編集の `modify` のみ対象とする。
- タスクノート編集時の同期中表示抑制は、今回のv0.5.23では対象外とし、必要に応じて別途検討する。

## v0.5.29 PC版D&DフィルタON時セクション戻し修正ルール

- v0.5.29では、PC版でフィルタON（開始予定順）中に、セクションまたぎD&Dで移動したタスクを別セクションへ戻せないことがある問題を修正する。
- 原因は、タスク行上へのD&Dでセクションをまたぐ経路が、TaskBoard行の `tc-meta` の `section` / `section_id` を移動先へ更新していなかったこと。
- 空セクションやセクション本文へのD&D経路では既に `section` / `section_id` を更新していたため、行上ドロップ経路も同じ扱いに揃える。
- セクション移動時も `start_plan` は自動変更しない。フィルタONの再整列では、行メタの明示セクションを優先しつつ、セクション内の並びだけ開始予定順にする。
- Alt+上下キーのセクションまたぎ移動挙動は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.28 モバイル版プロジェクトノート戻る導線の取り消しルール

- v0.5.26/v0.5.27で追加した、モバイル版プロジェクトノート上の「← TaskBoardへ戻る」一時導線は不要になったため削除する。
- モバイル版のタスク三点メニューにある「プロジェクトノートを開く」導線はv0.5.25仕様として維持する。
- プロジェクトノートを開いたあとにTaskBoardへ戻る操作は、Obsidian標準の戻る操作やビュー切替に任せる。
- ノート本文へ戻るリンクを書き込まない。プロジェクトノート表示領域にも戻るボタンを挿入しない。
- PC版の右サイドペイン、PC版プロジェクトノート導線、プロジェクト設定ページのノートボタンは変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。



## v0.5.36 モバイル追加シートのキーボード表示時サイズ維持ルール

- v0.5.36では、モバイル版タスク追加シートでキーボード表示時に通常時より小さく縮む問題を修正する。
- タスク追加シート表示直後のタスク名入力欄への自動フォーカスは維持する。
- シートを開いた時点の通常高さを `--tc-quick-sheet-height` として保持し、キーボード表示後もシート自体の高さは基本的に変えない。
- キーボードで下側が隠れる場合は、`visualViewport` から算出したキーボード分の下余白を追加し、シート内スクロールで入力欄・ボタンへ到達できるようにする。
- キーボード表示時もシート上部が画面外へ隠れないことを維持する。
- v0.5.33の「モバイル追加時に現在時刻のセクションを初期選択」は維持する。

## v0.5.35 モバイル追加シートのキーボード表示時レイアウト

- v0.5.34で停止したモバイル版タスク追加シート表示直後のタスク名入力欄への自動フォーカスは戻す。
- モバイル版タスク追加シートを開いたら、タスク名入力欄へ自動フォーカスしてよい。
- キーボード表示時にシート上部が画面外へ隠れないことを優先する。
- `visualViewport` の `resize` / `scroll` を使い、キーボード表示後の可視領域に合わせて `--tc-quick-sheet-top` / `--tc-quick-sheet-bottom` を更新する。
- 追加シートは上部を固定気味に保ち、内容が収まらない場合はシート内スクロールにする。
- v0.5.33の「モバイル追加時に現在時刻のセクションを初期選択」は維持する。


## v0.5.37 モバイル版タスクカードの縦幅コンパクト化ルール

- v0.5.37では、モバイル版TaskBoardの通常タスクカードの縦幅を抑える。
- 対象はモバイル版TaskBoardのカード表示のみとし、PC版、ルーティン設定ページ、保存形式、タスク行メタ情報、D&D、タスク追加処理は変更しない。
- 主な調整対象はカード内の余白、行間、時刻チップの高さ、詳細ボタン、三点メニュー、開始/完了ボタン、チェックボックス周辺のサイズとする。
- 情報の表示項目は削除しない。表示/非表示の制御は既存の列表示設定・詳細表示設定に従う。
- タップ操作が極端にしづらくならない範囲でコンパクト化し、必要であれば実機確認後に微調整する。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。


## v0.5.42 モバイル版セクションヘッダーコンパクト化ルール

- v0.5.42では、モバイル版TaskBoardのセクションカードのヘッダー部分だけをコンパクト化する。
- 対象はモバイル版の `.tc-section-head`、開閉ボタン、セクションアイコン、セクション名、時刻/件数メタ表示の余白・高さ・文字サイズ。
- 通常タスクカード本体はv0.5.41（v0.5.39相当）の密度を維持し、v0.5.40の超圧縮は再導入しない。
- PC版、ルーティン設定ページ、保存形式、D&D、タスク追加処理は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。

## v0.5.43 モバイル版日付移動時スクロール保持ルール

- v0.5.43では、モバイル版でタスクを「前日へ移動」「翌日へ移動」「日付を選択」で別日に移動したあと、TaskBoard表示が最上部へスクロールされる問題を修正する。
- モバイル版では `.tc-board-scroll` が `overflow: visible` になり、実際のスクロール主体がObsidian側の親要素や `document.scrollingElement` になる場合があるため、スクロール保持処理は `.tc-board-scroll` だけに限定しない。
- `preserveScroll` 時は、実際にスクロール可能な親要素またはdocument側のスクロール位置も保存・復元する。
- メニュークローズや再描画直後のレイアウト変化で再度スクロール位置が変わることを避けるため、即時・requestAnimationFrame・短時間遅延で復元する。
- PC版、タスク移動の保存形式、日付移動の対象条件、v0.5.42のモバイルセクションヘッダーコンパクト化は変更しない。
- 配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。`main.js` 単一ファイル運用を継続する。



## v0.5.45 別端末操作後の初回書き込み前同期確認ルール

- v0.5.45では、最後にTaskchuteデータを書き込んだ端末と、現在書き込み操作しようとしている端末が異なる場合だけ、初回書き込み前に同期確認を行う。
- 各端末の `deviceId` は端末ローカルの `localStorage` に保存し、Obsidian Syncで同期しない。
- 同期対象データには `taskchuteDeviceSyncMeta` として `lastWriterDeviceId` / `lastWriterDeviceLabel` / `lastWriterAt` / `lastWriterOperation` を保存する。
- 書き込み操作直前に `lastWriterDeviceId` が自端末の `deviceId` と異なる場合、操作を一時保留し、Taskchute関連データを読み直し、表示中TaskBoardをスクロール維持でパッチ更新してから操作を続行する。
- 同じ別端末IDに対する確認は、確認後の自端末書き込みまで繰り返し出さない。
- この機能はObsidian Sync本体の完了を100%保証するものではなく、Vaultに到着済みのTaskchute関連ファイルと `data.json` を操作前に再確認するための安全策とする。
- 確認に失敗した場合は、Noticeを出したうえで操作を続行し、操作不能状態を作らない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.47 ルール（PC右サイドペイン サブタスクD&D表示）

- v0.5.46で追加した、PC右サイドペインのサブタスク行フォーカス中 `Alt+↑` / `Alt+↓` による並び替えは不要のため削除する。
- PC右サイドペインのサブタスク並び替えはドラッグ&ドロップを主導線にする。
- サブタスク行は引き続きフォーカス可能にする。
- サブタスク行にはドラッグ可能と分かるグリップ表示を付ける。
- 上下ボタンは復活させない。
- 編集ボタン、削除ボタン、チェックボックス、D&D並び替えは維持する。
- サブタスク保存形式、RoutineLog保存方針、actual / Log / LogDaily へ影響させないルールは変更しない。

## v0.5.49 ルール（関連リンクURL読み戻し正規化）

- v0.5.49では、タスクノートfrontmatterの `task_links` をObsidian再起動後に読み戻した際、リンクURLの先頭に YAML リスト記号や引用符（例: `- "https://...`）が残る場合がある問題を修正する。
- `task_links` は引き続きURLのみを保存する。保存形式は `task_links:` 配下のYAMLリストを維持する。
- 読み取り時は、YAMLリスト行を文字列として受け取った場合でも、先頭の `- ` と前後の引用符を除去してURL本体へ正規化する。
- 既存タスクノートに混入済みの `- "https://...` 形式も、UI表示・リンクを開く処理・次回保存時にURL本体へ正規化されるようにする。
- リンク表示名は従来通りURLから自動生成し、ユーザー入力のlabelは保存しない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.55 ルール（同期中表示の座標系統一）

- v0.5.55では、同期中のくるくるリングと「同期中」文字列の表示基準を同じ `.tc-board-scroll` に統一する。
- くるくるリングは既存通り `.tc-board-scroll::after` で描画し、「同期中」文字列と解除ボタンは `.tc-board-scroll` 内の `.tc-sync-board-status` として描画する。
- ヘッダー内に作成していたPC用 `.tc-sync-status-pc` / モバイル用 `.tc-sync-status-title` の同期ラベルは使わない。文字列重複防止のため、旧 `.tc-sync-status.is-active` は表示しない。
- 右サイドペイン表示時でも、文字列は画面全体中央ではなくTaskBoard本体の中央に合わせる。
- 「同期中」文字列はくるくるリングの下に表示する。
- 同期ロック解除ボタンは `.tc-sync-board-status` 内に残し、同期ロック中でも無効化しない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.56 ルール（同期中表示ピルUI復元）

- v0.5.56では、v0.5.55でTaskBoard本体内へ移した同期中表示の見た目を、旧UIに近い1つの枠線付きピルへ戻す。
- くるくるリングは引き続き `.tc-board-scroll::after` で描画し、表示基準はTaskBoard本体の中央とする。
- 同期状態ピル `.tc-sync-board-status` は `.tc-board-scroll` 内に1つだけ作り、くるくるリングの下に配置する。
- ピル内は左から同期ドット、`同期中` 文字列、`解除` ボタンの横並びにする。
- `同期中` 文字列と `解除` ボタンは同じ枠線・背景の中に収める。文字列だけ独立した枠にしない。
- ヘッダー内に作成していたPC用 `.tc-sync-status-pc` / モバイル用 `.tc-sync-status-title` の同期ラベルは使わない。文字列重複防止のため、旧 `.tc-sync-status.is-active` は表示しない。
- 同期ロック解除ボタンは `.tc-sync-board-status` 内に残し、同期ロック中でも無効化しない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.57 ルール（別端末更新検知時の初回書き込み停止）

- v0.5.57では、別端末の更新を検知した直後の初回書き込みでは、到着済みデータを再読み込みしてTaskBoardへ反映したうえで、その操作自体は保存せず停止する。
- 目的は、PCを起動しっぱなしにしていた場合などに、古いTaskBoard内部状態のままモバイル側の完了状態を上書きする事故を避けること。
- `lastWriterDeviceId` が自端末と異なる場合、`data.json` と表示中Taskchuteノート/ルーティン履歴を短く安定待ちして読み直し、表示を更新する。
- 再読み込み後は「別端末の更新を反映しました。今回の操作は保存していません。内容を確認してもう一度実行してください。」というNoticeを出す。
- 同じ別端末IDに対しては、再読み込み後に確認済み扱いにするため、ユーザーが内容確認後にもう一度同じ操作を行えば保存できる。
- 初回停止直後の同一操作チェーン内で複数書き込みが続かないよう、短時間だけ追加書き込みも抑止する。
- 手動の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- Obsidian Sync本体の完了保証ではなく、Vaultに到着済みのTaskchute関連ファイルと `data.json` を書き込み前に再確認して競合リスクを下げる安全策とする。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.58 ルール（別端末更新ガードをユーザー操作入口へ移動）

- v0.5.58では、v0.5.57の別端末更新検知ガードを、低レイヤー保存処理だけでなくユーザー操作の入口側でも実行する。
- 目的は、別端末更新を反映したのに、モーダルやシートだけ閉じて「保存されたように見えたが実際は保存されていない」状態を避けること。
- タスク追加、開始、完了、中断、再開、タスク編集、タスク名編集、コメント編集、リンク編集、サブタスク操作、一括編集/移動/削除、D&D移動など主要な書き込み入口では、実際のファイル書き込みやruntime変更の前に `ensureDeviceWriteGuard(..., { userOperationEntry: true })` を呼ぶ。
- 別端末更新を検知した場合は、到着済みの `data.json` と表示中Taskchuteノート/ルーティン履歴を読み直してTaskBoardへ反映し、その操作は保存せず `false` を返す。
- ガード停止時は、モーダルや入力中UIをできるだけ閉じず、入力値も維持する。成功Noticeや見た目だけのTaskBoard更新は行わない。
- Notice文言は「別端末の更新を反映しました。まだ保存していません。内容を確認してから、もう一度『保存』または同じ操作を実行してください。」を基本とする。
- `savePluginData()` と `writeFileText()` 側のガードは保険として残すが、本命は操作入口で止める方針とする。
- 手動の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- Obsidian Sync本体の完了保証ではなく、Vaultに到着済みのTaskchute関連ファイルと `data.json` を書き込み前に再確認し、古い状態での上書きリスクを下げる安全策とする。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.59 ルール（開始/完了操作は別端末更新反映後に自動継続）

- v0.5.59では、v0.5.58の別端末更新ガードのうち、タスク開始/完了だけは「再読み込み後にもう一度押す」方式にしない。
- 理由は、開始/完了はユーザーから見ると即時の状態変更であり、「開始したはずなのに開始されていない」「完了ボタンを押したのに完了していない」という体験を避ける必要があるため。
- `startTask()` と `completeRunningTask()` では、`ensureDeviceWriteGuard(..., { continueAfterDeviceReload: true })` を使い、別端末更新を反映したあとも同じ操作を継続する。
- タスク開始では、再読み込み後に同じ `entry_id/taskKey/task_id` の最新行をTaskBoardから取り直し、完了/スキップ/キャンセル済みになっている場合は開始しない。
- タスク完了では、再読み込み前後で実行中タスクの `entry_id/taskKey/task_id` が同じ場合だけ完了を継続する。別端末更新で実行中タスクが別物に変わっている場合は、誤完了を避けるため停止する。
- タスク追加、編集、コメント、リンク、サブタスク、一括操作、D&Dなどの編集系はv0.5.58どおり、別端末更新を反映したら入力UIを閉じず、ユーザー確認後にもう一度保存する方針を維持する。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- Obsidian Sync本体の完了保証ではなく、Vaultに到着済みのTaskchute関連ファイルと `data.json` を操作前に再確認し、古い状態での上書きリスクを下げる安全策とする。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.60 ルール（別端末更新後の安全操作は自動継続）

- v0.5.60では、v0.5.59の開始/完了だけでなく、別端末更新を反映したあとも安全に再適用しやすい操作は自動継続する。
- 対象は、タスク追加、割り込みタスク追加、タスク開始/割り込み開始、タスク完了、中断、再開、タスクコピー、サブタスク追加、開始予定/終了予定/見積/プロジェクト/モード/カテゴリ/エリア/クライアント/優先度の単純変更、開始実績/終了実績の手動変更とする。
- これらの操作では、`lastWriterDeviceId` が別端末の場合でも、到着済みの `data.json` と表示中Taskchuteノート/ルーティン履歴を読み直してTaskBoardへ反映したうえで、同じ操作を継続する。
- 削除、並び替え、一括操作、D&D移動、タスク名変更、タスク全体編集、コメント本文編集、リンク一覧編集、サブタスクのチェック/名前編集/削除/並び替え、ルーティンサブタスク更新など、別端末側の変更を上書きしやすい操作は確認停止を維持する。
- 確認停止時のNoticeは「もう一度押してください」ではなく、「内容が変わっている可能性があるため、保存前に確認してください。」を基本とする。
- 自動継続時は「別端末の更新を反映して操作を続行します」という短いNoticeを出す。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- Obsidian Sync本体の完了保証ではなく、Vaultに到着済みのTaskchute関連ファイルと `data.json` を操作前に再確認し、古い状態での上書きリスクを下げつつ、ユーザーに再操作を求める場面を減らす安全策とする。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.61 ルール（自動継続を開始/終了系のみに再限定）

- v0.5.61では、v0.5.60で広げた別端末更新後の自動継続範囲を撤回し、タスク開始/終了系だけに限定する。
- `startTask()` / `completeRunningTask()` など、`continueAfterDeviceReload: true` を明示した操作だけ、別端末更新を反映したあとに同じ操作を継続する。
- タスク追加、編集、属性変更、実績時刻手動変更、コメント、リンク、サブタスク、一括操作、D&D、削除、並び替えなどは、別端末更新を反映したら保存前に確認停止する。
- 理由は、単純変更に見える操作でも、再読み込み前の古い行全体を書き戻すと別端末側の変更を上書きする危険があるため。
- 確認停止時は、モーダルや入力中UIをできるだけ閉じず、成功Noticeや見た目だけのTaskBoard更新を行わない。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.62 ルール（完了処理の二重ログ防止）

- v0.5.62では、v0.5.61をベースに、タスク完了処理の直前で二重完了ログを防止する安全チェックを追加する。
- `completeRunningTask()` は、別端末更新反映後に完了操作を自動継続するが、書き込み直前に表示中日付のTaskchuteノートを読み直し、対象タスク行が既に `[x]` になっている場合は完了ログを追加しない。
- 同じ `exec_id` の `[status::done]` ログが `## Log` または `## LogDaily` に既に存在する場合も、完了ログを追加しない。
- 既に完了済みと判断した場合は、古い実行中runtimeを解除し、TaskBoardを再読み込みして表示を整える。Noticeは「既に完了済みのため、完了ログは追加しませんでした。」とする。
- タスク開始/終了系だけ自動継続するv0.5.61の方針は維持し、タスク追加・編集・属性変更・コメント・リンク・サブタスク・一括操作・D&D・削除・並び替えなどは確認停止のままとする。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.63 ルール（同期確認失敗時は保存せず停止）

- v0.5.63では、v0.5.62をベースに、別端末更新確認・復帰後同期確認に失敗した場合の扱いを安全側へ変更する。
- `ensureDeviceWriteGuard()` が `loadData()`、安定待ち、TaskBoard再読み込みなどで例外になった場合、従来のように「このまま操作を続行」せず、`false` を返して保存処理を停止する。
- 同期確認失敗時のNoticeは「同期確認に失敗したため、保存せず停止しました。同期データを再読み込みしてから、もう一度操作してください。」とする。
- 同期確認に失敗した場合は、別端末writer確認済み扱いにせず、短時間だけ追加書き込みを抑止する。
- タスク開始/終了系だけ別端末更新後に自動継続するv0.5.61方針、および完了処理直前の二重ログ防止を入れたv0.5.62方針は維持する。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.64 ルール（直接Vault書き込み箇所の同期ガード監査）

- v0.5.64では、v0.5.63をベースに、`writeFileText()` を通らない直接Vault書き込み箇所を監査し、同期ガードをすり抜けやすい箇所を補強する。
- 監査対象は `app.vault.modify/create/delete/rename`、`app.fileManager.renameFile`、`adapter.write/remove`、直接 `saveData()` など。
- 低レイヤーの `writeFileText()` 内部、履歴スナップショット、エラーログ、内部クリーンアップなど、既に内部処理として扱う書き込みは原則そのまま維持する。
- ユーザー操作から呼ばれる直接リネーム/直接保存については、操作入口で `ensureDeviceWriteGuard(..., { userOperationEntry: true })` を通す。
- タスク名/ファイル名同期コマンドは、開始時に同期ガードを通し、ガード停止時はリネームやリンク同期へ進まない。
- プロジェクト名変更時のプロジェクトノートリネームは、同期ガードで停止した場合に入力値を元へ戻し、設定保存へ進まない。
- Undo/Redo は復元前に同期ガードを通し、復元時に直接 `saveData()` する場合でも `taskchuteDeviceSyncMeta` を現在端末のwriter情報へ更新してから保存する。
- プロジェクトノート作成/メタ保存/アーカイブ復元などで `savePluginData()` や `writeFileText()` が `false` を返した場合は、後続処理へ進まない。
- タスク開始/終了系だけ別端末更新後に自動継続するv0.5.61方針、完了処理直前の二重ログ防止を入れたv0.5.62方針、同期確認失敗時に保存せず停止するv0.5.63方針は維持する。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.65 ルール（割り込み開始時の実行中タスク整合チェック）

- v0.5.65では、v0.5.64をベースに、別端末更新反映後の割り込み開始で古い実行中タスクを誤って割り込み終了ログ化しないための整合チェックを追加する。
- `startTask()` では、開始前の実行中セッションと、`ensureDeviceWriteGuard(..., { continueAfterDeviceReload: true })` 後の実行中セッションを `entryId/taskKey/taskId + execId` で比較する。
- 別端末更新後に実行中タスクが別物へ変わっている場合は、割り込み開始を実行せず、Notice「別端末の更新で実行中タスクが変わったため、割り込み開始は実行しませんでした。」を出す。
- 別端末更新後に、開始前は実行中なしだったのに実行中タスクが見つかった場合も、古い画面状態からの開始/割り込みを止め、内容確認を促す。
- `closeRunningTaskForInterrupt()` では、対象タスク行が既に `[x]`、または同じ `exec_id` の `[status::done]` / `[status::interrupted]` が `## Log` / `## LogDaily` に存在する場合、追加の `interrupted` ログを書かない。
- 上記で既に終了済みと判断した場合は、古い実行中runtimeを解除し、Notice「実行中タスクは既に終了済みのため、割り込み終了ログは追加しませんでした。」を出す。
- タスク開始/終了系だけ別端末更新後に自動継続するv0.5.61方針、完了処理直前の二重ログ防止を入れたv0.5.62方針、同期確認失敗時に保存せず停止するv0.5.63方針、直接Vault書き込み補強を入れたv0.5.64方針は維持する。
- v0.5.50の「同期データを再読み込み」とv0.5.56の同期中表示ピルUIは維持する。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.66 ルール（右サイドペインのサブタスク欄レイアウト修正）

- v0.5.66では、v0.5.65をベースに、PC版右サイドペインのサブタスク欄が崩れる問題を修正する。
- 同期関連のv0.5.50〜v0.5.65仕様には触らず、サブタスク欄のCSSレイアウトだけを最小差分で調整する。
- サブタスク行のDOMは「ドラッググリップ / チェックボックス＋本文＋完了時刻 / 編集・削除ボタン」の3要素で構成されるため、CSS gridも3列 `auto minmax(0, 1fr) auto` を正とする。
- サブタスクカード・リスト・行・本文領域に `min-width: 0` や `overflow` 調整を入れ、右サイドペインの狭幅時に本文やボタンがカード外へはみ出しにくくする。
- サブタスク保存形式、追加/チェック/編集/削除/並び替え処理、D&D挙動、Log/LogDaily/actual、同期ガード処理は変更しない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。



## v0.5.67 ルール（右サイドペインのサブタスク欄コンパクト化）

- v0.5.67では、v0.5.66をベースに、PC版右サイドペインのサブタスク欄の縦幅をコンパクト化する。
- 同期関連のv0.5.50〜v0.5.65仕様には触らず、v0.5.66のサブタスクレイアウト修正を維持したまま、CSSの余白・行間・ボタンサイズだけを最小差分で調整する。
- サブタスク同士の間隔は `.tc-right-pane-subtask-list` の `gap` を小さくし、各サブタスク行の `padding` / `min-height` / `line-height` を詰める。
- 編集・削除ボタン、チェックボックス、ドラッググリップも狭幅の右サイドペインで収まりやすい範囲に小さくする。
- サブタスク保存形式、追加/チェック/編集/削除/並び替え処理、D&D挙動、Log/LogDaily/actual、同期ガード処理は変更しない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.68 ルール（右サイドペインのサブタスク欄がっつりコンパクト化）

- v0.5.68では、v0.5.67をベースに、PC版右サイドペインのサブタスク欄をさらに高密度表示へ寄せる。
- 同期関連のv0.5.50〜v0.5.65仕様には触らず、v0.5.66の3列grid修正とv0.5.67のコンパクト化を維持したまま、CSSの余白・行間・ボタンサイズを追加で詰める。
- サブタスク同士の間隔、サブタスク行の上下padding、min-height、本文line-height、編集/削除ボタン、チェックボックス、ドラッググリップ、追加入力欄をより小さくし、右サイドペイン内で一覧性を優先する。
- サブタスク保存形式、追加/チェック/編集/削除/並び替え処理、D&D挙動、Log/LogDaily/actual、同期ガード処理は変更しない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.71 ルール（起動時はTaskBoard枠を先に表示）

- v0.5.71では、v0.5.70をベースに、Obsidian起動時のTaskBoard自動表示で、Taskchuteノートが先に見えてからTaskBoard UIが形成される挙動を減らす。
- 設定キー `openTaskBoardOnStartup` は維持し、PC/モバイル別トグルは追加しない。
- 起動時は、`safeEnsureBaseFolders()` やクリーンアップなどの内部メンテナンスを待ってからTaskBoardへ切り替えるのではなく、先にTaskBoardのView枠を表示する。
- `TaskchuteView.onOpen()` では、非同期の同期データ再読み込み・本体描画を始める前に、TaskBoard側のローディング枠を即時描画する。
- 既存TaskBoard leafがある場合も、まずそのleafを前面表示してからrefreshする。
- 通常の「Task Boardを開く」コマンド、リボン、設定系ビュー内ボタンからの `activateView()` は従来どおり現在leaf再利用を許可する。
- 同期関連v0.5.50〜v0.5.65、右サイドペイン/サブタスクv0.5.66〜v0.5.68、起動時自動表示設定v0.5.69〜v0.5.70、TaskBoard保存形式、Log/LogDaily/actualには影響させない。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.72 起動時TaskBoardカバー表示ルール

- v0.5.72では、v0.5.71をベースに、Obsidian本体が前回ノート/Taskchuteノートを復元してからTaskBoard Viewへ切り替わるまでの見え方をさらに抑制する。
- 設定キー `openTaskBoardOnStartup` は1つのまま維持し、PC/モバイル別設定は追加しない。
- プラグイン `onload()` の早い段階で、直近の `openTaskBoardOnStartup` 設定キャッシュがONなら、body直下にTaskBoard用の起動カバーを表示する。
- 起動カバーは「TaskBoard / TaskBoardを起動しています…」のシンプルな表示とし、TaskBoard View側の `renderStartupShell()` が描画されたら外す。
- `data.json` 読み込み前でも起動カバーのON/OFFを判断できるよう、`openTaskBoardOnStartup` の直近値を localStorage にキャッシュする。
- 設定がOFFの場合は起動カバーを出さず、読み込み後にカバーが残っていれば即解除する。
- Obsidian本体がプラグイン実行前に描画するごく短い復元画面までは完全保証しないが、プラグイン側で制御可能な範囲ではTaskBoard表示を最優先にする。
- 同期関連v0.5.50〜v0.5.65、右サイドペイン/サブタスクv0.5.66〜v0.5.68、起動時自動表示設定v0.5.69〜v0.5.71、TaskBoard保存形式、Log/LogDaily/actualには影響させない。
- `manifest.json` は `0.5.72`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.73 ルール（ルーティンサブタスクの日別リセット補強）

- v0.5.73では、v0.5.72をベースに、ルーティンタスクのサブタスクを「タスクノート側テンプレート」と「当日RoutineLog側チェック状態」に分ける既存方針を補強する。
- 通常タスクのサブタスクは従来どおり親タスクノート `## Subtasks` に保存する。
- ルーティン生成行のサブタスクは、タスクノート `## Subtasks` をテンプレートとして読み、当日のチェック状態・完了時刻は `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` の対象 `tc:routine_detail` ブロック内 `### Subtasks` に保存する。
- 翌日以降は別日のRoutineLogを参照するため、前日のチェック状態を引き継がず未チェックのテンプレートとして表示する。
- 既存の当日RoutineLogブロックにサブタスク状態がある場合はそれを優先し、タスクノート側テンプレートに新しい項目が増えていた場合は未チェック項目として当日表示に追加する。
- 古いRoutineLogブロックに `### Subtasks` セクション自体がない場合は、タスクノート側テンプレートから未チェック状態を復元する。
- 当日RoutineLogに明示的な空の `### Subtasks` セクションがある場合は、その日のサブタスクを空にした状態として尊重する。
- サブタスクチェック/追加/編集/削除/並び替えはLog/LogDaily/actualには影響させない。親タスクの開始/終了だけがactual集計対象。
- 同期関連v0.5.50〜v0.5.65、右サイドペイン/サブタスクUI v0.5.66〜v0.5.68、起動時表示v0.5.69〜v0.5.72には影響させない。
- `manifest.json` は `0.5.73`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。


## v0.5.76 ルール（モバイル版サブタスク編集メニューと局所追加）

- v0.5.76では、v0.5.75をベースに、モバイル版TaskBoardのカード内サブタスクUIを改善する。
- モバイル版の各サブタスク行の右側にメニューボタンを追加し、そこからサブタスク名編集・削除を実行できるようにする。
- サブタスク名編集・削除は既存の `renameSubtask()` / `deleteSubtask()` を使い、通常タスクは親タスクノート `## Subtasks`、ルーティンタスクは当日RoutineLog側へ保存する既存仕様を維持する。
- サブタスクがあるタスクをモバイル版で開始した場合、開始後にそのタスクカードの詳細を自動展開し、サブタスク欄をすぐ操作できるようにする。
- サブタスク追加時はTaskBoard全体を再描画せず、対象カード内のサブタスクリスト、進捗カウント、進捗ピルだけを局所更新する。
- サブタスクのチェック/チェック解除時に全体再描画しないv0.5.75方針は維持する。
- 編集・削除・追加・チェック/チェック解除はいずれも `Log` / `LogDaily` / `actual` には影響させない。親タスクの開始/終了だけがactual集計対象。
- 同期関連v0.5.50〜v0.5.65、PC右サイドペインUI、起動時表示v0.5.69〜v0.5.72には影響させない。
- `manifest.json` は `0.5.76`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.77 ルール（ルーティン設定内サブタスクテンプレート編集）

- v0.5.77では、v0.5.76をベースに、ルーティン設定モーダル内でサブタスクテンプレートを設定できるようにする。
- ルーティン設定の「サブタスク」は1行1件の入力欄とし、保存時に親タスクノートの `## Subtasks` へ未チェックのチェックリストとして保存する。
- 入力時に `- [ ]` / `- [x]` / `- ` が含まれていても、テンプレート保存時は未チェック `- [ ] サブタスク名` に正規化する。完了時刻はテンプレートへ持ち込まない。
- ルーティン生成行では、v0.5.73の方針どおり、親タスクノート `## Subtasks` をテンプレートとして読み、当日のチェック状態は `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` 側へ保存する。
- 通常タスクのサブタスク保存仕様、モバイル版カード内サブタスクUI、PC右サイドペイン、同期関連v0.5.50〜v0.5.65、起動時表示v0.5.69〜v0.5.72には影響させない。
- `manifest.json` は `0.5.77`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.78 ルーティン設定ページのサブタスクテンプレート

- v0.5.78では、ルーティン設定ページの一覧に「サブタスク」列を追加する。
- ルーティン設定ページ側では、各ルーティン行のサブタスク件数を表示し、「編集」ボタンからサブタスクテンプレートを編集できる。
- サブタスクテンプレートは1行1件で入力し、保存時は親タスクノートの `## Subtasks` に未チェックチェックリストとして保存する。
- 入力時に `- [ ]` / `- [x]` / `- ` が含まれていても、テンプレート保存時は未チェック `- [ ] サブタスク名` に正規化する。
- ルーティン生成行の日別チェック状態は引き続き当日の `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` 側へ保存し、ルーティン設定ページで編集するテンプレートには完了時刻やチェック状態を持ち込まない。
- v0.5.77のルーティン設定モーダル側サブタスク入力、v0.5.73の日別リセット仕様、モバイルカード内サブタスクUI、PC右サイドペイン、同期関連仕様は維持する。


## v0.5.79 ルール（モバイル版ルーティン設定ページのヘッダー操作折り返し）

- v0.5.79では、v0.5.78をベースに、モバイル版ルーティン設定ページのヘッダー操作ボタンが画面外へはみ出す問題を修正する。
- 対象はルーティン設定ページ上部の「Task Boardを開く」「休日カレンダー」「整合性チェック」ボタン。
- モバイル幅ではヘッダー操作領域を折り返し可能にし、各ボタンを画面幅内へ収める。
- 「整合性チェック」は1行分の幅を使えるようにし、右端が画面外へ出ないようにする。
- ルーティン設定ページのサブタスク列/編集導線、ルーティン日別サブタスク仕様、同期関連仕様、TaskBoard保存形式には影響させない。
- `manifest.json` は `0.5.79`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.5.80 ルール（同期待機中の編集ブロック緩和）

- v0.5.80では、v0.5.79をベースに、同期表示が残っているだけで編集操作が何度も「同期中のため、編集は少し待ってから実行してください」でブロックされる問題を修正する。
- `getTaskchuteSyncState()` は従来どおり同期中/同期待機中の表示状態を返してよいが、ユーザー編集をブロックする判定とは分離する。
- ユーザー編集ブロックは `shouldBlockTaskchuteUserEditForSync()` で判定し、実際に外部変更を適用中、手動再読み込み中、別端末更新確認中など、UIを書き換える可能性が高い処理中だけ一時停止する。
- `externalRefreshTimer` / `pendingExternalRefreshReasons` による同期待機中表示、または `externalSyncEditLockUntil` の短い安定待ちだけでは、入力・編集をブロックし続けない。
- TaskBoard内のキャプチャ段階イベントブロッカーと `blockIfTaskchuteSyncBusy()` は、表示状態そのものではなく `shouldBlockTaskchuteUserEditForSync()` を使う。
- 同期関連v0.5.50〜v0.5.65、起動時表示v0.5.69〜v0.5.72、サブタスク/ルーティン設定v0.5.73〜v0.5.79の仕様は維持する。
- `manifest.json` は `0.5.80`。
- ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。



## v0.5.81 TaskBoard refresh重複描画防止ルール

- v0.5.81では、モバイル初回起動時などにTaskBoard全体が縦に複数回描画されることがある問題へ対応した。
- 原因は、`TaskchuteView.refresh()` がファイル読み込み・ルーティン生成・同期再読み込みで `await` を挟むため、複数のrefreshが並走すると、古いrefreshが先に `empty()` した後で、後続refreshが描画したDOMへさらにヘッダー/サマリ/タスク/フッター一式を追加描画できる構造だったこと。
- `TaskchuteView` に `refreshRunId` を追加し、refresh開始ごとに世代番号を更新する。await後・最終描画直前に最新世代でなければ描画しない。
- 最終描画直前にも最新refreshだけが `el.empty()` してからTaskBoard本体を描画し、古い描画結果が混在しないようにする。
- 同期関連v0.5.50〜v0.5.65、起動時表示v0.5.69〜v0.5.72、サブタスク/ルーティン設定v0.5.73〜v0.5.80の仕様は維持する。


## v0.5.82 モバイル起動時TaskBoard前面表示安定化

- v0.5.82 では、v0.5.81 をベースに、モバイル起動時に Taskchute ノートが開いたまま TaskBoard が表示されないことがある問題へ対応した。
- 原因は、v0.5.70 以降でモバイル起動時に `workspace.getLeaf("tab")` / `workspace.getLeaf(true)` を優先していたため、TaskBoard View を別 leaf に作成しても、起動直後のモバイル1画面表示でその leaf が前面に出きらず、復元された Taskchute ノート leaf が残る可能性があったこと。
- v0.5.82 では、起動時TaskBoard自動表示で既存TaskBoard leafがない場合、PC/モバイル共通で `workspace.getLeaf(false)` を使い、現在アクティブleafを確実にTaskBoardへ差し替える方針へ戻す。
- 一瞬Taskchuteノートが見える可能性は、v0.5.72 の起動時TaskBoardカバーで抑制する。TaskBoardが表示されない事故を避けることを優先する。
- `revealTaskBoardLeafReliably()` を追加し、`setViewState()` 後および既存TaskBoard leaf表示時に `revealLeaf()` を即時実行し、短い遅延でも再実行する。
- 通常の「Task Boardを開く」コマンド、リボン、設定系ビュー内ボタンの挙動は従来どおり維持する。
- 同期関連 v0.5.50〜v0.5.65、起動時カバー v0.5.72、サブタスク/ルーティン設定 v0.5.73〜v0.5.81 の仕様は維持する。

## v0.5.83 同期確認失敗ループ対策

- v0.5.83では、同期確認ガード中に `data.json` 読み込み・安定待ち・writerメタ確認が成功した後の TaskBoard 表示反映 (`patchTaskchuteViewsFromExternalSync`) 失敗は、ユーザー操作を停止する致命エラーとして扱わない。
- 特にモバイルで、PC側で開始したタスクを完了する際、表示反映中の一時的な refresh/patch 失敗だけで「同期確認に失敗しました」が繰り返し出て完了できない状態を避ける。
- 表示反映に失敗した場合は `console.error` に記録し、`queueExternalRefresh("device-write-guard-patch-failed", ...)` で後続反映を予約する。
- `loadData()`、安定待ち、writerメタ確認など同期確認そのものが失敗した場合は、v0.5.63方針どおり保存せず停止する。

## v0.5.84 同期確認失敗理由の明確化と重複entry_id完了ガード

- v0.5.84では、v0.5.83でもモバイル完了時に「同期確認に失敗しました」が繰り返し出るケースへの追加対策を行う。
- 同期確認ガード内で、`workspace.getLeavesOfType(VIEW_TYPE)` などTaskBoard leaf取得そのものが一時的に失敗しても、`loadData()`・安定待ち・writerメタ確認が成功している場合は、完了操作を止める致命エラーとして扱わない。
- 手動「同期データを再読み込み」でも、data.json 読み込みと安定待ちが成功している場合、TaskBoard表示反映 (`patchTaskchuteViewsFromExternalSync`) の一時失敗だけで再読み込み全体を失敗扱いにしない。
- 同期確認そのものが本当に失敗した場合は、Noticeに `理由: ...` を付け、次回切り分けできるようにする。
- 同じ日別TaskBoard内で `entry_id` が重複している場合、完了処理の `replaceTaskCheckbox()` / `moveTaskLineToSection()` が複数行へ作用して誤完了・誤移動する危険があるため、完了直前に対象キーの一致行数を確認する。
- 対象キーに一致するタスク行が複数ある場合は、完了ログを追加せず、Noticeで `entry_id` 重複により完了を停止したことを伝える。自動修復は行わない。
- `Taskchute/2026-05-12 Taskchute.md` など、整合性チェックで `board_duplicate_entry_id` が出ている日別Taskchuteノートは、重複行の確認・手動修正が必要。自動で片方を削除すると実績やログを壊す可能性があるため、v0.5.84では安全停止に留める。
- v0.5.83の同期確認失敗ループ対策、v0.5.81のrefresh重複描画防止、v0.5.82のモバイル起動時表示安定化、v0.5.73以降のルーティン/サブタスク仕様は維持する。
- `manifest.json` は `0.5.84`。
- ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.85 running表示/実体不整合ガード

- 完了処理では、実行元日付のTaskchuteノート内に対象 `entry_id/taskKey/task_id` のタスク行がちょうど1件存在することを必須とする。
- 対象行が0件の場合、data.json の実行中情報だけ先に同期され、日別Taskchuteノート本文が未到着/未反映の可能性があるため、Log/LogDailyだけを書かず完了処理を停止する。
- 対象行が複数件の場合は、重複 `entry_id` による誤完了を避けるため停止する。
- `runtime.running` が存在しないのにUI上だけ実行中表示が残る場合、完了ボタン押下時にTaskBoardを再読み込みして古い実行中DOMを解消する。
- フローティング実行中バーは data.json 由来の実行中情報を表示するが、完了時には必ず日別Taskchuteノート本文上の対象行存在確認を行う。

## v0.5.87 notes

- v0.5.87 adds polling for open TaskBoard-related files to catch Obsidian Sync updates that do not reliably emit vault modify events on mobile.
- The poll targets the currently open TaskBoard date's daily Taskchute markdown and RoutineHistory file, using mtime/size stat keys.
- When a displayed board file changes externally, call `queueExternalRefresh()` so the open TaskBoard can reload without manual "同期データを再読み込み" or app restart.
- Internal writes marked via `markTaskchuteInternalWrite()` must continue to be ignored so local saves do not loop back as external sync.
- Keep main.js single-file operation. Do not add `src/`, `package.json`, `esbuild.config.mjs`, `tsconfig.json`, or `data.json` to release ZIPs.

## v0.5.88 外部同期後ビュー反映安定化ルール

- v0.5.88では、PC/モバイルを開きっぱなしにした状態で、同期中表示が終わってもTaskBoardビューが最新状態へ反映されないことがある問題へ対応した。
- 原因は、外部同期反映で差分パッチ `applyExternalTaskPatch()` を優先していたため、日別Taskchuteノート本文には差分が少ない一方、`data.json` 側の `runtime.running` / `paused` / 表示状態だけが変わるケースを取りこぼしやすかったこと。
- 外部同期・手動同期再読み込みなど `externalSync: true` の反映では、差分パッチではなく `TaskchuteView.refresh()` に集約し、最新の `data.json` と表示中日付のTaskchuteノートを同じ描画サイクルで反映する。
- ローカル操作直後など `externalSync` ではない軽い表示更新では、従来どおり差分パッチを使ってよい。
- v0.5.87の表示中Taskchuteノート/RoutineHistory statポーリング、v0.5.81のrefresh世代管理、v0.5.50〜v0.5.65の同期ガード方針は維持する。
- 同期関連を修正する場合も、`main.js` 単一ファイル運用を維持し、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を追加しない。


## v0.5.90 外部同期refreshちらつき抑制の撤回

- v0.5.90では、v0.5.89で追加した外部同期refreshちらつき抑制を不採用として撤回する。
- ベースはv0.5.88相当へ戻し、外部同期・手動同期再読み込みなど `externalSync: true` の反映では、差分パッチではなく `TaskchuteView.refresh()` に集約する。
- 理由は、v0.5.89の「同期の到着が落ち着くまで待って最後に1回だけ差し替える」処理で、TaskBoardビューの反映順やDOM状態が崩れる可能性があるため。
- ちらつきよりも表示整合性を優先する。外部同期後のビューが不安定になる修正は採用しない。
- v0.5.87の表示中Taskchuteノート/RoutineHistory statポーリング、v0.5.88の外部同期後full refresh方針、v0.5.81のrefresh世代管理、v0.5.50〜v0.5.65の同期ガード方針は維持する。
- 同期関連を再度改善する場合は、まず表示整合性を壊さないことを優先し、ちらつき対策は別途慎重に検証する。
- `manifest.json` は `0.5.90`。
- ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。

## v0.5.91 開始/完了の低レイヤー同期ガード二重発火防止

- v0.5.91では、タスク開始/完了時にビュー上は開始/完了へ進む一方で、低レイヤーの `writeFileText()` / `savePluginData()` が再度同期ガードに入り、「今回の操作は保存していません」Noticeを出して保存を止め、UIと内部状態が不一致になる問題へ対応する。
- `startTask()` / `completeRunningTask()` は、ユーザー操作入口で `ensureDeviceWriteGuard(..., { continueAfterDeviceReload: true })` を通過済みなら、その同一操作内の後続 `writeFileText()` / `savePluginData()` では同期ガードを再実行しない。
- 具体的には、同一開始/完了操作内だけ有効な trusted write bypass を追加し、低レイヤー保存関数が「別端末更新を反映しました。今回の操作は保存していません。」系Noticeを出して途中停止しないようにする。
- このbypassは開始/完了操作内の `try/finally` で解除し、タスク追加・編集・コメント・リンク・サブタスク・D&D・削除などには適用しない。
- 低レイヤー保存自体の `markCurrentDeviceAsLastWriter()` / writer meta保存は維持するため、保存成功時は現在端末がlast writerになる。
- v0.5.90の外部同期後full refresh方針、v0.5.87の表示中Taskchuteノート/RoutineHistory statポーリング、v0.5.81のrefresh世代管理、v0.5.50〜v0.5.65の同期ガード方針は維持する。
- `manifest.json` は `0.5.91`。
- ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.92 保存失敗時のUI先行更新防止

- タスク削除などのユーザー操作では、低レイヤーの `writeFileText()` / `savePluginData()` が同期ガードで `false` を返したあとに、ビューだけ削除済みへ進めてはいけない。
- ユーザー操作入口で `runTaskchuteUserWriteTransaction()` を通し、ガード通過後の同一操作内だけ trusted write bypass を使う。これにより、入口で同期確認済みの操作中に低レイヤー保存が再度「今回の操作は保存していません」を出して途中停止する事故を防ぐ。
- タスク削除・ルーティンタスク削除では、TaskBoard行削除、タスクノート削除、runtime更新、ビュー行削除の順序を保存成功後に進める。保存が止まった場合はビューから行を消さない。
- 開始/完了のv0.5.91方針は維持しつつ、削除系にも「保存成功前にUIを進めない」ルールを適用する。


## v0.5.93 Codexレビュー指摘対応：書き込み停止時のUI先行更新漏れ補強

- v0.5.93では、v0.5.92に対するCodexレビューで指摘された「保存は止まったがUIだけ進む」経路を追加補強する。
- `runTaskchuteUserWriteTransaction()` 自体の設計は維持し、trusted write bypass は `try/finally` で解除する。
- `updateTaskRoutineSettings()` は、ユーザー操作入口で `runTaskchuteUserWriteTransaction("ルーティン変更", ...)` を通す。内部再入用に `_insideWriteTransaction` を使い、同期ガード通過後の同一操作内だけ低レイヤー保存ガードを再実行しない。
- `updateTaskRoutineSettings()` の `writeFileText()` 戻り値を確認し、`false` の場合は `Object.assign(task, patch)`、`updateTaskFieldInViews()`、生成済みルーティン同期、成功Noticeへ進まない。
- ルーティン設定ページ側の削除 `deleteRoutineTask()` は、確認後の本体処理を `runTaskchuteUserWriteTransaction("ルーティン削除", ...)` で包み、各 `updateTaskRoutineSettings()` が `false` の場合は選択解除・削除件数加算・refresh・成功Noticeへ進まない。
- ルーティン設定ページ側の一括反映 `applyRoutineBulkChange()` は、各 `updateTaskRoutineSettings()` / `updateRoutineTaskTitle()` の戻り値を確認し、失敗時は後続refresh・成功Noticeへ進まない。
- `updateRoutineTaskTitle()` は `writeFileText()` の戻り値を確認し、保存停止時は `task.title` 更新やView更新へ進まない。
- `bulkDeleteTasks()` と `bulkMoveTasksToDate()` は、入口ガード通過後の同一操作内で trusted write bypass を使い、各 `writeFileText()` / `savePluginData()` の戻り値を確認する。保存停止時はDOM削除・runtime表示更新・成功Noticeへ進まない。
- 通常タスクのサブタスク操作 `addSubtask()` / `toggleSubtask()` / `renameSubtask()` / `deleteSubtask()` / `moveSubtask()` は、`writeFileText()` の戻り値を確認し、保存停止時は `task.subtasks` 更新・進捗ピル/局所DOM更新の呼び出し元が成功扱いできないよう `false` を返す。
- ルーティンタスクのサブタスク保存先である `upsertRoutineLogDetail()` も `writeFileText()` の戻り値を確認し、保存停止時は `task.comments` / `task.subtasks` 更新やView更新へ進まない。
- v0.5.90の外部同期後full refresh方針、v0.5.91の開始/終了trusted write bypass、v0.5.92の書き込みトランザクション方針、起動時表示、ルーティン/サブタスク仕様は維持する。
- `manifest.json` は `0.5.93`。
- ZIPには `data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を含めない。


## v0.5.94 Codex全体レビュー指摘対応

- v0.5.93に対するCodex全体レビュー指摘を受け、「保存は止まったがUIだけ進む」経路をさらに補強する。
- `bulkDeleteTasks()` は確認ダイアログ表示前に trusted write bypass を開始しない。確認完了後、実削除処理だけを `runTaskchuteUserWriteTransaction()` で包む。
- タスク作成/コピー/挿入系は `writeFileText()` / `savePluginData()` の戻り値を確認し、`false` の場合はTaskBoard行追加・成功Noticeへ進まない。
- 移動/D&D系は保存が `false` の場合に表示を再同期し、成功扱いしない。
- メタ情報・コメント・リンク更新、一括フィールド更新、一括セクション移動も保存戻り値を確認し、失敗時は内部状態/DOM更新へ進まない。
- `main.js` 単一ファイル運用、配布ZIPから `data.json` / `src` / `package.json` / `esbuild.config.mjs` / `tsconfig.json` を除外する方針は継続する。


## v0.5.95 追加ルール（保存停止時のUI先行更新防止レビュー修正）

- v0.5.95では、v0.5.94再レビューで残っていた `writeFileText()` / `savePluginData()` の戻り値確認漏れを追加修正する。
- 一括フィールド更新 `bulkUpdateTaskYamlField()` は、日別Taskchuteノート書き込みが `false` の場合、taskオブジェクト更新・runtime保存・DOM更新・成功Noticeへ進まない。
- 手動実績時刻編集 `resetTaskActualState()` / `setManualTaskStart()` / `setManualTaskEnd()` は、Taskchuteノート書き込みやruntime保存が `false` の場合、runtimeをロールバックし、行更新・成功Noticeへ進まない。
- 通常のセクション移動 `moveTaskToSection()` は、Taskchuteノート書き込み、タスクノート側セクションメタ更新、runtime保存のいずれかが停止した場合、表示を再同期し、DOM移動・成功Noticeへ進まない。
- ルーティン作成 `createRoutineTaskDefinition()` とルーティン下挿入 `insertRoutineBelow()` は、タスクノート作成/追記が `false` の場合に作成成功扱い・追加更新扱いへ進まない。
- ルーティン履歴 `writeRoutineHistoryMonth()` はbooleanを返し、`upsertRoutineHistory()` / `recordRoutineHistoryForTask()` から失敗を呼び元へ伝播する。
- ルーティンのスキップ/キャンセル/無効化系 `setRoutineOccurrenceStatus()` / `disableRoutineMasterActiveOnly()` は、履歴保存・タスクノート無効化・runtime保存が停止した場合、行削除UI・成功Noticeへ進まない。
- 割り込みタスク追加 `addTask(..., interrupt=true)` は、タスク追加後の `startTask()` が `false` の場合、「開始しました」と表示しない。タスク追加成功と開始停止を分けて扱う。
- v0.5.90の外部同期後full refresh方針、v0.5.91〜v0.5.94のtrusted write bypass / write transaction / 保存戻り値確認方針は維持する。
- v0.5.89のちらつき抑制ロジックは復活させない。

## v0.5.98 ローテーションルーティンMVP

- v0.5.98では、通常ルーティンとは別に「ローテーションルーティン」を追加する。
- ローテーションルーティンは `settings.rotationRoutines` に同期対象設定として保存する。
- 各ローテーションは `rotation_id / name / active / start_date / work_days / rest_days / items` を持つ。
- `items` は既存タスクノートの `task_id` を順番付きで保持する。各メニューは引き続き「1タスク = 1ノート」として扱う。
- 生成時は `work_days + rest_days` の周期で対象日を判定し、実行日に該当する場合だけ該当メニューのタスクをTaskBoardへ生成する。休みの日は何も生成しない。
- 生成されたTaskBoard行には `is_routine=true` に加え、`routine_type=rotation / rotation_id / rotation_name / rotation_index / rotation_pattern` をtcメタへ出力する。
- 重複生成防止は同一日のTaskBoard内で `rotation_id + task_id` が既に存在する場合にスキップする。
- RoutineHistoryは `rotation_id` をキーとして使い、削除/スキップ等の既存ルーティン履歴ブロック方針を流用する。
- ルーティン設定ページには「ローテーションルーティン」カードを追加し、追加・編集・有効化/無効化・削除・今後の予定プレビューに対応する。
- UI上では「9日周期」「offset」のような内部表現は出さず、「2日やる → 1日休む」「A → B → C」のような生活リズムとして表示する。
- MVPでは祝日スキップ、特定日除外、休みタスク表示、ズレ自動補正、過去履歴補正、同日複数メニュー、未完了自動繰越、統計画面は対象外。
- main.js単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.6.00 追加ルール（ローテーションメニュー詳細設定 / ルーティン設定ページスクロール）

- v0.6.00では、ローテーションルーティンのメニューを1行テキストだけでなく、メニューごとに見積、開始予定、終了予定、セクション、プロジェクト、モードを設定できるようにする。
- ローテーションメニュー保存時は、各メニューの `estimate_min / start_plan / end_plan / project / section_id / section / mode` を `settings.rotationRoutines[].items[]` に保持する。
- TaskBoard自動生成時は、ローテーションメニュー側の設定値をタスクノート側のfrontmatterより優先する。未設定項目は従来どおりタスクノート側の値へフォールバックする。
- 開始予定が設定されている場合のセクション判定は既存TaskBoard方針に合わせ、開始予定から求めたセクションを優先する。開始予定が空の場合はメニュー側の明示セクションを使う。
- ローテーションメニュー用タスクノートを自動作成する場合は、メニュー側の見積、開始予定、終了予定、セクション、プロジェクト、モード等を初期frontmatterへ反映する。
- ルーティン設定ページでは、ローテーションルーティンカード追加により「登録中ルーティン」が下へ押し出されても下部を操作できるよう、ページ/一覧のスクロールを確保する。
- main.js単一ファイル運用、配布ZIPから `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を除外する方針は継続する。

## v0.6.01 ルーティン設定ページの縦スクロール復旧

- v0.6.00でローテーションルーティンカードとメニュー詳細設定を追加した結果、ルーティン設定ページ内の「登録中ルーティン」領域が画面下で見切れ、縦スクロールできない場合があった。
- v0.6.01では、ルーティン設定ページのrootを明示的な縦スクロールホストにし、shell/list/cardの固定高さ・flex伸縮を解除する。
- 登録中ルーティンの表は横幅が大きいため、ページ全体の縦スクロールとは別に、`.tc-routine-board-wrap` 自体にも縦横スクロールを残す。
- ローテーションルーティンの保存形式、生成ルール、メニュー詳細項目、通常ルーティン保存形式には影響させない。


## v0.6.03 ルーティン休日表示文言の短縮

- v0.6.03では、ルーティン設定画面の「休日」列/休日扱い選択肢の表示文言を調整した。
- 列名や設定名で既に休日文脈が分かるため、`holiday_rule: skip` のユーザー向け表示は「休日なら生成しない」ではなく「生成しない」とする。
- `holiday_rule` の内部値は `none` / `skip` のまま変更しない。
- 既存データ互換のため、「休日なら生成しない」「休日は生成しない」「営業日のみ」「平日のみ」などの旧表記も `skip` として読み取る。
- ローテーションプレビューの休日スキップ表示も「生成しない」に寄せる。
- ルーティン生成判定、休日カレンダー判定、保存形式はv0.6.02から変更しない。

## v0.6.02 ルーティン休日スキップMVP

- v0.6.02では、通常ルーティンとローテーションルーティンに `holiday_rule` を追加する。
- `holiday_rule: none` は従来どおり対象日に生成する。
- `holiday_rule: skip` は「休日なら生成しない」として扱い、対象日が営業日でない場合はTaskBoardへ自動生成しない。
- 営業日判定は既存の休日カレンダーを使い、例外営業日を最優先、ユーザー指定休日・日本の祝日・土日を非営業日として扱う。
- 通常ルーティンではタスクノートfrontmatterに `holiday_rule` を保存する。ルーティン設定モーダルとルーティン設定ページ一覧の「休日」列から変更できる。
- ローテーションルーティンでは `settings.rotationRoutines[].holiday_rule` に保存し、設定モーダル内の「休日扱い」から変更できる。
- ローテーションの予定プレビューでは、休日スキップ日は「休日スキップ」と表示し、TaskBoard生成時は何も生成しない。
- v0.6.02では前営業日/次営業日への移動は実装しない。まずは「休日なら生成しない」のみ対応する。
- main.js単一ファイル運用、配布ZIPから `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を除外する方針は継続する。

## v0.6.05 サブタスク欄折りたたみ

- v0.6.05では、サブタスク欄を折りたためるようにする。
- PC版右サイドペインの「サブタスク」見出し右側に開閉ボタンを追加し、折りたたみ時はサブタスク一覧と追加欄を隠す。
- モバイル版カード詳細内のサブタスク欄にも開閉ボタンを追加し、折りたたみ時は一覧と追加欄を隠して件数だけ残す。
- サブタスク折りたたみ状態は端末別UI設定として localStorage に保存し、Obsidian Syncで共有しない。
- サブタスク保存形式、通常タスク `## Subtasks`、ルーティンタスクRoutineLog、actual / Log / LogDaily へ影響させない。
- モバイルでサブタスク進捗ピルを押した場合は、詳細を開いたうえでサブタスク欄を展開する。

## v0.6.06 サブタスクチェック表示・スクロール保持・右サイドペイン初期表示

- サブタスクチェックボックスは、PC右サイドペイン・モバイルカード内とも、チェックマークが上下左右中央に見えるようCSSでカスタム描画する。
- サブタスクをチェック/解除したときは、TaskBoard本体や右サイドペインのスクロール位置を維持する。チェック操作後にサブタスク欄が見えない位置へ自動スクロールしない。
- PC右サイドペインが開いている状態でTaskBoardを開き、実行中タスクが存在し、明示的に別タスクが選択されていない場合は、右サイドペインに実行中タスクの詳細を表示する。
- ユーザーが別のタスクを選択した場合は、右サイドペイン表示は選択タスクを優先する。
- 右サイドペインが閉じている場合は、実行中タスク表示のためだけに右サイドペインを開かない。
- サブタスク保存形式、RoutineLog、Log / LogDaily / actual には影響させない。


## v0.6.07 サブタスクチェックボックス視認性・中央寄せ再調整

- v0.6.07では、v0.6.06で追加したサブタスクチェックボックスのカスタム描画を再調整する。
- PC右サイドペイン・モバイルカード内のサブタスクチェックマークは、文字フォントの `✓` ではなくCSS border strokeで描画する。
- チェックマークは `display: inline-grid` / `place-items: center` と固定strokeサイズで上下左右中央に見えるようにする。
- チェック済み背景はアクセント色ベタ塗りではなく、アクセント色を薄く混ぜた背景にし、チェックマーク本体は `var(--interactive-accent)` で描画する。これにより、テーマによってチェックと背景が近く見える状態を避ける。
- サブタスク保存形式、RoutineLog、Log / LogDaily / actual、スクロール保持、右サイドペイン初期表示には影響させない。
- `manifest.json` は `0.6.07`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.6.08 サブタスクチェックボックスのチェックマーク復旧

- v0.6.08では、v0.6.07で薄い背景へ変更したサブタスクチェックボックスを見直し、完了時の背景色をv0.6.06相当のアクセント背景へ戻す。
- チェックマークは必ず表示する。文字フォントの `✓` には戻さず、チェック済みcheckbox本体の中央に白いSVGチェックを背景画像として表示する。
- PC右サイドペイン・モバイルカード内の両方を対象にする。
- チェックマークは `background-position: center center` と固定 `background-size` で上下左右中央に配置し、疑似要素やフォントの上下ズレに依存しない。
- サブタスク保存形式、RoutineLog、Log / LogDaily / actual、スクロール保持、右サイドペイン初期表示には影響させない。
- `manifest.json` は `0.6.08`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.6.11 実績時刻入力のクイック候補

- v0.6.11では、TaskBoardの実績開始/終了時刻の手入力補助を追加する。
- 開始時間（`start_actual`）入力にフォーカスしたとき、小さな候補メニューから「直前の終了時間」「現在時刻」を選んで入力できる。
- 「直前の終了時間」は、表示中TaskBoard上で対象タスクより上にあるタスクのうち、直近の完了済み終了実績 `endActual` を使う。該当がない場合は候補に出さない。
- 終了時間（`end_actual`）入力にフォーカスしたとき、「見積通り」を選んで、開始実績 + 見積分の終了時刻を入力できる。
- 終了時間の見積通り入力は、開始実績がない場合は無効候補として扱い、保存処理へ進まない。
- PC版インライン入力とモバイル版カード内実績時刻入力の両方に対応する。
- 候補選択後の保存は既存の `updateTaskActualTimeField()` / `setManualTaskStart()` / `setManualTaskEnd()` を通すため、同期ガード、保存戻り値確認、日付またぎ判定、Log / LogDaily 更新方針は従来どおり維持する。
- main.js単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。

## v0.6.13 実績開始候補「直前の終了時間」安定化

- v0.6.13では、v0.6.12をベースに、開始時間候補「直前の終了時間」が一度使った後に消える問題を修正した。
- 手動開始を入れると対象タスクが実行中扱いでセクション上部へ移動することがあり、その後開始時間を空に戻すと、見た目上の前行が存在せず候補が消える場合があった。
- `getPreviousTaskEndClock()` は、従来どおり対象タスクより上の行から終了実績を探す。
- それで見つからない場合は、同じTaskBoard内の対象タスク以外の終了実績から最新の終了時刻をフォールバック候補として返す。
- v0.6.12のプルダウン風UI、候補選択時の `pointerdown` 処理、blur二重保存抑止、保存処理の同期ガード方針は維持する。
- main.js単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。


## v0.6.14 実績時刻候補プルダウンのキーボード操作対応

- v0.6.14では、v0.6.13をベースに、開始時間/終了時間の候補プルダウンをキーボード操作できるようにした。
- 開始時間/終了時間入力欄へフォーカス中、候補プルダウンが開いている場合は `ArrowDown` / `ArrowUp` で候補を移動できる。
- `Enter` で選択中候補を確定し、既存の `updateTaskActualTimeField()` 保存処理へ流す。
- `Escape` は入力値を戻すのではなく、候補プルダウンだけを閉じる。
- 候補の現在選択状態は `is-active` / `aria-selected` / `aria-activedescendant` で表現する。
- v0.6.12のプルダウン風UI、v0.6.13の「直前の終了時間」安定化、保存処理の同期ガード方針は維持する。
- main.js単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。


## v0.6.15 実績時刻候補プルダウンのEnter挙動修正

- v0.6.15では、v0.6.14をベースに、開始時間/終了時間の候補プルダウン表示直後の初期選択を解除した。
- 候補プルダウンを表示しただけでは一番上の候補へフォーカス/選択状態を当てない。
- 手入力で時刻を入力してEnterを押した場合は、候補ではなく入力値の確定を優先する。
- `↑` / `↓` で明示的に候補を選択した場合だけ、Enterで候補を確定する。
- `Esc` でプルダウンだけ閉じる既存挙動は維持する。
- v0.6.12のプルダウン風UI、v0.6.13の「直前の終了時間」安定化、v0.6.14のキーボード操作対応は維持する。
- `manifest.json` は `0.6.15`。
- `main.js` 単一ファイル運用を継続し、配布ZIPには `data.json / src / package.json / esbuild.config.mjs / tsconfig.json` を含めない。


<!-- TASKCHUTE_BRIDGE_RELEASE_RULES_START -->
## Release / BRAT 配布ルール

- BRAT固定版配布では、GitHub Release assetsに必ず `main.js` / `manifest.json` / `styles.css` を個別添付する。
- ZIP添付は任意。ただしZIPのみ添付は禁止。
- `data.json`、API token、Vault内Taskchuteデータ、`Taskchute/_system/index.json`、バックアップファイル、個人データ、実運用ログは配布物へ含めない。
- tagは原則 `v{manifest.version}` とする。
- release titleにはBridge世代・RC名を記載する。
- release本文には必須assets、任意assets、禁止物、既知の注意を明記する。
- 配布前に `node --check .\main.js` を必ず実行する。
- `main.js` 単一ファイル運用を維持する。
- RC3 FIXED本体の同期ロジックは固定済み。変更する場合はRC3.1またはv6.6候補として扱う。
- 同期ロジックを変更した場合は、三端末起点スモーク、mobile BG/hidden復帰、完了済みTaskDeletedを再確認する。

<!-- TASKCHUTE_BRIDGE_RELEASE_RULES_END -->

