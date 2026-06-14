# TaskChute Bridge v6.4 RC1 リリースノート草案

## ステータス

Task系主要同期試験完了後のリリース候補。追加機能より、運用整理と回帰安定性を優先する。

## 主な内容

- `server_sequence`を正としたPull順序・cursor進行
- 保存後再読込検証に基づくAckとfalse-applied防止
- TaskCreated / TaskUpdated / TaskMoved v3 / TaskDeletedの双方向同期安定化
- TaskStarted / TaskStopped / TaskCompleted / TaskCommentAdded同期
- Project / Mode / Category / Area / Client / Section定義同期
- start_plan直接入力のTaskUpdated同期
- start_plan由来section移動のTaskMoved v3同期
- 日付またぎTaskMoved、order同期、target_order_task_ids対応
- safe_stoppedと全イベント反映ON/OFFの分離
- index.json stale時のwarning diagnosticsとMarkdown正の明確化
- Bridge送受信診断・復旧UI

## 重要な運用原則

- Taskchute日付Markdownが正データ。
- index.jsonは再構築可能キャッシュ。
- Ackは保存後検証成功時のみ。
- 未検証・失敗イベントを跨いでcursorを進めない。
- TaskUpdatedとTaskMovedの意味をcoalesceで潰さない。

## 未完了・残リスク

- 長時間運用、モバイル復帰、圏外復旧の追加確認
- diagnostics保持期間・上限とdata.json肥大化対策
- Bridge診断UI文言の整理
- Snapshot / Routine Bridge / Widget / Watchは本RC1の対象外

## 確認

詳細は`Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`を参照する。
