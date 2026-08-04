import type { EvenHubEvent } from '@evenrealities/even_hub_sdk'

import type { ContextProvider, ContextSnapshot } from '../context/context-snapshot.ts'
import type { DiagnosticsPort } from '../diagnostics/diagnostics-view.ts'
import type { G2DisplayPort } from '../even/g2-display.ts'
import { normalizeEvenHubEvent } from '../even/event-normalizer.ts'
import type { WhisperGenerator } from '../whisper/whisper-generator.ts'
import { initialAppState, reduceAppState, type AppAction, type AppState } from './state.ts'

const releaseLabel = 'WORLD WHISPER v0.5.1'
const clearedContent = '\u00a0'

const initialContent = [
  releaseLabel,
  'World Whisper',
  '',
  '開発画面の「通知を発生」から開始します。',
  'ダブルタップ: 開発用終了',
].join('\n')

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const limitText = (text: string, limit = 50) =>
  Array.from(text).slice(0, limit).join('')

export class AppController {
  private state: AppState = initialAppState
  private readonly display: G2DisplayPort
  private readonly diagnostics: DiagnosticsPort
  private readonly contextProvider: ContextProvider
  private readonly whisperGenerator: WhisperGenerator
  private generationToken = 0
  private lastSnapshot: ContextSnapshot | null = null
  private lastWhisper: string | null = null

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
    this.diagnostics.setStatus('準備完了。「通知を発生」でPhase 2操作を開始できます。')
  }

  async triggerNotification() {
    if (this.state.status !== 'ready') return
    if (this.state.isGenerating) {
      this.diagnostics.setStatus('生成処理中は新しい通知を発生できません。')
      return
    }

    this.generationToken += 1
    this.lastSnapshot = null
    this.lastWhisper = null
    this.dispatch({ type: 'NOTIFICATION_TRIGGERED' })
    await this.showSafely([
      releaseLabel,
      '',
      '💡 気づきのヒントがあります',
      '',
      'シングルタップで深掘り',
      '上スライドで飛ばす',
    ].join('\n'))
    this.diagnostics.setStatus('通知済み。G2のシングルタップで深掘りできます。')
  }

  async dismissDisplay() {
    if (this.state.status !== 'ready') return
    const phase = this.state.interaction.phase
    if (phase === 'idle' || phase === 'dismissed') {
      this.diagnostics.setStatus('消去できる表示はありません。')
      return
    }

    this.generationToken += 1
    if (this.state.isGenerating) this.dispatch({ type: 'WHISPER_CANCELLED' })
    this.dispatch({ type: 'DISPLAY_DISMISSED' })
    await this.showSafely(clearedContent)
    this.diagnostics.setStatus('表示を消去しました。')
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

    switch (gesture.kind) {
      case 'click':
        await this.handleSingleTap()
        break
      case 'scroll-up':
        this.dispatch({ type: 'GESTURE_HANDLED' })
        await this.dismissDisplay()
        break
      case 'scroll-down':
        await this.showNextPerspective()
        break
      case 'unknown':
        this.diagnostics.setStatus(`未判定イベント: ${String(gesture.reportedEventType)}`)
        break
    }
  }

  private async handleSingleTap() {
    if (this.state.isGenerating) {
      this.diagnostics.setStatus('生成処理中のため、追加タップは無視しました。')
      return
    }

    switch (this.state.interaction.phase) {
      case 'notified':
        this.dispatch({ type: 'GESTURE_HANDLED' })
        await this.generatePrimaryWhisper()
        break
      case 'primary':
      case 'next':
      case 'deepened':
        this.dispatch({ type: 'GESTURE_HANDLED' })
        await this.showDeepenedWhisper()
        break
      default:
        this.diagnostics.setStatus('先にスマホ画面の「通知を発生」を押してください。')
    }
  }

  private async generatePrimaryWhisper() {
    const token = ++this.generationToken
    this.dispatch({ type: 'WHISPER_STARTED' })
    this.diagnostics.setStatus('現在地と時刻を取得しています…')

    try {
      await this.display.show([releaseLabel, '', '世界の気配を探しています…'].join('\n'))
      if (!this.isGenerationActive(token, 'notified')) return
      const result = await this.contextProvider.capture()
      if (!this.isGenerationActive(token, 'notified')) return

      if (!result.ok) {
        this.dispatch({ type: 'WHISPER_FAILED', message: result.message })
        this.diagnostics.setStatus(`ささやきを生成できませんでした: ${result.message}`)
        await this.showSafely([releaseLabel, '', '今は世界の気配を受け取れません。'].join('\n'))
        return
      }

      this.lastSnapshot = result.snapshot
      this.lastWhisper = this.whisperGenerator.generate(result.snapshot)
      await this.display.show([releaseLabel, '', this.lastWhisper].join('\n'))
      if (!this.isGenerationActive(token, 'notified')) return
      this.dispatch({ type: 'WHISPER_SUCCEEDED' })
      this.dispatch({ type: 'PRIMARY_SHOWN' })
      this.diagnostics.setStatus(`初回表示: ${this.lastWhisper}`)
    } catch (error) {
      await this.handleGenerationError(token, error)
    }
  }

  private async showDeepenedWhisper() {
    if (!this.lastWhisper) {
      this.diagnostics.setStatus('深掘りできるささやきがありません。')
      return
    }
    const deepened = limitText(`もう少しだけ：${this.lastWhisper}`)
    await this.showSafely([releaseLabel, '', deepened].join('\n'))
    this.dispatch({ type: 'DEEPENED' })
    this.diagnostics.setStatus(`深掘り表示: ${deepened}`)
  }

  private async showNextPerspective() {
    if (this.state.isGenerating) {
      this.diagnostics.setStatus('生成処理中のため、別視点の要求は無視しました。')
      return
    }
    if (!this.lastSnapshot || !['primary', 'deepened', 'next'].includes(this.state.interaction.phase)) {
      this.diagnostics.setStatus('別視点を表示するには、先にささやきを開いてください。')
      return
    }

    this.dispatch({ type: 'GESTURE_HANDLED' })
    const nextIndex = this.state.interaction.perspectiveIndex + 1
    this.lastWhisper = this.whisperGenerator.generate(this.lastSnapshot, {
      perspectiveIndex: nextIndex,
    })
    await this.showSafely([releaseLabel, '', this.lastWhisper].join('\n'))
    this.dispatch({ type: 'NEXT_SHOWN' })
    this.diagnostics.setStatus(`別視点 ${nextIndex + 1}: ${this.lastWhisper}`)
  }

  private isGenerationActive(token: number, phase: 'notified') {
    return this.state.status === 'ready' &&
      this.state.interaction.phase === phase &&
      this.generationToken === token
  }

  private async handleGenerationError(token: number, error: unknown) {
    if (this.generationToken !== token || this.state.status !== 'ready') return
    const message = errorMessage(error)
    this.dispatch({ type: 'WHISPER_FAILED', message })
    this.diagnostics.reportError(error)
    await this.showSafely([releaseLabel, '', 'ささやきの生成中に問題が起きました。'].join('\n'))
  }

  private async showSafely(content: string) {
    try {
      await this.display.show(content)
    } catch (error) {
      this.dispatch({ type: 'ERROR', message: errorMessage(error) })
      this.diagnostics.reportError(error)
    }
  }

  private async shutdown() {
    this.generationToken += 1
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
