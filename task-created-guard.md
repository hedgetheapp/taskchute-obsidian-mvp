# TaskChute Bridge 文書索引

このディレクトリは、TaskChute Bridgeのリポジトリ内運用文書を置く。現在の固定状態は`Taskchute Bridge v6.5 RC3 FIXED`とする。

## Taskchute Bridge v6.5 RC3 FIXED

RC3はdev / remote / mobileの三端末起点による最終スモーク通過済みの固定リリース候補。RC3固定後の同期ロジック変更は禁止し、変更が必要な場合はRC3.1またはRC4候補として扱う。

- [RC3 Release Lock](Taskchute_Bridge_v6.5_RC3_RELEASE_LOCK.md)
- [RC3 FIXED仕様メモ](Taskchute_Bridge_仕様メモ_v6.5_RC3_FIXED.md)
- [RC3 FIXED引継ぎ](Taskchute_Bridge_引継ぎ_v6.5_RC3_FIXED.md)
- [RC3 FIXEDリリースノート](../release/taskchute-bridge-v6.5-rc3-fixed.md)

RC3固定原則:

- Markdown正
- `task_id + entry_id` identity
- 保存後検証成功時のみAck
- false-applied禁止
- cursor飛ばし禁止
- 実行イベントappend-only保護
- TaskDeleted削除後検証
- mobile hidden中のpending fetch / apply / Ack禁止

## v6.5 RC1

- [同期モデル](sync-model.md)
- [Identityと削除](identity-and-delete.md)
- [TaskCreated前提guard](task-created-guard.md)
- [TaskStartedと開始前戻し](task-started-and-reset.md)
- [diagnostics保持上限](diagnostics-retention.md)
- [回帰試験チェックリスト](../regression/bridge-v6.5-rc1-checklist.md)
- [リリースノート](../release/taskchute-bridge-v6.5-rc1.md)

## v6.5 RC2

v6.5 RC2固定候補では、RC1固定後のPC 2 Vault運用試験で検出したTaskStarted開始時セクション不整合を修正済み仕様として扱う。

- [TaskStartedと開始前戻し](task-started-and-reset.md)
- [v6.5 RC2回帰試験チェックリスト](../regression/bridge-v6.5-rc2-checklist.md)
- [v6.5 RC2リリースノート](../release/taskchute-bridge-v6.5-rc2.md)

RC2差分:

- 開始時は `started_at` のUTC ISOをローカル時刻へ変換してセクション判定する。
- 開始時セクション移動が発生する場合、保存後Markdownの確定位置から `TaskMoved -> TaskStarted` の順で送信する。
- `TaskMoved` sourceは `task-start-section-move-confirmed-markdown-v3` とする。
- `TaskStarted` payloadのsection情報は保存後Markdownのentry_id物理位置から作る。

v6.5 RC1で固定した最重要原則:

- Markdown正
- `task_id + entry_id` identity
- 保存後検証成功時のみAck
- false-applied禁止
- cursor飛ばし禁止
- TaskDeleted missing targetの安全側判定
- 全件削除snapshot仕様
- TaskStarted Ack前検証
- diagnostics protected-aware prune

## v6.4 RC1履歴

Bridge v6.4 RC1の外部正本ファイル名は以下。

## 正本

1. `Taskchute_Bridge_統合設計仕様書_v6.4_RC1_整理版.md`
2. `Taskchute_Bridge_引継ぎ_v6.4_RC1_仕様整理後.md`
3. `Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`
4. `Taskchute_Bridge_仕様整理マップ_v6.4_RC1.md`

旧追補、診断メモ、過去Codex指示は履歴資料。実装判断では整理版仕様書を優先する。

## リポジトリ内運用文書

- [Codex運用手順](Taskchute_Bridge_Codex運用手順_v6.4_RC1.md)
- [リリース候補化チェックリスト](Taskchute_Bridge_v6.4_RC1_リリース候補化チェックリスト.md)
- [リリースノート草案](Taskchute_Bridge_v6.4_RC1_リリースノート草案.md)
- [RC1 Release Lock](Taskchute_Bridge_v6.4_RC1_RELEASE_LOCK.md)

## 注意

- `docs/main-js-split-*`は過去の分割検討資料。Bridge v6.4 RC1では`main.js`単一ファイル運用を維持する。
- `data.json`と`Taskchute/_system/index.json`をVault間コピーしない。
