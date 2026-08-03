import {
  AppLocationAccuracy,
  type AppLocation,
  type AppLocationOptions,
} from '@evenrealities/even_hub_sdk'

import type {
  ContextCaptureResult,
  ContextProvider,
  ContextSnapshot,
} from './context-snapshot.ts'

export interface AppLocationBridge {
  getAppLocation(options?: AppLocationOptions): Promise<AppLocation | null>
}

const isValidCoordinate = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180

const hourInTimezone = (date: Date, timezone: string) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: timezone,
    }).format(date),
  )

export class EvenHubContextProvider implements ContextProvider {
  private readonly bridge: AppLocationBridge
  private readonly now: () => Date
  private readonly timezone: () => string

  constructor(
    bridge: AppLocationBridge,
    now: () => Date = () => new Date(),
    timezone: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {
    this.bridge = bridge
    this.now = now
    this.timezone = timezone
  }

  async capture(): Promise<ContextCaptureResult> {
    const location = await this.bridge.getAppLocation({
      accuracy: AppLocationAccuracy.High,
      timeoutMs: 10_000,
    })

    if (!location || !isValidCoordinate(location.latitude, location.longitude)) {
      return {
        ok: false,
        reason: 'unavailable',
        message: '位置情報を取得できませんでした。権限と端末の位置情報設定を確認してください。',
      }
    }

    const capturedDate = location.timestamp ? new Date(location.timestamp) : this.now()
    const timezone = this.timezone()
    const snapshot: ContextSnapshot = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters:
        location.accuracy !== undefined && Number.isFinite(location.accuracy)
          ? location.accuracy
          : null,
      capturedAt: capturedDate.toISOString(),
      localHour: hourInTimezone(capturedDate, timezone),
      timezone,
    }

    return { ok: true, snapshot }
  }
}
