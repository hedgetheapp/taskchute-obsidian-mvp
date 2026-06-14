# TaskChute Bridge v6.4 RC1 リリース候補化チェックリスト

## 文書・変更範囲

- [ ] 整理版仕様書、引継ぎ、回帰試験チェックリスト、仕様整理マップを正本として固定
- [ ] README / AGENTS / Codex運用手順が正本と矛盾しない
- [ ] 旧追補・診断メモ・過去Codex指示を履歴扱いとして明記
- [ ] `main.js`単一ファイル運用を維持
- [ ] 配布物に`data.json`、`src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json`を含めない

## 静的確認

- [ ] `node --check .\main.js`
- [ ] API token / Authorization header / API URL全文 / payload_json全文 / data.json全文が診断へ出ない
- [ ] Ack条件、cursor進行、applied_events記録条件を緩めていない

## 必須回帰

- [ ] TaskCreated / TaskUpdated / TaskMoved / TaskDeleted
- [ ] TaskStarted / TaskStopped / TaskCompleted
- [ ] TaskCommentAdded
- [ ] start_plan直接入力
- [ ] start_plan由来TaskMoved v3
- [ ] 通常section移動・order変更・日付またぎ移動
- [ ] Section定義先行同期
- [ ] safe_stopped解除と全イベント反映ON維持
- [ ] index stale warningでTaskMovedを止めない
- [ ] false-appliedなし

## 運用確認

- [ ] 長時間運用
- [ ] モバイル復帰
- [ ] 圏外・通信失敗後のretry
- [ ] outbox drainと残件診断
- [ ] diagnostics保持件数・肥大化リスク確認
- [ ] dev / remote双方で未適用イベントとcursor blockを確認

## リリース判定

- [ ] 未解決の高危険度不具合なし
- [ ] 未実施項目と残リスクをリリースノートへ記載
- [ ] 本番投入前の最終バックアップ・復旧手順確認
