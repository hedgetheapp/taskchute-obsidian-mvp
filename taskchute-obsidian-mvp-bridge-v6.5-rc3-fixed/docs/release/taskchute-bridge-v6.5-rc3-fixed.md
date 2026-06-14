# Taskchute Bridge v6.5 RC3 FIXED Release Notes

作成: 2026-06-14 JST  
ステータス: LOCKED / FIXED

## 概要

Taskchute Bridge v6.5 RC3 FIXEDは、dev / remote / mobileの三端末起点で、新規作成、タイトル変更、開始予定変更、セクション移動、開始、完了、削除の最終スモークを通過した固定リリース候補です。

## RC3で固定した内容

### Mobile BG / hidden復帰

- hidden中にpending fetch / apply / Ackを開始しない
- visible復帰後にdeferred drainを再開する
- network errorとpending 0件を分離する

### 開始予定変更とTaskMoved v3

- 開始予定時刻からsectionを再解決する
- `section_id`で移動要否を判定する
- section変更時のみ、保存後Markdown検証済みTaskMoved v3を送信する

### 実行状態イベント

- `TaskStarted / TaskStopped / TaskCompleted`の無言破棄を禁止する
- 保存後Markdownとruntime状態を確認してenqueueする
- 実行イベントをappend-onlyとして保護する
- TaskDeleted前のsupersede対象から実行イベントを除外する

### 完了済みTaskDeleted

- 削除直前に`## Tasks`内から`entry_id`優先で対象を再解決する
- 削除後Markdownを再読込し、対象entry不在時のみTaskDeletedを送信する
- 完了済み削除では`delete_context=completed-task-delete` / `is_completed=1`を付与する

## 固定安全原則

- Markdown正
- `task_id + entry_id` identity
- 保存後検証成功時のみAck
- false-applied禁止
- cursor飛ばし禁止
- D1 schema変更なし
- 秘密情報をdiagnosticsへ出さない

## 最終確認

- dev起点一連操作: 合格
- remote起点一連操作: 合格
- mobile起点一連操作: 合格
- mobile起点TaskMoved単独確認: 合格
- 完了済みTaskDeleted: 合格
- mobile hidden / BG復帰: 合格

## 固定後の変更方針

RC3本体へ追加変更しません。変更が必要な場合はRC3.1またはRC4候補として扱います。

