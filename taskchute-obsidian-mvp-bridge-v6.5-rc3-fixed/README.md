# TaskChute Obsidian MVP

Obsidian上でTaskChute形式のTaskBoardを運用するプラグインです。現行配布・開発では、ビルド済みの`main.js`単一ファイル運用を維持します。

## Taskchute Bridge v6.5 RC3 FIXED

Taskchute Bridge v6.5 RC3 FIXEDは、dev / remote / mobileの三端末起点による最終スモークを通過した固定リリース候補です。RC3本体の同期ロジックは固定済みで、追加変更はRC3.1またはRC4候補として扱います。

### RC3固定内容

- mobile hidden中はpending fetch / apply / Ackを開始せず、visible復帰後にdeferred drainを再開する。
- 開始予定変更によるsection移動は、保存後Markdownを検証してTaskMoved v3を送信する。
- `TaskStarted / TaskStopped / TaskCompleted`はappend-onlyとして保護する。
- 完了済みタスク削除でも、削除後Markdown検証後に`TaskDeleted`を送信する。
- 完了済み削除のpayloadは`delete_context=completed-task-delete` / `is_completed=1`を持つ。

### RC3固定原則

- Markdown正
- `task_id + entry_id` identity
- 保存後検証成功時のみAck
- false-applied禁止
- cursor飛ばし禁止
- 実行イベントappend-only保護
- TaskDeleted削除後検証
- mobile hidden中のpending fetch / apply / Ack禁止

### RC3 Docs

- [RC3 Release Lock](docs/bridge/Taskchute_Bridge_v6.5_RC3_RELEASE_LOCK.md)
- [RC3 FIXED仕様メモ](docs/bridge/Taskchute_Bridge_仕様メモ_v6.5_RC3_FIXED.md)
- [RC3 FIXED引継ぎ](docs/bridge/Taskchute_Bridge_引継ぎ_v6.5_RC3_FIXED.md)
- [RC3 FIXEDリリースノート](docs/release/taskchute-bridge-v6.5-rc3-fixed.md)

## TaskChute Bridge v6.5 RC2

TaskChute Bridge v6.5 RC2は、v6.5 RC1固定後のPC 2 Vault運用試験で見つかったTaskStarted開始時セクション不整合を修正した固定候補です。RC1固定後に`main.js`の同期挙動変更が入ったため、RC1のまま正式版へ進めずRC2として再固定します。

### RC2差分

- タスク開始時は`started_at`のUTC ISOをローカル時刻へ変換してセクション判定する。
- 開始時に現在時刻セクションへ移動する場合は、保存後Markdownの確定位置を元に`TaskMoved -> TaskStarted`の順でBridgeイベントを送信する。
- 開始時セクション移動のTaskMoved sourceは`task-start-section-move-confirmed-markdown-v3`とする。
- `TaskStarted` payloadの`section_id` / `section` / `section_label`は、古いtask/cacheではなく保存後Markdownを再読込してentry_idの物理位置から作る。
- 行コメントの`section` / `section_id`も移動先に更新し、物理見出しとズラさない。
- false-applied禁止、cursor飛ばし禁止、保存後検証成功時のみAckの原則は維持する。

### RC2 Docs

- [v6.5 RC2 release note](docs/release/taskchute-bridge-v6.5-rc2.md)
- [v6.5 RC2 regression checklist](docs/regression/bridge-v6.5-rc2-checklist.md)
- [task-started-and-reset](docs/bridge/task-started-and-reset.md)

## TaskChute Bridge v6.5 RC1

TaskChute Bridge v6.5 RC1は、v6.4 RC1をベースに短縮負荷試験で見つかった同期安全性の問題を修正したリリース候補です。詳細仕様は`docs/bridge/`、回帰試験は`docs/regression/`、リリース情報は`docs/release/`へ分離します。

### 固定原則

