# Current Project Status

## 調査基準

- 調査日: 2026-08-15
- manifest version: `0.6.58`
- branch: `feature/v6.6-routine-sync`
- canonical docs checkpoint: `v0.6.58` tag target
- release tag: `v0.6.58`（BRAT実機試験用Prerelease。release commitはtag targetを参照）
- release準備開始時のworktree: `main.js`にv0.6.58候補の未commit差分あり
- 構文確認: `node --check .\main.js` 成功

この文書は実ファイル、Git履歴、既存docsから確認した現在地を記録する。実装の存在、試験配布、実機試験済みであることは分けて扱う。v0.6.58はinbound Ack / cursor recoveryを追加したBRAT実機試験用Prereleaseであり、Verified済み安定版ではない。

## 文書運用

- 現行仕様と現在地はcanonical 6文書を正とする。
- release/version単位の変更履歴はroot [`CHANGELOG.md`](../CHANGELOG.md)を参照する。
- 現行versionの検証状態は[`TEST_MATRIX.md`](TEST_MATRIX.md)を正とする。
- 過去versionの詳細資料は[`archive/`](archive/README.md)へ保存し、現行仕様の根拠には使わない。

## Delivery state

- **Integrated**: main反映済み。実機確認未完了の場合がある。
- **Prereleased / Test-distributed**: Integratedなcommitを新規tagとGitHub Prereleaseの固定assetsとして試験配布済み。実機確認未完了でもよい。
- **Verified**: ユーザー実機確認済みで、current evidenceを`TEST_MATRIX.md`へ反映済み。
- **Released**: Verifiedな配布物を安定配布対象として公開済み。

main反映、実装完了、syntax check、BRAT Prerelease公開だけではVerifiedまたはReleasedとしない。BRAT試験ではPrereleaseを先に固定配布し、同一assetsの実機証跡を後からTEST_MATRIXへ記録できる。公開済みtag / Release / assetsは差し替えず、不具合は次versionで修正する。詳細は[`DEVELOPMENT_WORKFLOW.md`](DEVELOPMENT_WORKFLOW.md)を参照する。

## 現在の開発状況

アプリ本体とBridge同期は広範囲に実装済みである。Bridgeの基礎部分はv6.5 RC3でdev / remote / mobile三端末スモークを通過した記録がある。その後、v0.6.16以降にRoutine同期、Routine occurrence、TaskMoved v4、lifecycle identity、割り込みcontinuation、safe rekeyが追加された。

v0.6.55公開後に`CURRENT.md`、`FEATURES.md`、`SPEC.md`、`ARCHITECTURE.md`、`DECISIONS.md`、`TEST_MATRIX.md`の6文書をcanonical documentation baselineとして固定した。READMEとdocs索引も現行入口へ更新した。v0.6.56はこのbaselineとversion metadataをBRAT配布versionとして固定する。v0.6.42からv0.6.54の個別試験結果にはrepository内で統合証跡になっていないものがあり、未確認項目は引き続き試験不足として扱う。

v0.6.57では、Auto Flush実行中にenqueueされたeventのwake-up要求を保持し、終了後に送信可能なpending eventが残る場合だけ再scheduleする。synthetic scheduler checkは成功しているが、AF-LWU-01からAF-LWU-03の実Vault端末間試験は未実施である。

v0.6.58では、inbound server Ackとlocal cursor persistenceを分離し、Ack済みeventをMarkdownへ再適用しないcursor-only reconciliation、bounded Ack retry、recoverable mobile rescueを追加した。ACK-CURSOR-GUARD-01、ACK-AMBIG-01、ACK-AUTH-01、CURSOR-GAP-01、CURSOR-MERGE-01、MOBILE-RESCUE-01相当のsynthetic / structural試験は成功しているが、実Vault / 実mobile試験は未実施である。

## 実装済み

### ローカルTaskChute機能

- 日付別TaskBoardの表示・作成・編集・削除・コピー・複数選択・並び替え。
- タスクの開始、完了、中断、再開、割り込み開始とcontinuation作成。
- 見積、開始予定、実績時刻、project、mode、category、area、client、priority、sectionの編集。
- コメント、関連リンク、サブタスク、右サイドペイン、モバイルカード内詳細。
- 通常Routine、Rotation Routine、RoutineLog、RoutineHistory、休日・営業日判定。
- Board履歴、undo / redo、設定バックアップ・復元、index再構築、整合性診断、one-click repair。

主な根拠: `TaskchutePlugin` (`main.js:10401`)、`TaskchuteView` (`main.js:38507`)、task mutation群 (`main.js:31616`以降)。

### Bridge同期

