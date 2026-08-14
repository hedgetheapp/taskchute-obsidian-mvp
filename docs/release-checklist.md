# Release Checklist

対象: Taskchute Bridge v6.5 RC3 FIXED 以降  
用途: GitHub Release / BRAT frozen release tag 配布前チェック

---

## 1. 必須チェック

- [ ] canonical docsをrelease対象versionへ更新
- [ ] root `CHANGELOG.md`の先頭へrelease-level summaryを追加
- [ ] CHANGELOGにruntime変更の有無、verification、tag、release commitを記録
- [ ] `node --check .\main.js` 成功
- [ ] `manifest.json` の `version` 確認
- [ ] feature branchをpush
- [ ] base `main` / head `feature/v6.6-routine-sync`でPR作成
- [ ] PRのchanged filesとdiffがrelease scopeどおり
- [ ] PR checks成功または問題なしを確認
- [ ] mainへfast-forward反映後のrelease commitを確認
- [ ] BRAT Prereleaseの場合、runtime / UI / Bridgeの未実施項目をTEST_MATRIXで`NOT_VERIFIED`としている
- [ ] BRAT Prereleaseの場合、titleと本文に実機試験用であり未Verifiedであることを明記
- [ ] stable releaseの場合、ユーザー実機確認とTEST_MATRIXのcurrent evidenceを確認
- [ ] docs-onlyで実機確認を省略する場合はruntime / UI / Bridge diff 0を確認
- [ ] tagが `v{manifest.version}` 形式
- [ ] tagがmain反映後のrelease commitを指す
- [ ] release titleにBridge世代・RC名を記載
- [ ] Release assetsに `main.js` を個別添付
- [ ] Release assetsに `manifest.json` を個別添付
- [ ] Release assetsに `styles.css` を個別添付
- [ ] ZIPだけ添付になっていない
- [ ] `data.json` を含めていない
- [ ] API tokenを含めていない
- [ ] Vault内Taskchuteデータを含めていない
- [ ] `Taskchute/_system/index.json` を含めていない
- [ ] バックアップファイルを含めていない
- [ ] 個人データ・実運用ログを含めていない
- [ ] release後cleanupは公開済みtagへ含めず、tag / Releaseを移動・上書きしない
- [ ] 公開後に同一versionのassetsを差し替えず、不具合時は次versionにする
- [ ] main反映後にfeature branchへ戻り、両remote SHAとclean worktreeを確認

---

## 2. 推奨チェック

- [ ] 任意ZIPの中身が `main.js` / `manifest.json` / `styles.css` のみ
- [ ] Release本文に必須assetsを明記
- [ ] Release本文に任意assetsを明記
- [ ] Release本文に禁止物を明記
- [ ] BRATでreinstall / reload確認
- [ ] 新規Vaultまたは検証Vaultでプラグイン起動確認
- [ ] version mismatch警告が出ないことを確認

---

## 3. 同期ロジック変更時だけ必須

RC3 FIXED本体の同期ロジックを変更した場合のみ、以下を必須にする。

- [ ] RC3 FIXED固定扱いを解除する
- [ ] RC3.1またはv6.6候補として別管理する
- [ ] 三端末起点スモークを再実施する
- [ ] mobile BG/hidden復帰を再確認する
- [ ] 完了済みTaskDeletedを再確認する
- [ ] Release本文に同期ロジック変更ありと明記する

---

## 4. Release本文テンプレート

```md
# Taskchute Bridge v6.5 RC4

## 配布方式

BRAT frozen release tag向け固定版。

## 必須assets

- main.js
- manifest.json
- styles.css

## 任意assets

- taskchute-obsidian-mvp-v0.6.16.zip

## 注意

- ZIPのみ添付は禁止
- data.json / API token / Vaultデータ / 実運用ログは含めない
- RC3 FIXED本体の同期ロジックを変更した場合は、RC3.1またはv6.6候補として扱う
```
