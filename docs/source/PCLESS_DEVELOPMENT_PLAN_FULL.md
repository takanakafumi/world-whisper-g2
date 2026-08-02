Even G2 旅アプリ PCレス開発環境 構想
## 1. 目的
Even G2を実際の旅行中に使用しながら、外出先からスマートフォンだけでアプリを改良できる開発環境を構築する。
PCを持ち歩くことは前提とせず、以下の役割を分離する。
スマートフォン：開発指示・動作確認
Codex：プログラムの実装・修正
GitHub：ソースコードの管理
GitHub Actions：Buildの自動化
GitHub Pages：開発中Webアプリの配布
Even App：スマートフォン上でEven G2アプリを実行
Even G2：最終的な表示デバイス

## 2. 全体構成
                        Internet
                            │
                            │
                     ┌──────▼──────┐
                     │ スマートフォン │
                     │              │
                     │ ・Codex操作   │
                     │ ・GitHub操作  │
                     │ ・動作確認    │
                     └──────┬───────┘
                            │
                 ┌──────────▼──────────┐
                 │       GitHub         │
                 │                     │
                 │ Repository          │
                 │ ソースコード         │
                 └──────────┬──────────┘
                            │
                      GitHub Actions
                            │
                     npm build等
                            │
                 ┌──────────▼──────────┐
                 │    GitHub Pages      │
                 │                     │
                 │ HTTPSでWebアプリ配布  │
                 └──────────┬──────────┘
                            │
                         HTTPS
                            │
                 ┌──────────▼──────────┐
                 │     Even App         │
                 │   (スマートフォン)    │
                 └──────────┬──────────┘
                            │
                           BLE
                            │
                 ┌──────────▼──────────┐
                 │       Even G2        │
                 │                     │
                 │   情報を表示・操作     │
                 └─────────────────────┘


## 3. 基本的な考え方
今回の構成では、スマートフォン自体を開発環境にはしない。
スマートフォンは、
「Codexに開発を指示する端末」
「完成したアプリを実際に使う端末」
として利用する。
実際の開発処理はクラウド上のGitHub/Codex側で行う。
そのため、旅行中にPCを持ち歩く必要がなくなる。

## 4. 開発フロー
### Step 1：スマートフォンからCodexへ指示
例えば、
「現在地から目的地までのルートを表示する。G2では次の曲がり角だけ表示するように変更して。」
などとスマートフォンから指示する。
### Step 2：Codexがソースコードを変更
CodexがGitHub Repository上のコードを編集する。
src/
├── App.tsx
├── components/
├── services/
└── ...

必要に応じて、
TypeScript
React
Even SDK
API連携
UI
G2向け表示処理
などを変更する。
### Step 3：GitHubへ反映
Codexが変更内容をcommit / pushする。
Codex
 ↓
GitHub Repository

### Step 4：GitHub ActionsでBuild
GitHub Actionsを利用して自動的にBuildする。
git push
   ↓
GitHub Actions
   ↓
npm install
   ↓
npm run build

### Step 5：GitHub Pagesへ公開
BuildされたWebアプリをGitHub PagesからHTTPSで公開する。
例えば、
https://xxxxx.github.io/travel-g2/

のようなURLでアクセスできる状態にする。
### Step 6：Even Appから読み込む
Even HubのLocal Testingで利用できる仕組みを使い、GitHub Pages上のWebアプリをEven Appから読み込む。
GitHub Pages
       ↓ HTTPS
Even App
       ↓ BLE
Even G2

### Step 7：実際のG2で確認
旅行中の実環境で、
現在地
GPS
周辺情報
ナビゲーション
実際の視認性
G2でのUI/UX
などを確認する。
問題があれば、再びスマートフォンからCodexへ指示する。

## 5. 旅先での想定サイクル
① G2を使って旅行
       ↓
② 「ここ、こうした方がいい」と気付く
       ↓
③ スマホからCodexへ指示
       ↓
④ Codexがコードを修正
       ↓
⑤ GitHubへpush
       ↓
⑥ GitHub ActionsでBuild
       ↓
⑦ GitHub Pages更新
       ↓
⑧ Even Appから再読み込み
       ↓
⑨ G2で確認
       ↓
⑩ また旅行を続ける

このサイクルを繰り返す。
つまり、
「実際に使う → 気付く → AIに修正させる → すぐ試す」
という開発スタイルを旅行中に実現する。

