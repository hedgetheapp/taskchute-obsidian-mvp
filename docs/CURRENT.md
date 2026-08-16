# Current Project Status

## 調査基準

- 調査日: 2026-08-15
- manifest version: `0.6.63`
- branch: `feature/v6.6-routine-sync`
- canonical docs checkpoint: `v0.6.63` tag target
- release tag: `v0.6.63`（BRAT実機試験用Prerelease。release commitはtag targetを参照）
- release準備開始時のworktree: clean
- 構文確認: `node --check .\main.js` 成功

この文書は実ファイル、Git履歴、既存docsから確認した現在地を記録する。実装の存在、試験配布、実機試験済みであることは分けて扱う。v0.6.63はsame-section D&Dのsource/targetをexact entryと物理Markdown見出しから再解決し、reload後のruntime section fieldsに依存しないBRAT実機試験用Prereleaseであり、Verified済み安定版ではない。

## 文書運用

- 現行仕様と現在地はcanonical 6文書を正とする。
- release/version単位の変更履歴はroot [`CHANGELOG.md`](../CHANGELOG.md)を参照する。
- 現行versionの検証状態は[`TEST_MATRIX.md`](TEST_MATRIX.md)を正とする。
- 過去versionの詳細資料は[`archive/`](archive/README.md)へ保存し、現行仕様の根拠には使わない。

## Delivery state

- **Integrated**: main反映済み。実機確認未完了の場合がある。
- **Prereleased / Test-distributed**: Integratedなcommitを新規tagとGitHub Prereleaseの固定assetsとして試験配布済み。実機確認未完了でもよい。
- **Verified**: ユーザー実機確認済みで、current evidenceを`TEST_MATRIX.md`へ反映済み。
- **Released**: Verifiedな配布物を安定配布対象として公開済み。

main反映、実装完了、syntax check、BRAT Prerelease公開だけではVerifiedまたはReleasedとしない。BRAT試験ではPrereleaseを先に固定配布し、同一assetsの実機証跡を後からTEST_MATRIXへ記録できる。公開済みtag / Release / assetsは差し替えず、不具合は次versionで修正する。詳細は[`DEVELOPMENT_WORKFLOW.md`](DEVELOPMENT_WORKFLOW.md)を参照する。

## 現在の開発状況

アプリ本体とBridge同期は広範囲に実装済みである。Bridgeの基礎部分はv6.5 RC3でdev / remote / mobile三端末スモークを通過した記録がある。その後、v0.6.16以降にRoutine同期、Routine occurrence、TaskMoved v4、lifecycle identity、割り込みcontinuation、safe rekeyが追加された。

v0.6.55公開後に`CURRENT.md`、`FEATURES.md`、`SPEC.md`、`ARCHITECTURE.md`、`DECISIONS.md`、`TEST_MATRIX.md`の6文書をcanonical documentation baselineとして固定した。READMEとdocs索引も現行入口へ更新した。v0.6.56はこのbaselineとversion metadataをBRAT配布versionとして固定する。v0.6.42からv0.6.54の個別試験結果にはrepository内で統合証跡になっていないものがあり、未確認項目は引き続き試験不足として扱う。

v0.6.57では、Auto Flush実行中にenqueueされたeventのwake-up要求を保持し、終了後に送信可能なpending eventが残る場合だけ再scheduleする。synthetic scheduler checkは成功しているが、AF-LWU-01からAF-LWU-03の実Vault端末間試験は未実施である。

v0.6.58では、inbound server Ackとlocal cursor persistenceを分離し、Ack済みeventをMarkdownへ再適用しないcursor-only reconciliation、bounded Ack retry、recoverable mobile rescueを追加した。ACK-CURSOR-GUARD-01、ACK-AMBIG-01、ACK-AUTH-01、CURSOR-GAP-01、CURSOR-MERGE-01、MOBILE-RESCUE-01相当のsynthetic / structural試験は成功しているが、実Vault / 実mobile試験は未実施である。

v0.6.58実機試験ではAF-LWU-01がPASSした一方、TMV4-BASIC-01はdevのMarkdown並び替え成功後にTaskMovedが1件も生成されずFAILした。v0.6.59ではD&D操作の移動前entry順と保存後entry順を明示的に比較し、保存後検証成功後にD&D専用sourceでTaskMoved v4を1件enqueueする。v0.6.59 syntheticはPASSしているが、実Vault再試験は未実施である。

