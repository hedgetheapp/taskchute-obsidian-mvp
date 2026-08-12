# Architecture

## 1. 概要

このprojectはObsidian Community Plugin形式のJavaScript applicationである。build systemやpackage manifestをrepositoryに持たず、配布物は`main.js`、`manifest.json`、`styles.css`の3ファイルである。

```text
Obsidian UI / commands
        |
        v
TaskchutePlugin + ItemViews (main.js)
        |
        +--> Vault Markdown --------> Obsidian Sync / filesystem
        |
        +--> plugin data.json ------> settings / runtime / outbox / cursor
        |
        +--> localStorage ----------> device-local UI state / device ID
        |
        +--> Bridge HTTP API -------> events / pending / applied
```

## 2. Repository構成

| Path | 役割 |
|---|---|
| `main.js` | 全application logic。約53,147行。CommonJSで`TaskchutePlugin`をexport。 |
| `styles.css` | PC / mobile / views / modal / settingsのstyle。約15,032行。 |
| `manifest.json` | Obsidian plugin metadata。version `0.6.54`。 |
| `README.md` | project説明。ただし現行実装より古い。 |
| `AGENTS.md` | versionごとの開発guardと過去判断。現行・旧記述が併存する。 |
| `docs/` | Bridge仕様、release、regression、運用資料。 |

`src/`、`package.json`、test directory、bundler設定は存在しない。

## 3. 使用技術

- JavaScript / CommonJS。
- Obsidian Plugin API (`require("obsidian")`)。
- Obsidian Vault APIとadapter API。
- DOM APIによるUI構築。
- CSS。
- Obsidian `requestUrl()`を利用するBridge HTTP client。
- Markdown、YAML/frontmatter、Obsidian wiki link、HTML comment metadata。
- browser `localStorage`。

外部npm runtime dependencyはコード上`obsidian`以外に見つからない。

## 4. main.js内の責務区分

`main.js`はcommentで16 sectionに分けられている。

| Section | 行付近 | 役割 |
|---|---:|---|
| 00 | 1 | constants、default settings、table定義 |
| 01 | 632 | date、time、holiday、calendar helper |
| 02 | 2107 | path、ID、name、value normalization |
| 03 | 2996 | Markdown、YAML、text section helper |
| 04 | 3285 | Routine rule helper |
| 05 | 4908 | comment parse / serialize |
| 06 | 5390 | Vault I/O、folder、history、backup helper |
| 07 | 6391 | comment等のmodal UI |
| 08 | 8318 | Routine settings modal UI |
| 09 | 10397 | plugin lifecycle、storage、Bridge、mutation |
| 09-A | 29121 | index生成、integrity、repair |
| 10 | 38502 | Main TaskBoard UI |
| 11 | 46376 | Project / Section / Mode settings views |
| 12 | 47226 | Routine management view |
| 13 | 50526 | setup、diagnostics、maintenance views |
| 14 | 50919 | settings backup / restore view |
| 15 | 51066 | plugin settings tab |
| 16 | 53145 | CommonJS export |

これは論理区分であり、module境界ではない。

## 5. 主要クラス

### Core

- `TaskchutePlugin` (`main.js:10401`): plugin lifecycle、settings/runtime、Vault mutation、Bridge、history、repairの中心。
- `TaskchuteView` (`main.js:38507`): main TaskBoard。PC tableとmobile cardsを描画する。

### ItemViews

- `ProjectSettingsView`: project一覧、archive、note導線。
- `SectionSettingsView`: section CRUD、time、color、icon、order。
- `ModeSettingsView`: mode CRUDと定義note。
- `RoutineManagementView`: Routine一覧、inline edit、row / column D&D、Rotation panel。
- `BoardHistoryManagementView`: snapshot一覧、preview、restore、delete。
- `HolidayCalendarSettingsView`: user holiday、exception business day。
- `SetupDiagnosticView`: folder・data・integrity・repair状態。
- `SettingsBackupView`: backup一覧、create、restore、delete。
- `TaskchuteSettingTab`: general、display、Bridge、diagnostics settings。

### Modals

task edit/add、comments、confirm、Routine rule picker、Routine history / calendar / heatmap、shortcut help等がある。`TaskLinksModal`は定義以外の参照がなく未使用候補。

## 6. データモデルと保存先

### 正本Markdown

