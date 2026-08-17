# Current Project Status

## 調査基準

- 調査日: 2026-08-17
- manifest version: `0.6.71`
- branch: `feature/v6.6-routine-sync`
- canonical docs checkpoint: v0.6.71 TaskCreated exact placement integrated candidate
- latest release tag: `v0.6.70`（immutable BRAT実機試験用Prerelease。tag target `26ae1c2ff4efb5a4d07c6cb553234b7bf506cdfe`。公開済みtag / Release / assetsは固定。v0.6.71 tagは未作成）
- 構文確認: `node --check .\main.js` 成功

この文書は実ファイル、Git履歴、既存docsから確認した現在地を記録する。実装の存在、試験配布、実機試験済みであることは分けて扱う。v0.6.70はimmutable BRAT Prereleaseとして試験配布済みで、TaskBoard D&Dのtargeted実機試験にはPASS証跡がある。一方、通常TaskCreatedのsection-top作成ではsenderが先頭、remote / mobileが末尾となる実機FAILが確認された。v0.6.71は作成後Markdownの物理隣接entryからversioned placement contractを構築し、受信側もexact placementを保存後検証してからAckする。syntheticはPASSだが未配布・実機未検証であり、plugin全体 / full matrixも`NOT_VERIFIED`である。

## 文書運用

- 現行仕様と現在地はcanonical 6文書を正とする。
- release/version単位の変更履歴はroot [`CHANGELOG.md`](../CHANGELOG.md)を参照する。
- 現行versionの検証状態は[`TEST_MATRIX.md`](TEST_MATRIX.md)を正とする。
- 過去versionの詳細資料は[`archive/`](archive/README.md)へ保存し、現行仕様の根拠には使わない。

## Delivery state

| State | v0.6.71 |
|---|---|
| Integrated | Yes |
| Prereleased / Test-distributed | No |
| Verified | No |
| Released | No |

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

v0.6.63のinterrupt実機試験では、original T-0635 / E-20260816-0008をinterrupt task T-0636 / E-20260816-0009で停止し、continuation T-0635 / E-20260816-0010を作成した。continuation TaskCreated seq 2325はinterrupt taskが開始前にいた午後を保持し、その後seq 2326でinterrupt taskだけが午前へ移動したため、三端末の最終状態でcontinuationだけ午後へ残った。v0.6.64候補は停止処理でcontinuation identityだけを予約し、interrupt taskの開始時section移動確定後にfinal physical entry直後へ行を作成する。保存後にexact entry、同section、隣接順、row metadataを再検証してからTaskCreatedをenqueueする。focused syntheticはPASSだが実Vaultは`NOT_VERIFIED`である。

v0.6.64実機試験ではfinal placement自体は成功した。original T-0638 / E-20260816-0012、interrupt T-0639 / E-20260816-0013、continuation T-0638 / E-20260816-0014は最終的にafternoonでinterrupt直後・row metadata一致となり、`interrupt_continuation_final_placement_verified`も記録された。一方、logical clock 1021のTaskMovedはcontinuation作成前のtarget order `[E-0012,E-0013]`を保持し、後続1022 TaskCreatedがE-0014を物理追加した後のsend-preflightでcurrent order `[E-0012,E-0013,E-0014]`と不一致になりfailedとなった。TaskCreatedと1023 TaskStartedもpendingに残ったため、INTERRUPT-CONTINUATION-FINAL-PLACEMENT-01は`FAIL`、TMV4-MULTI-ENTRY-01は`NOT_RUN`、v0.6.64全体は`NOT_VERIFIED`である。v0.6.65はexact後続continuationが1件だけ一致する場合に限りE-0014をcurrent orderから一時投影除外し、TaskMovedのintermediate orderをstrict検証する。

v0.6.65実機試験ではINTERRUPT-CONTINUATION-FINAL-PLACEMENT-01がPASSした。original T-0641 / E-20260816-0016、interrupt T-0642 / E-20260816-0017、continuation T-0641 / E-20260816-0018はafternoonでこの順に隣接した。D1 seq 2358 TaskStopped、2359 TaskMoved、2360 TaskCreated continuation、2361 TaskStartedはremote / mobile appliedで、三端末の物理順と最終sectionが一致した。

