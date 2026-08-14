# main.js 分割計画書（v0.4.79）

このドキュメントは、Taskchute Obsidian MVP の `main.js` を将来的に安全に分割するための計画書です。

v0.4.79では、**実際の大規模分割は行わない**。目的は、現在の巨大な `main.js` の責務を整理し、Codex / Claude / MCP などのAIエージェントが安全に分割作業できるようにすることです。

## 1. 現状

- 対象バージョン: `0.4.79`
- 直前ベース: `0.4.78`
- `main.js` は約 27,000 行規模。
- Obsidianプラグインのエントリは `manifest.json` の `main: "main.js"`。
- 現時点ではビルドパイプラインを導入していない。
- `AGENTS.md` はAIエージェント向けの開発ルールとしてリポジトリルートに配置済み。
- `Taskchute/_system/index.json` はAI向けの再構築可能なキャッシュとして実装済み。
- 診断/整合性チェックも実装済み。

## 2. 分割時の基本方針

### 2.1 最優先事項

- 既存挙動を壊さない。
- 1回の修正で大規模に分けすぎない。
- 分割ごとに `node --check main.js` を通す。
- 可能なら実機で以下を確認する。
  - TaskBoard表示
  - タスク追加/編集
  - コメント追加/編集/削除
  - プロジェクト設定
  - プロジェクトアーカイブ/復元
  - 右サイドペイン
  - ルーティン設定
  - hit-a-hint
  - index再構築
  - 整合性チェック

### 2.2 `main.js` をいきなり複数ファイル実行にしない

現時点ではビルドパイプラインがないため、いきなり `require("./src/...")` によるランタイム分割へ進むのはリスクがあります。

理由:

- Obsidianデスクトップとモバイルで相対 `require` の挙動差が出る可能性がある。
- 現状のZIP配布は `main.js` 単体中心で動いている。
- バンドル済み `main.js` の前提を崩すと、モバイルや同期環境で不具合が出る可能性がある。

推奨方針:

1. まずはドキュメント上で分割境界を固定する。
2. 次に純関数・副作用の少ない関数群を「内部セクション」として整理する。
3. ビルドパイプラインを導入する場合は、別バージョンで明示的に実施する。
4. 本格分割する場合は `src/**/*.js` または `src/**/*.ts` を入力にし、最終成果物として従来どおり `main.js` を出力する方式を優先する。

## 3. 主な責務ブロック

現在の `main.js` は大きく以下の責務を持っています。

### 3.1 定数・デフォルト設定

例:

- view type 定数
- `DEFAULT_SETTINGS`
- テーブル列定義
- モバイルD&D定数
- CSSクラスや列キー

将来候補:

- `src/constants/view-types.js`
- `src/constants/default-settings.js`
- `src/constants/table-columns.js`

注意:

- `DEFAULT_SETTINGS` は多くの関数から参照されるため、最初に分離すると依存が広がる。
- 初期段階では移動せず、依存が整理されてから切り出す。

### 3.2 日付・カレンダー・休日

例:

- `todayDate`
- `normalizeTaskchuteDate`
- `addDaysToTaskchuteDate`
- `formatTaskchuteDateLabel`
- `buildJapaneseHolidayMap`
- `getJapaneseHolidayName`
- `isTaskchuteCalendarHolidayDate`
- `getCalendarGridDates`

将来候補:

- `src/utils/date.js`
- `src/calendar/japanese-holidays.js`
- `src/calendar/business-days.js`

優先度:

- 高め。副作用が少なく、比較的安全に切り出しやすい。

注意:

- 日付またぎ、ルーティン判定、セクション判定に影響するため、切り出し後はルーティンと日付移動を重点確認する。

### 3.3 hit-a-hint / キーボード / ポップアップ制御

例:

- `getTaskchuteVisibleHintRect`
- `tcGetHintRestoreFocusElement`
- `tcRestoreHintFocus`
- `tcGetModalRootForHintEscape`
- `tcMarkHintEscapeHandled`
- `tcShouldBlockModalCloseAfterHintEscape`
- `enableTaskchutePopupArrowNavigation`
- `enableTaskchuteSelectKeyboardNavigation`

将来候補:

- `src/ui/hints.js`
- `src/ui/keyboard.js`
- `src/ui/popup-focus.js`

優先度:

- 中。機能境界は明確だが、モーダル/ESC/フォーカス復元/D&Dと干渉する。

注意:

- 既知の過去課題として、モーダル内hint中のESCがモーダル自体を閉じる問題があった。
- 分割時はイベント伝播・フォーカス復元を壊さない。

### 3.4 Markdown / frontmatter / YAML / セクション操作

例:

- `replaceYamlValue`
- `setYamlFrontmatterScalar`
- frontmatter除去/抽出系
- Commentsセクション操作
- Log / LogDaily操作
- Daily Taskchuteノートの読み書き

