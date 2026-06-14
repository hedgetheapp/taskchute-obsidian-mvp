# RC3 FIXED Distribution Notes

対象: Taskchute Bridge v6.5 RC3 FIXED  
位置づけ: 本番導入前の固定版配布メモ

---

## 現在地

v6.5 RC3 FIXED は、開発・検証・配布導線まで完了済み。

完了済み:

- v6.5 RC3 FIXED 確定
- 三端末起点スモーク合格
  - dev起点
  - remote起点
  - mobile起点
- mobile BG/hidden復帰確認済み
- 完了済みTaskDeleted確認済み
- 配布ZIP実導入合格
- GitHub repo配布導線作成
- BRAT frozen release tag導入成功
- BRATリリース運用方針FIX

成功済みBRAT tag:

```text
v0.6.15-bridge-v6.5-rc3-fixed-3
```

---

## 本番導入

本番導入は保留。

理由:

- 完璧に仕上げてから本番へ入れるため
- 現時点では、本番導入ではなく配布運用・ドキュメント・リリース手順を固定する

---

## RC3 FIXED固定範囲

RC3 FIXED本体の同期ロジックは固定済みとして扱う。

変更しない:

- main.js内のBridge同期ロジック
- mobile BG/hidden復帰drain周辺
- TaskDeleted missing target冪等Ack周辺
- TaskMoved v3 / section move confirmed markdown周辺
- 既存の三端末スモーク合格済み挙動

変更する場合:

- RC3.1またはv6.6候補として扱う
- 配布運用仕上げとは別フェーズにする
- 三端末起点スモークを再実施する
- mobile BG/hidden復帰を再確認する
- 完了済みTaskDeletedを再確認する

---

## 次候補

配布運用固定後、v6.6候補の優先順位を決める。

候補:

- Routine同期
- Android Widget
- Pixel Watch
- 日付またぎ / セクションまたぎ強化
- 並び替えUX改善
