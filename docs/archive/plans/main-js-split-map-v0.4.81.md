# main.js 分割マップ（v0.4.81）

このドキュメントは、Taskchute Obsidian MVP の `main.js` を将来分割する前に参照する責務マップです。

v0.4.80では、実コードの分割、`src/` 作成、`import` / `export` 追加、esbuild導入、`package.json` 追加は行いません。目的は、現行 `main.js` の責務を棚卸しし、今後の安全な分割順を明文化することです。


## v0.4.81で追加したこと

- 実ファイル分割はまだ行っていない。
- `main.js` に責務別の大見出しコメントを追加した。
- 関数の並び替え、`src/` 作成、`import` / `export` 追加、ビルド構成追加は行っていない。
- 目的は、次回以降の小さな実分割でCodex/Claudeが責務境界を見失わないようにすること。

## 現在の構成

- `manifest.json` は `"main": "main.js"` を指定している。
- `main.js` は `require("obsidian")` と `module.exports = TaskchutePlugin` による単一CommonJS構成。
- 現時点で `package.json` / esbuild / tsconfig は存在しない。
- ZIP配布も、従来どおり `main.js` をObsidianが直接読む前提。

## 本格分割時の推奨方針

- 将来的に本格分割する場合は、`src/**/*.js` または `src/**/*.ts` を入力にし、ビルドで単一 `main.js` に束ねる方式が安全。
- Obsidianデスクトップ/モバイル差を避けるため、相対 `require("./src/...")` によるランタイム分割は慎重に扱う。
- v0.4.80ではビルド構成を導入しない。
- 実分割の前に、まず `main.js` 内のセクションコメントや小さな純関数の境界整理から始める。

## 最初に分割すべき候補

| 候補 | 主な範囲 | 理由 | 注意 |
|---|---:|---|---|
| 日付・休日・カレンダー純関数 | `todayDate`, `normalizeTaskchuteDate`, `buildJapaneseHolidayMap`, `getCalendarGridDates` など | 副作用が少なく、テストしやすい | ルーティン、日付移動、日付またぎ確認が必要 |
| ID/名前/path正規化の純関数 | `safePath`, `sanitizeFileName`, `slugifyId`, `cleanProjectValue`, `normalizeProjects` など | UI依存が少なく、境界を作りやすい | `DEFAULT_SETTINGS` 依存を不用意に広げない |
| Markdown抽出・小さな文字列操作 | `stripYamlFrontmatter`, `extractYamlValue`, `extractMarkdownSection`, `firstNonEmptyLine` など | 読み取り・文字列変換中心で分離しやすい | frontmatter更新の挙動変更は避ける |
| コメントのparse/serialize純関数 | `parseTaskCommentsThread`, `serializeTaskCommentsThread`, `getTaskCommentsPreview` など | UIから切り離しやすい | `## Comments` のcompact保存仕様を壊さない |
| index/診断の読み取り系 | `buildTaskchuteIndexObject`, `buildTaskchuteIndex`, integrity issue整形系 | `index.json` は再構築可能キャッシュで境界が明確 | 自動修復処理と混ぜない |

## まだ分割しない候補

| 候補 | 理由 |
|---|---|
| `TaskchuteView` | D&D、右サイドペイン、hit-a-hint、インライン編集、モバイルUIが密結合している |
| `TaskchutePlugin` 中核メソッド | 保存、同期、undo、タスク操作、index、プロジェクト、履歴が混在している |
| ルーティン設定UI | `RoutineSettingsModal` / `RoutineManagementView` はUIとルールが密に絡む |
| hit-a-hint / ESC / メニュー制御 | モーダル、メニュー、フォーカス復元、イベント伝播と干渉しやすい |
| プロジェクト管理全体 | `note_path` 非正データ、論理アーカイブ、候補除外、index warning が絡むため、純関数整理後に扱う |

## 関数棚卸し表

