# Test Matrix

## 基準と読み方

- 対象release: v0.6.57 BRAT Prerelease
- canonical docs checkpoint: `c08bfca0b4fb7793eca1f096d7ae18c447ec01af`
- v0.6.57はv0.6.56へAuto Flush lost wake-up修正を追加した実機試験用version。
- この表は実装有無ではなく、実Vaultを使った保証状態を記録する。
- dev / remote / mobile列と`Status`列は、いずれもv0.6.57についての判定を示す。
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

## Current v0.6.57 Matrix

| Area | Test case | dev | remote | mobile | Last verified version | Status | Evidence / Notes |
|---|---|---|---|---|---|---|---|
| Auto Flush lost wake-up | AF-LWU-01: create直後renameを手動flushなしで両event送信 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | scheduler helperのsynthetic checkはOK。実Vault / D1 / remote / mobile確認は未実施。 |
| Auto Flush lost wake-up | AF-LWU-02: flush中の複数enqueueを終了後に再schedule | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic checkのみ。実機で同時flushなし・全送信を要確認。 |
| Auto Flush lost wake-up | AF-LWU-03: failedのみでloopせず新規pendingは送信 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | synthetic checkのみ。実outboxでmax retry failedとの共存を要確認。 |
| TaskCreated | 通常taskを作成し、他2端末のMarkdown/UIとAckを確認 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | `bridge-v6.5-rc1-checklist.md`に三端末起点PASSあり。ただし後続のTaskCreated guard / collision変更を含むv0.6.56回帰は未記録。 |
| TaskUpdated | 通常taskのtitle・値変更を物理MarkdownとAckまで確認 | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | v6.5 RC3 | `NOT_VERIFIED` | RC3証跡はある。v0.6.48以降のfalse Ack対策を含む現行三端末回帰はrepository内に未記録。 |
| TaskMoved v4 | section移動・日付移動・同一task_id複数entry・空source section | `NOT_VERIFIED` | `NOT_VERIFIED` | `NOT_VERIFIED` | none | `NOT_VERIFIED` | RC3のTaskMoved v3 PASSはあるが、v4の現行保証には使わない。 |
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