- TaskCreated / TaskUpdated / TaskMoved / TaskDeleted。
- TaskStarted / TaskStopped / TaskPaused / TaskResumed / TaskCompleted。
- TaskCommentAdded。
- Project / Mode / Category / Area / Client / Section定義同期。
- RoutineCreated / RoutineUpdated / RoutineReordered / RoutineDeleted。
- RoutineOccurrenceSkipped / Cancelled / Deleted。
- outbox、auto flush、pending pull、inbound apply、保存後検証、Ack、cursor、安全停止、diagnostics。
- mobile hidden中のdrain延期とvisible復帰後の再開。

受信イベントregistryは`main.js:16253`以降、各apply本体は`main.js:17132`以降にある。

### v0.6.48からv0.6.54の追加実装

- 通常TaskUpdatedの物理Markdown未反映false Ack防止 (`611e4f5`)。
- lifecycleイベントへのRoutine identity混入防止 (`0a53b6a`)。
- 同一task_id・異なるentry_idを区別するTaskMoved v4 (`fcb8543`)。
- 割り込みLifecycle Log metadataとrunning cleanup (`c6bedae`)。
- TaskMoved v4でsource sectionが空になる場合の許可 (`8e4e0d5`)。
- Routine interrupt continuationのRoutine metadata保持 (`9b3c36f`)。
- Routine TaskCreatedのentry_id collision検出とsafe rekey (`f8842d0`)。

## 開発途中・試験不足

次はコード上は実装済みだが、現行HEADを対象とする統合試験結果がリポジトリに記録されていない。

- v0.6.56 safe rekeyの実Vault回帰。実行コードはv0.6.54と同一で、過去データ混在により現在保留。
- v0.6.57 Auto Flush lost wake-upのAF-LWU-01 / AF-LWU-02 / AF-LWU-03実Vault回帰。
- v0.6.58 inbound Ack / cursor recoveryの実mobile回帰。
- AF-LWU-01、TMV4-BASIC-01、TMV4-EMPTY-SOURCE-01のv0.6.58実Vault回帰。
- v0.6.48からv0.6.56をまとめた三端末full regression。
- TaskMoved v4の日付移動、section移動、同一task_id複数entry、coalesce、空source sectionの組合せ試験。
- normal / routine / interrupt continuationのlifecycle identity回帰。
- Routine定義同期とRoutine occurrenceの三端末同時起動・オフライン復帰試験。
- TaskCommentAdded、Section、Category / Area / Clientのv0.6.56上での回帰。
- mobile長時間hidden、OS強制停止、通信断・圏外復帰。

`docs/archive/v6.6/routine-sync-regression-checklist-v1.md`は全項目未チェックのため、コードが存在することだけをもって試験済みとは扱わない。

## 未完了と思われる箇所

- `main.js:17348`に旧Routine duplicate guardが`if (false && ...)`として残る。到達不能だが削除されていない。
- `TaskLinksModal` (`main.js:7579`) は定義以外の参照が見つからない。現在のリンクUIはpopover / menu経路を使用しているため、未使用候補。削除可否は要確認。
- v6.6の旧詳細仕様・引継ぎ・回帰チェックリストはv0.6.16からv0.6.17時点の記述を含む。現行統合文書と併読する場合はHistorical資料として扱う。
- 自動テスト基盤が存在しない。確認可能なtestファイルはリリース文書と手動回帰チェックリストのみ。
- `projectNoteMeta`は名前キー中心の互換層を残す。`project_id`中心への全面移行は未実装と既存docsに記載されている。

## TODO

優先度順:

1. `TEST_MATRIX.md`を運用し、cleanな試験identityでsafe rekey以外のfull regressionを先に実施する。
2. safe rekey用の隔離された試験データを用意して再試験する。
3. mobile長時間・通信断復帰試験を行う。
4. `section_id`と`section_label`の表示名揺れを調査する。
5. 到達不能な旧duplicate guardと未使用候補クラスを、回帰試験後に整理する。
6. 旧v6.6詳細仕様と回帰手順を、現行統合文書を参照する形へ段階的に整理する。

## 現在確認できる問題点

- 現行統合文書はv0.6.58へ整合したが、旧詳細資料には過去versionの記述が残る。
- occurrence keyについて、古い仕様書の時刻入り形式と現行の日付のみ形式が併存する。
- Routine変更時の生成済み行の扱いも、古い「更新しない」と現行の「保護対象以外を再整合」が併存する。
- 巨大な単一`main.js`に全責務が集中し、影響範囲の静的把握が難しい。ただし配布物を単一`main.js`とすること自体は現行の明示方針。
- 実装済み機能の大半に自動テストがなく、実Vault試験への依存が高い。
- 本番導入は既存文書上で保留のまま。v0.6.58は実機試験用Prereleaseであり、本番可否は要確認。

## 将来候補・明示的対象外

- Rotation RoutineのBridge同期。
- RoutineHistory全体同期。
- Android Widget。
- Pixel Watch / Watch連携。
- 外部カレンダー連携。
- 専用MCPサーバー・外部操作API。

これらは未実装だが、現行v6.6の欠陥ではなく将来候補または対象外として記録されている。
