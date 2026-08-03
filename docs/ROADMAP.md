# World Whisper G2 Roadmap

## 現在地
- 公式テストアプリとWorld Whisperの固定メッセージをG2実機に表示確認済み
- 両つる・リングで上下スライドとダブルタップ終了を実機確認済み
- シングルタップはeventTypeなしのsysEventとして到達することを確認し、touch由来イベントとして互換処理を追加

## Phase 0 — 実機表示PoC
**完了条件**：Even G2でWorld Whisperの固定文が表示され、ダブルタップで終了できる。

1. ✅ Even Hub／G2で公式サンプルを実機起動
2. ✅ World Whisper PoCをG2に表示
3. GitHub Pagesへ自動公開
4. 公開したHTTPS URLをEven Appで読み込めるか実機検証
5. ✅ 両つる・リングで上下スライドとダブルタップ終了を確認
6. ✅ シングルタップがeventTypeなし・eventSource付きsysEventで到達することを確認

## Phase 1 — 最小の「ささやき」
**完了条件**：スマホの位置情報と時刻を入力に、50文字以内の1文を手動で生成・表示できる。

## Phase 2 — 文脈と操作
**完了条件**：移動・滞在時間を加味し、「閉じる／深掘り」の操作をG2で行える。

## Phase 3 — 旅での実地テスト
**完了条件**：通知頻度、可読性、GPS精度、通信・電池消費を記録して改善できる。

## スマホからの運用
- 次の作業はGitHub IssuesのOpen一覧から選ぶ
- 実機での気づきは、新しいIssueとして短く記録する
- 作業完了時はIssueに結果と検証環境を追記してCloseする
