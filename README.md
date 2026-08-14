# TaskChute Obsidian MVP

Obsidian上でTaskChute形式のTaskBoardを運用するCommunity Pluginです。現行配布はビルド済みの`main.js`単一ファイル運用を維持します。

## Current Development

- Current release: `v0.6.56`
- Current branch: `feature/v6.6-routine-sync`
- Canonical docs checkpoint: `c08bfca0b4fb7793eca1f096d7ae18c447ec01af`
- Release commit: Git tag `v0.6.56`のtargetを参照
- Distribution files: `main.js` / `manifest.json` / `styles.css`

v0.6.56はcanonical documentation baselineとversion metadataを固定するdocs-only releaseです。`main.js`と`styles.css`はv0.6.55から変更せず、Bridge/runtime logicはv0.6.54と同一です。

## Canonical Documentation

- [Current status](docs/CURRENT.md)
- [Feature inventory](docs/FEATURES.md)
- [Behavior specification](docs/SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design decisions](docs/DECISIONS.md)
- [Test matrix](docs/TEST_MATRIX.md)
- [Documentation index](docs/README.md)
- [Changelog](CHANGELOG.md): release/versionごとの変更履歴

実装済みであることと、現行versionで実機試験済みであることは分けて扱います。保証状態は`TEST_MATRIX.md`を参照してください。不明事項は推測せず「要確認」または`NOT_VERIFIED`とします。

## Current Safety Principles

- Taskchute日付MarkdownをTaskBoardのdate、section、order、entry位置の正とする。
- Task identityは原則`task_id + entry_id`とする。
- `TaskMoved v4`ではentry ID順序を正データとする。
- 保存後にVaultを再読込して期待状態を検証できた場合だけBridge Ackする。
- false-appliedとcursor飛ばしを禁止し、不明・衝突・検証失敗では未Ack停止する。
- mobile hidden中はpending fetch、apply、Ackを開始せず、visible復帰後にdrainを再開する。
- Routine occurrenceは`routine_occurrence_key`で解決し、通常taskへRoutine identityを推定混入させない。

詳細な現行挙動と例外条件は[Behavior specification](docs/SPEC.md)と[Design decisions](docs/DECISIONS.md)を参照してください。

## Historical Documentation

過去versionの設計、試験、release資料は[Documentation Archive](docs/archive/README.md)へ保存しています。現行実装判断の正本には使用しません。版数ごとの変更要約は[Changelog](CHANGELOG.md)を参照してください。

配布・リリース手順は[BRAT release operation](docs/brat-release-operation.md)と[Release checklist](docs/release-checklist.md)を参照してください。