v0.6.59実機試験では、空sectionへ`task-insert-section-top`で作成した`T-0593 / E-20260815-0011`を即renameした際、D1にはseq 2184 TaskCreated（title=`新規タスク`）だけが到達し、TaskUpdatedは0件だった。`task-insert-below`のT-0594 / T-0595はTaskUpdatedまでremote / mobile appliedだった。調査により、Auto Flushが保持するTaskCreated送信snapshotと元outboxのpending表示が分離し、snapshot refresh後のrenameが元eventへのmerge成功扱いでTaskUpdatedを省略できる競合を確認した。v0.6.60はflush対象event IDをruntimeで追跡し、対象中TaskCreatedのrenameをTaskUpdatedへhandoffする。focused syntheticはPASSしているが、実Vault再試験は未実施である。

v0.6.60実機試験ではTC-RENAME-SECTION-TOP-01がPASSし、A `T-0602 / E-20260815-0020`、B `T-0603 / E-20260815-0021`、C `T-0604 / E-20260815-0022`の連続create→renameもtitle伝播、identity、remote / mobile appliedまでPASSした。一方、D&D開始前のdev物理MarkdownはC / A / B、remote / mobileはA / B / Cだった。`insertTaskAfterKey()`がselected targetを常にprotected集合へ加え、通常Bの下へのCもsection top scannerへrerouteしたlatent bugが原因である。v0.6.61はexplicit insert-belowと「下にコピー」だけtargetの人工的protected化を止め、実際のcompleted / running / paused保護は維持する。TMV4-BASIC-01はD&D未開始のためv0.6.60ではBLOCKEDであり、v0.6.61のinsert order確認後に再開する。

v0.6.61実機試験ではT-0614 / E-20260815-0032のsame-section D&D detection、Markdown保存、保存後order検証、enqueue attemptまで成功したが、`enqueueBridgeTaskMoved()`が`markdown_section_mismatch`でfalseを返した。expected / physical / index sectionは`morning`、row section resolutionは`__no_section__`だった。コード確認ではrow commentに明示`__no_section__`があったのではなく、`task-insert-below`行の`section` / `section_id`欠落を`getSectionByNameOrId("")`がno-section definitionへfallbackした結果だった。v0.6.62はsame-section D&D保存前に欠落metaをphysical headingから補完し、row `section_id`が物理sectionと一致する場合だけ欠落・古いlabelを正規化して、保存後にentry_idで再読込検証する。明示section ID不一致の一般guardは維持する。

v0.6.62実機試験では通常C `T-0624 / E-20260815-0042`のA/B/C→C/A/B D&Dがdevで`drag_drop_enqueue_succeeded`まで到達し、section / physical / resolved IDは`morning`だった。ただしremote / mobile / D1最終確認は未完了でPASS確定しない。missing metadata B `T-0623 / E-20260815-0041`はreload後にgrab/drop gestureが成立してもcommitされず、`drag_drop_section_identity_blocked`、`physical_section_unresolved`、`enqueue_attempted=false`となった。filter stateは空で、試験前backupでもB rowのsection metadataは欠落していた。コード確認では画面add formが通る`addTask()`だけがv0.6.62でも`estimate_min`しかrowへ保存しておらず、欠落行を作り得た。v0.6.63はcurrent Markdownからexact source/target entryの物理見出しを解決し、generic add rowにもsection metadataを保存する。

v0.6.63実機試験では、午後sectionのA `T-0625 / E-20260815-0043`、B `T-0626 / E-20260815-0044`、C `T-0627 / E-20260815-0045`を使用したTMV4-BASIC-01がPASSした。Cのsame-section D&Dはdev物理Markdownと三端末UIをC/A/Bへ揃え、D1 seq 2284のTaskMoved v4がremote / mobile appliedになった。続くTMV4-SECTION-HANDOFF-01もPASSし、controlled missing metadata化したB rowはreload後D&Dで`section=午後 section_id=afternoon`へ補完され、D1 seq 2285がremote / mobile applied、三端末UIはB/C/Aになった。same-section系のcurrent PASSはこの2ケースであり、v0.6.63全体をVerified扱いしない。

