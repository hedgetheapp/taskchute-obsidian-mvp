# TaskChute Bridge v6.6 Routine同期 引継ぎ

v0.6.17は通常Routine同期のBRAT Test 2候補。

確認対象:

1. daily Routineが表示対象日ごとに生成される。
2. Routine名・見積・開始予定・section・属性・リンク・Subtasks変更が未実行生成済み行へ反映される。
3. Routine無効化・条件変更で当日以降の未実行生成済み行が削除され、保護対象は残る。
4. 今回のみスキップ・キャンセル・削除が他端末へ反映され、再生成されない。
5. Rotation Routineのローカル生成・履歴・表示が退行しない。
6. false-applied、cursor飛ばし、派生Taskイベントのechoが発生しない。
