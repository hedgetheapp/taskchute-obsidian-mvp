# Taskchute Bridge v6.5 RC3 RELEASE LOCK

作成日: 2026-06-14
状態: LOCKED / FIXED

## 固定名

Taskchute Bridge v6.5 RC3

## 固定理由

dev / remote / mobile の三端末起点で以下の最終スモークを通過したため。

- 新規作成
- タイトル変更
- 開始予定変更
- セクション移動
- 開始
- 完了
- 削除

## 合格条件

- D1に必要イベントが生成される
- 起点端末以外が applied になる
- UI反映される
- 完了済み削除で TaskDeleted が生成される
- mobile BG/hidden復帰で反映漏れがない

## 固定時点の保護仕様

- Markdown正
- `task_id + entry_id` 正体性
- 保存後検証Ack
- false-applied禁止
- cursor飛ばし禁止
- TaskMoved v3のsection移動検証
- 実行イベントappend-only保護
- TaskDeleted削除後検証
- mobile hidden中のpending fetch/apply/Ack禁止

## 固定後の変更方針

RC3固定後に変更する場合は、RC3.1またはRC4候補として扱う。
RC3本体には追加変更しない。
