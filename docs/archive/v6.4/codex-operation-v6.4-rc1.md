# TaskChute Bridge Codex運用手順 v6.4 RC1

## 1. 作業開始

1. `AGENTS.md`をUTF-8で読む。
2. 整理版仕様書、引継ぎ、回帰試験チェックリスト、仕様整理マップの順に確認する。
3. 旧追補・診断メモは経緯確認用とし、整理版と矛盾する内容を採用しない。
4. 作業開始前に変更対象を限定し、既存のユーザー変更を戻さない。

## 2. 実装時の絶対ルール

- `main.js`単一ファイル運用を維持する。
- Taskchute日付Markdownを正とし、index.jsonはキャッシュとして扱う。
- Ack前の保存後再読込検証を省略しない。
- 未検証・失敗・unknown・prerequisite不足イベントをAckせず、cursorを跨がせない。
- TaskUpdatedとTaskMovedの責務を混ぜない。
- start_plan由来section移動ではTaskUpdatedとTaskMoved v3の両方を維持する。
- TaskDeletedは現在Markdownから対象entryだけを削除する。
- 秘匿情報やpayload/data.json全文を診断へ出さない。

## 3. 調査・修正手順

1. UI操作入口から保存、enqueue、outbox、flush、受信apply、保存後検証、Ackまで実経路を追う。
2. 日付・section・order問題では、保存直前・保存後に日付Markdownを再読込して比較する。
3. index.json不一致だけならwarning diagnosticsとし、Markdown確認済み操作を止めない。
4. 安全停止を緩めず、失敗理由を安全化してdiagnosticsへ残す。
5. false-appliedが起き得る経路ではAckしない。

## 4. 最低確認

```powershell
node --check .\main.js
```

実装変更時は回帰試験チェックリストから影響範囲を実機確認する。実機確認できない項目は、静的確認済みと未確認を分けて報告する。

## 5. 報告

- 変更概要
- 変更ファイル
- 守った不変条件
- 実行した確認コマンドと結果
- 未実施の実機確認
- 残リスク
