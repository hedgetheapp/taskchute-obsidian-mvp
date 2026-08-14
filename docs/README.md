# Documentation Index

このディレクトリはTaskChute Obsidian MVPの現行仕様、実装状況、試験状態、履歴資料への入口である。現行基準はv0.6.56。Bridge/runtime logicはv0.6.54と同一である。

## Current Documentation

- [Current status](CURRENT.md): 現在地、未試験、保留、TODO。
- [Feature inventory](FEATURES.md): 実装済み・一部実装・未実装の機能一覧。
- [Behavior specification](SPEC.md): 現行コードから確認できる動作仕様。
- [Architecture](ARCHITECTURE.md): 構成、保存先、主要クラス、データフロー。
- [Design decisions](DECISIONS.md): コードから確認できる設計判断。
- [Test matrix](TEST_MATRIX.md): 実機保証状態と証跡。

上記6文書を現行統合文書として優先する。不明事項は推測せず「要確認」または`NOT_VERIFIED`として扱う。

## Bridge Detail Docs

- [v6.6 Routine同期 仕様書 v1](bridge/Taskchute_Bridge_v6.6_Routine同期_仕様書_v1.md)
- [v6.6 Routine同期 実装仕様](bridge/Taskchute_Bridge_v6.6_Routine同期_実装仕様.md)
- [v6.6 Routine同期 引継ぎ](bridge/Taskchute_Bridge_v6.6_Routine同期_引継ぎ.md)
- [Task Identity and Delete Semantics v6.5 RC1](bridge/Task_Identity_and_Delete_Semantics_v6.5_RC1.md)
- [Sync model](sync-model.md)
- [TaskCreated guard](task-created-guard.md)
- [TaskStarted and reset](task-started-and-reset.md)
- [Settings cleanup inventory](bridge/Taskchute_Settings_Cleanup_v0.6.22_Inventory.md)

Bridge詳細資料には作成時点のversion固有記述が残る。現行統合文書と矛盾する場合は、`SPEC.md`、`ARCHITECTURE.md`、`DECISIONS.md`と現行コードを優先する。

## Regression Procedures

- [v6.6 Routine同期 試験チェックリスト](regression/試験チェックリスト_v6.6_Routine同期_v1.md)
- [v6.5 RC1/RC3 checklist and evidence](bridge-v6.5-rc1-checklist.md)
- [Release checklist](release-checklist.md)

チェックボックスが未完了の手順書は、項目が存在するだけではPASS証跡にならない。現行保証状態は`TEST_MATRIX.md`を参照する。

## Release Docs

- [v0.6.56 BRAT Prerelease](release/v0.6.56.md)
- [BRAT release operation](brat-release-operation.md)
- [BRAT実機試験用 Release作成チェックリスト](release/BRAT実機試験用_Release作成チェックリスト_v6.6_Routine同期.md)
- [v6.6 Routine Sync Test 1 release note](release/taskchute-bridge-v6.6-routine-sync-test-1.md)
- [v6.6 Routine Sync Test 2 release note](release/taskchute-bridge-v6.6-routine-sync-test2.md)
- [RC3 FIXED distribution notes](rc3-fixed-distribution-notes.md)

## Legacy / Historical Docs

- [v6.5 RC3 Release Lock](Taskchute_Bridge_v6.5_RC3_RELEASE_LOCK.md)
- [v6.5 RC3 FIXED specification memo](Taskchute_Bridge_仕様メモ_v6.5_RC3_FIXED.md)
- [v6.5 RC3 FIXED handoff](Taskchute_Bridge_引継ぎ_v6.5_RC3_FIXED.md)
- [v6.5 RC2 notes](taskchute-bridge-v6.5-rc2.md)
- [v6.5 RC1 notes](taskchute-bridge-v6.5-rc1.md)
- [v6.4 RC1 Release Lock](Taskchute_Bridge_v6.4_RC1_RELEASE_LOCK.md)
- [v6.4 RC1 Codex operation](Taskchute_Bridge_Codex運用手順_v6.4_RC1.md)
- [main.js split plan](main-js-split-plan.md)
- [main.js split map](main-js-split-map.md)
- [Codex split instructions](codex-main-js-split-instructions.md)

Historical資料は削除せず、当時の判断と試験記録を保存するために残す。現行versionの案内としては使用しない。
