export type MovementState = 'unknown' | 'stationary' | 'moving' | 'dwelling'

export interface MovementContext {
  state: MovementState
  sampleCount: number
  durationMs: number
  totalDistanceMeters: number
  displacementMeters: number
  speedMetersPerSecond: number
  dwellDurationMs: number
}

