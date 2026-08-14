# Current Behavior Specification

## 文書の扱い

この仕様は`v0.6.56`を基準とし、canonical docs checkpointは`c08bfca0b4fb7793eca1f096d7ae18c447ec01af`である。v0.6.56はdocs/release metadataのみのreleaseで、実行挙動はv0.6.54 / commit `f8842d0`と同一である。過去文書と食い違う場合でも、ここではコード上の事実を優先する。意図や保証範囲をコードから確定できない箇所は「要確認」とする。

## 1. アプリ起動

1. pluginはObsidianの`loadData()`から設定・runtime・Bridge状態を読む。
2. 必要なdefault・migration・diagnostics pruneを適用する。
3. 9種類のItemViewと設定tab、commands、Vault watcher、wake / mobile resume watcherを登録する。
4. `openTaskBoardOnStartup`が有効ならlayout ready時にTaskBoardを開く。
5. base foldersを確認し、必要に応じてBridge auto flushとmobile resume pull kickをscheduleする。

根拠: `TaskchutePlugin.onload()` (`main.js:10402`)。

## 2. TaskBoardデータ形式

日付ノートの既定pathは`Taskchute/YYYY-MM-DD Taskchute.md`である。本文は概ね次の構造を持つ。

```markdown
# YYYY-MM-DD Taskchute

## Tasks

### 午前

- [ ] [[T-0001_title|title]] <!-- tc: entry_id=E-... section_id=morning ... -->

## Log

## LogDaily

## Comments
```

task行はwiki link targetから`task_id`、aliasから表示title、`tc` commentから`entry_id`と各種metadataを読む。`parseTasks()`は`## Tasks`内だけを対象にする (`main.js:5667`)。

## 3. Task identity

- task定義のIDは`task_id`。
- TaskBoard上の個別配置・実行単位は`entry_id`。
- 原則のidentityは`task_id + entry_id`。
- 同一task_idが複数entryとして同一日または別sectionへ存在し得る。
- entry_idがあるイベントでtask_idだけを根拠に別entryをAckしてはならない。
- 古いpayloadでentry_idがない場合だけ、限定的なtask_id fallbackが残る。

## 4. Task作成

- 通常追加、section先頭追加、現在行の下への追加、割り込み追加を提供する。
- 新規taskにはtask noteと日付noteのentry行を作成する。
- task noteの既定pathは`Taskchute/Tasks/{file_base}.md`。
- Bridge有効時はTaskCreatedをoutboxへ追加する。
- TaskCreated未送信の高速更新は、可能な項目をpending TaskCreatedへmergeする。
- inbound TaskCreatedは同じentry_idの複数行、または別task_idによるentry_id占有をcollisionとして未Ack停止する。

## 5. Task更新

- title、見積、予定時刻、実績時刻、section、project、mode、category、area、client、priority、notes、links等を更新できる。
- title更新は日付note alias、task note YAML title、heading、必要時task note filenameを整合させる。
- start_plan変更で物理sectionが変わる場合、値変更のTaskUpdatedと位置変更のTaskMovedを別イベントとして扱う。
- inbound通常TaskUpdated title変更は保存後にalias、YAML title、headingを検証してからAckする。
- occurrence-only TaskUpdatedはRoutine定義やfuture occurrenceを変更せず、同じroutine_occurrence_keyの行だけを変更する。

## 6. Task移動・並び順

- PC / mobileのD&D、上下移動、section移動、日付移動を提供する。
- Markdownの物理sectionと行順がboard positionの正である。
- TaskMoved v4は`target_order_entry_ids`と必要時`source_order_entry_ids`を使用する。
- v4ではentry orderが正で、task_id配列は診断・旧互換用である。
- v4 entry配列が不正な場合はv3へ黙って降格せず未Ack停止する。
- v3以前はtask_id順を使用するが、同じsectionにduplicate task_idがある場合は安全停止する。
- source sectionが移動後に空になる場合、v4の空`source_order_entry_ids`を許可する。

## 7. 実行lifecycle

### 開始

- task rowへ開始状態・開始実績を反映する。
- runtime.runningを作る。
- 日付noteのLogとLogDailyへrunning行を保存する。
- started_atからlocal sectionを判定し、必要ならTaskMovedをTaskStartedより先に送る。

### 中断・再開

- runtime.pausedへsessionを保持する。
- TaskPaused / TaskResumedをBridge対象とする。
- 再開時は通常開始とは別の検証経路を使う。

### 完了

- task rowをcheckedにし、終了実績とdone logを保存する。
- 同じexec_id / occurrence key / entry_idに対応するactive running logをLogとLogDailyから閉じる。
- running logが複数一致するなどidentityが曖昧な場合はBridge Ackしない。

### 割り込み

- 実行中taskをinterruptedとして停止する。
- interrupting taskへ`is_interrupt`とinterrupted task identityを記録する。
- 元taskのcontinuation entryを作成できる。
- Routine occurrenceのcontinuationは元entryのRoutine metadataを引き継ぐ。

## 8. コメント・リンク・サブタスク