| Data | 既定path | 内容 |
|---|---|---|
| 日付TaskBoard | `Taskchute/YYYY-MM-DD Taskchute.md` | Tasks、Log、LogDaily、Comments |
| Task定義 | `Taskchute/Tasks/*.md` | YAML、heading、Notes、Comments、Subtasks、Routine定義 |
| Project | Taskchute配下のproject note folder | project_id、name、archive、本文 |
| Mode | Taskchute配下のmode note folder | mode_id、name、color、icon、order |
| Category / Area / Client | definition note folders | definition IDと表示属性 |
| RoutineLog | `Taskchute/RoutineLogs/YYYY-MM-DD_RoutineLog.md` | 当日コメント・subtask presentation |

一部folder名はsettingsまたはhelperで生成されるため、固定pathの詳細は要確認。

### plugin data.json

- settings。
- runtime.running / paused。
- Bridge outbox、cursor、known / used IDs、applied cache、diagnostics。
- Rotation Routine定義。
- UI共有設定の一部。

saveはqueueで直列化され、古い並行snapshotによる巻き戻しを防ぐ (`main.js:14779`付近)。

### localStorage

- device-local表示状態、filter、collapse等。
- startup open setting cache。
- 生成されたdevice ID。

端末固有UI状態をObsidian Syncされる`data.json`から分離する。

### 履歴・保守データ

- `.taskchute/board-history/{date}/*.md`: boardと関連task note snapshot。
- `.taskchute/routine-history/{YYYY-MM}.json`: Routine occurrence history。
- `Taskchute/SettingsBackups/*.json`: 現行のsettings backup。旧`/.taskchute/settings-backups`も読込対象。
- `.taskchute/repair-reports/{run_id}`: repair backups / reports。
- `Taskchute/ErrorLogs/YYYY-MM-DD.jsonl`: error logs。

### index

`Taskchute/_system/index.json`はMarkdownから再構築するlookup cache。task、project、mode、category、area、client、section、board、warningを収録する。正本ではなく、単独不一致でTaskMovedを止めない。

## 7. データフロー

### Local operation

```text
UI / command
  -> ensureDeviceWriteGuard
  -> current Markdown / dataを再読込
  -> mutation
  -> Vaultへ保存
  -> 保存後状態を確認
  -> runtime / index / viewを更新
  -> Bridge eventをoutboxへenqueue
  -> optional auto flush
```

操作により順番は異なる。Bridge event payloadは可能な限り保存後Markdownからrefreshする。

### Inbound Bridge

```text
timer / mobile resume / manual action
  -> GET pending(cursor)
  -> normalize + sort by server_sequence
  -> event registry validate
  -> target resolve
  -> apply to Markdown / data
  -> Vault再読込によるverify
  -> before-Ack guards
  -> POST applied
  -> contiguous cursor update
```

apply失敗、verification失敗、Ack失敗ではcursorを跨がない。

### External Vault change

Vault create / modify / delete / renameをwatchし、内部write markerを除外する。Obsidian Sync到着後の短いsettleを待ち、関連Markdownと`data.json`を読み直してviewをrefreshする。

## 8. Bridge境界

Bridge serverはこのrepositoryの外部依存である。clientは以下を利用する。

- `POST /events`
- `GET /events/pending`
- `POST /events/{event_id}/applied`

user ID、device ID、API base URL、tokenはsettingsから取得する。tokenやpayload全文をdiagnosticsへ出さないguardがある。

## 9. 画面構成

```text
TaskBoard
  - compact header / date navigation / summary
  - task table (desktop)
  - task cards + running bar + quick add (mobile)
  - desktop right pane

Management Views
  - Project
  - Section
  - Mode
  - Routine + Rotation Routine
  - Board History
  - Holiday Calendar
  - Setup / Diagnostics
  - Settings Backup / Restore

Plugin Setting Tab
  - general / folders / display
  - Bridge connection / send / receive
  - repair / developer diagnostics
```

## 10. 主要依存関係

- `TaskchuteView`は`TaskchutePlugin`のmutation APIへ依存する。
- 全management viewも同じplugin instanceのsettingsとVault helperへ依存する。
- Bridge applyはMarkdown parser / serializer、Vault I/O、runtime、definition helperへ横断的に依存する。
- Routine生成はtask note definition、RoutineHistory、holiday calendar、section設定へ依存する。
- indexとdiagnosticsはすべてのMarkdown schemaへ依存する。
- stylesはclass nameによって全view / modalと密結合している。

## 11. 構造上の注意

- 単一ファイルのためprivate module境界はなく、関数名とsection commentが主な構造化手段。
- manual Markdown / frontmatter parserが多く、format変更の影響範囲が広い。
- Obsidian Vault indexとadapterの到着差を吸収するfallbackがある。
- `main.js`分割計画docsはあるが、現行配布方針は単一`main.js`維持。分割の再開可否は要確認。
