# Taskchute Bridge 引継ぎ v6.5 RC3 FIXED

作成日: 2026-06-14
状態: v6.5 RC3 固定

## 現在の結論

v6.5 RC3候補は、dev / remote / mobile の三端末起点で最終スモークを通過したため、RC3固定として扱う。

最終スモーク結果:

- dev起点一連操作: 合格
- remote起点一連操作: 合格
- mobile起点一連操作: 合格
- mobile起点TaskMoved単独確認: 合格
- 完了済みTaskDeleted: 合格
- mobile hidden / BG復帰: 合格

## 直近の合格確認

### dev起点

一連操作:

- TaskCreated
- TaskUpdated
- TaskMoved
- TaskStarted
- TaskCompleted
- TaskDeleted

結果:

- remote applied
- mobile applied
- UI反映OK

### remote起点

一連操作:

- TaskCreated
- TaskUpdated
- TaskMoved
- TaskStarted
- TaskCompleted
- TaskDeleted

結果:

- dev applied
- mobile applied
- UI反映OK

### mobile起点

一連操作:

- TaskCreated
- TaskUpdated
- TaskStarted
- TaskCompleted
- TaskDeleted

結果:

- dev applied
- remote applied
- UI反映OK

TaskMoved単独確認:

- `night -> afternoon` source `start-plan-section-move-confirmed-markdown-v3`: dev/remote applied
- `afternoon -> free` source `confirmed-markdown-v2`: dev/remote applied
- `free -> night` source `task-start-section-move-confirmed-markdown-v3`: dev/remote applied

## RC3で解消した主な問題

1. mobile BG/hidden復帰時の同期不安定
   - hidden中にpending fetch/apply/Ackしない
   - visible復帰後にdeferred drainを再開
   - network errorとpending 0件を分離

2. 開始予定変更時のsection自動移動漏れ
   - 開始予定時刻からsectionを再解決
   - `section_id`ベースで移動判定
   - section変更時のみTaskMoved v3 enqueue

3. 実行状態イベント未送信
   - TaskStarted / TaskStopped / TaskCompleted の無言破棄を撤廃
   - 実行イベントはappend-onlyとして保護
   - supersede対象から除外

4. 完了済みTaskDeleted未送信
   - 完了済み削除でもTaskDeletedをenqueue/flush
   - `delete_context=completed-task-delete`
   - `is_completed=1`

## 次チャットで最初にやるなら

RC3固定後の次作業候補:

1. RC3長時間放置・再開試験
2. RC3実運用スモーク
3. `section_id / section_label` 表示名揺れの調査
4. 次機能設計へ移行

## 重要な注意

- メモリには保存しない。仕様・引継ぎはmdファイルで管理する。
- 次チャットでも、仕様メモmdと引継ぎmdを必ず添付する。
- D1確認時のJOIN条件は以下を守る。

```sql
LEFT JOIN applied_events am ON am.event_id = e.event_id AND am.device_id = '$MobileDevice'
```

誤って `am.event_id = '$MobileDevice'` のようにしない。

## RC3固定ラベル

`Taskchute Bridge v6.5 RC3 FIXED`
