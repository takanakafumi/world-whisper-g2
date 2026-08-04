import type { SamplingSession, SamplingSessionState } from './sampling-session.ts'

const meters = (value: number) => `${value.toFixed(1)} m`
const seconds = (value: number) => `${(value / 1000).toFixed(0)} s`

export class SamplingDiagnosticsController {
  private readonly startButton: HTMLButtonElement | null
  private readonly stopButton: HTMLButtonElement | null
  private readonly output: HTMLElement | null
  private readonly session: SamplingSession

  constructor(
    startSelector: string,
    stopSelector: string,
    outputSelector: string,
    session: SamplingSession,
  ) {
    this.startButton = document.querySelector(startSelector)
    this.stopButton = document.querySelector(stopSelector)
    this.output = document.querySelector(outputSelector)
    this.session = session
  }

  start(): void {
    this.startButton?.addEventListener('click', () => void this.session.start())
    this.stopButton?.addEventListener('click', () => void this.session.stop())
    this.render(this.session.getState())
  }

  render(state: SamplingSessionState): void {
    if (this.startButton) this.startButton.disabled = state.active || state.transitioning
    if (this.stopButton) this.stopButton.disabled = !state.active || state.transitioning
    if (!this.output) return

    const movement = state.movement
    this.output.textContent = [
      `SDK位置更新: ${state.transitioning ? '切替中' : state.active ? '実行中' : '停止中'}`,
      `判定: ${movement.state}`,
      `サンプル数: ${movement.sampleCount}`,
      `期間: ${seconds(movement.durationMs)}`,
      `移動距離: ${meters(movement.totalDistanceMeters)}`,
      `変位: ${meters(movement.displacementMeters)}`,
      `速度: ${movement.speedMetersPerSecond.toFixed(2)} m/s`,
      `滞在時間: ${seconds(movement.dwellDurationMs)}`,
      `最新精度: ${state.latestAccuracyMeters === null ? '不明' : meters(state.latestAccuracyMeters)}`,
      `エラー: ${state.error ?? 'なし'}`,
    ].join('\n')
  }
}
