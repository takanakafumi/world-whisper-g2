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

export interface ContextUpdateSource {
  start(
    onSnapshot: (snapshot: ContextSnapshot) => void,
    onError: (error: unknown) => void,
  ): Promise<void>
  stop(): Promise<void>
}
