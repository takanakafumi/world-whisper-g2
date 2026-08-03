import type { ContextCaptureResult, ContextProvider } from './context-snapshot.ts'

const formatResult = (result: ContextCaptureResult) => {
  if (!result.ok) {
    return [
      '結果: 取得失敗',
      `理由: ${result.reason}`,
      `詳細: ${result.message}`,
      '取得元: Even Hub SDK',
    ].join('\n')
  }

  const { snapshot } = result
  return [
    '結果: 取得成功',
    `緯度: ${snapshot.latitude.toFixed(6)}`,
    `経度: ${snapshot.longitude.toFixed(6)}`,
    `精度: ${snapshot.accuracyMeters === null ? '不明' : `±${Math.round(snapshot.accuracyMeters)} m`}`,
    `取得時刻: ${snapshot.capturedAt}`,
    `現地時刻: ${snapshot.localHour}時`,
    `タイムゾーン: ${snapshot.timezone}`,
    '取得元: Even Hub SDK',
    '',
    '位置情報は保存・送信していません。',
  ].join('\n')
}

export class LocationDiagnosticsController {
  private readonly button: HTMLButtonElement | null
  private readonly output: HTMLElement | null

  constructor(
    buttonSelector: string,
    outputSelector: string,
    private readonly diagnostic: ContextProvider,
  ) {
    this.button = document.querySelector<HTMLButtonElement>(buttonSelector)
    this.output = document.querySelector<HTMLElement>(outputSelector)
  }

  start() {
    this.button?.addEventListener('click', () => void this.capture())
  }

  private async capture() {
    if (this.button) {
      this.button.disabled = true
    }
    if (this.output) {
      this.output.textContent = '位置情報を取得しています…'
    }

    try {
      const result = await this.diagnostic.capture()
      if (this.output) {
        this.output.textContent = formatResult(result)
      }
    } catch (error) {
      if (this.output) {
        this.output.textContent = `診断処理エラー: ${error instanceof Error ? error.message : String(error)}`
      }
    } finally {
      if (this.button) {
        this.button.disabled = false
      }
    }
  }
}
