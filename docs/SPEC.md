# Current Behavior Specification

## 文書の扱い

この仕様はimmutable `v0.6.77` BRAT Prerelease（peeled target `8e263f14e8b07382c9639add09a9fd052708e826`）を基準とし、公開済みtag / Release / assetsは固定する。v0.6.77のfocused syntheticはPASSしたが実Vault未検証であり、plugin全体 / full matrixも`NOT_VERIFIED`で、Verified / Releasedではない。過去文書と食い違う場合でも、ここではコード上の事実を優先する。意図や保証範囲をコードから確定できない箇所は「要確認」とする。

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
- 通常追加、section先頭、現在行の下、コピーで作る日付note行には作成時から`section` / `section_id`を保存する。
- explicitな「下にタスクを追加」と「下にコピー」は、通常targetを人工的なprotected keyにせず、選択target直下へ物理Markdownを保存する。
- target自体がcompleted、running、pausedとして保護対象なら、既存どおりprotected block直後へ挿入する。section先頭追加は既存placementを維持する。interrupt continuationはこの保護規則へ降格せず、exact anchor `entry_id`の直後という専用placementを使う。
- 作成時のphysical orderとvisual orderを同じ挿入結果から構築し、order修復目的のTaskMovedは生成しない。
- task noteの既定pathは`Taskchute/Tasks/{file_base}.md`。
- Bridge有効時はTaskCreatedをoutboxへ追加する。
- v0.6.71以降に新規生成するordinary TaskCreatedは、local作成保存後にdate noteを再読込し、exact `task_id + entry_id`と物理sectionを一意確認してから、任意のplacement v1 contractをsnapshotへ含める。fieldsは`taskcreated_placement_version=1`、`placement_mode=after-entry|before-entry|only-in-section`、before/after時の`placement_anchor_entry_id`である。
- captureは同sectionの実保存後task順を使い、直前entryがあれば`after-entry`、なければ直後entryの`before-entry`、両方なければ`only-in-section`とする。UI intent、`creation_source`、task IDだけの推定、index cacheはplacement authorityにしない。
- inbound v1はanchorを同一date・同一physical sectionでexact entryとして一意解決し、その直前または直後へ挿入する。`only-in-section`はfresh apply前にsectionが空の場合だけ許可する。保存後にnew rowのexact identity、row metadata、physical section、隣接anchorまたはsection内唯一性を再読込検証し、registry検証後にだけAckする。
- v1のexact rowが既存ならduplicateは作らず、identityとplacement relationの両方を検証する。存在だけでは冪等Ackしない。不一致rowを自動移動せず未Ack停止する。
- placement versionなしはbounded `legacy_taskcreated_placement_fallback` diagnostic付きで従来のordinary section insertionを維持し、exact orderを保証しない。未知version、invalid mode、anchor欠落・重複・別section、non-emptyな`only-in-section`、保存後placement不一致はlegacyへ降格せず未Ack停止する。
- placement contractはcreation-time snapshotである。rename merge、flush中TaskUpdated handoff、Vault refresh、retry/outbox cloneは既存v1 fieldsを再計算・除去しない。後続の実移動はTaskMovedで表し、初期order修復用の補正TaskMovedは生成しない。
- `creation_source`はordinary createの操作・診断metadataでありplacement instructionではない。`interrupt-continuation`は既存のspecialized exact-anchor lifecycle contractを維持し、ordinary v1へ推測変換しない。
- TaskCreated未送信の高速更新は、可能な項目をpending TaskCreatedへmergeする。
- rename時に同一identityのTaskCreatedが現在のflush送信snapshot対象なら、元outboxがpending表示でもmergeしない。同じ`task_id + entry_id`のTaskUpdatedを追加する。
- TaskCreatedがflush対象外のpending / retry可能failedならtitleとfileをTaskCreatedへmergeし、既存Auto Flushをwakeする。TaskCreated不在は既送信相当としてTaskUpdatedを追加する。
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
- TaskMoved v4のgeneric send-preflightはpayload entry orderとcurrent physical orderのstrict equalityを維持する。
- interrupt lifecycleでTaskMovedの後にexact matchingするsendableな`creation_source=interrupt-continuation` TaskCreatedが1件だけ存在する場合、send-preflightはcurrent target orderからそのcontinuation entryだけを一時除外したprojected orderをTaskMoved発生時点のorderとしてstrict比較する。payload order自体は書き換えない。
- projectionは`taskmoved_payload_source=task-start-section-move-confirmed-markdown-v3`のinterrupt start section moveに限定する。TaskCreatedの後続logical clock、同一date / target section、`continuation_after_entry_id == TaskMoved.entry_id`、exact anchor / continuation entry/task identity、物理隣接、送信可能statusをすべて満たす場合だけ許可する。候補なし・重複・不一致・他の余分なrowがある場合はgeneric strict比較へ戻り、不一致なら送信しない。
- v4ではentry orderが正で、task_id配列は診断・旧互換用である。
- v4 entry配列が不正な場合はv3へ黙って降格せず未Ack停止する。
- v3以前はtask_id順を使用するが、同じsectionにduplicate task_idがある場合は安全停止する。
- source sectionが移動後に空になる場合、v4の空`source_order_entry_ids`を許可する。
- 日付移動はtask definition identityの`task_id`を維持し、destination date note上のboard occurrenceには新しい`entry_id`を割り当て得る。sourceとdestinationの`entry_id`が同一である必要はない。
- TaskMoved date-change payloadは`from` / `before`にsource側の旧`entry_id`、`to` / `after`とtop-level `entry_id`にdestination側の新`entry_id`を保持する。
- date-changeの`source_order_entry_ids`と`target_order_entry_ids`は、それぞれsource / destination date noteを保存後に再読込した物理identityを正とする。
- inbound date-changeは旧`entry_id`でsource occurrenceを解決し、destination行を新`entry_id`へ書き換える。Ack前にsource旧entryの消失、destination新entryの存在、task_id、section/orderを再検証する。旧entryだけを移動後の固定主キーとして扱わない。
- 同一sectionのtask-row D&Dは、移動前のentry/task順と保存後Markdownのentry/task順を明示的に取得する。順序が変わった場合だけ、保存後検証成功後に`task-drag-reorder-confirmed-markdown-v4`のTaskMovedを1件enqueueする。
- 同一section D&D payloadは移動前の`source_order_entry_ids` / `source_order_task_ids`と移動後の`target_order_entry_ids` / `target_order_task_ids`を保持する。orderが同じno-opではTaskMovedを生成しない。
- D&Dのsourceとrow drop targetはcurrent Markdownからexact `entry_id`で一意解決し、それぞれの物理見出しをsource/destination sectionの正とする。reload後のruntime task `section` / `sectionId`が空でも、この物理contextが一致すればsame-section D&Dを続行する。
- same-section D&Dのmoved rowに`section_id`がない場合、物理見出しを正として`section` / `section_id`を補完し、保存後に同じ`entry_id`を再読込して`task_id`、物理section、row section identityを検証する。
- row metadataの明示`section_id`が`__no_section__`または別sectionで物理見出しと矛盾する場合は正規化せず、一般`markdown_section_mismatch` guardでTaskMoved enqueueをblockする。row `section_id`が物理sectionと一致する場合に限り、欠落・古いsection labelを正規化する。`__no_section__`をwildcardとして扱わない。
- same-dateの単一task D&D履歴は、exact `task_id + entry_id`、before / after section、entry/task orderを保持する。Ctrl+Z / Ctrl+Y / Ctrl+Shift+Zは復元前にcurrent source stateを、復元後にtarget stateをMarkdownから検証し、成功時だけ逆向きまたは再実行のTaskMoved v4をenqueueする。
- TaskChute shortcut ownershipはTaskBoardのactive viewとevent target / active elementを確認する。TaskBoard内の非テキストcontrol、row、board containerではCtrl+Z / Ctrl+Y / Ctrl+Shift+Zをcapture-phaseで1回だけconsumeし、TaskChute Undo / Redo gatewayへrouteする。textarea、text input、select、contenteditable、TaskBoard外のeditor / modal / menuではconsumeせずObsidian/nativeへpass-throughする。
- TaskMoved semantic lifecycleがactiveな間のTaskBoard Undo / Redo shortcutはgatewayがconsumeしてblockする。native/editor Undoへfall-throughしてlocal Markdownだけを変更してはならない。
- supported D&DのUndo captureはoperation IDとbatch IDを持つ。timer、履歴表示、別操作capture、Undo / Redo開始などの通常経路はsemantic未付与batchをcommitできない。exact operation、task / entry、before / after order fingerprintが一致するsemanticを付けたD&D経路だけがbatchをcommitできる。
- forward TaskMoved同期後はsemantic build / attach / commitに加え、exact operation ID / batch ID / semantic fingerprintを持つactionがUndo stack topに1件だけ存在することを検証する。成立した場合だけ通常のUndoable D&D成功とする。
- semantic handoffを証明できない場合、操作開始後に追加されたexact pre-D&D file snapshotに一致するsemanticless actionだけを除去し、topへ明示barrierを置いてlocal-only Undoを拒否する。操作開始前の履歴とforward TaskMoved eventは維持し、操作は通常成功として返さない。
- TaskBoardのrow drop、section-container / empty-section drop、mobile quick dragは、共通D&D dispatch gatewayでsource key、target key / section、drop position、selection modeを分類してからmutation helperへ渡す。single-task same-date routeはrow / section targetのどちらでも同じoperation-scoped lifecycleとhistory-top invariantを満たす必要がある。
- `selectedTaskId`はentry ID形式を取り得る。single-task routeはexact source `entry_id`を維持し、`task_id`だけへ縮退してrouteやsemantic targetを選ばない。複数選択routeは明示的に別分類し、single-task contractの成立を推測しない。
- same-section Undo / Redoは`source_order_entry_ids`を正とし、duplicate task IDがあってもentry identityを維持する。cross-sectionも保存後のphysical headingとrow metadata一致を必須とする。
- exact forwardが未送信かつactive flush snapshot外と証明できる場合だけforward / inverseをnet-zeroとしてsend対象外にできる。active flush中・送信済み・状態不明ならforwardを変更せず、より後のlogical clockでinverseを追加する。
- net-zeroは`task_id + entry_id`、from / to、entry order、task orderが完全な逆関係で、候補が1件だけの場合に限る。非exact・複数候補・欠落fieldでは既存eventをcoalesceせず、Undo / Redo eventを後続追加する。
- 保存後検証またはTaskMoved enqueueが失敗した場合は、可能な限り直前snapshotへrollbackして履歴stackも操作前へ戻す。rollback自体が失敗した場合は成功表示せず、local変更とBridge未同期を明示する。
- arbitrary snapshot diffによるBridge event生成は行わない。TaskCreated / Deleted、lifecycle、Routine definition、日付移動rekeyのUndo / Redo同期はv0.6.68対象外で`NOT_VERIFIED`である。

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
- 元taskのcontinuation identityはTaskStopped時に予約するが、board行はinterrupting taskのtask-start section移動が完了して最終物理配置を確認した後に作成する。
- continuationはcurrent Markdown上のinterrupting `entry_id`を一意解決し、その同一物理section内の直後へ配置する。row `section` / `section_id`は物理見出しと一致させる。
- 保存後にinterrupt taskとcontinuationのexact `entry_id`、task identity、同section、隣接順、row metadataを再読込検証し、成功した場合だけinterrupt-continuation TaskCreatedをenqueueする。
- inboundの明示interrupt-continuation TaskCreatedは`continuation_after_entry_id`を必須とし、payload dateのMarkdown上でexact entryを一意解決できた場合だけその直後へ挿入する。anchor欠落・重複・task identity不一致・section不一致では保存せず、同じsection・隣接順・row metadataを保存後検証してからAckする。
- 開始時section移動がない場合も同じ最終配置検証を行う。section移動・保存・TaskMoved enqueueが確定しない場合、continuation行自体を作成せず、未確認のTaskCreatedも送信しない。
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
- auto flush実行中の新しいflush要求は破棄せずpending wake-upとして保持する。
- active flush終了後、送信可能なpending eventが残る場合だけdebounceとmin intervalを守って再scheduleする。
- max retry到達済みfailed eventまたはsuperseded eventだけが残る場合は再scheduleしない。