v0.6.65のUNDO-BRIDGE-CROSS-SECTION-01はFAILだった。T-0647 / E-20260816-0024をafternoonからnightへD&Dしたforward TaskMovedはD1 seq 2383 / event `ce3baf78-5d5e-4523-857d-116b16955226`としてremote / mobile appliedになったが、Ctrl+Zはdev snapshotだけをafternoonへ戻し、reverse TaskMovedを生成しなかった。remote / mobileはnightに残った。v0.6.66候補はD&D履歴へbefore / afterのexact entry orderとsectionを保存し、Undo / Redoの復元前後にMarkdownを検証して通常のTaskMoved v4をenqueueする。same-date cross-section / same-section D&Dだけが対象で、実機は未確認である。

v0.6.66実機試験でもUNDO-BRIDGE-CROSS-SECTION-01はFAILした。T-0648 / E-20260816-0025のafternoon→morning forward TaskMovedはD1 seq 2386 / event `c2863685-ada9-4fb8-8090-7c0661e16741`としてremote / mobile appliedになったが、Ctrl+Z後はdevだけafternoonへ戻り、remote / mobileはmorningに残った。inverse TaskMoved、`task-undo-confirmed-markdown-v4`、`net_zero=true`はいずれも観測されず、Undo後のredoStack actionは`hasSemantic:false`だった。契約上の原因は、Ctrl+Zが消費したsnapshotに`bridgeTaskMovedSemantic`がなかったことである。コード上はv0.6.66のcapture guardが650ms timerだけを延期し、await中の通常commit / Undo開始をoperation identityで拒否していなかった。v0.6.67はD&D batchをoperation-scopedにし、semanticless commitを禁止する。

v0.6.67実機試験でもUNDO-BRIDGE-CROSS-SECTION-01はFAILした。T-0650 / E-20260816-0026のafternoon→morning forward TaskMovedはD1 seq 2392 / event `806ddfc4-fc55-47fa-b3dd-0d5ea1f1d676`としてremote / mobile appliedになった。Ctrl+Z後、dev physicalはafternoonへ戻ったがremote / mobileはmorningに残り、inverse TaskMovedは0件だった。配布asset hashとloaded runtime functionを確認済みでstale runtimeではなく、single-task route条件からgroup D&Dも除外された。コード上のrouting defectは、capture-phase keydown handlerがCtrl+Z判定より先に`isEditableEventTarget()`を実行し、TaskBoard上のbuttonもeditableとしてreturnした点である。この場合eventをconsumeせずObsidian local Undoへ渡し、TaskChute semantic Undoを呼ばない。v0.6.68候補はshortcut ownershipを汎用button guardより先に判定し、TaskBoard非テキストcontextだけをexactly onceで所有する。

v0.6.68実機試験ではrouting自体は成功したが、UNDO-BRIDGE-CROSS-SECTION-01は再びFAILした。T-0651 / E-20260816-0027のforward TaskMovedはD1 seq 2396 / event `3a69bd85-bdc3-4858-8ddc-35245b1beb17`としてremote / mobile appliedとなった。Ctrl+ZはTaskChute-owned routeへ入りdevをafternoonへ戻したが、top actionはsemanticlessでinverse TaskMovedは0件、remote / mobileはmorningに残った。残存diagnosticだけではsemantic build / attach / commitのどのstageが失敗したか確定できないが、`moveTaskByDrag()`がその失敗を警告後も成功として返し、古いgeneric snapshotを利用可能なまま残し得ることをコード上で確認した。v0.6.69はsemantic付きactionのexact operation / batch / fingerprintとhistory topをcommit直後に検証し、失敗時はexact pre-D&D snapshotを除去して明示barrierを置く。

