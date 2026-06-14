# BRAT実機試験用 Release 作成チェックリスト v6.6 Routine同期

## 目的

v6.6 Routine同期の実機試験は、ローカルコピーではなくObsidian BRATでGitHub Release assetsからダウンロードして行う。

## Release作成前

- [ ] 作業ブランチは `feature/v6.6-routine-sync`
- [ ] `node --check .\main.js` 成功
- [ ] `git status --short` に意図しない差分なし
- [ ] `data.json` なし
- [ ] API tokenなし
- [ ] Vault内Taskchuteデータなし
- [ ] `Taskchute/_system/index.json` なし
- [ ] ログ/バックアップ/個人データなし
- [ ] `manifest.json` version確認済み

## Release assets必須

- [ ] `main.js`
- [ ] `manifest.json`
- [ ] `styles.css`

ZIPは任意。ZIPのみ添付は禁止。

## 推奨tag

```text
v0.6.16
```

## 推奨release title

```text
Taskchute Bridge v6.6 Routine Sync Test 1
```

## BRAT確認

- [ ] BRATで対象repo/tagを指定
- [ ] Plugin reinstall/reload成功
- [ ] version mismatchがある場合、manifest versionとtag名の差分由来か確認
- [ ] dev / remote / mobileで同じRelease assetsから導入

## 実機試験開始条件

- [ ] 三端末で同一BRAT releaseを導入済み
- [ ] Bridge設定が正しい
- [ ] dev-user / device_id の想定が揃っている
- [ ] 旧pendingが試験に影響しない状態
