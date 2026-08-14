# BRAT Release Operation

対象: Taskchute Bridge v6.5 RC3 FIXED 以降  
目的: BRAT frozen release tag による固定版配布の手順を固定する

---

## 基本方針

固定版配布は BRAT frozen release tag を基本とする。

GitHub Release assets には、毎回以下3ファイルを個別添付する。

```text
main.js
manifest.json
styles.css
```

ZIPは任意。ZIPは補助配布物であり、BRAT用の正配布物は個別assetsとする。

---

## 禁止物

Release assets / ZIP に以下を含めない。

- `data.json`
- API token
- Vault内Taskchuteデータ
- `Taskchute/_system/index.json`
- バックアップファイル
- 個人データ
- 実運用ログ

---

## tag / manifest version

次回以降のtagは `manifest.json` の `version` に寄せる。

例:

```text
manifest version: 0.6.16
tag: v0.6.16
release title: Taskchute Bridge v6.5 RC4
```

原則:

- `manifest.json` の `version` を正とする
- tagは `v{manifest.version}` とする
- release titleにはBridge世代・RC名を入れる
- RC名・FIXED名・Bridge世代名はrelease titleとrelease本文で管理する
- tag名に長い説明を入れない

過去の成功tagは履歴として維持する。

```text
v0.6.15-bridge-v6.5-rc3-fixed-3
```

このtagは成功実績があるため、改名・削除・上書きしない。

---

## リリース前確認

PowerShell想定。

```powershell
cd C:\Obsidian\20251202-dev\.obsidian\plugins\taskchute-obsidian-mvp
node --check .\main.js
```

確認項目:

- `node --check` が成功する
- `manifest.json` の `version` が次回versionになっている
- `main.js` / `manifest.json` / `styles.css` が存在する
- Release assetsへ3ファイルを個別添付する準備ができている
- 禁止物が含まれていない

## Release workflow

BRAT実機試験用Prereleaseは次の順序で進める。

1. versionを決定する。
2. canonical docsを現行状態へ更新する。
3. root `CHANGELOG.md`の先頭へversion単位の要約を追加する。
4. `manifest.json`のversionを更新する。
5. static checksを実行する。
6. release commitを作成する。
7. branchをpushする。
8. base `main`、head `feature/v6.6-routine-sync`のPull Requestを作成する。
9. PRのdiff、files、checksを確認する。
10. feature branchからmainへfast-forwardし、Integratedとする。
11. runtime、UI、Bridge変更がある場合、未実施の実機項目がTEST_MATRIXで`NOT_VERIFIED`であることを確認する。
12. main上のrelease commitへ新規tagを作成・pushする。
13. GitHub Prereleaseを作成する。
14. 必須assetsを確認し、Prereleased / Test-distributedとする。
15. feature branchへ戻す。
16. 公開した同一assetsをBRATで実Vault / 実mobile試験する。
17. current evidenceをTEST_MATRIXへ通常PRで記録し、Verified判定する。

CHANGELOGには主要変更、runtime変更の有無、事実として確認できたverification、tag、release commitを簡潔に記録する。Git履歴の全commitやhistorical docsを転載しない。Prerelease後のverification記録やdocs cleanup commitは公開済みtagへ含めず、tag、Release、assetsを移動・置換・上書きしない。不具合は次versionで修正する。

通常のPR作成、review gate、4つのdelivery state、main反映方法は[`DEVELOPMENT_WORKFLOW.md`](DEVELOPMENT_WORKFLOW.md)を正とする。BRAT Prereleaseは実機試験前の固定配布を許可するが、Verifiedとは扱わない。Docs-only releaseはruntime、UI、Bridge diffが0の場合に限り、実機確認を省略できる。

---

## 任意ZIP作成

ZIPを作る場合、含めるのは以下3ファイルのみ。

```powershell
Compress-Archive -Path .\main.js, .\manifest.json, .\styles.css -DestinationPath .\taskchute-obsidian-mvp-v0.6.16.zip -Force
```

ZIPだけ添付は禁止。必ず個別assetsも添付する。

---

## GitHub Release 作成例

```text
tag: v0.6.16
title: Taskchute Bridge v6.5 RC4
```

必須assets:

```text
main.js
manifest.json
styles.css
```

任意assets:

```text
taskchute-obsidian-mvp-v0.6.16.zip
```

---

## BRAT導入確認

期待表示例:

```text
Plugin has been reinstalled and reloaded with version 0.6.16
```

確認項目:

- reinstall / reload が成功する
- Obsidianでプラグインが読み込まれる
- manifest version と導入表示が一致する
- version mismatch警告が出ないことが望ましい

過去の成功tag `v0.6.15-bridge-v6.5-rc3-fixed-3` では、tag名とmanifest version `0.6.15` の差によるversion mismatch警告は失敗ではないと判定済み。ただし次回以降はtagをmanifest versionへ寄せる。
