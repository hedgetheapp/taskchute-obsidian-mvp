# Test Matrix

## 基準と読み方

- 対象release: v0.6.63 BRAT Prerelease
- canonical docs checkpoint: `v0.6.63` tag target
- v0.6.63はsame-section D&Dのsource/targetをexact entryと物理Markdown見出しから再解決し、reload後runtime section空でもhandoffする実機試験用version。
- この表は実装有無ではなく、実Vaultを使った保証状態を記録する。
- dev / remote / mobile列と`Status`列は、いずれもv0.6.63についての判定を示す。
- 過去versionのPASSは`Last verified version`と`Historical Evidence`へ記録し、現行列へ自動継承しない。
- チェックリストに項目が存在するだけ、コードが存在するだけ、構文確認だけではPASSにしない。
- Codexの実装完了、PRのmain反映、local helper test成功だけではcurrent `PASS`にしない。
- ユーザー実機確認後、対象version・端末・操作・物理状態をcurrent evidenceとして記録できた場合だけ`PASS`にする。

## Status

| Status | 意味 |
|---|---|
| `PASS` | 対象versionとtest caseについて、明示的な成功証跡がある。 |
| `FAIL` | 明示的な不合格証跡があり、未解消である。 |
| `BLOCKED` | 前提データや環境の問題で有効な試験を継続できない。 |
| `NOT_VERIFIED` | 実装は存在し得るが、対象versionの十分な実機証跡がない。 |
| `NOT_APPLICABLE` | 対象端末またはtest caseに適用されない。 |

## v0.6.58 Device Evidence

| Test case | Result | Evidence |
|---|---|---|
| AF-LWU-01 | `PASS` | `T-0586 / E-20260815-0004`。seq 2162 TaskCreated、2163 TaskUpdated、2164 TaskUpdatedがremote / mobileともapplied。手動flushなし。dev / remote / mobileの最終titleとUIが一致。 |
| TMV4-BASIC-01 | `FAIL` | A `T-0587 / E-20260815-0005`、B `T-0588 / E-20260815-0006`、C `T-0589 / E-20260815-0007`。devでCを同一section最下部から最上部へD&Dし、dev Markdown orderは更新。remote / mobileは未反映。payloadにE-20260815-0007を含むTaskMovedは0件、server_sequence > 2171かつdevice_id=devのTaskMovedも0件。outbound D&D TaskMoved enqueue欠落。 |

この証跡はv0.6.58についての判定であり、v0.6.59へ自動継承しない。

## v0.6.59 Device Evidence

| Test case | Result | Evidence |
|---|---|---|
| TC-RENAME-SECTION-TOP-01 | `FAIL` | A `T-0593 / E-20260815-0011`を空sectionへ`task-insert-section-top`で作成後、`tmv4-v659-basic-01-A`へ即rename。D1はseq 2184 TaskCreated（title=`新規タスク`）のみでTaskUpdatedは0件。remote / mobileも旧title。dev `data.json`にはidentity / TaskCreated diagnosticsはあるがrename後titleはない。比較のB `T-0594 / E-20260815-0012`とC `T-0595 / E-20260815-0013`は`task-insert-below`でTaskUpdatedあり、remote / mobile applied。 |
| TMV4-BASIC-01 | `BLOCKED` | A/B/Cのcreate/rename前提でAのtitle同期が失敗したため、v0.6.59のD&D修正を純粋に判定せずv0.6.60で再試験する。 |

この証跡はv0.6.59についての判定であり、v0.6.60へ自動継承しない。

## v0.6.60 Device Evidence

| Test case | Result | Evidence |
|---|---|---|
| TC-RENAME-SECTION-TOP-01 | `PASS` | 空sectionへの最初のtask作成直後renameがBridgeへ伝播し、remote / mobile appliedまで確認。 |
| TC-RENAME-SEQUENCE-01 | `PASS` | A `T-0602 / E-20260815-0020`、B `T-0603 / E-20260815-0021`、C `T-0604 / E-20260815-0022`。3件のrename伝播、`task_id + entry_id` identity、remote / mobile appliedを確認。 |
| INSERT-BELOW-ORDER-01 | `FAIL` | D&D前のdev物理MarkdownがC / A / B。remote / mobileはA / B / C。dev date noteにもT-0604 / T-0602 / T-0603の順で保存されており、visual A / B / Cと物理順が不一致。 |
| TMV4-BASIC-01 | `BLOCKED` | insert-below physical order regressionをD&D前に検出したため、D&D操作は未開始。v0.6.61でphysical order PASS後に再開する。 |

