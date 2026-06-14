# Taskchute Bridge v6.6 Routine同期 仕様書 v1

## 位置づけ

v6.6では、v6.5 RC3 FIXEDで固定済みのBridge同期基盤を前提に、Routine定義の同期とRoutine由来タスク生成の冪等性を実装対象とする。

RC3 FIXED本体の既存同期ロジックは安定版として扱い、Routine同期で必要な変更は **v6.6開発ブランチ** として実装する。

## v6.6のゴール

- 複数端末でRoutine定義を同期できる
- Routine作成・更新・削除・有効/無効・並び替えが他端末へ反映される
- Routineから生成された日付タスクが複数端末で二重生成されない
- Routine由来タスクは生成後、通常タスクとして編集・移動・完了・削除できる
- 既存のTaskCreated / TaskUpdated / TaskMoved / TaskDeleted / Section系 / Category系同期を壊さない

## v6.6でやらないこと

- Android Widget本実装
- Pixel Watch本実装
- Routine変更時の生成済みタスク一括更新
- Routine削除時の生成済みタスク一括削除
- 複雑な繰り返し条件の完全実装
- カレンダー連携
- 本番導入

## 基本方針

### 1. Routine定義と生成済みタスクを分離する

Routine定義は「今後の日付タスクを生成するためのテンプレート」として扱う。

Routineから生成されたタスクは、生成後は通常のTaskとして扱う。

Routine定義を後から変更しても、既に生成済みのタスクは原則として自動更新しない。

### 2. routine_idを正とする

Routine定義の同一性は `routine_id` で判定する。

表示名や保存行、UI上の順番、Markdown上の位置に依存して同一性を判定しない。

### 3. routine_occurrence_keyで二重生成を防ぐ

Routine由来の日付タスクには `routine_occurrence_key` を付与する。

推奨形式:

```text
routine:{routine_id}:date:{YYYY-MM-DD}:time:{scheduled_time_or_empty}
```

例:

```text
routine:rtn-20260614-0001:date:2026-06-15:time:09:00
```

同じ `routine_occurrence_key` のタスクがローカルに既に存在する場合、新規生成しない。

### 4. 削除・無効化は未来生成停止のみ

Routine削除・Routine無効化では、未来の生成を止める。

生成済みタスクは削除しない。

## データモデル

### Routine定義

最低限のフィールド:

```json
{
  "routine_id": "rtn-...",
  "title": "朝レビュー",
  "enabled": true,
  "scheduled_time": "09:00",
  "section_id": "sec-morning",
  "estimate_min": 15,
  "project_id": null,
  "mode_id": null,
  "category_id": null,
  "area_id": null,
  "client_id": null,
  "sort_index": 1000,
  "updated_at": "2026-06-14T00:00:00.000Z",
  "deleted_at": null
}
```

### Routine由来タスク

TaskCreated payloadへ追加するRoutine由来情報:

```json
{
  "generated_by_routine_id": "rtn-...",
  "routine_occurrence_key": "routine:rtn-...:date:2026-06-15:time:09:00",
  "routine_generated_for_date": "2026-06-15",
  "routine_scheduled_time": "09:00"
}
```

## Bridgeイベント

### RoutineCreated

Routine定義の新規作成。

payload例:

```json
{
  "routine_id": "rtn-20260614-0001",
  "title": "朝レビュー",
  "enabled": true,
  "scheduled_time": "09:00",
  "section_id": "sec-morning",
  "estimate_min": 15,
  "project_id": null,
  "mode_id": null,
  "category_id": null,
  "area_id": null,
  "client_id": null,
  "sort_index": 1000,
  "updated_at": "2026-06-14T00:00:00.000Z",
  "deleted_at": null
}
```

適用方針:

- `routine_id` が未存在なら作成
- `routine_id` が既に存在する場合は、より新しい `updated_at` を採用
- 同一または古いイベントは冪等Ack

### RoutineUpdated

Routine定義の更新。

対象:

- title
- enabled
- scheduled_time
- section_id
- estimate_min
- project/mode/category/area/client属性
- sort_index
- deleted_at解除など

適用方針:

- `routine_id` が存在する場合は更新
- `routine_id` が未存在の場合は安全側としてupsertを許可する
- `updated_at` が古い場合は冪等Ack

### RoutineDeleted

Routine定義の削除。

payload例:

```json
{
  "routine_id": "rtn-20260614-0001",
  "deleted_at": "2026-06-14T00:00:00.000Z",
  "updated_at": "2026-06-14T00:00:00.000Z"
}
```

適用方針:

- Routine定義を削除済み扱いにする、または物理削除する
- 生成済みタスクは削除しない
- 対象Routineが存在しない場合は冪等Ack

### RoutineReordered

Routine表示順の同期。

payload例:

