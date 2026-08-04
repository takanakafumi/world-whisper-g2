import { ContextTimeline } from './context-timeline.ts'
import type { ContextProvider } from './context-snapshot.ts'
import type { MovementContext } from './movement-context.ts'

export interface SamplingScheduler {
  setInterval(callback: () => void, intervalMs: number): unknown
  clearInterval(handle: unknown): void
}

export interface SamplingSessionState {
  active: boolean
  capturing: boolean
  movement: MovementContext
  latestAccuracyMeters: number | null
  error: string | null
}

export interface SamplingSessionOptions {
  intervalMs?: number
  scheduler?: SamplingScheduler
  onChange?: (state: SamplingSessionState) => void
}

const defaultScheduler: SamplingScheduler = {
  setInterval: (callback, intervalMs) => window.setInterval(callback, intervalMs),
  clearInterval: (handle) => window.clearInterval(handle as number),
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export class SamplingSession {
  private readonly provider: ContextProvider
  private readonly timeline: ContextTimeline
  private readonly intervalMs: number
  private readonly scheduler: SamplingScheduler
  private readonly onChange: (state: SamplingSessionState) => void
  private intervalHandle: unknown = null
  private active = false
  private capturing = false
  private generation = 0
  private latestAccuracyMeters: number | null = null
  private error: string | null = null

  constructor(
    provider: ContextProvider,
    timeline: ContextTimeline,
    options: SamplingSessionOptions = {},
  ) {
    this.provider = provider
    this.timeline = timeline
    this.intervalMs = options.intervalMs ?? 15_000
    if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
      throw new RangeError('intervalMs must be greater than 0')
    }
    this.scheduler = options.scheduler ?? defaultScheduler
    this.onChange = options.onChange ?? (() => undefined)
  }

  start(): void {
    if (this.active) return
    this.timeline.clear()
    this.active = true
    this.generation += 1
    this.latestAccuracyMeters = null
    this.error = null
    this.emit()
    void this.captureOnce()
    this.intervalHandle = this.scheduler.setInterval(() => void this.captureOnce(), this.intervalMs)
  }

  stop(): void {
    if (!this.active && this.intervalHandle === null) return
    this.active = false
    this.generation += 1
    if (this.intervalHandle !== null) {
      this.scheduler.clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
    this.capturing = false
    this.emit()
  }

  async captureOnce(): Promise<void> {
    if (!this.active || this.capturing) return
    const generation = this.generation
    this.capturing = true
    this.emit()

    try {
      const result = await this.provider.capture()
      if (!this.isCurrent(generation)) return
      if (!result.ok) {
        this.error = result.message
        return
      }
      const movement = this.timeline.add(result.snapshot)
      this.latestAccuracyMeters = result.snapshot.accuracyMeters
      this.error = null
      this.emit(movement)
    } catch (error) {
      if (this.isCurrent(generation)) this.error = errorMessage(error)
    } finally {
      if (this.isCurrent(generation)) {
        this.capturing = false
        this.emit()
      }
    }
  }

  getState(): SamplingSessionState {
    return this.createState()
  }

  private isCurrent(generation: number): boolean {
    return this.active && this.generation === generation
  }

  private emit(movement = this.timeline.analyze()): void {
    this.onChange(this.createState(movement))
  }

  private createState(movement = this.timeline.analyze()): SamplingSessionState {
    return {
      active: this.active,
      capturing: this.capturing,
      movement: { ...movement },
      latestAccuracyMeters: this.latestAccuracyMeters,
      error: this.error,
    }
  }
}
