# TaskCreated Guard

作成: 2026-06-14 12:28:11 JST
ステータス: v6.5 RC1 docs反映用

## Purpose

新規作成直後の高速更新・削除・移動で、TaskCreatedなしの後続TaskイベントがD1へ送信されることを防ぐ。

対象例:

- 作成直後のタイトル変更
- 作成直後のセクション移動
- 作成直後の開始
- 作成直後の削除
- 作成直後の一括削除

## Identity

新規作成pending identityは `task_id + entry_id` 単位で管理する。

同じ `task_id` でも別 `entry_id` は別entryである。
`task_id` 単独で別entryを既知扱いしてはいけない。

## Rules

- TaskCreated未確定の新規entryに対するTaskUpdated / TaskMoved等は、前提が満たされるまで送信しない
- TaskCreatedなしの後続TaskイベントをD1へ出さない
- 既存タスクは既知集合未登録だけでは停止しない
- `task_id` 単独で別entryを既知扱いしない
- create直後deleteでは削除意図を失わない

## Create Then Delete

create直後deleteでは、remoteへ削除意図を届けるため、以下を送信する。

```text
TaskCreated -> TaskDeleted
```

TaskDeleted payloadには `task_id` と `entry_id` を含める。

後続TaskDeletedが存在する場合、中間TaskUpdated / TaskMovedは不要送信を避けてよい。
ただし、remoteが最終的に作成後削除状態へ到達できることを優先する。

## Guard Failure Handling

TaskCreated前提が満たされない場合は、後続Taskイベントを安全に止める。

- false-appliedにしない
- cursorだけ進めない
- diagnosticsへ原因を残す
- outboxを壊さない
