# TaskChute Bridge v6.5 RC1 Regression Checklist

作成: 2026-06-14 12:28:11 JST
ステータス: v6.5 RC1回帰試験チェックリスト

## Static Check

- [ ] `node --check .\main.js`

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

## Final RC Confirmation

- [ ] README / AGENTS / docs反映後、仕様矛盾がない
- [ ] READMEからdocs導線が通っている
- [ ] AGENTSにCodex向け禁止事項が明記されている
- [ ] release note作成に進める状態である
