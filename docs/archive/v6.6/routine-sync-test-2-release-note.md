# TaskChute Bridge v6.6 Routine Sync Test 2

## 概要

Bridge前の通常Routine仕様を維持した通常Routine同期のBRAT実機試験版です。

## 変更

- 通常Routine定義の作成・更新・削除同期
- 今回のみスキップ・キャンセル・削除のOccurrence同期
- 安定したOccurrence keyによる二重生成防止
- Routine定義受信後の生成済みタスク再整合
- Routine無効化・条件変更時の未実行生成済みタスク削除を復元
- Routine定義apply由来Task変更のBridge echo抑止

## 対象外

- Rotation Routine同期
- RoutineHistory全体同期

## BRAT assets

`main.js`、`manifest.json`、`styles.css`を個別に添付します。
