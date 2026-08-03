export interface ContextSnapshot {
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAt: string
  localHour: number
  timezone: string
}

export type ContextCaptureResult =
  | { ok: true; snapshot: ContextSnapshot }
  | { ok: false; reason: 'unavailable'; message: string }

export interface ContextProvider {
  capture(): Promise<ContextCaptureResult>
}
