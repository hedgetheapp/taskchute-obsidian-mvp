# Git And Pull Request Operation

対象: TaskChute Obsidian MVPの通常開発とrelease作業

## Standard workflow

通常変更は次の順序で進める。

1. `feature/v6.6-routine-sync`で変更する。
2. 影響範囲に応じたtestとstatic checkを実行する。
3. expected filesだけをstageしてcommitする。
4. feature branchをpushする。
5. base `main`、head `feature/v6.6-routine-sync`でPull Requestを作成する。
6. PRのdiff、files、checksを確認する。
7. 問題がなければmainへ反映する。
8. feature branchへ戻し、originと同期する。

PRはレビュー履歴と変更記録を残すために必ず作成する。安全条件を満たす通常作業では、PRをopenのままユーザー確認待ちにせず、main反映まで同じ作業内で進める。

## PR review gate

main反映前に以下を確認する。

- baseが`main`、headが`feature/v6.6-routine-sync`である。
- PRにexpected filesだけが含まれる。
- unexpected runtime diffがない。
- `git diff --check`が成功する。
- `node --check .\main.js`が成功する。
- 文書変更時は必要に応じてMarkdown relative link checkが成功する。
- runtime変更時は影響する`docs/TEST_MATRIX.md`の行とcurrent evidenceを確認する。
- CI checkがある場合は成功または問題なしと判断できる状態である。

問題、unexpected diff、test failure、競合がある場合だけmain反映を停止して報告する。

## Main integration

履歴はfeature commitを維持し、fast-forwardを優先する。GitHub PRのmerge方式でfast-forwardを保証できない場合は、PR作成・確認後にローカルで次を実施してよい。

```powershell
git checkout main
git pull --ff-only origin main
git merge --ff-only origin/feature/v6.6-routine-sync
git push origin main
```

反映後、PRがmergedまたはclosedになったことを確認する。openのまま残る場合はbase/head間のdiffが0であることを確認してcloseする。

禁止事項:

- main上で直接実装commitを作る。
- merge commitを不要に作る。
- rebase、force push、squashを通常手順として使う。
- test failureやunexpected diffを無視してmainへ反映する。

## Release workflow

Releaseは次の順序で進める。

1. featureでversion、CHANGELOG、canonical docs、manifestを更新する。
2. testとstatic checkを実行する。
3. commitしてfeatureをpushする。
4. PRを作成してdiffとchecksを確認する。
5. mainへfast-forward反映する。
6. mainへ反映されたrelease commitへ新規tagを作成する。
7. GitHub Releaseを作成し、assetsを確認する。
8. featureへ戻る。

Release後のdocs-only cleanupも通常PR運用でmainへ反映する。公開済みtagやGitHub Releaseは移動・上書きしない。
