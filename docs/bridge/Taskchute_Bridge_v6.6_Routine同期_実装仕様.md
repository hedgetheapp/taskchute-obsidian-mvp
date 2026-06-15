# TaskChute Bridge v6.6 Routine同期 実装仕様

- 通常Routineのみ同期する。Rotation Routineは同期しない。
- 定義イベントは`RoutineCreated`、`RoutineUpdated`、`RoutineDeleted`。
- 今回のみ操作は`RoutineOccurrenceSkipped`、`RoutineOccurrenceCancelled`、`RoutineOccurrenceDeleted`。
- occurrence keyは`routine:{routine_id}:{occurrence_date}`。
- RoutineHistory全体は同期しない。
- 定義受信applyの派生Task変更は再enqueueしない。
- 保存後検証成功時のみAckし、部分失敗ではAckしない。
- 通常Routine無効化・条件変更時は、保護対象を残して当日以降の未実行生成済み行を再整合する。
