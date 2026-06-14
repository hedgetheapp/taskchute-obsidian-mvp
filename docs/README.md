# Task Identity and Delete Semantics

作成: 2026-06-14 12:28:11 JST
ステータス: v6.5 RC1 docs反映用

## Identity

Task identityは原則 `task_id + entry_id` とする。

同一 `task_id` でも、日付行や発生単位が異なる `entry_id` は別entryとして扱う。

Task系イベントでは、可能な限り `task_id` と `entry_id` の両方をpayloadに含める。

対象イベント例:

- TaskCreated
- TaskUpdated
- TaskMoved v3
- TaskDeleted
- TaskStarted
- TaskStopped
- TaskCompleted
- TaskCommentAdded

## 禁止事項

以下は禁止する。

- `entry_id` があるpayloadで `task_id` だけを根拠に同一task扱いする
- 同一 `task_id` の別 `entry_id` を既知扱いしてAckする
- TaskDeleted missing targetを `knownTaskIds.has(taskId)` だけでskipped_appliedにする

## TaskDeleted Missing Target

TaskDeleted applyで対象行が見つからない場合は、冪等成功か未Ackかを安全側に判定する。

payloadに `entry_id` がある場合:

```text
known = knownEntryIds.has(entryId)
```

payloadに `entry_id` がない旧payloadのみ:

```text
known = knownTaskIds.has(taskId)
```

禁止:

```text
entry_idありpayloadで task_id 既知だけを根拠に skipped_applied する
```

task_idだけ既知・entry_id未知の場合:

```text
missing_target_task_id_only_rejected_entry_id_required
```

として未Ack側へ回す。

## 通常削除

通常削除では、Markdown上の対象entryを削除する。

remote側は保存後にMarkdownを再読込し、対象 `entry_id` が消えていることを検証する。
検証成功時のみAckする。

## Create Then Delete

タスク作成直後に削除した場合でも、remoteへ削除意図を届ける。

送信順序:

```text
TaskCreated -> TaskDeleted
```

TaskDeleted payloadには `task_id` と `entry_id` を含める。

TaskCreated適用後にTaskDeletedを適用できるようにする。

## Bulk Delete / Delete All

全件削除 / 一括削除では、削除しながらlive entries / DOM / runtime rowsを反復してはいけない。

v6.5 RC1仕様:

- `bulkDeleteTasks()` 開始時点で削除前Markdown snapshotを作る
- snapshotから削除対象の `task_id / entry_id / date / section / rowMarkdown` を取得する
- 削除後live配列に依存せずTaskDeletedをenqueueする
- 削除件数ぶんTaskDeletedをD1へ送信する
- `isBridgeTaskCreatedPending(taskId, entryId)` は `task_id + entry_id` identityで判定する
