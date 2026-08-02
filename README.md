# World Whisper for Even G2

最初のPoCです。Even G2に固定のメッセージを表示し、ダブルタップで終了します。

## 動かし方

```powershell
npm install
npm run dev
```

シミュレータは `npm run simulate`、実機は開発サーバーを起動後に `npx evenhub qr --url http://<PCのIPアドレス>:5173` を実行して、Even HubアプリでQRコードを読み込みます。

## スマホから実機確認する

`main` ブランチへ反映すると、GitHub ActionsがアプリをGitHub Pagesへ自動公開します。初回のみ、GitHubリポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。

公開後は、スマホで次のURLをQRコードにしてEven Hubアプリから読み込みます。

```text
https://takanakafumi.github.io/world-whisper-g2/
```

更新時はGitHub Actionsの `Deploy to GitHub Pages` が完了してから、Even Hubアプリで同じURLを読み直します。古い内容が表示される場合は、URLの末尾に `?v=<任意の番号>` を付けて再読み込みしてください。

> GitHub Pagesは静的ファイルを公開します。今後追加するLLMのAPIキー、位置履歴、個人データは置かず、生成処理は別のバックエンドへ分離します。

次の実装では、この固定文を「現在地・時刻」から生成するささやきに置き換えます。
