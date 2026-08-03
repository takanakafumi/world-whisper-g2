import {
  type GeolocationDiagnosticResult,
  type GeolocationDiagnostic,
} from './geolocation-diagnostic.ts'

const formatResult = (result: GeolocationDiagnosticResult) => {
  const environment = [
    `Secure Context: ${result.environment.isSecureContext ? 'yes' : 'no'}`,
    `URL: ${result.environment.href}`,
  ]

  if (!result.ok) {
    return [
      '結果: 取得失敗',
      `理由: ${result.reason}`,
      `詳細: ${result.message}`,
      ...environment,
    ].join('\n')
  }

  return [
    '結果: 取得成功',
    `緯度: ${result.latitude.toFixed(6)}`,
    `経度: ${result.longitude.toFixed(6)}`,
    `精度: ±${Math.round(result.accuracyMeters)} m`,
    `取得時刻: ${result.capturedAt}`,
    ...environment,
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
    private readonly diagnostic: GeolocationDiagnostic,
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