| 責務 | 主な関数・クラス例 | 分割優先度 | 方針 |
|---|---|---|---|
| 定数/設定 | `DEFAULT_SETTINGS`, view type定数, `TC_TABLE_COLUMNS` | 低 | 参照元が多いため初期分割では動かさない |
| 日付/休日 | `todayDate`, `normalizeTaskchuteDate`, `addDaysToTaskchuteDate`, `buildJapaneseHolidayMap`, `getCalendarGridDates` | 高 | まず純関数として境界を作る |
| path/ID/正規化 | `safePath`, `sanitizeFileName`, `slugifyId`, `cleanProjectValue`, `normalizeProjectNoteMeta`, `formatSequentialProjectId` | 高 | `note_path` 非正データ方針を維持する |
| Markdown/frontmatter | `stripYamlFrontmatter`, `extractYamlValue`, `quoteYamlString`, `replaceMarkdownSection`, `replaceYamlTaskLinks` | 中〜高 | 読み取り系から始め、更新系は後回し |
| ファイルI/O | `ensureFolder`, `readFileText`, `removeFile`, board history snapshot系 | 中 | Obsidian Syncと内部書き込みマーカーに注意 |
| コメント | `parseTaskCommentsThread`, `serializeTaskCommentsThread`, `TaskCommentsModal` | 中 | parse/serializeを先に分離し、Modalは後回し |
| ルーティン | `routineMatchesDate`, `validateTaskchuteRoutineDefinition`, `RoutineSettingsModal`, `RoutineManagementView` | 低〜中 | ルール純関数とUIを分ける準備から始める |
| index/診断 | `buildTaskchuteIndexObject`, `buildTaskchuteIndex`, `normalizeTaskchuteIntegrityIssue`, `summarizeTaskchuteIntegrityIssues` | 高 | 読み取り専用・キャッシュ生成として境界化する |
| プロジェクト | `normalizeProjectNoteMeta`, `buildProjectNotePath`, `isProjectArchived`, `getActiveProjectNames`, `ensureProjectNoteForName` | 中 | 直近変更が多いため、診断で確認しながら進める |
| View/UI | `TaskchuteView`, `ProjectSettingsView`, `SetupDiagnosticView`, `TaskchuteSettingTab` | 低 | 最後に回す。初回分割では触らない |

## v0.4.81以降の推奨ステップ

1. `main.js` 内に大見出しセクションコメントを追加し、既存関数の並び替えはしない。
2. 日付・休日・カレンダー純関数の境界をコメントで明示する。
3. `node --check main.js` を実行する。
4. Taskchute整合性チェックを実行し、分割準備による副作用がないことを確認する。
5. 実ファイル分割を始める前に、ビルド方式を決める。
6. 実分割前後で `node --check main.js` とTaskchute整合性チェックを必ず実行する。

## 禁止事項

- v0.4.80では `src/` を作らない。
- v0.4.80では `import` / `export` を追加しない。
- v0.4.80では esbuild / package.json / tsconfig を追加しない。
- 初回分割でView/Modal/`TaskchutePlugin`中核処理を移動しない。
- `note_path` を正データとして復活させない。
- `index.json` を正データとして扱わない。
- アーカイブ済みプロジェクトを新規候補に戻さない。

## v0.4.84: 日付・休日・カレンダー純関数の切り出し準備レビュー

v0.4.84では、実コードの分割は行わず、`main.js` 内の `SECTION 01: Date, time, holiday, and calendar helpers` を中心に、日付・休日・カレンダー純関数の切り出し候補を棚卸しした。

### 対象ブロック

- `main.js` の `SECTION 01: Date, time, holiday, and calendar helpers`
- 近接する日付入力補助関数
- ルーティン判定で使われる日付分解関数

### 切り出し候補一覧

| 区分 | 関数 | 切り出し優先度 | 注意点 |
|---|---|---|---|
| 基本日付 | `pad`, `todayDate`, `normalizeTaskchuteDate`, `dateFromTaskchuteDate`, `addDaysToTaskchuteDate` | 高 | `normalizeTaskchuteDate` は不正値時に `todayDate()` へフォールバックする既存挙動を維持する |
| 表示・path | `formatTaskchuteDateLabel`, `taskchuteDateFromPath`, `formatTaskchuteDateSlash` | 高 | 曜日表示・日本語表示文字列は既存表示を変えない |
| 年月日分解 | `taskchuteDateYear`, `taskchuteDateMonth`, `taskchuteDateDay`, `monthStartTaskchuteDate`, `addMonthsToTaskchuteDate` | 高 | カレンダー、休日、ルーティンで横断利用される |
| 祝日計算 | `nthWeekdayOfMonth`, `vernalEquinoxDay`, `autumnEquinoxDay`, `buildJapaneseHolidayMap`, `getJapaneseHolidayName`, `isJapaneseHolidayDate` | 高 | `JAPANESE_HOLIDAY_CACHE` と一緒に移す必要がある |
| ユーザー休日 | `normalizeTaskchuteDateList`, `normalizeTaskchuteCalendarEntryList`, `getTaskchuteCalendarEntryDescription`, `getUserHolidayDates`, `getExceptionBusinessDates` | 中 | `settings` の旧キー/新キー両対応を壊さない |
| 営業日判定 | `isUserHolidayDate`, `isExceptionBusinessDate`, `isTaskchuteCalendarHolidayDate`, `isTaskchuteBusinessWeekday` | 中 | 例外営業日がユーザー休日・祝日より優先される順序を維持する |
| カレンダー表示補助 | `getCalendarDateTone`, `addCalendarDateToneClass`, `formatTaskchuteMonthTitle`, `getCalendarGridDates` | 中 | `addCalendarDateToneClass` はDOM副作用があるため、純関数群とは別扱いにする |
| 入力補助 | `normalizeDateDigits`, `parseFlexibleTaskchuteDate` | 高 | モーダル、ルーティン、日付入力欄で使うため、許容形式を変えない |
| 日時合成 | `addDaysToDateString`, `isoFromTaskDateClock` | 中 | 実行ログ・日付またぎに影響するため、切り出し後の確認範囲を広く取る |
| ルーティン日付 | `routineDateParts` | 中 | ルーティン専用に見えるが基本日付関数へ依存するため、最初は移動せず参照関係を確認する |