### 受信

- `GET /events/pending`をcursor付きで取得する。
- `server_sequence ASC, event_id ASC`で処理する。
- event registryがvalidate、resolve、apply、post-save verify、before-Ack guardを管理する。
- 保存後検証成功時だけ`POST /events/{event_id}/applied`を呼ぶ。
- HTTP 2xxは`serverAcked=true`として扱い、後続のlocal cursor保存失敗をserver Ack失敗へ戻さない。
- inbound Ack cursorは専用trusted persistenceで最新data.jsonへmergeし、sequenceを後退させず、acked sequenceをunionし、他設定やoutboxを古いsnapshotで巻き戻さない。
- Ack responseがnetwork error等で曖昧な場合はbounded retryし、なお不明ならrecoverable recordとしてserver状態のreconcileを待つ。401 / 403はhard failureとする。
- server Ack済みと確認できたeventはMarkdownへ再適用せず、cursor-only reconciliationを行う。
- failed_unacked、unknown event、unsupported version、保存後検証失敗ではAckせずcursorを進めない。

### mobile resume

- hidden中はpending fetch / apply / Ackを開始しない。
- visible復帰後にdeferred drainを再開する。
- recoverableなAck / cursor停止はserver Ack状態とcursorをreconcileしてからruntimeをenabledへ戻し、pending drainを再開する。