## 6. GitHub Pagesを利用する理由
当初はAWS等のクラウドサーバーを用意する案も考えられるが、今回のアプリが静的Webアプリとして動作する範囲であれば、まずはGitHub Pagesを利用する。
メリット
別途Webサーバーを管理する必要がない
HTTPSで公開できる
GitHub Repositoryと一体化できる
GitHub Actionsと組み合わせてBuild・公開を自動化できる
Codexとの相性が良い
PCレス運用に適している
ランニングコストを抑えられる
注意点
GitHub Pagesは「開発サーバー」ではない。
そのため、
Hot Reload
開発中のリアルタイム更新
サーバーサイド処理
などが必要になった場合は、別途クラウド上の開発サーバーを検討する。
まずはGitHub Pagesによる静的配信で成立するかを検証する。

## 7. Local Testingと正式テストの使い分け
Even G2の開発では、用途に応じて以下を使い分ける。
開発中
ソースコード
 ↓
Build
 ↓
Webアプリ
 ↓
Even App
 ↓
G2

Webアプリとして動作確認を繰り返す。
ある程度完成したら
ソースコード
 ↓
Even Hub CLI
 ↓
.ehpk
 ↓
Even Hub
 ↓
Private / Beta Testing
 ↓
Even App
 ↓
G2

という正式なパッケージベースのテストに移行する。

## 8. GitHub Repositoryの想定構成
travel-g2/
│
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   └── ...
│
├── public/
│
├── app.json
├── package.json
├── vite.config.ts
├── tsconfig.json
│
└── .github/
    └── workflows/
        └── deploy.yml

GitHub Actionsでは、
push
 ↓
npm install
 ↓
npm run build
 ↓
GitHub PagesへDeploy

を自動化する。

## 9. Codexの役割
Codexは単なるコード生成ツールではなく、今回の構成ではクラウド上の開発者として位置付ける。
想定する役割は、
Repositoryの理解
コード変更
ファイル追加・削除
npm関連処理
Build
エラー解析
Gitへのcommit
GitHubへのpush
GitHub Actionsのエラー修正
など。
これにより、ユーザーはスマートフォンから、
「こういう機能にしたい」
という要求を伝えることに集中できる。

## 10. PCレス開発環境としての最終イメージ
【人間】
旅行しながらG2を使用
       │
       │ 気付き・要求
       ▼
【スマートフォン】
Codexへ指示
       │
       ▼
【Codex】
コードを修正
       │
       ▼
【GitHub】
ソースコード管理
       │
       ▼
【GitHub Actions】
自動Build
       │
       ▼
【GitHub Pages】
Webアプリ公開
       │
       ▼
【Even App】
アプリ実行
       │
       │ BLE
       ▼
【Even G2】
実環境で確認
       │
       └────────→ 改善要求へ戻る


## 11. 最初に検証すべきこと
いきなりCodexや自動Buildまで構築せず、以下の順番で小さく検証する。
### Phase 1：Even G2の基本動作
Even Hubでサンプルアプリを作成
Even AppからG2で実行
G2上でのWebアプリ動作を確認
### Phase 2：GitHub Pages
サンプルアプリをGitHubへ配置
GitHub PagesでHTTPS公開
スマートフォンからアクセスできることを確認
### Phase 3：Even Appとの接続
GitHub PagesのURLをEven Appから読み込む
G2上で動作するか確認
ここが今回の構想における最重要PoC。
### Phase 4：自動Build
GitHub Actionsを追加。
push
 ↓
Build
 ↓
GitHub Pages更新

を自動化する。
### Phase 5：Codex
Codexから、
コード修正
 ↓
commit
 ↓
push
 ↓
Actions
 ↓
Pages

まで実行できるようにする。
### Phase 6：実際の旅で使用
ここまで完成したら、PCを持たずに旅行へ行き、
「G2を使いながらスマホでアプリを改良する」
という本来の開発体験を検証する。

## 12. 現時点での構想上の結論
現時点では、以下の構成が最もシンプルな第一候補となる。
スマートフォン
＋
Codex
＋
GitHub
＋
GitHub Actions
＋
GitHub Pages
＋
Even App
＋
Even G2
AWS等の専用サーバーは、GitHub Pagesでは対応できない要件が出てから追加する。
最初から大規模なクラウド環境を構築するのではなく、
GitHubを中心に、できるだけサーバーレスでPCレス開発環境を作る
方針とする。
最終的な目標は、
「旅行中、PCを持たずにEven G2を使い、スマートフォンからCodexに指示するだけで、旅アプリをその場で改良して再びG2で試せる環境」
の実現である。