### 最初に移してよい候補

最初の実分割では、次のような副作用のない関数から始めるのが安全。

- `pad`
- `todayDate`
- `normalizeTaskchuteDate`
- `dateFromTaskchuteDate`
- `addDaysToTaskchuteDate`
- `taskchuteDateYear`
- `taskchuteDateMonth`
- `taskchuteDateDay`
- `monthStartTaskchuteDate`
- `addMonthsToTaskchuteDate`
- `getCalendarGridDates`
- `normalizeDateDigits`
- `parseFlexibleTaskchuteDate`
- `formatTaskchuteDateSlash`

### 同時に移すべき依存

- `buildJapaneseHolidayMap`, `getJapaneseHolidayName`, `isJapaneseHolidayDate` を移す場合は、`JAPANESE_HOLIDAY_CACHE` も同じモジュールへ置く。
- `normalizeTaskchuteDate` を移す場合は、`todayDate` と `pad` も同じモジュールへ置く。
- `getCalendarGridDates` を移す場合は、`monthStartTaskchuteDate`, `dateFromTaskchuteDate`, `addDaysToTaskchuteDate` も同じモジュールへ置く。

### まだ移さないほうがよい候補

- `addCalendarDateToneClass`
  - DOMへクラスを追加する副作用があるため、純関数モジュールには混ぜない。
- `isoFromTaskDateClock`
  - 実行ログ、日付またぎ、開始/終了時刻の扱いに影響するため、日時合成専用の確認が必要。
- `routineDateParts`
  - ルーティン判定に密接なので、日付純関数の初回移動が安定してから扱う。
- `manualActualRangeFromClocks`
  - 実行時間・日付またぎロジックを含むため、今回の日付/休日/カレンダー純関数とは別フェーズにする。

### 分割時の注意点

- `normalizeTaskchuteDate` の「不正値は今日へフォールバック」挙動を変えない。
- `parseFlexibleTaskchuteDate` の `{ ok, value }` 形式を変えない。
- 日本の祝日計算は、代替休日・国民の休日・特定年のオリンピック移動を含むため、`buildJapaneseHolidayMap` の内部順序を変えない。
- 例外営業日は通常休日・祝日より優先される。
- `settings.userHolidays` / `settings.user_holidays`、`settings.exceptionBusinessDays` / `settings.exception_business_days` の互換読みを維持する。
- 既存の日本語表示文字列を変更しない。
- モバイルUI、ルーティン設定、休日カレンダー設定、日付移動、日付またぎログを確認対象に含める。

### 今後の分割方針

1. v0.4.85以降で実分割する場合は、まず `main.js` 内のSECTION 01をそのまま一塊として扱う。
2. ビルド構成が未導入の間は、実ファイル分割ではなく、関数境界コメントやテスト観点の追記に留める。
3. 実ファイル分割を始める場合は、単一 `main.js` に束ねるビルド方式を決めてから行う。
4. 分割前後で `node --check main.js` を実行する。
5. 実機確認では、TaskBoard表示、日付移動、ルーティン設定、休日カレンダー設定、日付またぎ実行ログを重点確認する。

## v0.4.85: 日付・休日・カレンダー純関数の小分割