### inbound UI refresh / idle resume

- elapsed idle durationはTaskChute UI invalidation authorityではない。30秒以上のfocus / visibility復帰や30分以上後のfirst interactionだけを理由にdisk reload / view refreshしない。
- focus / visibility / resume / first interactionはfreshness checkを起動できるが、relevant data generationとlast rendered generationが一致し、Bridge-applied dirty stateもない場合のTaskBoard refresh countは0とする。
- relevant TaskChute Markdown、Routine history、表示に影響するplugin dataのexternal changeはactual invalidationとしてgenerationを進める。`data.json`の通知だけではdirtyにせず、表示対象subsetの変更を比較してからgenerationを進める。cursor、outbox、diagnostics等の非表示系writeとunrelated Vault noteはinvalidation対象にしない。clickごとのVault全体hashは行わない。
- TaskBoardのrender済みgenerationは、`TaskchuteView.refresh()`が実際にauthoritative Vault Markdownを読み始めた時点のgenerationまでしか進めない。disk reloadだけ、`patchViews:false`、superseded / failed renderはgenerationをrender済みにしない。予約済みの遅延refreshはtimer発火時にもgeneration差を再確認し、既にcurrentならno-opにする。
- open中TaskBoardの内部保存と初回render後は、そのphysical fileのstat/content baselineを即時更新する。focus復帰後のpollでmtime/sizeだけが変わり内容fingerprintが同一なら`view_already_current`としてrefreshしない。内容が異なるrelevant Markdown changeは従来どおりactual invalidationにする。
- current viewのinvalidation authorityは、open board、そのboardにloadedされたtask definition、Routine historyのexplicit visible dependency baselineとする。baseline recordはexistenceを保持し、mapにないuntracked pathと、作成前のtracked-absent pathを区別する。
- untracked TaskChute pathのevent、およびtracked-present pathのcontentが同一なduplicate `create`はcurrent viewをinvalidateしない。tracked-absentからpresent、tracked-presentのcontent差、delete / renameはactual visible changeとして最大1回のrefreshへcoalesceできる。
- window focus / visibility returnでは既存TaskChute view instanceを再利用し、focusだけを理由に`setViewState`やview再生成を行わない。
- one physical Bridge catch-upはstartup / interval / focus / resumeの重複kickoffと複数pending passを1 UI refresh sessionへjoinする。active/queued drainへのkickoffは別follow-up sessionを予約しない。eventのfetch、apply、persist、post-save verify、Ack、cursor merge、安全停止は従来どおり個別・sequence順で行う。
- session内で成功したvisible mutationが0件ならfinal refreshは0回、1件以上ならopenかつvisibleなTaskBoardを最大1回だけrefreshする。safe-stop前の成功prefixは1回表示し、mutation前safe-stopは0回とする。
- TaskBoard viewがopenでなければ自動openしない。mobile hidden中はrenderせず、visible mutationのdirty generationを保持する。最初のeligibleなopen / visible renderはcurrent physical Markdownを読み、active inbound sessionが所有していなければ未消費generationを最大1回のfirst-open convergence refreshで消費する。
- finalizerはactive apply/save/verify operationが0になるまで実行せず、visible mutationがある場合だけauthoritative full refreshを1回行う。このrefreshはviewのrefresh generationを進め、先行refreshの古いsnapshotが後から描画することを防ぐ。
- final UI refreshの例外はdiagnosticへ記録するが、既にapply / verify / Ack済みのeventやcursorを巻き戻さない。
- plugin inbound write由来のVault eventはinternal-write guardとactive refresh sessionでcoalesceし、Bridge apply→Vault listener→refreshのfeedback loopを作らない。
- in-flight、write in progress、network error、空pending到着遅延に対するretry / watch windowがある。
- OSによりprocess自体が停止している期間の保証は要確認。