この証跡はv0.6.60についての判定であり、v0.6.61へ自動継承しない。

## v0.6.61 Device Evidence

| Test case | Result | Evidence |
|---|---|---|
| TMV4-BASIC-01 | `FAIL` | T-0614 / E-20260815-0032。同一section D&Dのorder detection、before / after entry order取得、Markdown保存、保存後order検証、`drag_drop_enqueue_attempted`までは成功。`enqueueBridgeTaskMoved()`はfalseで`drag_drop_enqueue_failed`。`reason_code=markdown_section_mismatch`、expected / physical / index section=`morning`、row section resolution=`__no_section__`。remote / mobileへD&D TaskMovedは伝播しなかった。 |

この証跡はv0.6.61についての判定であり、v0.6.62へ自動継承しない。

## v0.6.62 Device Evidence

| Test case | Result | Evidence |
|---|---|---|
| TMV4-BASIC-01 | `NOT_VERIFIED` | C `T-0624 / E-20260815-0042`。devでA/B/C→C/A/B、`drag_drop_move_detected`、`drag_drop_enqueue_attempted`、`drag_drop_enqueue_succeeded`、section / physical / resolved ID=`morning`を確認。remote / mobile / D1最終確認が未完了のためPASSにしない。 |
| TMV4-SECTION-HANDOFF-01 | `FAIL` | B `T-0623 / E-20260815-0041`。row section metadataなし、grab/drop gesture成立後にcommitされず元表示へ戻る。`drag_drop_section_identity_blocked`、`physical_section_unresolved`、`enqueue_attempted=false`。filter/search/query stateは空。試験前backup復元後もB row metadataは欠落。 |

この証跡はv0.6.62についての判定であり、v0.6.63へ自動継承しない。

## v0.6.63 Device Evidence

| Test case | Result | Evidence |
|---|---|---|
| TMV4-BASIC-01 | `PASS` | 午後sectionのA `T-0625 / E-20260815-0043`、B `T-0626 / E-20260815-0044`、C `T-0627 / E-20260815-0045`。三端末A/B/Cをbaselineに、devでCをAの上へsame-section D&D。UI・物理MarkdownはC/A/B、revert・failure noticeなし、全行`section=午後 section_id=afternoon`。D1 seq 2284 / event `465fc34f-a559-4cc5-afdd-9b355abe63f3`はTaskMoved v4、source=`task-drag-reorder-confirmed-markdown-v4`、target task order=T-0627/T-0625/T-0626。remote / mobile applied、両UI C/A/B。 |
| TMV4-SECTION-HANDOFF-01 | `PASS` | B `T-0626 / E-20260815-0044`のrow `section` / `section_id`だけをcontrolled missing metadata化し、reload後にBをCの上へsame-section D&D。dev物理MarkdownはB/C/A、revertなし、B rowへ`section=午後 section_id=afternoon`を自動補完。D1 seq 2285 / event `7aa1ac1a-d13d-4b74-a691-252502c7e4a3`はTaskMoved v4、source=`task-drag-reorder-confirmed-markdown-v4`、target task order=T-0626/T-0627/T-0625。remote / mobile applied、両UI B/C/A。 |
| TMV4-CROSS-SECTION-01 | `PASS` | `tmv4-v663-cross-01`、T-0628 / E-20260816-0001。generic add formで午後sectionへ作成し、dev physical rowに`section=午後 section_id=afternoon`を確認。remote / mobile UIも午後。devで午後→午前へcross-section D&Dし、revert・同期準備失敗Noticeなし。dev物理Markdownは`### 午前`直下、`section=午前 section_id=morning`。D1 seq 2298 / event `6ce13f31-c1bd-418b-bb85-46aa0d6a7036`はTaskMoved v4、payload source=`confirmed-markdown-v2`、from=`afternoon`、to=`morning`。remote / mobile applied、両UI午前。 |
| TMV4-EMPTY-SOURCE-01 | `PASS` | `tmv4-v663-empty-source-01`、T-0629 / E-20260816-0002。devで夜（`night`）→午後（`afternoon`）へcross-section D&Dし、sourceの夜sectionを空にした。dev / remoteは夜task count=0、fixtureは午後で`section=午後 section_id=afternoon`。mobileもfixtureは午後で夜にfixtureなし。D1 matching event=1、seq 2301 / event `c346e9aa-d15f-451f-a375-cebcc774e8f1`はTaskMoved v4、`source_order_entry_ids=[]`、source entry count=0、target order=`[E-20260816-0002]`、remote / mobile applied。 |
| TMV4-DATE-MOVE-01 | `PASS` | `tmv4-v663-date-move-01`、T-0630。2026-08-16のE-20260816-0003を2026-08-17の午後へ移動し、destination identityはE-20260817-0001。三端末でsource日から消失、destination日に1件、task_idとtask noteを維持。dev / remote rowは`section=午後 section_id=afternoon`、mobile UIも同じ最終状態。D1 TaskCreated seq 2302は旧entryでremote / mobile applied。TaskMoved v4 seq 2303 / event `bf7d8eaf-7d1f-45df-8f1a-4a6d2c53fb77`はmove type=`date-change`、source=`date-move-confirmed-markdown-v3`、top-level/to/after=E-20260817-0001、from/before=E-20260816-0003、remote / mobile applied。 |