v0.4.85では、初回の実コード分割として、副作用が少ない日付・カレンダー純関数だけを `src/date-calendar.js` へ切り出した。

### 追加した構成

- `src/date-calendar.js`
  - 現行 `main.js` と同じCommonJS形式。
  - `module.exports` で日付・カレンダー純関数を公開する。
- `main.js`
  - `require("./src/date-calendar")` で切り出した関数を参照する。
- `package.json`
  - `npm run check` と将来用の `npm run build` を追加。
- `esbuild.config.mjs`
  - 将来、単一 `dist/main.js` に束ねるための最小設定。

### v0.4.85で切り出した関数

- `pad`
- `todayDate`
- `normalizeTaskchuteDate`
- `dateFromTaskchuteDate`
- `addDaysToTaskchuteDate`
- `taskchuteDateYear`
- `taskchuteDateMonth`
- `taskchuteDateDay`
- `monthStartTaskchuteDate`
- `addMonthsToTaskchuteDate`
- `getCalendarGridDates`
- `normalizeDateDigits`
- `parseFlexibleTaskchuteDate`
- `formatTaskchuteDateSlash`

### v0.4.85でまだ切り出していない関数

- `formatTaskchuteDateLabel`
- `taskchuteDateFromPath`
- `nthWeekdayOfMonth`
- `vernalEquinoxDay`
- `autumnEquinoxDay`
- `buildJapaneseHolidayMap`
- `getJapaneseHolidayName`
- `isJapaneseHolidayDate`
- ユーザー休日/例外営業日/営業日判定系
- `getCalendarDateTone`
- `addCalendarDateToneClass`
- `isoFromTaskDateClock`
- `routineDateParts`

### 注意

- v0.4.85では、View/Modal/`TaskchutePlugin`中核処理、ルーティンUI、index再構築、整合性診断には触れていない。
- 祝日計算は日本語表示文字列とキャッシュを含むため、次フェーズ以降で `JAPANESE_HOLIDAY_CACHE` と一緒に扱う。
- `addCalendarDateToneClass` はDOM副作用があるため、純関数モジュールには含めない。

## v0.4.86 読み込み復旧メモ

- v0.4.85では `main.js` から `src/date-calendar.js` を `require("./src/date-calendar")` する実コード小分割を行ったが、Obsidian実環境でプラグインが読み込めなくなる事象が発生した。
- v0.4.86では読み込み復旧を最優先し、ランタイムで使用する `main.js` は再び自己完結の単一ファイル構成へ戻した。
- `src/date-calendar.js`、`package.json`、`esbuild.config.mjs` は次回以降のバンドル方式検証用として残すが、現時点の `main.js` からは `src/date-calendar.js` を直接 `require` しない。
- 次に実分割を進める場合は、Obsidianへ配置する成果物を必ず単一 `main.js` にバンドルするか、実環境でローカルモジュール解決が問題ないことを確認してから採用する。
- 確認観点として、`node --check main.js` だけでは不十分。Obsidianでプラグインを無効化→再読み込み→有効化し、コンソールに `Cannot find module` などが出ないことを確認する。


## v0.4.87 単一ファイル運用へ戻す

- v0.4.85の実ファイル小分割により、Obsidian実環境でプラグインが読み込めない事象が発生したため、当面は実ファイル分割を行わない。
- v0.4.87では、`src/`、`package.json`、`esbuild.config.mjs` を削除し、ZIP配布物を `main.js` 単一ファイル中心の従来構成へ戻した。
- 今後の `main.js` 整理は、実ファイル分割ではなく、セクションコメント・docs・小さな局所修正を優先する。
- 将来分割を再検討する場合は、単一 `main.js` へバンドルする方式を別ブランチ/別バージョンで検証し、Obsidian実環境で有効化できることを確認してから採用する。
- Codexへの依頼では、明示的に求められない限り `src/`、`package.json`、`esbuild.config.mjs`、`tsconfig.json` を追加しない。


## v0.4.88 projectNoteMeta孤立項目の扱い

- v0.4.87で `main.js` 単一ファイル運用へ戻した後、整合性チェックで `projectNoteMetaに孤立した項目があります` が出るケースを確認。
- 添付された `index.json` では `warnings` は空であり、警告元はindexキャッシュではなく `data.json` 側の `projectNoteMeta` と判断。
- `projectNoteMeta` は `projects` 配列に存在するプロジェクトの補助メタ情報として扱い、`projects` に存在しないキーは起動時/保存時に自動クリーンアップする。
- 今後のZIPではユーザー設定を上書きしないため、配布物に `data.json` を含めない。