v0.6.69実機試験でもUNDO-BRIDGE-CROSS-SECTION-01はFAILした。fixture `undo-v069-cross-normal`のobserved entryはE-20260816-0028で、single selectionだった。D&D直後・Ctrl+Z前にactive operation / pending batchはnull、top actionはoperation ID / batch ID / fingerprint / semanticを持たないgeneric snapshotで、lifecycle / drag diagnosticsも空だった。Ctrl+Zは失敗前提検出後に意図的に実行していない。source traceではrow targetが`moveTaskByDrag()`へ入る一方、section-container / empty-section targetがlegacy `moveTaskToSectionByDrag()`へ入り、Markdownとforward TaskMovedを更新しながらoperation-scoped lifecycleを開始しないbypassを確認した。

v0.6.70はTaskBoardのrow / section / mobile quick dropを`dispatchTaskBoardTaskDrop()`へ集約し、routeをmutation前に診断する。section-target helperも最初のwrite前にoperationを開始し、forward TaskMoved後はrow helperと同じ`finalizeTaskMovedUndoSemanticHandoff()`でsemantic actionとhistory topを検証する。実際の`dropTaskBoardDrag()` callbackを通すrow / section testとfailure barrier testはPASSした。tag target `26ae1c2ff4efb5a4d07c6cb553234b7bf506cdfe`のimmutable BRAT Prereleaseとして試験配布済みで、後述のcross-section 3 route、same-section reorder、multi-entry exact-entry Undo / Redoには実Vault / remote / mobile PASS証跡があるが、plugin全体 / full matrixは`NOT_VERIFIED`である。

v0.6.70の`TASKCREATED-SECTION-TOP-ORDER-01`では、T-0667 / E-20260817-0015のTaskCreated seq 2462がremote / mobile appliedになったにもかかわらず、devはafternoon先頭、remote / mobileは末尾へ保存した。payloadにplacement anchor/order contractがなく、ordinary inboundが既存section末尾へgeneric insertしたことが原因である。date move操作はこのbaseline divergenceを確認した時点で開始しておらず、v0.6.70の`TMV4-DATE-MOVE-01`はTaskMoved FAILではなく`BLOCKED`とする。

v0.6.71はordinary TaskCreatedへ任意の`taskcreated_placement_version=1`、`placement_mode`、必要時`placement_anchor_entry_id`を追加する。senderはlocal save後にMarkdownを再読込し、同sectionの直前entryを優先、なければ直後entry、どちらもなければ`only-in-section`としてsnapshot化する。inboundはexact anchor / section / adjacencyまたはonly-row状態を保存後に再検証してからAckする。versionなしpayloadはbounded diagnostic付きlegacy fallback、未知versionは未Ack停止とし、既Ack済みv0.6.70 rowの自動修復や補正TaskMovedは行わない。focused testと既存standalone testsはPASSしているが、server round-tripと三端末実機試験は未実施である。

v0.6.70実機試験では、section / empty-section routeのT-0653 / E-20260816-0029、row routeのT-0654 / E-20260816-0030、empty night routeのT-0655 / E-20260816-0031がtargeted PASSとなった。3件ともCtrl+Z前にexact semantic action、operation ID、batch ID、fingerprint、history topを確認し、forward / Undo / Redo TaskMovedがD1 seq 2404〜2406、2409〜2411、2414〜2416としてremote / mobile appliedになった。Undo / Redo後はdev / remote physical sectionとmobile UIが収束した。これによりv0.6.69 failureは試験した3 routeについて解消したが、plugin全体 / full matrixは`NOT_VERIFIED`、Delivery StateはVerified=Noのままとする。

同じv0.6.70 assetsで`UNDO / REDO-BRIDGE-SAME-SECTION-01`もPASSした。afternoonのA T-0659 / E-20260817-0007、B T-0660 / E-20260817-0008、C T-0661 / E-20260817-0009をA/B/CからC/A/BへD&Dし、Ctrl+ZでA/B/C、Ctrl+YでC/A/Bへ戻した。Ctrl+Z前のhistory topはexact `task-moved-v4` semantic、operation / batch / fingerprint付きで、D1 seq 2436 / 2437 / 2438はforward / Undo / Redoとしてremote / mobile applied、三端末の物理/UI順が収束した。この試験ではroute/lifecycle diagnostics自体は取得されていないため、診断phaseの観測は保証に含めない。

