import { ContextTimeline } from './context-timeline.ts'
import type { ContextSnapshot, ContextUpdateSource } from './context-snapshot.ts'
import type { MovementContext } from './movement-context.ts'

export interface SamplingSessionState {
  active: boolean
  transitioning: boolean
  movement: MovementContext
  receivedEventCount: number
  ignoredEventCount: number
  latestCapturedAt: string | null
  latestAccuracyMeters: number | null
  error: string | null
}

export interface SamplingSessionOptions {
  onChange?: (state: SamplingSessionState) => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class SamplingSession {
  private readonly source: ContextUpdateSource
  private readonly timeline: ContextTimeline
  private readonly onChange: (state: SamplingSessionState) => void
  private active = false
  private transitioning = false
  private generation = 0
  private lastAcceptedTimestamp = Number.NEGATIVE_INFINITY
  private receivedEventCount = 0
  private ignoredEventCount = 0
  private latestCapturedAt: string | null = null
  private latestAccuracyMeters: number | null = null
  private error: string | null = null

  constructor(
    source: ContextUpdateSource,
    timeline: ContextTimeline,
    options: SamplingSessionOptions = {},
  ) {
    this.source = source
    this.timeline = timeline
    this.onChange = options.onChange ?? (() => undefined)
  }

  async start(): Promise<void> {
    if (this.active || this.transitioning) return
    const generation = ++this.generation
    this.timeline.clear()
    this.lastAcceptedTimestamp = Number.NEGATIVE_INFINITY
    this.receivedEventCount = 0
    this.ignoredEventCount = 0
    this.latestCapturedAt = null
    this.latestAccuracyMeters = null
    this.error = null
    this.active = true
    this.transitioning = true
    this.emit()

    try {
      await this.source.start(
        (snapshot) => this.receive(snapshot, generation),
        (error) => this.receiveError(error, generation),
      )
      if (this.generation !== generation) return
    } catch (error) {
      if (this.generation === generation) {
        this.active = false
        this.error = errorMessage(error)
      }
    } finally {
      if (this.generation === generation) {
        this.transitioning = false
        this.emit()
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.active && !this.transitioning) return
    this.generation += 1
    this.active = false
    this.transitioning = true
    this.emit()
    try {
      await this.source.stop()
    } catch (error) {
      this.error = errorMessage(error)
    } finally {
      this.transitioning = false
      this.emit()
    }
  }

  getState(): SamplingSessionState {
    return this.createState()
  }

  private receive(snapshot: ContextSnapshot, generation: number): void {
    if (!this.active || this.generation !== generation) return
    try {
      this.receivedEventCount += 1
      this.latestCapturedAt = snapshot.capturedAt
      const timestamp = Date.parse(snapshot.capturedAt)
      if (Number.isFinite(timestamp) && timestamp <= this.lastAcceptedTimestamp) {
        this.ignoredEventCount += 1
        this.emit()
        return
      }
      const movement = this.timeline.add(snapshot)
      this.lastAcceptedTimestamp = timestamp
      this.latestAccuracyMeters = snapshot.accuracyMeters
      this.error = null
      this.emit(movement)
    } catch (error) {
      this.receiveError(error, generation)
    }
  }

  private receiveError(error: unknown, generation: number): void {
    if (!this.active || this.generation !== generation) return
    this.error = errorMessage(error)
    this.emit()
  }

  private emit(movement = this.timeline.analyze()): void {
    this.onChange(this.createState(movement))
  }

  private createState(movement = this.timeline.analyze()): SamplingSessionState {
    return {
      active: this.active,
      transitioning: this.transitioning,
      movement: { ...movement },
      receivedEventCount: this.receivedEventCount,
      ignoredEventCount: this.ignoredEventCount,
      latestCapturedAt: this.latestCapturedAt,
      latestAccuracyMeters: this.latestAccuracyMeters,
      error: this.error,
    }
  }
}
