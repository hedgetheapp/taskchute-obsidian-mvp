# TaskChute Bridge v6.5 RC2 Regression Checklist

作成: 2026-06-14 JST  
ステータス: v6.5 RC2固定候補チェックリスト

## Static Check

- [ ] `node --check .\main.js`

## PC 2 Vault確認済み主要経路

- [ ] dev -> remote TaskCreated
- [ ] dev -> remote TaskUpdated
- [ ] dev -> remote TaskMoved v3
- [ ] TaskCompleted
- [ ] Uキー開始前戻し
- [ ] 手動開始時刻クリア
- [ ] 通常削除
- [ ] create直後delete
- [ ] 全件削除snapshot
- [ ] TaskDeleted missing target冪等判定

## TaskStarted開始時セクション移動

- [ ] `started_at` のUTC ISOをローカル時刻へ変換してセクション判定する
- [ ] 開始時刻に対応するセクションへ移動してから開始する
- [ ] セクション移動が発生する場合、`TaskMoved -> TaskStarted` の順でenqueueされる
- [ ] `TaskMoved` sourceが `task-start-section-move-confirmed-markdown-v3` になる
- [ ] `TaskStarted` payloadの `section_id` / `section` / `section_label` が保存後Markdownの物理位置と一致する
- [ ] 行コメントの `section` / `section_id` が物理見出しと一致する
- [ ] remote側でも同じセクションで実行中になる
- [ ] 保存後検証成功時のみAckされる
- [ ] false-appliedが発生しない
- [ ] cursor飛ばしが発生しない

## Delete

- [ ] 通常削除がremoteへ反映される
- [ ] create直後deleteで `TaskCreated -> TaskDeleted` が送信される
- [ ] create直後delete後、remote側で対象entryが最終的に消える
- [ ] 全件削除で削除件数ぶんTaskDeletedがenqueueされる
- [ ] 全件削除でlive entries / DOM削除後反復による取りこぼしがない
- [ ] TaskDeleted missing targetでentry_idありpayloadはknownEntryIdsのみで既知判定される
- [ ] TaskDeleted missing targetでentry_idなし旧payloadのみknownTaskIds fallbackされる
- [ ] task_idだけ既知・entry_id未知は `missing_target_task_id_only_rejected_entry_id_required` で未Ack側へ回る

## TaskCreated Guard

- [ ] 新規作成直後のTaskUpdatedがTaskCreatedより先にD1へ出ない
- [ ] 新規作成直後のTaskMovedがTaskCreatedより先にD1へ出ない
- [ ] 新規作成直後のTaskDeletedで `TaskCreated -> TaskDeleted` が保たれる
- [ ] 既存タスクが既知集合未登録だけで誤停止されない
- [ ] `task_id` 単独で別entryを既知扱いしない

## Start / Reset

- [ ] TaskStarted受信でTaskBoard rowが開始状態になる
- [ ] TaskStarted受信でLog開始ログが保存される
- [ ] TaskStarted受信でLogDaily開始ログが保存される
- [ ] TaskStarted受信でruntime.runningが保存される
- [ ] TaskStarted保存後検証成功時のみAckされる
- [ ] TaskStarted false-appliedが発生しない
- [ ] Uキー開始前戻しがremoteへ反映される
- [ ] 手動開始時刻クリアがremoteへ反映される
- [ ] 開始前戻し後、runtime.runningが解除される
- [ ] 開始前戻し後、Log / LogDailyが整合する

## Diagnostics

- [ ] diagnostics保持上限が適用される
- [ ] protected-aware pruneが働く
- [ ] failed_unackedが削られない
- [ ] unknown_eventが削られない
- [ ] verified=false相当が削られない
- [ ] safe_stopped系が削られない
- [ ] outboxがprune対象にならない
- [ ] cursorがprune対象にならない
- [ ] API設定がprune対象にならない
- [ ] applied event ID履歴がdiagnostics扱いで削られない

## Skipped

- [ ] TaskStoppedはUI未実装のため、今回のRC2 PC 2 Vault運用試験では正式対象外として扱う

## Final RC2 Confirmation

- [ ] README / AGENTS / docsへRC2差分が反映されている
- [ ] release noteが `docs/release/taskchute-bridge-v6.5-rc2.md` に存在する
- [ ] regression checklistが `docs/regression/bridge-v6.5-rc2-checklist.md` に存在する
- [ ] `docs/bridge/task-started-and-reset.md` に開始時セクション移動仕様が明記されている
- [ ] RC1からRC2への差分がTaskStarted開始時セクション不整合修正であることが明確になっている
