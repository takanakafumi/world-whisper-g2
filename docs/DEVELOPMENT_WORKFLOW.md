# PCレス開発フロー

## 目標
旅行中もPCを持たず、スマホから要望を伝え、Even G2で検証して改善を繰り返す。

## 構成
スマートフォン → Codex → GitHub → GitHub Actions → GitHub Pages／API → Even App → BLE → Even G2

## 開発サイクル
1. G2を使って気づきを得る
2. スマホからGitHub IssueまたはCodexに変更を伝える
3. コード変更・ビルド・公開
4. Even Appから読み直してG2で確認
5. 結果をIssueへ記録し、必要なら次のIssueを作る

## 検証の順序
1. 公式サンプルをG2で起動
2. World Whisperの固定文をG2に表示
3. 外部HTTPS URLをEven Appから読み込む
4. GitHub Actionsでビルド・配布を自動化
5. 位置情報とLLMによるささやき生成を追加

## 運用上の注意
- GitHub Pagesは静的配信用。LLMや外部APIのキーは置かない
- 生成APIはCloudflare Workers／Vercel Functions等のバックエンドに分離する
- APIキー、位置履歴、個人データはリポジトリへコミットしない
