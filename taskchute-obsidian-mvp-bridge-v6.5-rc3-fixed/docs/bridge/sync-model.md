# TaskChute Bridge Sync Model

作成: 2026-06-14 12:28:11 JST
ステータス: v6.5 RC1 docs反映用

## Source of Truth

TaskChute Bridgeは、Obsidian Vault上のMarkdownを正とする。

- 日付・セクション・順序・実行状態: `Taskchute/YYYY-MM-DD Taskchute.md`
- タスク定義: `Taskchute/Tasks/*.md`
- 再構築可能キャッシュ: `Taskchute/_system/index.json`
- 設定・runtime・outbox・cursor・diagnostics: `data.json`
- イベントログ: D1 `events`
- 端末別適用済み管理: D1 `applied_events`

## Sync Flow

Bridge同期は以下の流れで動く。

1. local端末がMarkdown変更またはUI操作からBridgeイベントを生成する。
2. outboxへイベントを積む。
3. sync-apiへ送信し、D1 `events` へ保存する。
4. 他端末がpending eventsをpullする。
5. 他端末がMarkdown / runtime / Log / LogDailyへapplyする。
6. 保存後検証に成功した場合のみAckする。
7. Ack済みイベントはD1 `applied_events` に端末別で記録される。

## Safety Principles

v6.5 RC1では、同期安全性を優先し、以下を固定する。

- Ackは保存後検証成功時のみ
- false-applied禁止
- cursor飛ばし禁止
- Task identityは原則 `task_id + entry_id`
- apply失敗イベントをapplied扱いにしない
- missing targetは安全側に判定する
- diagnostics pruneは保護対象を残す

## Cursor Rule

cursorは、未適用イベントを飛ばすために進めてはいけない。

applyに失敗したイベント、保存後検証に失敗したイベント、または未Ack側へ回すべきイベントがある場合は、cursorだけを先に進めない。

## Ack Rule

Ackは、実際にMarkdown / runtime / Log / LogDailyなどの保存結果が検証できた場合のみ行う。

特にTaskStarted、TaskDeleted、開始前戻し系TaskUpdatedは、UI上の見た目だけでAckしない。

## Runtime / data.json Rule

`data.json` は正データではないが、Bridge動作に必要な以下を保持する。

- Bridge設定
- runtime状態
- outbox
- cursor
- diagnostics
- applied event ID履歴

`data.json`肥大化対策を行う場合でも、outbox / cursor / API設定 / applied event ID履歴をdiagnostics扱いで削除してはいけない。
