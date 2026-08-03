import type { EvenHubEvent } from '@evenrealities/even_hub_sdk'

import type { DiagnosticsPort } from '../diagnostics/diagnostics-view.ts'
import type { G2DisplayPort } from '../even/g2-display.ts'
import { normalizeEvenHubEvent } from '../even/event-normalizer.ts'
import { initialAppState, reduceAppState, type AppAction, type AppState } from './state.ts'

const releaseLabel = 'LOCATION DIAGNOSTIC v0.2.4'

const initialContent = [
  releaseLabel,
  'World Whisper',
  '',
  '操作を試してください',
  'タップ: 表示更新',
  '上下スライド: 表示更新',
  'ダブルタップ: 終了',
].join('\n')

const gestureLabels = {
  click: 'シングルタップ',
  'scroll-up': '上方向スライド',
  'scroll-down': '下方向スライド',
} as const

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class AppController {
  private state: AppState = initialAppState

  constructor(
    private readonly display: G2DisplayPort,
    private readonly diagnostics: DiagnosticsPort,
  ) {}

  async start() {
    await this.display.create(initialContent)
    this.dispatch({ type: 'READY' })
    this.diagnostics.setStatus('G2画面を作成しました')
  }

  handleEvenHubEvent(event: EvenHubEvent) {
    const gesture = normalizeEvenHubEvent(event)
    this.dispatch({ type: 'RAW_EVENT_RECEIVED' })
    this.diagnostics.recordEvent(this.state, gesture.reportedEventType, event)

    if (this.state.status !== 'ready') {
      return
    }

    if (gesture.kind === 'double-click') {
      this.dispatch({ type: 'SHUTDOWN_STARTED' })
      this.diagnostics.setStatus('G2画面を終了しています')
      void this.display
        .shutdown()
        .then(() => {
          this.dispatch({ type: 'SHUTDOWN_SUCCEEDED' })
          this.diagnostics.setStatus('G2画面を終了しました')
        })
        .catch((error) => {
          const message = errorMessage(error)
          this.dispatch({ type: 'SHUTDOWN_FAILED', message })
          this.diagnostics.reportError(error)
        })
      return
    }

    const label =
      gesture.kind === 'unknown'
        ? `未判定イベント (${String(gesture.reportedEventType)})`
        : gestureLabels[gesture.kind]

    this.dispatch({ type: 'GESTURE_HANDLED' })
    const content = [
      'World Whisper',
      '',
      `検出: ${label}`,
      `操作回数: ${this.state.gestureCount}`,
      '',
      'ダブルタップで終了',
    ].join('\n')

    void this.display.show(content).catch((error) => {
      this.dispatch({ type: 'ERROR', message: errorMessage(error) })
      this.diagnostics.reportError(error)
    })
  }

  private dispatch(action: AppAction) {
    this.state = reduceAppState(this.state, action)
  }
}
