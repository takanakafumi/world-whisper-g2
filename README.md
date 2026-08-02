# World Whisper for Even G2

最初のPoCです。Even G2に固定のメッセージを表示し、ダブルタップで終了します。

## 動かし方

```powershell
npm install
npm run dev
```

シミュレータは `npm run simulate`、実機は開発サーバーを起動後に `npx evenhub qr --url http://<PCのIPアドレス>:5173` を実行して、Even HubアプリでQRコードを読み込みます。

次の実装では、この固定文を「現在地・時刻」から生成するささやきに置き換えます。
