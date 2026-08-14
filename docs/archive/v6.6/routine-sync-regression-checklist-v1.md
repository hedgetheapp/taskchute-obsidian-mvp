# 試験チェックリスト: Taskchute Bridge v6.6 Routine同期 v1

## 事前確認

- [ ] 作業ブランチが `feature/v6.6-routine-sync` である
- [ ] `node --check .\main.js` が成功する
- [ ] `main.js` 以外の意図しない変更がない
- [ ] `data.json` がgit差分に入っていない
- [ ] API tokenがgit差分に入っていない
- [ ] Vault内Taskchuteデータがgit差分に入っていない

## 端末構成

対象端末:

- dev
- remote
- mobile

確認対象:

- Routine定義
- Routine由来タスク
- Bridge pending/apply/ack
- mobile BG/hidden復帰drain

## Routine定義同期

### dev起点

- [ ] devでRoutineを作成する
- [ ] `RoutineCreated` がenqueueされる
- [ ] remoteにRoutineが作成される
- [ ] mobileにRoutineが作成される
- [ ] 重複Routineが作成されない

### remote起点

- [ ] remoteでRoutineタイトルを変更する
- [ ] `RoutineUpdated` がenqueueされる
- [ ] devに変更が反映される
- [ ] mobileに変更が反映される
- [ ] 古い更新が後着しても巻き戻らない

### mobile起点

- [ ] mobileでRoutineを無効化する
- [ ] `RoutineUpdated` がenqueueされる
- [ ] devで無効化される
- [ ] remoteで無効化される
- [ ] 無効化後に未来タスクが生成されない

## Routine削除

- [ ] devでRoutineを削除する
- [ ] `RoutineDeleted` がenqueueされる
- [ ] remoteでRoutineが削除済みになる
- [ ] mobileでRoutineが削除済みになる
- [ ] 生成済みタスクは削除されない
- [ ] 対象が既にないRoutineDeletedを再受信してもエラーにならない

## Routine並び替え

- [ ] remoteでRoutine順序を変更する
- [ ] `RoutineReordered` がenqueueされる
- [ ] devで同じ順序になる
- [ ] mobileで同じ順序になる
- [ ] 未知Routine IDが混ざっても既知分が壊れない

## Routine由来タスク生成

### 単一端末

- [ ] enabled Routineから対象日付のタスクが生成される
- [ ] 生成タスクに `generated_by_routine_id` が付く
- [ ] 生成タスクに `routine_occurrence_key` が付く
- [ ] 同じ日付で再生成しても二重生成されない

### 三端末同時起動

- [ ] dev/remote/mobileを同時起動する
- [ ] 同じRoutine由来タスクが二重生成されない
- [ ] pending/apply後も1件に収束する
- [ ] `routine_occurrence_already_exists` または重複Ackログで追跡できる

### オフライン復帰

- [ ] 片端末をオフラインにする
- [ ] 別端末でRoutine由来タスクを生成する
- [ ] オフライン端末を復帰させる
- [ ] Routine由来タスクが重複しない
- [ ] 受信TaskCreatedが `routine_occurrence_key` で冪等Ackされる

## Routine由来タスクの通常操作

- [ ] Routine由来タスクを手動でタイトル変更できる
- [ ] 変更が通常 `TaskUpdated` として同期される
- [ ] Routine由来タスクをセクション移動できる
- [ ] 移動が通常 `TaskMoved` として同期される
- [ ] Routine由来タスクを完了できる
- [ ] 完了が通常更新として同期される
- [ ] Routine由来タスクを削除できる
- [ ] 削除が通常 `TaskDeleted` として同期される
- [ ] Routine再生成で手動編集済みタスクが上書きされない

## 既存同期の回帰試験

- [ ] 通常TaskCreatedが同期される
- [ ] 通常TaskUpdatedが同期される
- [ ] 通常TaskMovedが同期される
- [ ] 通常TaskDeletedが同期される
- [ ] SectionCreated / Updated / Deleted / Reorderedが従来通り動く
- [ ] Category / Area / Client同期に影響しない
- [ ] mobile BG/hidden復帰drainが従来通り動く

## D1確認例

必要に応じて、イベント種別を確認する。

```powershell
cd E:\Programing\git-dev\taskfulness\services\sync-api
npx wrangler d1 execute taskfulness-sync-db --remote --command "SELECT event_id, event_type, device_id, server_sequence, created_at, json_extract(payload_json, '$.routine_id') AS routine_id, json_extract(payload_json, '$.routine_occurrence_key') AS routine_occurrence_key FROM events WHERE user_id = 'dev-user' ORDER BY server_sequence DESC LIMIT 30;"
```

Routine系だけ見る場合:

```powershell
cd E:\Programing\git-dev\taskfulness\services\sync-api
npx wrangler d1 execute taskfulness-sync-db --remote --command "SELECT event_id, event_type, device_id, server_sequence, created_at, json_extract(payload_json, '$.routine_id') AS routine_id, payload_json FROM events WHERE user_id = 'dev-user' AND event_type IN ('RoutineCreated','RoutineUpdated','RoutineDeleted','RoutineReordered') ORDER BY server_sequence DESC LIMIT 50;"
```

## RC化判定

以下を満たすまでRC化しない。

- [ ] Routine定義同期が三端末で安定
- [ ] Routine由来タスクの二重生成が発生しない
- [ ] 既存Task同期の回帰なし
- [ ] mobile復帰drainの回帰なし
- [ ] `node --check .\main.js` 成功
- [ ] 配布assetsルールを満たす