v0.6.63のTMV4-CROSS-SECTION-01もPASSした。generic add formで午後へ作成したT-0628 / E-20260816-0001はdev physical rowへ`section=午後 section_id=afternoon`を保存し、午後→午前D&D後は`### 午前`直下で`section=午前 section_id=morning`になった。D1 seq 2298のTaskMoved v4はfrom=`afternoon`、to=`morning`でremote / mobile applied、三端末UIは午前で一致した。TASK-ADD-SECTION-META-01はdev physical evidenceのみPASSであり、remote / mobileのphysical row metadataは未確認のためoverall `NOT_VERIFIED`を維持する。v0.6.63全体もVerifiedへ昇格しない。

TMV4-EMPTY-SOURCE-01もcurrent PASSとなった。T-0629 / E-20260816-0002を夜（`night`）から午後（`afternoon`）へD&Dし、sourceの夜sectionを空にした。dev / remoteは夜task count=0、fixtureは午後で`section=午後 section_id=afternoon`、mobileもfixtureは午後で夜に存在しない。D1 seq 2301のTaskMoved v4は`source_order_entry_ids=[]`、source entry count=0、target order=`[E-20260816-0002]`でremote / mobile appliedだった。

TMV4-DATE-MOVE-01もcurrent PASSとなった。T-0630を2026-08-16 / E-20260816-0003から2026-08-17 / E-20260817-0001へ移動し、三端末でsource日から消失、destination日の午後に1件だけ存在することを確認した。task_idとtask noteは維持し、board occurrenceのentry_idだけをdestination date用identityへrekeyした。D1 seq 2303のTaskMoved v4はfrom/beforeに旧ID、to/afterとtop-levelに新IDを保持し、remote / mobile appliedだった。同一task_id複数entryのcurrent実機証跡は未完了のためTaskMoved複合行とv0.6.63全体は引き続き`NOT_VERIFIED`とする。

## 実装済み

### ローカルTaskChute機能

- 日付別TaskBoardの表示・作成・編集・削除・コピー・複数選択・並び替え。
- タスクの開始、完了、中断、再開、割り込み開始とcontinuation作成。
- 見積、開始予定、実績時刻、project、mode、category、area、client、priority、sectionの編集。
- コメント、関連リンク、サブタスク、右サイドペイン、モバイルカード内詳細。
- 通常Routine、Rotation Routine、RoutineLog、RoutineHistory、休日・営業日判定。
- Board履歴、undo / redo、設定バックアップ・復元、index再構築、整合性診断、one-click repair。

主な根拠: `TaskchutePlugin` (`main.js:10401`)、`TaskchuteView` (`main.js:38507`)、task mutation群 (`main.js:31616`以降)。

### Bridge同期

- TaskCreated / TaskUpdated / TaskMoved / TaskDeleted。
- TaskStarted / TaskStopped / TaskPaused / TaskResumed / TaskCompleted。
- TaskCommentAdded。
- Project / Mode / Category / Area / Client / Section定義同期。
- RoutineCreated / RoutineUpdated / RoutineReordered / RoutineDeleted。
- RoutineOccurrenceSkipped / Cancelled / Deleted。
- outbox、auto flush、pending pull、inbound apply、保存後検証、Ack、cursor、安全停止、diagnostics。
- mobile hidden中のdrain延期とvisible復帰後の再開。

受信イベントregistryは`main.js:16253`以降、各apply本体は`main.js:17132`以降にある。

### v0.6.48からv0.6.54の追加実装

- 通常TaskUpdatedの物理Markdown未反映false Ack防止 (`611e4f5`)。
- lifecycleイベントへのRoutine identity混入防止 (`0a53b6a`)。
- 同一task_id・異なるentry_idを区別するTaskMoved v4 (`fcb8543`)。
- 割り込みLifecycle Log metadataとrunning cleanup (`c6bedae`)。
- TaskMoved v4でsource sectionが空になる場合の許可 (`8e4e0d5`)。
- Routine interrupt continuationのRoutine metadata保持 (`9b3c36f`)。
- Routine TaskCreatedのentry_id collision検出とsafe rekey (`f8842d0`)。