```json
{
  "target_order_routine_ids": [
    "rtn-001",
    "rtn-002",
    "rtn-003"
  ],
  "updated_at": "2026-06-14T00:00:00.000Z"
}
```

適用方針:

- 既知Routineのみ順序更新
- 未知Routine IDが含まれていても即失敗させず、既知分を安全に反映
- 完全一致が必要な場合は診断ログへ出す

## 送信enqueue方針

### Routine作成

UIでRoutineが新規作成されたら `RoutineCreated` をenqueueする。

### Routine更新

Routineの属性変更時に `RoutineUpdated` をenqueueする。

短時間の連続編集は、既存TaskUpdatedのcoalesce方針に準じてまとめてもよい。

ただし、削除イベントとは混ぜない。

### Routine削除

Routine削除時に `RoutineDeleted` をenqueueする。

削除は更新イベントに潰されないよう、coalesceキーを分離する。

### Routine並び替え

Routine並び替え時に `RoutineReordered` をenqueueする。

`target_order_routine_ids` を優先し、単純なindexだけに依存しない。

## 受信apply方針

### 冪等Ack

以下は失敗ではなく冪等Ackにする。

- 既に同じRoutineCreatedが反映済み
- 古いRoutineUpdatedを受信
- 既に削除済みのRoutineDeletedを再受信
- 対象Routineが存在しないRoutineDeleted
- 既に同じ順序のRoutineReordered

### 未知section_id

Routineが参照する `section_id` が未知の場合、初回v6.6では以下の安全方針にする。

- Routine定義自体は保存する
- UI上はセクション未解決として扱う、または「セクションなし」にフォールバックする
- 診断ログに `routine_unknown_section_id` を出す
- 可能ならSectionCreatedが後着した時点で再解決する

## Routine生成タスクの冪等性

### 生成判定

Routineから特定日付のタスクを生成する前に、同じ `routine_occurrence_key` を持つタスクが存在するかを確認する。

存在する場合:

- 新規TaskCreatedは発行しない
- ローカル生成もしない
- 診断ログに `routine_occurrence_already_exists` を出す

存在しない場合:

- 通常のTaskCreatedとして生成する
- payloadにRoutine由来情報を付ける

### 受信TaskCreated側

受信したTaskCreatedに `routine_occurrence_key` がある場合、同じキーのローカルタスクを探索する。

存在する場合:

- 新規作成しない
- 既存タスクの `entry_id` / `task_id` と競合しないように冪等Ackする
- 必要なら診断ログに `routine_taskcreated_duplicate_occurrence_acked` を出す

存在しない場合:

- 通常通りTaskCreatedを適用する

## 保存形式への要求

現行Routine保存形式がどこであっても、v6.6では以下を満たす必要がある。

- `routine_id` が永続化される
- `updated_at` / `deleted_at` が比較可能な形式で永続化される
- `enabled` が永続化される
- 並び順を復元できる
- Routine由来タスク側に `routine_occurrence_key` が永続化される

## 診断ログ

追加推奨ログ:

- `routine_created_enqueued`
- `routine_updated_enqueued`
- `routine_deleted_enqueued`
- `routine_reordered_enqueued`
- `routine_created_applied`
- `routine_updated_applied`
- `routine_deleted_applied`
- `routine_reordered_applied`
- `routine_event_stale_acked`
- `routine_deleted_missing_target_acked`
- `routine_unknown_section_id`
- `routine_occurrence_already_exists`
- `routine_taskcreated_duplicate_occurrence_acked`

## UI方針

既存Routine UIを大きく変えない。

v6.6では同期に必要な内部IDと冪等性を優先し、UI刷新はしない。

ユーザーに見せない内部情報:

- routine_id
- routine_occurrence_key
- updated_at
- deleted_at

## 試験合格条件

v6.6 RC化前に以下を満たす。

- dev起点Routine作成がremote/mobileへ反映される
- remote起点Routine更新がdev/mobileへ反映される
- mobile起点Routine無効化がdev/remoteへ反映される
- Routine削除が他端末へ反映され、生成済みタスクは消えない
- Routine並び替えが他端末へ反映される
- dev/remote/mobile同時起動でもRoutine由来タスクが二重生成されない
- オフライン復帰後もRoutine由来タスクが二重生成されない
- 通常TaskCreated / Updated / Moved / Deletedが従来通り動く
- mobile BG/hidden復帰drainに影響しない
- `node --check .\main.js` が通る

## リリース運用

v6.6で配布する場合は、v6.5 RC3 FIXEDで確定したBRAT配布運用ルールを継続する。

- manifest versionを更新する
- tagは `v{manifest.version}` に寄せる
- Release assetsに `main.js` / `manifest.json` / `styles.css` を個別添付する
- ZIPのみは禁止
