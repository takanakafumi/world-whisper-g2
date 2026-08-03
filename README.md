# World Whisper for Even G2

Phase 1へ進む前の構造整理版です。Even G2の操作イベントを正規化し、固定メッセージの表示とダブルタップ終了を確認できます。

## 動かし方

```powershell
pnpm install
pnpm dev
```

シミュレータは `pnpm simulate`、実機は開発サーバーを起動後に `pnpm exec evenhub qr --url http://<PCのIPアドレス>:5173` を実行して、Even HubアプリでQRコードを読み込みます。

Windowsでは [`start-local.cmd`](start-local.cmd) をダブルクリックすると、LAN内IPアドレスの検出、開発サーバーの起動、Even Hub用QRコードの表示までを一度に実行できます。終了時は、別ウィンドウで起動した開発サーバーを `Ctrl+C` で停止します。

## スマホから実機確認する

`main` ブランチへ反映すると、GitHub ActionsがアプリをGitHub Pagesへ自動公開します。初回のみ、GitHubリポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択してください。

公開後は、スマホで次のURLをQRコードにしてEven Hubアプリから読み込みます。

```text
https://takanakafumi.github.io/world-whisper-g2/
```

更新時はGitHub Actionsの `Deploy to GitHub Pages` が完了してから、Even Hubアプリで同じURLを読み直します。古い内容が表示される場合は、URLの末尾に `?v=<任意の番号>` を付けて再読み込みしてください。

今回の位置情報診断版が読み込まれていれば、スマホ画面とG2画面の先頭に **`LOCATION DIAGNOSTIC v0.2.4`** と表示されます。この表示がない場合は、GitHub Pagesのデプロイ完了を確認し、クエリ番号を変えて読み直してください。

GitHub Pagesから読み込んだ場合も、実機のタッチ操作はEven Hubアプリのブリッジ経由でアプリへ届きます。公式SDKのイベント種別に合わせ、次の操作を確認できます。

- シングルタップ (`CLICK_EVENT`): 検出した操作と操作回数を表示
- 上方向スライド (`SCROLL_TOP_EVENT`): 検出した方向と操作回数を表示
- 下方向スライド (`SCROLL_BOTTOM_EVENT`): 検出した方向と操作回数を表示
- ダブルタップ (`DOUBLE_CLICK_EVENT`): アプリを終了

イベントを受け取るコンテナには `isEventCapture: 1` を設定しています。実機からのイベント形式の違いも確認できるよう、テキスト、リスト、システムの各イベントに含まれる操作種別を処理します。

### v0.2.2 実機検証結果

左右のつるとEven R1リングで、シングルタップ、上下スライド、ダブルタップ終了がすべて動作することを確認しました。シングルタップは実機環境で `eventType` のない `sysEvent` として届くため、touch由来の `eventSource` を持つイベントをシングルタップとして補完しています。スマホ画面には受信イベント数と生イベントデータを表示し、SDKやファームウェアによる形式差を引き続き確認できます。

### v0.2.3 構造整理

起動処理、アプリ状態、Even Hubイベント正規化、G2表示、スマホ診断を分割しました。`pnpm test` で実機互換イベントと状態遷移の回帰テストを実行できます。Phase 1ではこの基盤へ位置・時刻の文脈取得と、ささやき生成インターフェースを追加します。

### v0.2.4 位置情報診断

スマホ画面の「位置情報を診断」を押すと、緯度・経度・精度・取得時刻、Secure Context判定、実行URLを表示します。権限拒否、位置取得不能、タイムアウト、API未対応を区別します。結果は画面表示だけに使い、保存や外部送信は行いません。

Issue #11の実機検証では、ローカルURLとGitHub Pages URLの両方で診断し、表示された結果をIssueへ記録します。

> GitHub Pagesは静的ファイルを公開します。今後追加するLLMのAPIキー、位置履歴、個人データは置かず、生成処理は別のバックエンドへ分離します。

次の実装では、この固定文を「現在地・時刻」から生成するささやきに置き換えます。

## ドキュメント

プロダクト構想、設計、ロードマップについては、[ドキュメント案内](docs/INDEX.md)から確認できます。