## 開発途中・試験不足

次はコード上は実装済みだが、現行HEADを対象とする統合試験結果がリポジトリに記録されていない。

- v0.6.56 safe rekeyの実Vault回帰。実行コードはv0.6.54と同一で、過去データ混在により現在保留。
- v0.6.57 Auto Flush lost wake-upのAF-LWU-02 / AF-LWU-03実Vault回帰。AF-LWU-01はv0.6.58でPASS証跡あり。
- v0.6.58 inbound Ack / cursor recoveryの実mobile回帰。
- generic add formのdev row metadata保存はT-0628で確認済み。remote / mobileのphysical row metadataは未確認。
- v0.6.61 explicit insert-below物理順とTC-RENAME-SECTION-TOP / SEQUENCEをv0.6.63で回帰する。
- TaskMoved v4の同一task_id複数entryに対するv0.6.63実Vault回帰。section移動、日付移動、empty-sourceはcurrent PASS済み。
- v0.6.48からv0.6.56をまとめた三端末full regression。
- TaskMoved v4の同一task_id複数entryとcoalesceの組合せ試験。
- normal / routine / interrupt continuationのlifecycle identity回帰。
- Routine定義同期とRoutine occurrenceの三端末同時起動・オフライン復帰試験。
- TaskCommentAdded、Section、Category / Area / Clientのv0.6.56上での回帰。
- mobile長時間hidden、OS強制停止、通信断・圏外復帰。

`docs/archive/v6.6/routine-sync-regression-checklist-v1.md`は全項目未チェックのため、コードが存在することだけをもって試験済みとは扱わない。

## 未完了と思われる箇所

- `main.js:17348`に旧Routine duplicate guardが`if (false && ...)`として残る。到達不能だが削除されていない。
- `TaskLinksModal` (`main.js:7579`) は定義以外の参照が見つからない。現在のリンクUIはpopover / menu経路を使用しているため、未使用候補。削除可否は要確認。
- v6.6の旧詳細仕様・引継ぎ・回帰チェックリストはv0.6.16からv0.6.17時点の記述を含む。現行統合文書と併読する場合はHistorical資料として扱う。
- 汎用自動テスト基盤は存在しない。`tests/`にはv0.6.59 TaskMoved D&D、v0.6.60 create/rename handoff、v0.6.61 insert-below order、v0.6.62 section handoffのfocused Node testだけがある。
- `projectNoteMeta`は名前キー中心の互換層を残す。`project_id`中心への全面移行は未実装と既存docsに記載されている。

## TODO

優先度順:

1. `TEST_MATRIX.md`を運用し、cleanな試験identityでsafe rekey以外のfull regressionを先に実施する。
2. safe rekey用の隔離された試験データを用意して再試験する。
3. mobile長時間・通信断復帰試験を行う。
4. `section_id`と`section_label`の表示名揺れを調査する。
5. 到達不能な旧duplicate guardと未使用候補クラスを、回帰試験後に整理する。
6. 旧v6.6詳細仕様と回帰手順を、現行統合文書を参照する形へ段階的に整理する。

## 現在確認できる問題点

- 現行統合文書はv0.6.63へ整合したが、旧詳細資料には過去versionの記述が残る。
- occurrence keyについて、古い仕様書の時刻入り形式と現行の日付のみ形式が併存する。
- Routine変更時の生成済み行の扱いも、古い「更新しない」と現行の「保護対象以外を再整合」が併存する。
- 巨大な単一`main.js`に全責務が集中し、影響範囲の静的把握が難しい。ただし配布物を単一`main.js`とすること自体は現行の明示方針。
- 実装済み機能の大半に自動テストがなく、実Vault試験への依存が高い。
- 本番導入は既存文書上で保留のまま。v0.6.63は実機試験用Prereleaseであり、本番可否は要確認。

## 将来候補・明示的対象外

- Rotation RoutineのBridge同期。
- RoutineHistory全体同期。
- Android Widget。
- Pixel Watch / Watch連携。
- 外部カレンダー連携。
- 専用MCPサーバー・外部操作API。

これらは未実装だが、現行v6.6の欠陥ではなく将来候補または対象外として記録されている。