### API server

clientが使用するendpointは`/events`、`/events/pending`、`/events/{id}/applied`である。server実装・D1 schemaはこのrepositoryに含まれないため詳細は要確認。cacheやlocal diagnosticが失われた過去のambiguous Ackを任意に確認するapplied-status endpointは現行client契約にないため、そのcold recoveryは要確認。

## 15. 保存と履歴

- 日付TaskBoard・task note・definition noteはVault Markdownへ保存する。
- plugin settings、runtime、outbox、cursor、diagnosticsはObsidian plugin `data.json`へ保存する。
- 端末固有UI状態とdevice IDの一部は`localStorage`へ保存する。
- `.taskchute/board-history/{date}`へ変更前snapshotを保存する。
- セッション内Undo / RedoはVault fileとplugin data snapshotを使う。TaskMoved意味論を持つsnapshot復元ではplugin-data save queue内でcurrent Bridge namespaceとTaskCreated / TaskMoved order diagnosticsを再mergeし、outbox、cursor、logical clock、Ack / retry / Auto Flush状態を古いsnapshotで巻き戻さない。通常UI設定などBridge外の状態はsnapshot復元対象のままとする。
- `.taskchute/routine-history/{YYYY-MM}.json`へRoutine occurrence statusを保存する。
- `Taskchute/_system/index.json`は再構築可能cacheであり正本ではない。

## 16. 未確定仕様

- Bridge server / D1 schemaとretention。
- comment編集・削除の端末間同期。
- project_id全面移行の最終形。
- section label正規化の最終規則。
- v0.6.65のinterrupt lifecycle TaskMoved projection、Routine continuation、TaskMoved v4同一task_id複数entryというtargeted scopeはcurrent実Vault / 実mobile証跡でPASSした。plugin全体をVerified / stable Releasedとみなす条件は、残る`TEST_MATRIX.md`の`NOT_VERIFIED` / `BLOCKED`範囲を含めて要確認である。
- Widget、Watch、MCP/API、外部calendarの仕様。
