# TaskChute Bridge v6.6 Routine Sync Test 1

## 概要

v6.5 RC3 FIXEDを基盤に、Routine定義とRoutine生成タスクのBridge同期を追加したBRAT実機試験用prereleaseです。

## 主な変更

- `RoutineCreated / RoutineUpdated / RoutineDeleted / RoutineReordered`を追加
- `routine_id`主キーによるRoutine定義upsert・削除・並び替え
- `routine_occurrence_key`による生成タスクの重複防止
- Routine生成TaskCreatedへのRoutine発生メタデータ付与
- stale Routineイベント、missing delete、duplicate occurrenceの冪等Ack
- Routine削除・無効化時の既存生成タスク保護

## 維持する安全原則

- Markdown正
- 保存後検証成功時のみAck
- false-applied禁止
- cursor飛ばし禁止
- `main.js`単一ファイル運用

## BRAT assets

Release assetsには`main.js`、`manifest.json`、`styles.css`を個別添付します。ZIPのみの配布は行いません。