`UNDO-BRIDGE-MULTI-ENTRY-01`もfresh v0.6.70 fixtureでPASSした。同じtask_id T-0662を持つoriginal E-20260817-0010とcontinuation E-20260817-0012がnightに共存する状態で、continuationだけをcontrol T-0664 / E-20260817-0013の下へ移動した。exact semantic history topと全TaskMovedはcontinuation E-0012を対象とし、original E-0010はその場に残った。D1 baseline 2450後のseq 2451〜2453はForward / Undo / Redo、2454〜2455は追加のUndo / Redo確認cycleで、全5件がremote / mobile applied、continuation E-0012のTaskMoved count=5、original E-0010は0だった。追加cycleだけから重複enqueue defectは推定せず、exact entry orderを正として三端末収束を確認した範囲をPASSとする。

この試験のForward部分は`TMV4-MULTI-ENTRY-01`のcurrent v0.6.70証跡としても独立にPASSとする。seq 2451 / event `6d679449-b1b1-4070-b020-8edefd8f0eef`はcontinuation T-0662 / E-20260817-0012だけを対象に、source task order `[T-0662,T-0663,T-0662,T-0664]`とtarget `[T-0662,T-0663,T-0664,T-0662]`のduplicate task IDを保持した。entry orderを正としてremote / mobile applied、三端末Forward順が一致し、original E-20260817-0010は位置を維持した。これはForward単体の証跡であり、後続Undo / Redoを通常TaskMoved PASSの前提にはしない。TaskMoved v4複合umbrellaは他componentのcurrent回帰が未完了のため`NOT_VERIFIED`を維持する。

同様に、v0.6.70 Undo / Redo試験のForward部分から通常TaskMoved v4のcurrent evidenceを独立して整理した。`TMV4-BASIC-01`はafternoonのA T-0659 / E-20260817-0007、B T-0660 / E-20260817-0008、C T-0661 / E-20260817-0009をA/B/C→C/A/Bへ並べ替えたseq 2436 / event `79ddc578-ec96-4ba1-b416-9c8728c9fe5d`を直接根拠にPASSとする。`TMV4-CROSS-SECTION-01`はT-0654 / E-20260816-0030をafternoon→morningへ移動したseq 2409 / event `180c1b3d-d38e-41ff-b048-803d4155ec47`を直接根拠にPASSとする。両eventはremote / mobile appliedで三端末Forward状態が収束しており、後続Undo / Redoは通常TMV4 PASSの前提にしない。SECTION-HANDOFF、DATE-MOVEのcurrent v0.6.70回帰とTaskMoved複合umbrellaは引き続き`NOT_VERIFIED`である。

`TMV4-EMPTY-SOURCE-01`もfresh v0.6.70 fixtureでcurrent PASSとなった。T-0665 / E-20260817-0014をmorning唯一のrowとしてdev / remoteのidentityとcount=1を同期後に再確認し、afternoon既存rowへD&Dした。seq 2458 / event `b3febced-e2f7-4736-a0fd-d1a3ec8c178f`はmorning→afternoon、`source_order_entry_ids=[]`、`source_order_task_ids=[]`でremote / mobile appliedとなり、matching TaskMoved countは1だった。dev / remote / mobileのmorningは0件、fixtureはafternoonに1件だけ存在し、重複なく収束した。初回remote未収束時にはD&Dを実施しておらず、試験FAILとは扱わない。これにより通常TaskMoved v4のcurrent PASSはBASIC、CROSS-SECTION、MULTI-ENTRY、EMPTY-SOURCEとなるが、SECTION-HANDOFF、DATE-MOVE、複合umbrellaは`NOT_VERIFIED`を維持する。