- コメントはtimestampとcomment_idを持つthreadとしてtask noteのCommentsへ保存する。
- BridgeはTaskCommentAddedのみをイベント化する。編集・削除のBridge仕様はコード上に見つからないため要確認。
- 関連リンクはtask noteの所定sectionから読み書きし、Obsidian linkまたはURLを開ける。
- 通常taskのsubtaskはtask noteの`## Subtasks`へ保存する。
- Routine taskはtask noteをtemplateとし、当日のcheck状態をRoutineLogへ保存する。

## 9. Project / Mode / Category / Area / Client

- ProjectとModeは専用設定viewと定義noteを持つ。
- Category / Area / Clientは定義noteを自動作成し、ID付きmetadataで管理する。
- Bridgeでは各定義のCreated / Updated / DeletedをTaskイベントより前提として送受信する。
- Priorityはtask属性だが独立定義イベントを持たない。
- project nameとproject_idの完全な役割分離は未完了。現行互換ルールの確定は要確認。

## 10. Section

- sectionは`id`、`name`、`start`、`end`、`color`、`icon`、`order`を持つ。
- 初期値は午前、午後、夜、自由時間。
- 設定viewで追加、更新、削除、並び替えができる。
- BridgeはSectionCreated / Updated / Reordered / Deletedを同期する。
- task位置の正はsection定義のrepresentative情報ではなく日付Markdownの物理見出しである。
- `section_id`と表示labelの完全正規化仕様は要確認。

## 11. 通常Routine

- task note frontmatterをRoutine定義として使用する。
- enabled、repeat rule、期間、予定時刻、見積、section、属性、subtask template、order等を保持する。
- daily、weekday、interval、month day等のrule helperが存在する。全組合せの保証範囲は要確認。
- 対象日表示時またはcommandでRoutine entryを生成する。
- current occurrence keyは`routine:{routine_id}:{YYYY-MM-DD}`で、title、time、section、estimateを含めない。
- 同じoccurrence keyが存在すると重複生成しない。
- master変更時は、当日以降の未実行・未完了・非running・非paused等の保護対象外entryだけ再整合する。
- 今回のみskip / cancel / deleteはRoutineHistoryへ記録し、再生成を防ぐ。

## 12. Rotation Routine

- 複数menuを順番に生成するローカル機能を持つ。
- definitionは`data.json`の`rotationRoutines`に保持する。
- 生成結果と履歴は通常Routineと同じTaskBoard / RoutineHistory基盤を利用する。
- Bridge同期は明示的対象外。

## 13. Routine TaskCreatedとsafe rekey

- inbound通常Routine TaskCreatedで、同じoccurrence keyかつ同じentry_idなら冪等Ackできる。
- 同じoccurrence keyでentry_idが異なる場合、そのままAckしない。
- 既存entryが未開始・未完了・非削除・execution log参照なしで、payload entry_idが未使用の場合だけrekeyを許可する。
- rekey後はVaultを再読込し、task_id、entry_id、occurrence key一致を確認してからAckする。
- payload entry_idが別taskに使用されていれば`entry_id_collision`として未Ack停止する。
- `creation_source=interrupt-continuation`等の明示continuationは、同じoccurrence keyの別entry作成を許可する。

根拠: `inspectTaskCreatedRoutineRekeySafety()` (`main.js:2048`) と `applyBridgeInboundTaskCreatedEvent()` (`main.js:17132`)。

## 14. Bridge protocol

### 送信

- local operationからeventを`data.json`内outboxへenqueueする。
- auto flushまたは手動flushが`POST /events`へ送る。
- retry上限、batch上限、debounce、coalesce、supersedeを持つ。
- 送信前にVault / settingsを再読込してpayloadをrefreshするイベントがある。

### 受信

- `GET /events/pending`をcursor付きで取得する。
- `server_sequence ASC, event_id ASC`で処理する。
- event registryがvalidate、resolve、apply、post-save verify、before-Ack guardを管理する。
- 成功時だけ`POST /events/{event_id}/applied`を呼ぶ。
- failed_unacked、unknown event、unsupported version、保存後検証失敗ではAckせずcursorを進めない。

### mobile resume

- hidden中はpending fetch / apply / Ackを開始しない。
- visible復帰後にdeferred drainを再開する。
- in-flight、write in progress、network error、空pending到着遅延に対するretry / watch windowがある。
- OSによりprocess自体が停止している期間の保証は要確認。

### API server

clientが使用するendpointは`/events`、`/events/pending`、`/events/{id}/applied`である。server実装・D1 schemaはこのrepositoryに含まれないため詳細は要確認。

## 15. 保存と履歴

- 日付TaskBoard・task note・definition noteはVault Markdownへ保存する。
- plugin settings、runtime、outbox、cursor、diagnosticsはObsidian plugin `data.json`へ保存する。
- 端末固有UI状態とdevice IDの一部は`localStorage`へ保存する。
- `.taskchute/board-history/{date}`へ変更前snapshotを保存する。
- `.taskchute/routine-history/{YYYY-MM}.json`へRoutine occurrence statusを保存する。
- `Taskchute/_system/index.json`は再構築可能cacheであり正本ではない。

## 16. 未確定仕様

- Bridge server / D1 schemaとretention。
- comment編集・削除の端末間同期。
- project_id全面移行の最終形。
- section label正規化の最終規則。
- v0.6.56を本番版とみなす条件。
- Widget、Watch、MCP/API、外部calendarの仕様。