## v0.4.92 メモ

- 実コード分割は行わず、`main.js` 単一ファイル運用を継続。
- 診断画面で `window.error` / `window.unhandledrejection` 由来の過去ログがTaskchute本体エラーのように残って見える問題に対応。
- 診断/整合性チェック前にグローバル由来ログを掃除し、内部エラーログ件数からも除外する。


## v0.4.93 note

- 整合性チェック画面に「不正frontmatter修復」ボタンを追加。
- 対象は `category: area:` などの不正なタスクfrontmatter。グローバル由来ログ掃除とは別系統。
- `main.js` 単一ファイル運用を継続。


## v0.4.94 メモ

- 整合性チェック画面から「グローバル由来ログ掃除」ボタンを削除。
- `category: area:` 系はグローバル由来ログではなくタスクfrontmatter不正YAMLであるため、主導線は「不正frontmatter修復」ボタンに寄せる。
- グローバル由来ログの削除コマンドと内部フィルタ処理は保守用として残す。
- `main.js` 単一ファイル運用を継続。


## v0.4.95 タスク名/ファイル名同期ルール
- タスク名変更時は、frontmatter の `title`、ノート見出し、`T-xxxx_タスク名.md` 形式のファイル名、TaskBoard 上の内部リンク先を同期する。
- TaskBoard 行の表示名（リンクエイリアス）は、旧タスク名または旧ファイル名由来の表示名だった場合のみ新しい正規タイトルへ更新し、ユーザーが当日だけ手動変更した表示名は極力保持する。
- 整合性チェックでは、frontmatter `title` とファイル名のタイトル部分が一致しないタスクノートを warning として検出する。
- 修復導線として、コマンド `Taskchuteタスク名/ファイル名を同期` と、整合性チェック画面の `タスク名/ファイル名同期` ボタンを用意する。
- 同期処理は frontmatter `title` を正とし、同名ファイル衝突時は上書きせずスキップして Notice/結果に含める。


## v0.4.96 メモ
- 生成済みルーティン行は、ルーティンマスターの変更に追従する。
- `syncGeneratedRoutineInstancesForDefinition()` で当日以降の生成済み行のリンク、tcメタ、所属セクションを同期する。
- 完了済み・実行中・中断中の行は、セクション移動だけ保護する。リンクやメタの同期は、マスター参照の整合性維持を優先する。
- 引き続き `main.js` 単一ファイル運用。


## v0.4.97 メモ
- ルーティンマスター同期は、同期実行時にタスクノートの最新frontmatterを読み直す方針へ補強。
- ルーティン名/プロジェクト等を2回以上変更した場合でも、生成済みルーティン行が1回目の変更内容で止まらないようにする。
- 完了済み行は表示名・リンク・tcメタのみ同期し、セクション移動やLog/LogDaily書き換えは行わない。
- 実コード分割は引き続き行わず、main.js単一ファイル運用。


## v0.4.98 ルーティン完了行同期ルール
- 生成済みルーティン同期では、完了済みTaskBoard行の表示名・リンク先・プロジェクト等のマスター属性を過去日でも同期してよい。
- ただし、Log / LogDaily は実績履歴として扱い、自動書き換えしない。
- 過去日の未完了行は、古い計画履歴を壊さないため自動同期対象外とする。
- タスクノートfrontmatterで project / mode / category / area / client / priority 等が空欄に変更された場合も、古い画面オブジェクトの値へフォールバックせず空欄として同期する。

## v0.5.15 ルーティン日別RoutineLog対応

- `main.js` 単一ファイル運用は継続する。
- v0.5.15では、通常タスクのコメント/サブタスク保存先は変更しない。
- ルーティンタスクのコメント/サブタスク状態のみ、`Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` へ分岐する。
- RoutineLogは人間が読む日別ログ、`.taskchute/routine-history/YYYY-MM.json` は当日再生成防止などの内部制御データとして役割を分ける。
- RoutineLogの作成/更新は、コメント追加/編集/削除、サブタスク追加/チェック/解除/名前編集/削除/上下移動、ルーティンタスク完了時に限定する。
- TaskBoard表示だけ、右サイドペイン表示だけ、ルーティン自動生成だけではRoutineLogを作成しない。
- ルーティン完了時にRoutineLogが未作成の場合、タスクノート `## Subtasks` をテンプレートとして未完了状態で展開し、`status=done` / `completed_at=HH:mm` を保存する。
