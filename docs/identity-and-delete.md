# Diagnostics Retention

作成: 2026-06-14 12:28:11 JST
ステータス: v6.5 RC1 docs反映用

## Purpose

`data.json`肥大化を防ぎつつ、同期安全性に必要な重要診断を保護する。

## Basic Rule

diagnosticsごとに保持上限を適用する。
ただし、単純な件数削除ではなくprotected-aware pruneを使う。

## Protected Diagnostics

以下は削除しない、または優先的に保護する。

- failed_unacked
- unknown_event
- verified=false相当
- safe_stopped系
- 未Ack判断に必要な診断
- false-applied検知に必要な診断

## Prune対象にしてはいけないもの

以下はdiagnostics扱いで削ってはいけない。

- outbox
- cursor
- API設定
- applied event ID履歴
- Bridge接続設定
- 同期実行に必要なruntime情報

## Manual Cleanup UI

手動整理UIを提供する場合も、保護対象は削らない。

UI操作で削る対象と、自動pruneで削る対象のルールは揃える。

## Safety

diagnostics pruneの目的は `data.json` 肥大化対策であり、同期失敗を隠すことではない。

以下は禁止する。

- failed_unackedを上限超過だけで削る
- verified=false相当を削る
- unknown_eventを無条件に削る
- outbox / cursor / applied event ID履歴を巻き込んで削る