将来候補:

- `src/markdown/frontmatter.js`
- `src/markdown/sections.js`
- `src/markdown/comments.js`
- `src/markdown/logs.js`

優先度:

- 高いが慎重に行う。

注意:

- AI連携で最も壊れやすい領域。
- 将来的には `processFrontMatter` 利用も検討するが、既存の文字列処理を一気に置き換えない。
- まずは既存挙動維持で関数境界を固定する。

### 3.5 ファイルI/O・ストレージ

例:

- `ensureFolder`
- `pathExistsOnAdapter`
- `readFileText`
- `writeFileText`
- `removeFile`
- 内部書き込みマーカー
- history / backup / error log 周辺

将来候補:

- `src/storage/files.js`
- `src/storage/history.js`
- `src/storage/backup.js`
- `src/storage/error-log.js`

優先度:

- 高め。UI依存が比較的少なく、分割初期候補。

注意:

- Obsidian Syncやモバイルでの書き込みタイミングに関わる。
- `adapter.write` フォールバックの意図を崩さない。
- 内部書き込みマーカーを壊さない。

### 3.6 プロジェクト管理

例:

- `normalizeProjectNoteMeta`
- `buildProjectNotePath`
- `ensureProjectMetadataForName`
- `preserveProjectMetadataOnRename`
- `getProjectNotePath`
- `ensureProjectNoteForName`
- `findProjectNoteFile`
- `isProjectArchived`
- `setProjectArchived`
- `getActiveProjectNames`
- `updateProjectNoteArchivedFrontmatter`

将来候補:

- `src/projects/project-meta.js`
- `src/projects/project-notes.js`
- `src/projects/project-archive.js`
- `src/views/project-settings-view.js`

優先度:

- 中〜高。直近で大きく触った領域なので、診断機能で確認しながら慎重に分割する。

注意:

- `note_path` は正データにしない。
- `projectNoteMeta` は `{ id, archived }` 中心。
- `project_id` キー中心への全面移行は未実装。
- アーカイブ済みプロジェクトは既存表示のみ維持し、新規選択・再選択は不可。

### 3.7 タスク管理・TaskBoard行

例:

- タスクノート作成/読み取り
- TaskBoard日別ノート解析
- `task_id` / `entry_id` / `exec_id`
- 日付移動
- 開始/中断/再開/完了
- 見積/開始予定/実績

将来候補:

- `src/tasks/task-notes.js`
- `src/tasks/board-entries.js`
- `src/tasks/execution.js`
- `src/tasks/move-task.js`

優先度:

- 中。中核機能なので、初期分割対象にはしない。

注意:

- `task_id` はタスクマスタID。
- `entry_id` は日別TaskBoard上の行ID。
- `exec_id` は実行セッションID。
- `task_id` 単独で日別行を特定しない。

### 3.8 コメント

例:

- `TaskCommentsModal`
- タスクノート `## Comments`
- 日別Taskchuteノート `## Comments`
- コメント三点メニュー
- コメント編集/削除
- コメントモーダル内hint

将来候補:

- `src/comments/task-comments.js`
- `src/comments/execution-comments.js`
- `src/modals/task-comments-modal.js`

優先度:

- 中。

注意:

- 表示名は「コメント」。
- 内部的には `task_comment` と `execution_comment` を区別する。
- タスクノートCommentsは空行を増やさないcompact保存仕様。

### 3.9 ルーティン

例:

- ルーティン設定モーダル群
- repeat判定
- weekly/monthly/yearly/custom
- ルーティン履歴
- ルーティン設定ページ
- ルーティン候補とアーカイブ済みプロジェクト除外

将来候補:

- `src/routines/routine-rules.js`
- `src/routines/routine-generation.js`
- `src/routines/routine-history.js`
- `src/views/routine-management-view.js`
- `src/modals/routine-*.js`

優先度:

- 中〜低。関数が多く、UIとロジックが混在しているため、初期分割には不向き。

### 3.10 index / diagnostics

例:

- `Taskchute/_system/index.json` 再構築
- `Taskchute整合性チェックを実行`
- `project_id` / `task_id` / `entry_id` 欠落・重複チェック
- archived不一致warning
- legacy `note_path` 検出

将来候補:

- `src/indexing/index-builder.js`
- `src/diagnostics/integrity-check.js`
- `src/diagnostics/warnings.js`

優先度:

- 高め。直近で実装したが、正データではなくキャッシュ/診断であり、比較的境界を作りやすい。

注意:

- `index.json` は正データではない。
- 自動修復しない診断は、まず読み取り専用として維持する。

### 3.11 View / Modal / SettingTab

例:

- `TaskchuteView`
- `ProjectSettingsView`
- `SectionSettingsView`
- `ModeSettingsView`
- `RoutineManagementView`
- `HolidayCalendarSettingsView`
- `SetupDiagnosticView`
- `SettingsBackupView`
- `TaskchuteSettingTab`
- 各Modal

将来候補:

- `src/views/taskchute-view.js`
- `src/views/project-settings-view.js`
- `src/views/setup-diagnostic-view.js`
- `src/settings/setting-tab.js`
- `src/modals/*.js`

優先度:

- 低〜中。UIは依存が多いので、最後の方が安全。

## 4. 推奨フェーズ

### Phase 0: ドキュメント固定（v0.4.79）

- 本計画書を追加。
- Codex向け分割指示書を追加。
- `AGENTS.md` に分割方針を追記。
- 実コードの大規模分割はしない。

### Phase 1: 純関数・低副作用ユーティリティの境界整理

候補:

- 日付ユーティリティ
- 休日/カレンダー判定
- ID生成/正規化
- YAML/frontmatter文字列操作の一部

この段階では、ファイル分割ではなく、`main.js` 内でセクションコメントを整理するだけでもよい。

### Phase 2: ストレージ/履歴/診断/indexの切り出し

候補:

- `readFileText` / `writeFileText`
- history snapshot
- error log
- index builder
- integrity diagnostics

理由:

- UIから比較的独立している。
- 分割後の確認がしやすい。

### Phase 3: プロジェクト領域の切り出し

候補:

- project meta
- project notes
- archive
- active project options

注意:

- 直近の変更が多いので、v0.4.75〜v0.4.78の仕様を壊さない。
- アーカイブ済みプロジェクトの再選択不可仕様を維持する。

### Phase 4: コメント領域の切り出し

候補:

- task comments
- execution comments
- comments modal

注意:

- `## Comments` compact保存仕様を壊さない。
- hit-a-hint対象を壊さない。

### Phase 5: ルーティン領域の切り出し

候補:

- routine rules
- routine generation
- routine settings modal
- routine management view

注意:

- ルーティン候補からアーカイブ済みプロジェクトを除外する仕様を維持する。

### Phase 6: View/Modal分割

候補:

- `TaskchuteView`
- `ProjectSettingsView`
- `SetupDiagnosticView`
- setting tab

注意:

- ここは最後。依存が多く、崩れやすい。

## 5. 最初にCodexへ依頼するなら

最初の実装依頼は、**実ファイル分割ではなく、内部境界の明確化**がおすすめです。

例:

- `main.js` 内に大見出しコメントを追加する。
- 既存関数の順序を無理に変えない。
- セクションごとに責務を明記する。
- 分割候補ごとの関数一覧を `docs/main-js-split-map.md` に出す。

いきなり `src/` へ移すのは、ビルド方式が決まってからにする。

## 6. 分割時の禁止事項

- `task_id` と `entry_id` を混同しない。
- `note_path` をfrontmatter正データとして復活させない。
- `index.json` を正データとして扱わない。
- アーカイブ済みプロジェクトを新規候補に戻さない。
- `AGENTS.md` を文字化けした状態で上書きしない。
- `main.js` を大幅に並び替えない。
- 一度にView/Modalまで大規模移動しない。
- 実機確認できない変更を「確認済み」と書かない。

## 7. 分割後の必須確認

毎フェーズで以下を確認する。

- `node --check main.js`
- プラグイン起動
- TaskBoard表示
- タスク追加
- タスク編集
- コメント追加
- プロジェクト設定ページ表示
- アーカイブ/復元
- プロジェクトノートを複数回開いても新規ノートが増えない
- 右サイドペイン表示
- index再構築
- 整合性チェック

## 8. 未決事項

- ビルドパイプラインを導入するか。
- CommonJSの相対requireで分割するか、esbuild等で単一 `main.js` に束ねるか。
- TypeScript化するか。
- `projectNoteMeta` を将来 `project_id` キーへ全面移行するか。
- MCP/APIをどの単位で公開するか。

## 9. v0.4.87以降の見直し

v0.4.85で `src/date-calendar.js` への小分割を試した結果、Obsidian実環境でプラグインが読み込めない事象が発生した。
そのため、当面はファイル分割を進めず、`main.js` 単一ファイル運用を維持する。

- `src/` への分割は行わない。
- `package.json` / `esbuild.config.mjs` / `tsconfig.json` などのビルド構成は追加しない。
- `main.js` からローカル分割ファイルを直接 `require` しない。
- 保守性改善は、docs、セクションコメント、関数境界整理、小さな局所修正で進める。
- 将来再検討する場合は、単一 `main.js` へバンドルする方式を実環境で検証してから採用する。


## v0.4.88 メモ

- `projectNoteMeta` の孤立項目は自動クリーンアップ対象。
- 配布ZIPにはユーザー環境依存の `data.json` を含めない。
- `main.js` 単一ファイル運用は継続。
