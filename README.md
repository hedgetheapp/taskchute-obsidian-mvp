# TaskChute Obsidian MVP

Obsidian上でTaskChute形式のTaskBoardを運用するCommunity Pluginです。現行配布はビルド済みの`main.js`単一ファイル運用を維持します。

## Current Development

- Current implementation: `v0.6.71` BRAT Prerelease
- Current branch: `feature/v6.6-routine-sync`
- Latest immutable test distribution: `v0.6.71` BRAT Prerelease
- Release target: `24b3a480593a03921bc3bb497842b0a14fc8cae8`
- Distribution files: `main.js` / `manifest.json` / `styles.css`

v0.6.71は、通常TaskCreatedの作成後Markdownからexactな隣接`entry_id`を取得し、versioned placement contractとして送信・受信側で保存後検証するBRAT実機試験用Prereleaseです。v0.6.70で確認されたsection-top作成の三端末order divergenceを対象にします。synthetic / structural試験と配布asset検証は完了していますが、実Vault / 実mobile試験は未実施で、Verified済み安定版ではありません。

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

開発・検証・Git/PR運用は[Development workflow](docs/DEVELOPMENT_WORKFLOW.md)、配布・リリース手順は[BRAT release operation](docs/brat-release-operation.md)と[Release checklist](docs/release-checklist.md)を参照してください。
