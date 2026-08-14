# Development Workflow

対象: TaskChute Obsidian MVPの通常開発、検証、release作業

## Delivery states

変更の状態は次の4つを区別する。

- **Integrated**: feature commitがPR review gateを通過し、mainへ反映済み。実機確認は未完了の場合がある。
- **Prereleased / Test-distributed**: Integratedなcommitへ新規tagを作成し、GitHub Prereleaseと固定assetsをBRAT試験用に公開済み。実機確認は未完了でもよい。
- **Verified**: ユーザーが対象versionを実機で確認し、current evidenceが`TEST_MATRIX.md`へ反映済み。
- **Released**: Verifiedな配布物を安定配布対象として公開済み。Prereleaseを同一versionのまま差し替えてReleasedへ昇格させない。

mainへ入っただけの変更やPrerelease公開だけをVerifiedまたはReleasedとして扱わない。syntax check、helper test、PR merge、GitHub Prereleaseも実機証跡の代替にはならない。

BRATで実機試験するruntime、UI、Bridge変更は、Integrated後に同一配布物を固定したPrereleaseを先に公開してよい。公開後のtag、GitHub Release、assetsは移動・置換・上書きしない。不具合が見つかった場合は次versionで修正する。

Docs-only変更は、runtime、UI、Bridge挙動に影響しないことをdiffで確認できた場合、実機確認なしでreleaseしてよい。

## Standard workflow

通常変更は次の順序で進める。

1. `feature/v6.6-routine-sync`で変更する。
2. 影響範囲に応じたtestとstatic checkを実行する。
3. expected filesだけをstageしてcommitする。
4. feature branchをpushする。
5. base `main`、head `feature/v6.6-routine-sync`でPull Requestを作成する。
6. PRのdiff、files、checksを確認する。
7. 問題がなければmainへ反映し、状態をIntegratedとする。
8. feature branchへ戻し、originと同期する。
9. BRAT配布が必要なら新規tagとGitHub Prereleaseを作成し、Prereleased / Test-distributedとする。
10. 公開した同一assetsをユーザーが実機確認し、TEST_MATRIXへcurrent evidenceを記録してVerifiedとする。

PRはレビュー履歴と変更記録を残すために必ず作成する。安全条件を満たす通常作業では、PRをopenのままユーザー確認待ちにせず、main反映まで同じ作業内で進める。実機確認を待つのはVerified判定の段階であり、IntegratedおよびBRAT test distributionとは分ける。

## PR review gate

main反映前に以下を確認する。

- baseが`main`、headが`feature/v6.6-routine-sync`である。
- PRにexpected filesだけが含まれる。
- unexpected runtime diffがない。
- `git diff --check`が成功する。
- `node --check .\main.js`が成功する。
- 文書変更時はMarkdown relative link checkが成功する。
- runtime変更時は影響する`docs/TEST_MATRIX.md`の行を確認する。
- CI checkがある場合は成功または問題なしと判断できる状態である。

問題、unexpected diff、test failure、競合がある場合だけmain反映を停止して報告する。

## Specification authority

Codexは既存の`SPEC.md`、`ARCHITECTURE.md`、`DECISIONS.md`とユーザー指示の範囲で軽微な内部実装詳細を決めてよい。次は独断で決めず、実装またはmain反映を停止してユーザーへ報告する。

- ユーザーが観測する挙動を変更する判断。
- identity、sync、Ack、cursor、lifecycle、payload semanticsの意味変更。
- データ損失やidentity書換えを伴い得るdestructive migration。
- canonical docs間の矛盾を一方的な推測で解消する変更。

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
- IntegratedまたはPrereleasedをVerifiedまたはReleasedと表示する。

## TEST_MATRIX update rule

- Codexによる実装完了、syntax check、local helper testだけではcurrent `PASS`にしない。
- ユーザー実機確認が成功し、対象version、端末、操作、物理状態をcurrent evidenceとして記録できた場合だけ`PASS`にする。
- 明示的な不合格は`FAIL`、前提や環境により判定不能なら`BLOCKED`、未確認なら`NOT_VERIFIED`とする。
- historical PASSをcurrent versionへ自動継承しない。

## BRAT Prerelease workflow

Runtime、UI、Bridge変更をBRATで実機試験する場合は次の順序で進める。

1. featureで実装し、version、CHANGELOG、canonical docs、manifestを試験対象versionへ更新する。
2. synthetic / structural testとstatic checkを実行し、実機未確認項目はTEST_MATRIXで`NOT_VERIFIED`のままにする。
3. commit、feature push、PR reviewを経てmainへfast-forward反映し、Integratedとする。
4. main上のcommitへ新規tagを作成し、GitHub Prereleaseと`main.js`、`manifest.json`、`styles.css`を公開する。
5. tag targetとassetsを確認し、Prereleased / Test-distributedとする。
6. featureへ戻し、remote branch SHAとclean worktreeを確認する。
7. ユーザーが公開済みの同一assetsを実Vault / 実mobileで試験する。
8. current evidenceをTEST_MATRIXへ通常PRで記録し、条件を満たした項目をVerifiedとする。

公開済みtag、GitHub Release、assetsは同一versionのまま移動・置換・上書きしない。Prereleaseで不具合が見つかった場合は次versionで修正し、新しいtagとPrereleaseを作成する。

## Stable release workflow

安定配布としてReleasedにする場合は、Verifiedな証跡と対象配布物を確認し、新しいversionとして通常のfeature / PR / fast-forward手順を通す。同じPrereleaseのtagやassetsを書き換えて安定版へ見せ替えない。

Docs-only releaseはruntime、UI、Bridge diffが0であることを確認できれば、実機確認を省略できる。Release後のdocs-only cleanupも通常PR運用でmainへ反映する。
