export type GeolocationFailureReason =
  | 'unsupported'
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout'
  | 'unknown'

export interface GeolocationEnvironment {
  isSecureContext: boolean
  href: string
}

export interface GeolocationSuccess {
  ok: true
  latitude: number
  longitude: number
  accuracyMeters: number
  capturedAt: string
  environment: GeolocationEnvironment
}

export interface GeolocationFailure {
  ok: false
  reason: GeolocationFailureReason
  message: string
  environment: GeolocationEnvironment
}

export type GeolocationDiagnosticResult = GeolocationSuccess | GeolocationFailure

export interface GeolocationAdapter {
  getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions,
  ): void
}

const classifyError = (code: number): GeolocationFailureReason => {
  switch (code) {
    case 1:
      return 'permission-denied'
    case 2:
      return 'position-unavailable'
    case 3:
      return 'timeout'
    default:
      return 'unknown'
  }
}

export class GeolocationDiagnostic {
  private readonly geolocation: GeolocationAdapter | undefined
  private readonly environment: GeolocationEnvironment

  constructor(
    geolocation: GeolocationAdapter | undefined,
    environment: GeolocationEnvironment,
  ) {
    this.geolocation = geolocation
    this.environment = environment
  }

  capture(): Promise<GeolocationDiagnosticResult> {
    if (!this.geolocation) {
      return Promise.resolve({
        ok: false,
        reason: 'unsupported',
        message: 'この環境はGeolocation APIに対応していません',
        environment: this.environment,
      })
    }

    return new Promise((resolve) => {
      this.geolocation?.getCurrentPosition(
        (position) => {
          resolve({
            ok: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString(),
            environment: this.environment,
          })
        },
        (error) => {
          resolve({
            ok: false,
            reason: classifyError(error.code),
            message: error.message || '位置情報を取得できませんでした',
            environment: this.environment,
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        },
      )
    })
  }
}

export const createBrowserGeolocationDiagnostic = () =>
  new GeolocationDiagnostic(navigator.geolocation, {
    isSecureContext: window.isSecureContext,
    href: window.location.href,
  })
