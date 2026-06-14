# Taskchute Bridge 仕様メモ v6.5 RC3 FIXED

作成日: 2026-06-14
状態: v6.5 RC3 固定

## 固定判定

v6.5 RC3候補は、dev / remote / mobile の三端末起点で最終スモークを実施し、問題なしと判定した。

最終スモーク内容:

- dev起点: 新規作成 → タイトル変更 → 開始予定変更 → セクション移動 → 開始 → 完了 → 削除
- remote起点: 新規作成 → タイトル変更 → 開始予定変更 → セクション移動 → 開始 → 完了 → 削除
- mobile起点: 新規作成 → タイトル変更 → 開始予定変更 → セクション移動 → 開始 → 完了 → 削除

確認結果:

- 起点端末以外の2端末へUI反映される
- D1上で対象イベントが applied になる
- TaskStarted / TaskCompleted / TaskDeleted が送信される
- 完了済み削除では TaskDeleted に `delete_context=completed-task-delete` / `is_completed=1` が入る
- mobileのBG/hidden復帰を挟んでも反映漏れなし

## RC3で固定した主な仕様

### 1. mobile BG / hidden 復帰安定化

- mobile hidden中は pending fetch / apply / Ack を開始しない
- hidden中の network error は transient として扱う
- visible復帰時に deferred drain を再開する
- pending取得失敗と pending 0件を分離する
- pending取得失敗時は apply 本体を呼ばない
- watch-window retry後にdrain未開始の場合はdiagnosticsに理由を残す

主なphase:

- `bridge_mobile_resume_drain_deferred_hidden`
- `bridge_mobile_resume_watch_window_deferred_hidden`
- `bridge_mobile_resume_pending_fetch_deferred_hidden`
- `bridge_mobile_resume_network_error_while_hidden`
- `bridge_mobile_resume_network_error_deferred_until_visible`
- `bridge_mobile_resume_visible_recovery_started`
- `bridge_mobile_resume_visible_recovery_no_drain_started`
- `bridge_mobile_resume_watch_window_no_drain_started`

### 2. 開始予定変更によるsection自動移動

- `updateTaskEntryMetaField()` 共通経路で開始予定変更時にsectionを再解決する
- 対象行は `entry_id` 優先で一意解決する
- 探索範囲は日付Markdownの `## Tasks` 内に限定する
- section名ではなく `section_id` で移動要否を判定する
- 行コメントの `section / section_id` を正規化する
- 保存後Markdownを再読込し、開始予定・物理section・行コメントsectionを検証する
- section変更時のみ TaskMoved v3 をenqueueする
- TaskMoved source は `start-plan-section-move-confirmed-markdown-v3` を維持する

### 3. 実行状態イベント送信保護

- `TaskStarted / TaskStopped / TaskCompleted` が無言破棄される経路を撤廃する
- 保存後Markdownから `task_id + entry_id` を再解決する
- 物理sectionを正として `section_id / section_label` を正規化する
- 開始・停止・完了状態をenqueue前に検証する
- 実行イベントはappend-onlyとして保護する
- `TaskDeleted` 前のsupersede対象から実行イベントを除外する

### 4. 完了済みTaskDeleted送信修正

- 削除直前に `## Tasks` 内から `entry_id` 優先で対象を再解決する
- 物理section・完了状態をsnapshotへ保持する
- 削除後Markdownを再読込し、対象entry不在時のみenqueueする
- TaskDeleted共通enqueueでも削除後検証を実施する
- inbound apply中のTaskDeleted無言破棄を撤廃する
- `section_label / delete_context / is_completed` をpayloadへ追加する
- 完了済み削除では `delete_context=completed-task-delete` / `is_completed=1` を付与する

## 維持した安全条件

- Ack条件は緩めない
- cursor進行条件は緩めない
- 保存後検証を維持する
- false-applied防止を維持する
- 受信apply本体の安全条件を維持する
- D1 schemaは変更しない
- API token / API URL / payload全文など秘密情報をdiagnosticsへ出さない

## 既知の監視ポイント

- 一部payloadで `section_id=night` / `section_label=Afternoon` のような表示名揺れが見える場合がある。同期破綻の主因ではないが、今後section正規化の継続監視対象。
- mobile BG復帰系はRC3で安定化したが、長時間放置・OS強制停止・通信断復帰は別途長時間試験で確認する。

## 次フェーズ候補

- RC3長時間放置・再開試験
- RC3実運用スモーク
- section_id / section_label 表示名揺れの完全正規化
- Routine同期・Android Widget・Watch連携など次機能の設計継続