この5件だけをv0.6.63のcurrent TaskMoved PASSとする。v0.6.63全体および他のtest caseをVerifiedへ昇格しない。

## Current v0.6.63 Matrix

| Area | Test case | dev | remote | mobile | Last verified version | Status | Evidence / Notes |
|---|---|---|---|---|---|---|---|
| Auto Flush lost wake-up | AF-LWU-01: create直後renameを手動flushなしで両event送信 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v0.6.58 | `NOT_VERIFIED` | v0.6.58で実機PASS。v0.6.63のcurrent evidenceへは未昇格。Auto Flush scheduler本体はv0.6.58から変更なし。 |
| Auto Flush lost wake-up | AF-LWU-02: flush中の複数enqueueを終了後に再schedule | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic checkのみ。実機で同時flushなし・全送信を要確認。 |
| Auto Flush lost wake-up | AF-LWU-03: failedのみでloopせず新規pendingは送信 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic checkのみ。実outboxでmax retry failedとの共存を要確認。 |
| Inbound Ack / cursor | ACK-CURSOR-GUARD-01: Ack 2xx後のcursor保存失敗をreconcile | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic PASS。実mobileでMarkdown二重applyなし、永久safe-stopなしを未確認。 |
| Inbound Ack / cursor | ACK-AMBIG-01: server commit後transport errorをretry / reconcile | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic PASS。実networkでのambiguous outcomeは未確認。 |
| Inbound Ack / cursor | ACK-AUTH-01: 401 / 403をhard stop | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | structural / synthetic PASS。実API認証失敗試験は未実施。 |
| Inbound Ack / cursor | CURSOR-GAP-01: server Ack済みsequenceを再applyせずgap解消 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | 2157 / 2158 / 2159相当synthetic PASS。実mobile recoveryは未実施。 |
| Inbound Ack / cursor | CURSOR-MERGE-01: latest dataへmonotonic merge | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic PASS。外部reloadを伴う実data.json競合は未確認。 |
| Mobile rescue | MOBILE-RESCUE-01: recoverable Ack / cursor stopからdrain再開 | `NOT_APPLICABLE` | `NOT_APPLICABLE` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic / structural PASS。実mobile rescueは未実施。 |
| TaskCreated | 通常taskを作成し、他2端末のMarkdown/UIとAckを確認 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | `bridge-v6.5-rc1-checklist.md`に三端末起点PASSあり。ただし後続のTaskCreated guard / collision変更を含むv0.6.56回帰は未記録。 |
| TaskCreated / TaskUpdated | TC-RENAME-SECTION-TOP-01: 空section先頭へ作成後即rename | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v0.6.60 | `NOT_VERIFIED` | v0.6.60実機PASS。v0.6.63ではrename handoffコード未変更、focused synthetic再PASSだがcurrent実機証跡へは未昇格。 |
| TaskCreated / TaskUpdated | TC-RENAME-SEQUENCE-01: insert-belowと3件連続create→rename | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v0.6.60 | `NOT_VERIFIED` | v0.6.60でA/B/Cのrename、identity、remote / mobile appliedはPASS。v0.6.63実機回帰は未実施。 |
| TaskCreated | TASK-ADD-SECTION-META-01: generic add form rowへsection metadata保存 | `PASS` | `NOT_VERIFIED` | `NOT_VERIFIED` | v0.6.63 dev partial | `NOT_VERIFIED` | T-0628 / E-20260816-0001をgeneric add formから午後へ作成し、dev physical rowで`section=午後 section_id=afternoon`を確認。remote / mobile UIの午後配置は確認済みだが、両端末のphysical row metadataは未確認。 |
| TaskCreated | INSERT-BELOW-ORDER-01: Aの下へB、Bの下へCを作成し物理/UI順を確認 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v0.6.60 FAIL | `NOT_VERIFIED` | v0.6.61からv0.6.63のfocused syntheticでA / B / C、refresh、rename、physical / visual一致、protected targetを確認。v0.6.63実Vaultは未試験。 |
| TaskUpdated | 通常taskのtitle・値変更を物理MarkdownとAckまで確認 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | RC3証跡はある。v0.6.48以降のfalse Ack対策を含む現行三端末回帰はrepository内に未記録。 |
| TaskMoved v4 | section移動・日付移動・同一task_id複数entry・空source section | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v0.6.63 section / date / empty-source | `NOT_VERIFIED` | section移動、日付移動、empty-sourceはcurrent PASS。同一task_id複数entryのcurrent実機証跡が未完了のため複合行は昇格しない。 |
| TaskMoved v4 | TMV4-BASIC-01: v4 entry orderの基本移動 | `PASS` | `PASS` | `PASS` | v0.6.63 | `PASS` | A/B/C→C/A/B。D1 seq 2284、event `465fc34f-a559-4cc5-afdd-9b355abe63f3`、T-0627 / E-20260815-0045。remote / mobile applied、三端末UI・dev物理順一致。 |
| TaskMoved v4 | TMV4-SECTION-HANDOFF-01: missing row section metaをphysical headingから補完 | `PASS` | `PASS` | `PASS` | v0.6.63 | `PASS` | B row metadata欠落をreload後D&Dで`午後 / afternoon`へ自動補完。D1 seq 2285、event `7aa1ac1a-d13d-4b74-a691-252502c7e4a3`、T-0626 / E-20260815-0044。remote / mobile applied、三端末B/C/A。 |
| TaskMoved v4 | TMV4-CROSS-SECTION-01: section間D&D | `PASS` | `PASS` | `PASS` | v0.6.63 | `PASS` | T-0628 / E-20260816-0001を午後→午前へD&D。dev物理rowは`午前 / morning`、D1 seq 2298 / event `6ce13f31-c1bd-418b-bb85-46aa0d6a7036`はremote / mobile applied、三端末UI午前。 |
| TaskMoved v4 | TMV4-EMPTY-SOURCE-01: source sectionが空になる移動 | `PASS` | `PASS` | `PASS` | v0.6.63 | `PASS` | T-0629 / E-20260816-0002を夜（`night`）→午後（`afternoon`）へ移動し、source orderは空。D1 seq 2301 / event `c346e9aa-d15f-451f-a375-cebcc774e8f1`、remote / mobile applied。dev / remoteの夜task count=0、三端末でfixtureは午後。 |
| TaskMoved v4 | TMV4-DATE-MOVE-01: 日付移動とdestination entry rekey | `PASS` | `PASS` | `PASS` | v0.6.63 | `PASS` | T-0630を2026-08-16 / E-20260816-0003から2026-08-17 / E-20260817-0001へ移動。TaskMoved v4 seq 2303 / event `bf7d8eaf-7d1f-45df-8f1a-4a6d2c53fb77`は旧IDをfrom/before、新IDをtop-level/to/afterに保持し、remote / mobile applied。三端末でsource消失・destination 1件。 |
| TaskDeleted | 通常・create直後・完了済み・一括削除 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | RC3で通常一連操作と完了済みTaskDeletedのPASS記録あり。後続identity変更後のfull regressionは未記録。 |
| TaskStarted | Board / Log / LogDaily / runtime保存後検証とAck | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | RC3三端末起点PASS。v0.6.49 lifecycle classifier後の現行統合証跡なし。 |
| TaskStopped / Paused / Resumed | stop・pause・resumeとruntime / log整合 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | TaskStoppedを含む実装記録はあるが、3イベントを覆う現行実Vault証跡はない。 |
| TaskCompleted | done row、Log / LogDaily、running cleanup、Ack | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | RC3三端末起点PASS。v0.6.45以降のoccurrence key検証とcleanup変更後は未統合確認。 |
| interrupt / continuation | normal interruption、continuation作成・移動・再開・完了 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | v0.6.50からv0.6.53に実装変更あり。現行HEADの証跡はrepository内にない。 |
| interrupt / continuation | Routine occurrence interruptionとmetadata継承 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | continuation-aware duplicate guardを含むfull regression未記録。 |
| Comments | TaskCommentAddedを三端末で作成・物理保存・Ack確認 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | 実装はあるがv0.6.56上の明示的な実Vault証跡なし。編集・削除同期は仕様自体が要確認。 |
| Section | Created / Updated / Deleted / Reorderedとtask位置整合 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | v6.6回帰チェックリストは未チェック。`section_id` / label揺れは監視項目。 |
| Project / Mode / Category / Area / Client | 定義CRUD・参照更新・Ack | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | code pathはあるが現行HEADの統合証跡なし。 |
| RoutineCreated | 定義作成と重複なし | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | v6.6 Routine同期チェックリストは全項目未チェック。 |
| RoutineUpdated | title・条件・enabled変更と生成済み行再整合 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | 保護対象と再整合範囲を含む三端末証跡なし。 |
| RoutineReordered | routine_orderの三端末同期 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | 実装はあるが現行実機証跡なし。 |
| RoutineDeleted | 定義削除と生成済みentry保護 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | 実装はあるが現行実機証跡なし。 |
| Routine occurrence skip / cancel / delete | 今回のみ操作の同期とRoutineHistory反映 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | 3イベントの現行三端末証跡なし。 |
| Routine TaskCreated idempotency | 同一occurrence key・同一entryの冪等Ack | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | v0.6.54で判定を変更。現行実Vault回帰は完了記録なし。 |
| Routine TaskCreated idempotency | 明示interrupt continuationの同一key・別entry作成 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | v0.6.53のcontinuation-aware guard。現行full regression未記録。 |
| safe rekey | 同一key・異なるentryを安全条件下でrekey | `BLOCKED` | `BLOCKED` | `BLOCKED` | none | `BLOCKED` | 過去試験データ混在により純粋な回帰試験にならず保留。隔離したidentityで再試験が必要。 |
| safe rekey | payload entry_id使用済みcollisionで未Ack停止 | `BLOCKED` | `BLOCKED` | `BLOCKED` | none | `BLOCKED` | 過去試験データが既存Vaultのentry_idを占有しており、純粋なcollision試験にならないため保留。既存Vaultや`applied_events`の手動補正を前提にしない。 |
| offline recovery | 通信断中の操作、復帰後drain、重複なし | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | retry実装はある。長時間・圏外・OS停止を含む実機保証なし。 |
| mobile hidden / resume drain | hidden中fetch/apply/Ackなし、visible後再開 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | RC3でPASS記録あり。v0.6.56での長時間hidden / resume回帰は未記録。 |

