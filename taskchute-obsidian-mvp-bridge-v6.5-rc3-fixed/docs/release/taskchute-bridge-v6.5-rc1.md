# TaskChute Bridge v6.5 RC1 リリースノート最終版

作成: 2026-06-14 JST  
ステータス: RC1固定後 / README・AGENTS・docs反映後

## 1. 概要

TaskChute Bridge v6.5 RC1は、v6.4 RC1をベースに、短縮負荷試験と軽量回帰試験で見つかった同期安全性の問題を修正したRC版です。

主目的は、Bridge同期で最も危険な以下の問題を抑止することです。

- false-applied
- cursor飛ばし
- `task_id` だけによる誤同一視
- TaskCreated前に後続Taskイベントだけが送信される状態
- create直後deleteの欠落
- 全件削除時のTaskDeleted取りこぼし
- TaskStartedのAck前検証不足
- diagnostics肥大化

v6.5 RC1では、Markdownを正とし、保存後検証成功時のみAckする方針を改めて固定しています。

## 2. 利用者向け変更点

### 2.1 同期の安全性を強化

複数端末間でのタスク作成・削除・開始・開始前戻しなどの同期について、安全側に倒す修正を行いました。

特に、端末側で実際には反映できていないイベントを適用済みとして扱う `false-applied` を禁止し、保存後の検証に成功した場合だけAckする方針を明確にしています。

### 2.2 作成直後に削除したタスクの同期を改善

タスクを作成してすぐ削除した場合でも、remote側へ `TaskCreated → TaskDeleted` の意図が届くようにしました。

これにより、作成直後の高速操作でもremote側に不要なタスクが残りにくくなります。

### 2.3 全件削除・一括削除の取りこぼしを修正

全件削除時に、削除処理中のlive配列やDOM状態に依存してTaskDeletedが取りこぼされる問題を修正しました。

v6.5 RC1では、削除前Markdown snapshotをもとに削除対象を確定し、削除件数分のTaskDeletedを送信する方針です。

### 2.4 開始前に戻す操作の同期を改善

Uキー開始前戻し、または手動で開始時刻をクリアする操作を、他端末へTaskUpdatedとして同期する仕様を固定しました。

同期される代表値は以下です。

- `start_actual` 空
- `end_actual` 空
- `run_state=not_started`
- `is_running=false`
- `is_completed=false`

### 2.5 diagnosticsの肥大化を抑制

data.json肥大化対策として、diagnostics保持上限を導入しました。

ただし、重要な診断情報や設定情報を誤って削除しないよう、protected-aware pruneとして扱います。

## 3. 開発者向け変更点

### 3.1 Markdown正の再固定

TaskChute Bridgeでは、Obsidian Vault上のMarkdownを正とします。

- `Taskchute/YYYY-MM-DD Taskchute.md`: 日付・セクション・順序・実行状態
- `Taskchute/Tasks/*.md`: タスク定義
- `Taskchute/_system/index.json`: 再構築可能キャッシュ
- `data.json`: 設定・runtime・outbox・cursor・diagnostics保持
- D1 events: イベントログ
- applied_events: 端末ごとの適用済み管理

### 3.2 identity原則

Task identityは原則として `task_id + entry_id` です。

同じ `task_id` でも別 `entry_id` は別entryとして扱います。

禁止事項:

```text
task_idだけを根拠に、entry_idありpayloadの対象を既知扱いする
```

### 3.3 Ack条件

Bridge受信applyでは、保存後検証成功時のみAckします。

禁止事項:

- false-applied
- cursor飛ばし
- 保存失敗後のskipped_applied扱い
- 検証未完了イベントのapplied_events登録

### 3.4 TaskDeleted missing target判定

payloadに `entry_id` がある場合:

```text
known = knownEntryIds.has(entryId)
```

payloadに `entry_id` がない旧payloadのみ:

```text
known = knownTaskIds.has(taskId)
```

`task_id` だけ既知・`entry_id` 未知の場合:

```text
missing_target_task_id_only_rejected_entry_id_required
```

として未Ack側へ回します。

### 3.5 TaskCreated前提guard

新規作成直後の高速更新・削除・移動で、TaskCreatedなしの後続TaskイベントがD1へ出ることを防ぎます。

- 新規作成pending identityは `task_id + entry_id` 単位
- TaskCreated未確定の新規entryに対するTaskUpdated / TaskMoved等は前提成立まで送信しない
- 既存タスクは既知集合未登録だけでは停止しない
- `task_id` 単独で別entryを既知扱いしない

### 3.6 create直後delete

create直後deleteでは、以下の順序を保証します。

```text
TaskCreated → TaskDeleted
```

TaskDeleted payloadには `task_id` と `entry_id` を含めます。

中間TaskUpdated / TaskMovedは、後続TaskDeletedがある場合は不要送信を避けます。

### 3.7 全件削除snapshot仕様

`bulkDeleteTasks()` 開始時点で削除前Markdown snapshotを取得します。

snapshotから、削除対象の以下を取得します。

- `task_id`
- `entry_id`
- date
- section
- rowMarkdown

削除後のlive配列、DOM、runtime rowsに依存してTaskDeleted対象を列挙してはいけません。

### 3.8 TaskStarted Ack前検証

TaskStartedでは、payloadの `started_at` を正として扱います。

通常開始のremote applyでは、以下が揃った場合だけAckします。

- TaskBoard row / runtime更新
- Log保存
- LogDaily保存
- runtime.running保存
- 保存後再読込検証成功

resume系は通常開始と分離し、通常開始ログ必須条件を誤適用しないでください。

### 3.9 Uキー開始前戻し / 手動開始時刻クリア

専用イベントは増やさず、TaskUpdatedで扱います。

remote側では以下を行います。

- TaskBoard row更新
- runtime.running解除
- Log / LogDailyの対象実行ログを削除または整合
- 保存後検証成功時のみAck

### 3.10 diagnostics保持上限

保持上限はdiagnosticsに対して適用します。

削ってはいけないもの:

- outbox
- cursor
- API設定
- applied event ID履歴
- safe_stopped / failed_unacked / unknown_event / verified=false相当の重要診断

## 4. README / AGENTS / docs反映状況

v6.5 RC1固定後の文書反映として、以下を追加・追記済みです。

- README.md
- AGENTS.md
- docs/bridge/README.md
- docs/bridge/sync-model.md
- docs/bridge/identity-and-delete.md
- docs/bridge/task-created-guard.md
- docs/bridge/task-started-and-reset.md
- docs/bridge/diagnostics-retention.md
- docs/regression/bridge-v6.5-rc1-checklist.md
- docs/release/taskchute-bridge-v6.5-rc1.md

## 5. 確認済み

以下は確認済み扱いです。

- `node --check .\main.js` 成功
- diagnostics保持上限
- Uキー開始前戻し
- 手動開始時刻クリア
- TaskStarted false-applied修正
- TaskCreated前提guard
- create直後delete
- 全件削除
- TaskDeleted missing target判定
- README / AGENTS / docs反映
- `rg` による主要語句反映確認

## 6. 今回未実施

README / AGENTS / docs反映後の作業では、以下は未実施です。

- 実機Bridge同期
- 長時間運用試験
- モバイル復帰試験
- 圏外復旧試験
- applied event ID履歴保持上限の実装・試験

## 7. 既知の次課題

v6.5 RC1固定後の次課題候補は以下です。

1. 長時間運用試験
2. モバイル復帰・圏外復旧試験
3. applied event ID履歴保持上限設計
4. v6.5 RC1から正式版への昇格判断
5. Watch / Android widget / routine拡張

## 8. RC1固定判断

v6.5 RC1は、軽量回帰試験と文書反映まで完了したRC版として固定済みです。

ただし、正式版昇格前には、長時間運用試験・モバイル復帰・圏外復旧試験を追加で行うことを推奨します。
