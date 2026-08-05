import type { AppState } from '../app/state.ts'
import type { SamplingSessionState } from './sampling-session.ts'

export const observationSchemaVersion = '1.0' as const

export type ObservationLabel =
  | 'stationary'
  | 'walking'
  | 'dwelling'
  | 'vehicle'
  | 'other'

export interface ObservationRecord {
  sequence: number
  label: ObservationLabel
  recordedAt: string
  elapsedMs: number
  receivedEventCount: number
  acceptedSampleCount: number
  ignoredEventCount: number
  totalDistanceMeters: number
  displacementMeters: number
  calculatedSpeedMetersPerSecond: number
  dwellDurationMs: number
  latestAccuracyMeters: number | null
  appState: {
    status: AppState['status']
    interactionPhase: AppState['interaction']['phase']
    isGenerating: boolean
  }
}

export interface ObservationExport {
  schemaVersion: typeof observationSchemaVersion
  records: ObservationRecord[]
}

export type RecordObservationResult =
  | { ok: true; record: ObservationRecord }
  | { ok: false; reason: 'sampling-inactive' }

export class ObservationLog {
  private records: ObservationRecord[] = []
  private readonly now: () => Date

  constructor(now: () => Date = () => new Date()) {
    this.now = now
  }

  record(
    label: ObservationLabel,
    sampling: SamplingSessionState,
    app: AppState,
  ): RecordObservationResult {
    if (!sampling.active || sampling.transitioning) {
      return { ok: false, reason: 'sampling-inactive' }
    }

    const movement = sampling.movement
    const record: ObservationRecord = {
      sequence: this.records.length + 1,
      label,
      recordedAt: this.now().toISOString(),
      elapsedMs: movement.durationMs,
      receivedEventCount: sampling.receivedEventCount,
      acceptedSampleCount: sampling.acceptedEventCount,
      ignoredEventCount: sampling.ignoredEventCount,
      totalDistanceMeters: movement.totalDistanceMeters,
      displacementMeters: movement.displacementMeters,
      calculatedSpeedMetersPerSecond: movement.speedMetersPerSecond,
      dwellDurationMs: movement.dwellDurationMs,
      latestAccuracyMeters: sampling.latestAccuracyMeters,
      appState: {
        status: app.status,
        interactionPhase: app.interaction.phase,
        isGenerating: app.isGenerating,
      },
    }
    this.records.push(record)
    return { ok: true, record: structuredClone(record) }
  }

  getRecords(): ObservationRecord[] {
    return structuredClone(this.records)
  }

  clear(): void {
    this.records = []
  }

  exportJson(): string {
    const output: ObservationExport = {
      schemaVersion: observationSchemaVersion,
      records: this.getRecords(),
    }
    return JSON.stringify(output, null, 2)
  }
}