- Taskchute日付Markdownを正データとし、`Taskchute/_system/index.json`は再構築可能キャッシュとして扱う。
- `data.json`は設定・runtime・outbox・cursor・diagnostics保持に使い、Vault間コピーや正データ扱いをしない。
- D1 `events`はイベントログ、D1 `applied_events`は端末ごとの適用済み管理として扱う。
- Task identityは原則`task_id + entry_id`とする。
- Ackは保存後再読込検証に成功し、`verified=true`の場合だけ行う。
- false-appliedを禁止する。
- apply失敗・未検証・missing prerequisite・unknown eventではcursorを進めない。
- `entry_id`を持つTaskDeletedでは、`task_id`だけで既知扱いしない。
- TaskStartedはTaskBoard、Log、LogDaily、runtime.runningの整合を確認できた場合のみAckする。
- 全件削除/一括削除は、削除前Markdown snapshotからTaskDeletedを生成する。
- diagnostics保持上限はprotected-aware pruneとし、outbox、cursor、API設定、applied event ID履歴、未解決失敗情報を削らない。

### v6.5 RC1で固定した主な内容

- diagnostics保持上限
- TaskCreated前提guard
- create直後delete
- Uキー開始前戻し同期
- 手動開始時刻クリア同期
- TaskStarted false-applied修正
- 全件削除snapshot修正
- TaskDeleted missing target既知判定

### Bridge Docs

- [sync-model](docs/bridge/sync-model.md)
- [identity-and-delete](docs/bridge/identity-and-delete.md)
- [task-created-guard](docs/bridge/task-created-guard.md)
- [task-started-and-reset](docs/bridge/task-started-and-reset.md)
- [diagnostics-retention](docs/bridge/diagnostics-retention.md)
- [v6.5 RC1 regression checklist](docs/regression/bridge-v6.5-rc1-checklist.md)
- [v6.5 RC1 release note](docs/release/taskchute-bridge-v6.5-rc1.md)

## TaskChute Bridge v6.4 RC1

Bridge v6.4 RC1は、Task系主要同期試験完了後のリリース候補です。現在は追加機能実装より、回帰試験、長時間運用確認、diagnostics整理、リリース候補化を優先します。

### 正本ドキュメント

実装・レビュー判断では、次の順で参照します。

1. `Taskchute_Bridge_統合設計仕様書_v6.4_RC1_整理版.md`
2. `Taskchute_Bridge_引継ぎ_v6.4_RC1_仕様整理後.md`
3. `Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`
4. `Taskchute_Bridge_仕様整理マップ_v6.4_RC1.md`

旧追補、診断メモ、過去のCodex指示は履歴資料です。矛盾する場合は整理版仕様書を優先します。リポジトリ内の運用文書は[docs/bridge/README.md](docs/bridge/README.md)を参照してください。

### 最重要同期原則

- Taskchute日付Markdownを正データとし、`Taskchute/_system/index.json`は再構築可能キャッシュとして扱う。
- Pull順序は`server_sequence ASC, event_id ASC`とする。
- Ackは保存後再読込検証に成功し、`verified=true`の場合だけ行う。
- `failed_unacked`、unknown event、missing prerequisite、保存後検証失敗ではAckせず、cursorを進めない。
- 値変更は`TaskUpdated`、TaskBoard上の位置変更は`TaskMoved v3`で同期する。
- `start_plan`変更でsectionが変わる場合、`TaskUpdated(start_plan)`と`TaskMoved v3(section-change)`の両方を送り、coalesceで互いを潰さない。
- TaskDeleted受信applyは現在Markdownを再読込し、対象entryだけを削除する。
- index.json単独不一致ではTaskMovedを止めず、warning diagnosticsとして扱う。
- 全イベント反映ON/OFFとruntime `safe_stopped`を混同しない。
- false-appliedを禁止する。

### 回帰試験

Bridge変更時は`Taskchute_Bridge_回帰試験チェックリスト_v6.4_RC1.md`を正とします。最低限、TaskCreated、TaskUpdated、TaskMoved v3、TaskDeleted、実行系、コメント、safe_stopped復旧、index stale warning、false-appliedなしを確認します。

構文確認:

```powershell
node --check .\main.js
```
