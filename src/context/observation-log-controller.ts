import type { AppState } from '../app/state.ts'
import {
  ObservationLog,
  type ObservationLabel,
} from './observation-log.ts'
import type { SamplingSession, SamplingSessionState } from './sampling-session.ts'

const labelText: Record<ObservationLabel, string> = {
  stationary: '静止',
  walking: '歩行',
  dwelling: '滞在',
  vehicle: '乗り物',
  other: 'その他',
}

export class ObservationLogController {
  private readonly labelSelect: HTMLSelectElement | null
  private readonly recordButton: HTMLButtonElement | null
  private readonly copyButton: HTMLButtonElement | null
  private readonly clearButton: HTMLButtonElement | null
  private readonly output: HTMLElement | null
  private latestSamplingState: SamplingSessionState

  constructor(
    labelSelector: string,
    recordSelector: string,
    copySelector: string,
    clearSelector: string,
    outputSelector: string,
    private readonly session: SamplingSession,
    private readonly log: ObservationLog,
    private readonly getAppState: () => AppState,
  ) {
    this.labelSelect = document.querySelector(labelSelector)
    this.recordButton = document.querySelector(recordSelector)
    this.copyButton = document.querySelector(copySelector)
    this.clearButton = document.querySelector(clearSelector)
    this.output = document.querySelector(outputSelector)
    this.latestSamplingState = session.getState()
  }

  start(): void {
    this.recordButton?.addEventListener('click', () => this.record())
    this.copyButton?.addEventListener('click', () => void this.copy())
    this.clearButton?.addEventListener('click', () => {
      this.log.clear()
      this.render(this.latestSamplingState, 'ログを消去しました。')
    })
    this.render(this.latestSamplingState)
  }

  renderSamplingState(state: SamplingSessionState): void {
    this.latestSamplingState = state
    this.render(state)
  }

  clear(): void {
    this.log.clear()
    this.render(this.latestSamplingState)
  }

  private record(): void {
    const label = (this.labelSelect?.value ?? 'other') as ObservationLabel
    const result = this.log.record(label, this.session.getState(), this.getAppState())
    this.render(
      this.session.getState(),
      result.ok
        ? `${labelText[result.record.label]}として記録しました。`
        : 'サンプリング開始後に記録してください。',
    )
  }

  private async copy(): Promise<void> {
    try {
      await this.writeClipboard(this.log.exportJson())
      this.render(this.latestSamplingState, 'JSONをクリップボードへコピーしました。')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.render(this.latestSamplingState, `コピーに失敗しました: ${message}`)
    }
  }

  private async writeClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    try {
      if (!document.execCommand('copy')) throw new Error('clipboard API is unavailable')
    } finally {
      textarea.remove()
    }
  }

  private render(state: SamplingSessionState, message?: string): void {
    const records = this.log.getRecords()
    if (this.recordButton) {
      this.recordButton.disabled = !state.active || state.transitioning
    }
    if (this.copyButton) this.copyButton.disabled = records.length === 0
    if (this.clearButton) this.clearButton.disabled = records.length === 0
    if (!this.output) return

    const last = records.at(-1)
    this.output.textContent = [
      `観察記録数: ${records.length}`,
      `最終ラベル: ${last ? labelText[last.label] : '未記録'}`,
      '保存範囲: このアプリセッションのメモリ内のみ',
      '除外情報: 緯度・経度・地名・位置履歴',
      message ? `結果: ${message}` : '結果: 未操作',
    ].join('\n')
  }
}
