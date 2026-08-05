# World Whisper G2 Roadmap

## 現在地
- 公式テストアプリとWorld Whisperの固定メッセージをG2実機に表示確認済み
- 両つる・リングで上下スライドとダブルタップ終了を実機確認済み
- シングルタップはeventTypeなしのsysEventとして到達することを確認し、touch由来イベントとして互換処理を追加
- Phase 1前の構造整理として、SDKアダプター、状態、G2表示、診断UIを分離し回帰テストを追加
- Issue #11でブラウザ位置情報がEven Hub WebViewから拒否されることを確認し、公式SDK位置APIを採用
- Issue #12で`ContextSnapshot`と公式SDK位置取得を実装し、Private Build実機検証に成功
- Issue #13で置換可能な`WhisperGenerator`と50文字以内のルールベース生成を実装
- Issue #14でシングルタップから取得・生成・G2表示までを統合し、左右のつるとリングで実機検証済み
- v0.4.0の「シングルタップで生成／ダブルタップで終了」はPhase 1の検証用操作。Phase 2では設計方針V4に従い、パッシブ通知／シングルタップ深掘り／長押し終了／ダブルタップ音声入力へ移行する
- Issue #19でスマホの通知／消去ボタンと、G2の深掘り／別視点／閉じる状態遷移をv0.5.1として実装・実機確認済み。下／後スライドを別視点、上／前スライドを飛ばす／消去へ割り当て
- Issue #22でメモリ内`ContextTimeline`を実装済み。Issue #24でSDK-first方針に基づくEven Hub SDK連続位置更新と文脈変化の診断表示を実装し、v0.6.0実機検証済み
- Issue #27でPrimary・深掘り・別視点の5秒自動消灯と開発用トグルをv0.7.0として実装し、実機検証済み
- Issue #26で座標を含まない実地観察ログをv0.8.0として実装中。散歩・観光データを集めてから通知条件を決定する

## Phase 0 — 実機表示PoC
**完了条件**：Even G2でWorld Whisperの固定文が表示され、ダブルタップで終了できる。

1. ✅ Even Hub／G2で公式サンプルを実機起動
2. ✅ World Whisper PoCをG2に表示
3. GitHub Pagesへ自動公開
4. 公開したHTTPS URLをEven Appで読み込めるか実機検証
5. ✅ 両つる・リングで上下スライドとダブルタップ終了を確認
6. ✅ シングルタップがeventTypeなし・eventSource付きsysEventで到達することを確認
7. ✅ Phase 1前の責務分割、エラー可視化、イベント／状態テストを追加

## Phase 1 — 最小の「ささやき」
**完了条件**：スマホの位置情報と時刻を入力に、50文字以内の1文を手動で生成・表示できる。

1. ✅ `ContextSnapshot`として位置・時刻を取得
2. ✅ `WhisperGenerator`インターフェースを定義
3. ✅ ルールベースで50文字以内の1文を生成
4. ✅ 手動操作でG2へ表示する統合を実装
5. ✅ 実機結果を記録し、バックエンドLLM接続の入力・出力契約を確定

### Phase 1アクション

1. ✅ [#11 Even Hub環境で位置情報取得可否を検証](https://github.com/takanakafumi/world-whisper-g2/issues/11)
2. ✅ [#12 ContextSnapshotとcontext providerを実装](https://github.com/takanakafumi/world-whisper-g2/issues/12)
3. ✅ [#13 WhisperGeneratorとルールベース生成を実装](https://github.com/takanakafumi/world-whisper-g2/issues/13)
4. ✅ [#14 G2へ統合してPhase 1を実機検証](https://github.com/takanakafumi/world-whisper-g2/issues/14)

## Phase 2 — 文脈と操作
**完了条件**：移動・滞在時間を加味した通知をパッシブに提示し、シングルタップの深掘り、後方／下スライドの別視点、前方／上スライドの飛ばす／閉じる、5秒の自動消灯をG2で行える。長押しは終了／スリープ、ダブルタップは音声入力へ割り当てる。

### Phase 2開発順序

1. ✅ スマホ代替操作とG2の深掘り、閉じる、別視点を実機検証する
2. ✅ SDK連続位置更新と移動・滞在の診断基盤を実機検証する
3. ✅ 5秒自動消灯を接続し、表示ライフサイクルを実機検証する
4. 座標を含まない実地観察ログで散歩・観光時の診断値を収集する
5. 観察結果から通知条件、クールダウン、重複抑制、滞在通知を決定する
6. 文脈変化をパッシブ通知へ接続し、本番UXとして通しで検証する
7. 長押し終了／スリープとダブルタップ音声入力へ本番操作を移行する

### Phase 2アクション

1. ✅ [#19 スマホ代替操作とG2状態遷移](https://github.com/takanakafumi/world-whisper-g2/issues/19)
2. ✅ [#22 ContextTimelineと移動・滞在判定](https://github.com/takanakafumi/world-whisper-g2/issues/22)
3. ✅ [#24 手動コンテキストサンプリングと診断表示](https://github.com/takanakafumi/world-whisper-g2/issues/24)
4. ✅ [#27 5秒自動消灯と表示ライフサイクル](https://github.com/takanakafumi/world-whisper-g2/issues/27)
5. [#26 プライバシーを守る実地観察ログ](https://github.com/takanakafumi/world-whisper-g2/issues/26)

## Phase 3 — 旅での実地テスト
**完了条件**：通知頻度、可読性、SDK位置精度、通信・電池消費を記録して改善できる。

## スマホからの運用
- 次の作業はGitHub IssuesのOpen一覧から選ぶ
- 実機での気づきは、新しいIssueとして短く記録する
- 作業完了時はIssueに結果と検証環境を追記してCloseする
