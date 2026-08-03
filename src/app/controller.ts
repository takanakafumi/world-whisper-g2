import type { EvenHubEvent } from '@evenrealities/even_hub_sdk'

import type { ContextProvider } from '../context/context-snapshot.ts'
import type { DiagnosticsPort } from '../diagnostics/diagnostics-view.ts'
import type { G2DisplayPort } from '../even/g2-display.ts'
import { normalizeEvenHubEvent } from '../even/event-normalizer.ts'
import type { WhisperGenerator } from '../whisper/whisper-generator.ts'
import { initialAppState, reduceAppState, type AppAction, type AppState } from './state.ts'

const releaseLabel = 'WORLD WHISPER v0.4.0'

const initialContent = [
  releaseLabel,
  'World Whisper',
  '',
  'シングルタップで、今の世界のささやきを表示します。',
  '上下スライド: 操作確認',
  'ダブルタップ: 終了',
].join('\n')

const gestureLabels = {
  'scroll-up': '上方向スライド',
  'scroll-down': '下方向スライド',
  'double-click': 'ダブルタップ',
  unknown: '未判定イベント',
} as const

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class AppController {
  private state: AppState = initialAppState
  private readonly display: G2DisplayPort
  private readonly diagnostics: DiagnosticsPort
  private readonly contextProvider: ContextProvider
  private readonly whisperGenerator: WhisperGenerator

  constructor(
    display: G2DisplayPort,
    diagnostics: DiagnosticsPort,
    contextProvider: ContextProvider,
    whisperGenerator: WhisperGenerator,
  ) {
    this.display = display
    this.diagnostics = diagnostics
    this.contextProvider = contextProvider
    this.whisperGenerator = whisperGenerator
  }

  async start() {
    await this.display.create(initialContent)
    this.dispatch({ type: 'READY' })
    this.diagnostics.setStatus('G2画面を作成しました。シングルタップで生成できます。')
  }

  async handleEvenHubEvent(event: EvenHubEvent) {
    const gesture = normalizeEvenHubEvent(event)
    this.dispatch({ type: 'RAW_EVENT_RECEIVED' })
    this.diagnostics.recordEvent(this.state, gesture.reportedEventType, event)

    if (gesture.kind === 'double-click' && this.state.status === 'ready') {
      await this.shutdown()
      return
    }
    if (this.state.status !== 'ready') return

    if (gesture.kind === 'click') {
      if (this.state.isGenerating) {
        this.diagnostics.setStatus('生成処理中のため、追加のタップを待機しています。')
        return
      }
      this.dispatch({ type: 'GESTURE_HANDLED' })
      await this.generateWhisper()
      return
    }

    this.dispatch({ type: 'GESTURE_HANDLED' })
    const label = gesture.kind === 'unknown'
      ? `${gestureLabels.unknown} (${String(gesture.reportedEventType)})`
      : gestureLabels[gesture.kind]
    const content = [
      releaseLabel,
      '',
      `検出: ${label}`,
      `操作回数: ${this.state.gestureCount}`,
      '',
      'シングルタップでささやきを生成',
      'ダブルタップで終了',
    ].join('\n')

    try {
      await this.display.show(content)
    } catch (error) {
      this.dispatch({ type: 'ERROR', message: errorMessage(error) })
      this.diagnostics.reportError(error)
    }
  }

  private async generateWhisper() {
    this.dispatch({ type: 'WHISPER_STARTED' })
    this.diagnostics.setStatus('現在地と時刻を取得しています…')

    try {
      await this.display.show([releaseLabel, '', '世界の気配を探しています…'].join('\n'))
      if (this.state.status !== 'ready') return
      const result = await this.contextProvider.capture()
      if (this.state.status !== 'ready') return

      if (!result.ok) {
        this.dispatch({ type: 'WHISPER_FAILED', message: result.message })
        this.diagnostics.setStatus(`ささやきを生成できませんでした: ${result.message}`)
        await this.display.show(
          [releaseLabel, '', '今は世界の気配を受け取れません。', '', 'もう一度タップしてください。'].join('\n'),
        )
        return
      }

      const whisper = this.whisperGenerator.generate(result.snapshot)
      if (this.state.status !== 'ready') return
      await this.display.show([releaseLabel, '', whisper].join('\n'))
      this.dispatch({ type: 'WHISPER_SUCCEEDED' })
      this.diagnostics.setStatus(`生成成功: ${whisper}`)
    } catch (error) {
      if (this.state.status !== 'ready') return
      const message = errorMessage(error)
      this.dispatch({ type: 'WHISPER_FAILED', message })
      this.diagnostics.reportError(error)
      await this.display
        .show([releaseLabel, '', 'ささやきの生成中に問題が起きました。'].join('\n'))
        .catch((displayError) => this.diagnostics.reportError(displayError))
    }
  }

  private async shutdown() {
    this.dispatch({ type: 'SHUTDOWN_STARTED' })
    this.diagnostics.setStatus('G2画面を終了しています…')
    try {
      await this.display.shutdown()
      this.dispatch({ type: 'SHUTDOWN_SUCCEEDED' })
      this.diagnostics.setStatus('G2画面を終了しました。')
    } catch (error) {
      this.dispatch({ type: 'SHUTDOWN_FAILED', message: errorMessage(error) })
      this.diagnostics.reportError(error)
    }
  }

  private dispatch(action: AppAction) {
    this.state = reduceAppState(this.state, action)
  }
}