## Historical Evidence

v6.5 RC3については次の明示証跡がある。

- dev / remote / mobile各起点のTaskCreated、TaskUpdated、TaskMoved v3、TaskStarted、TaskCompleted、TaskDeleted一連操作: PASS。
- mobile起点TaskMoved単独確認: PASS。
- 完了済みTaskDeleted: PASS。
- mobile hidden / BG復帰: PASS。

根拠:

- [`handoff-v6.5-rc3-fixed.md`](archive/v6.5/handoff-v6.5-rc3-fixed.md)
- [`release-lock-v6.5-rc3.md`](archive/v6.5/release-lock-v6.5-rc3.md)
- [`specification-memo-v6.5-rc3-fixed.md`](archive/v6.5/specification-memo-v6.5-rc3-fixed.md)

これらは後続versionで変更されたTaskMoved v4、lifecycle classifier、interrupt continuation、Routine occurrence、safe rekeyの保証証跡ではない。

## Update Rule

1. test identity、対象release、端末、操作、期待結果を先に固定する。
2. Markdown物理状態、D1 event / applied状態、UI状態を確認する。
3. 対象versionの明示証跡が揃った行だけ`PASS`へ更新する。
4. false Ack、未反映、残留running行、cursor停止などがあれば`FAIL`とし、原因とevent identityを記録する。
5. 過去データ混在や前提イベント残留で判定不能なら`BLOCKED`とし、PASS / FAILへ丸めない。
