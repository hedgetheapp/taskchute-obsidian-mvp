# TaskChute Bridge v6.5 RC2 Release Notes

作成: 2026-06-14 JST  
ステータス: RC2固定候補 / PC 2 Vault運用試験後

## 1. 概要

TaskChute Bridge v6.5 RC2は、v6.5 RC1固定後のPC 2 Vault運用試験で検出した `TaskStarted` 開始時セクション不整合を修正したRC2固定候補です。

RC1固定後に `main.js` の同期挙動変更が入ったため、RC1のまま正式版へ進めず、RC2として再固定します。

## 2. RC1からの主差分

### TaskStarted開始時セクション移動

12:52 JSTにタスク開始したにもかかわらず、08:00-12:00相当の `morning / 午前` セクションに残る不整合を修正しました。

RC2では、タスク開始時に以下を保証します。

- `started_at` のUTC ISOをローカル時刻へ変換してセクション判定する
- 開始時刻に対応するセクションへ移動してから開始する
- セクション移動が発生する場合、`TaskMoved -> TaskStarted` の順でenqueueする
- `TaskMoved` sourceは `task-start-section-move-confirmed-markdown-v3`
- `TaskStarted` payloadの `section_id` / `section` / `section_label` は、古いtask/cacheではなく保存後Markdownを再読込してentry_idの物理位置から作る
- 行コメントの `section` / `section_id` も移動先に更新する

## 3. 確認済み

PC 2 Vault運用試験では以下を確認済みです。

- `node --check .\main.js` 成功
- dev -> remote TaskCreated
- dev -> remote TaskUpdated
- dev -> remote TaskMoved v3
- TaskStarted開始時セクション移動 修正後OK
- TaskCompleted
- Uキー開始前戻し
- 手動開始時刻クリア
- 通常削除
- create直後delete
- 全件削除snapshot
- TaskDeleted missing target冪等判定

TaskStarted開始時セクション移動の修正後確認:

```text
TaskCreated
TaskMoved   source = task-start-section-move-confirmed-markdown-v3
TaskStarted section_id = afternoon / section = 午後
remote applied 全件
```

## 4. スキップ項目

TaskStoppedはUI未実装のため、今回のPC 2 Vault運用試験では正式対象外としてスキップしました。

## 5. 維持する安全原則

RC2でも以下のv6.5原則を維持します。

- Markdown正
- `task_id + entry_id` identity
- 保存後検証成功時のみAck
- false-applied禁止
- cursor飛ばし禁止
- TaskDeleted missing target判定
- TaskCreated前提guard
- create直後delete
- 全件削除snapshot仕様
- TaskStarted Ack前検証
- Uキー開始前戻し / 手動開始時刻クリア同期
- diagnostics保持上限 / protected-aware prune

## 6. 残課題

正式版昇格前の残課題候補:

1. モバイル復帰試験
2. 圏外復旧試験
3. 長時間放置後pull確認
4. diagnostics保持上限の長時間観察
5. applied event ID履歴保持上限設計
6. Watch / Android widget / routine拡張

## 7. RC2固定判断

RC2は、RC1固定後に検出したTaskStarted開始時セクション不整合の修正を含む再固定候補です。

RC1は「文書反映後、PC 2 Vault運用試験中に不具合検出」、RC2は「TaskStarted開始時セクション不整合修正を含む候補」として扱います。
