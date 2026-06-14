# TaskStarted and Reset Semantics

作成: 2026-06-14 12:28:11 JST
ステータス: v6.5 RC2固定候補 docs反映用

## TaskStarted

TaskStartedは `started_at` payloadを正とする。

受信applyでは、UI上の表示だけではなく、以下の保存結果が揃った場合のみAckする。

- TaskBoard row / runtime更新
- Log開始ログ
- LogDaily開始ログ
- runtime.running
- 保存後再読込検証成功

## v6.5 RC2: 開始時セクション移動

v6.5 RC2では、RC1固定後のPC 2 Vault運用試験で検出したTaskStarted開始時セクション不整合を修正対象として固定する。

タスク開始時は、`started_at` のUTC ISOを文字列上のHH:mmとして扱わず、端末ローカル時刻へ変換してセクション判定する。開始時刻に対応するセクションが現在位置と異なる場合は、開始前にTaskBoard行を移動する。

開始時セクション移動が発生する場合の送信順:

```text
TaskMoved -> TaskStarted
```

TaskMoved要件:

- `taskmoved_payload_source = task-start-section-move-confirmed-markdown-v3`
- 保存後Markdownを再読込して、entry_idの物理位置から `from` / `to` / `target_order_task_ids` を作る
- 行コメントの `section` / `section_id` も移動先に更新する

TaskStarted payload要件:

- `section_id` / `section` / `section_label` は古いtask/cache/occurrenceから作らない
- 開始時移動後、保存後Markdownを再読込し、entry_idの物理位置から作る
- remote applyではpayload sectionだけを絶対視せず、保存後検証成功時のみAckする

禁止:

- UTC文字列上のHH:mmをそのままセクション判定へ使う
- 開始時セクション移動があるのにTaskStartedだけを送る
- 物理見出しと行コメント `section` / `section_id` をズラす
- false-appliedやcursor飛ばしを許容する

## TaskStarted Ack Condition

以下のいずれかが欠ける場合はAckしない。

- TaskBoard rowが開始状態へ反映されていない
- Log開始ログが保存されていない
- LogDaily開始ログが保存されていない
- runtime.runningが保存されていない
- 保存後再読込検証が失敗した

この状態をapplied扱いにするとfalse-appliedになるため禁止する。

## Resume系との分離

resume系は通常開始と分離する。

通常開始ログ必須条件をresume系へ誤適用してはいけない。

## Uキー開始前戻し / 手動開始時刻クリア

開始済みタスクを開始前状態へ戻す操作は、専用イベントを増やさずTaskUpdatedで扱う。

正規化される値:

- `start_actual` 空
- `end_actual` 空
- `run_state=not_started`
- `is_running=false`
- `is_completed=false`

## Remote Apply

remote側では以下を更新・整合する。

- TaskBoard row更新
- runtime.running解除
- Log / LogDailyの対象実行ログを削除または整合
- 保存後検証成功時のみAck

## Safety

開始前戻し / 手動開始時刻クリアでは、以下を禁止する。

- TaskBoard rowだけ更新してAckする
- runtime.running解除漏れのままAckする
- Log / LogDaily整合漏れのままAckする
- 保存後検証なしでAckする
- apply失敗時にcursorだけ進める