別のv0.6.65 fixtureでもTMV4-MULTI-ENTRY-01はPASSしていた。control T-0643 / E-20260816-0019を加え、同一task_id T-0641のoriginalを維持したままcontinuation E-20260816-0018だけをcontrol直下へD&Dした。D1 seq 2364 / event `23081df0-5c86-4e56-aa7b-86a7e1bf4bb4`のTaskMoved v4はduplicate task IDを保ったentry orderを使用し、remote / mobile applied、三端末が同一順へ収束した。このhistorical evidenceはv0.6.70 seq 2451のcurrent evidenceと区別して保持する。

Routine occurrence interrupt continuationもPASSした。T-0644のoriginal E-20260816-0020とcontinuation E-20260816-0022は`routine:T-0644:2026-08-16`、routine date / generated date、scheduled time 15:10、routine sourceを三端末で保持した。D1 seq 2373〜2376のlifecycle chainはremote / mobile appliedで、再評価後もoccurrence row countは2件のまま、第三の重複行は生成されなかった。これにより明示interrupt continuationの同一key・別entry作成もtargeted PASSとする。

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
- TaskMoved v4の同一task_id複数entryD&Dはv0.6.65でPASS。coalesce、日付移動との組合せ、その他entry-safe経路は引き続き要確認。
- v0.6.48からv0.6.56をまとめた三端末full regression。
- TaskMoved v4の同一task_id複数entryとcoalesceの組合せ試験。
- normal / routine / interrupt continuationのresume・completion・terminal logまで含むfull lifecycle回帰。v0.6.65では開始割り込みchainとRoutine metadata継承までPASS。
- Routine定義同期とRoutine occurrenceの三端末同時起動・オフライン復帰試験。
- TaskCommentAdded、Section、Category / Area / Clientのv0.6.56上での回帰。
- mobile長時間hidden、OS強制停止、通信断・圏外復帰。

`docs/archive/v6.6/routine-sync-regression-checklist-v1.md`は全項目未チェックのため、コードが存在することだけをもって試験済みとは扱わない。

## 未完了と思われる箇所

- `main.js:17348`に旧Routine duplicate guardが`if (false && ...)`として残る。到達不能だが削除されていない。
- `TaskLinksModal` (`main.js:7579`) は定義以外の参照が見つからない。現在のリンクUIはpopover / menu経路を使用しているため、未使用候補。削除可否は要確認。
- v6.6の旧詳細仕様・引継ぎ・回帰チェックリストはv0.6.16からv0.6.17時点の記述を含む。現行統合文書と併読する場合はHistorical資料として扱う。
- 汎用自動テスト基盤は存在しない。`tests/`にはv0.6.59からv0.6.70のTaskMoved、rename、insert-below、section handoff、physical context、interrupt continuation placement / preflight、same-date D&D Undo / Redo lifecycle / keyboard routing / actual DOM drop routeを対象とするfocused Node testがある。
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

- 現行統合文書はv0.6.65 post-prerelease evidenceへ整合したが、旧詳細資料には過去versionの記述が残る。
- occurrence keyについて、古い仕様書の時刻入り形式と現行の日付のみ形式が併存する。
- Routine変更時の生成済み行の扱いも、古い「更新しない」と現行の「保護対象以外を再整合」が併存する。
- 巨大な単一`main.js`に全責務が集中し、影響範囲の静的把握が難しい。ただし配布物を単一`main.js`とすること自体は現行の明示方針。
- 実装済み機能の大半に自動テストがなく、実Vault試験への依存が高い。
- 本番導入は既存文書上で保留のまま。v0.6.70は実機試験用BRAT Prereleaseで、synthetic route test、cross-section 3 route、same-section reorder、multi-entry exact-entry Undo / Redoの実機試験はPASSしたが、plugin全体は`NOT_VERIFIED`のため本番可否は要確認。

## 将来候補・明示的対象外

- Rotation RoutineのBridge同期。
- RoutineHistory全体同期。
- Android Widget。
- Pixel Watch / Watch連携。
- 外部カレンダー連携。
- 専用MCPサーバー・外部操作API。

これらは未実装だが、現行v6.6の欠陥ではなく将来候補または対象外として記録されている。
