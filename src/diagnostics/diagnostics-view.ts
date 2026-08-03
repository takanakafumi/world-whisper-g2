import type { AppState } from '../app/state.ts'

export interface DiagnosticsPort {
  setStatus(message: string): void
  recordEvent(state: AppState, eventType: unknown, event: unknown): void
  reportError(error: unknown): void
}

export class DiagnosticsView implements DiagnosticsPort {
  private readonly element: HTMLElement | null

  constructor(selector: string) {
    this.element = document.querySelector<HTMLElement>(selector)
  }

  setStatus(message: string) {
    if (this.element) {
      this.element.textContent = `状態: ${message}`
    }
  }

  recordEvent(state: AppState, eventType: unknown, event: unknown) {
    let rawEvent = ''
    try {
      rawEvent = JSON.stringify(event, null, 2) ?? String(event)
    } catch {
      rawEvent = String(event)
    }

    if (this.element) {
      this.element.textContent = [
        `状態: ${state.status}`,
        `受信イベント数: ${state.rawEventCount}`,
        `eventType: ${String(eventType)}`,
        '',
        rawEvent.slice(0, 2000),
      ].join('\n')
    }
    console.info('[World Whisper] Even Hub event', { eventType, event })
  }

  reportError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (this.element) {
      this.element.textContent = `エラー: ${message}`
    }
    console.error('[World Whisper]', error)
  }
}
