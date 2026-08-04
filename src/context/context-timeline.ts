import type { ContextSnapshot } from './context-snapshot.ts'
import {
  accuracyAdjustedDistanceMeters,
  geographicDistanceMeters,
} from './geo-distance.ts'
import type { MovementContext } from './movement-context.ts'

export interface ContextTimelineOptions {
  maxSamples?: number
  maxAgeMs?: number
  minimumMovementMeters?: number
  minimumMovingSpeedMetersPerSecond?: number
  dwellThresholdMs?: number
  dwellRadiusMeters?: number
}

const defaults: Required<ContextTimelineOptions> = {
  maxSamples: 20,
  maxAgeMs: 30 * 60 * 1000,
  minimumMovementMeters: 10,
  minimumMovingSpeedMetersPerSecond: 0.5,
  dwellThresholdMs: 5 * 60 * 1000,
  dwellRadiusMeters: 30,
}

export class ContextTimeline {
  private readonly options: Required<ContextTimelineOptions>
  private samples: ContextSnapshot[] = []

  constructor(options: ContextTimelineOptions = {}) {
    this.options = { ...defaults, ...options }
    validateOptions(this.options)
  }

  add(snapshot: ContextSnapshot): MovementContext {
    const timestamp = validateSnapshot(snapshot)
    const previous = this.samples.at(-1)
    if (previous && timestamp <= Date.parse(previous.capturedAt)) {
      throw new RangeError('ContextSnapshot timestamps must be strictly increasing')
    }

    this.samples.push({ ...snapshot })
    this.prune(timestamp)
    return this.analyze()
  }

  analyze(): MovementContext {
    if (this.samples.length < 2) return unknownContext(this.samples.length)

    const first = this.samples[0]
    const last = this.samples.at(-1)!
    const durationMs = Date.parse(last.capturedAt) - Date.parse(first.capturedAt)
    let totalDistanceMeters = 0

    for (let index = 1; index < this.samples.length; index += 1) {
      totalDistanceMeters += accuracyAdjustedDistanceMeters(
        this.samples[index - 1],
        this.samples[index],
      )
    }

    const displacementMeters = accuracyAdjustedDistanceMeters(first, last)
    const speedMetersPerSecond = durationMs > 0
      ? totalDistanceMeters / (durationMs / 1000)
      : 0
    const withinDwellRadius = this.samples.every((sample) => {
      const tolerance = this.options.dwellRadiusMeters + Math.max(
        first.accuracyMeters ?? 0,
        sample.accuracyMeters ?? 0,
      )
      return geographicDistanceMeters(first, sample) <= tolerance
    })

    const isMoving = totalDistanceMeters >= this.options.minimumMovementMeters &&
      speedMetersPerSecond >= this.options.minimumMovingSpeedMetersPerSecond
    const isDwelling = !isMoving &&
      withinDwellRadius &&
      durationMs >= this.options.dwellThresholdMs

    return {
      state: isMoving ? 'moving' : isDwelling ? 'dwelling' : 'stationary',
      sampleCount: this.samples.length,
      durationMs,
      totalDistanceMeters,
      displacementMeters,
      speedMetersPerSecond,
      dwellDurationMs: withinDwellRadius ? durationMs : 0,
    }
  }

  getSamples(): ContextSnapshot[] {
    return this.samples.map((sample) => ({ ...sample }))
  }

  clear(): void {
    this.samples = []
  }

  private prune(latestTimestamp: number): void {
    const oldestAllowed = latestTimestamp - this.options.maxAgeMs
    this.samples = this.samples
      .filter((sample) => Date.parse(sample.capturedAt) >= oldestAllowed)
      .slice(-this.options.maxSamples)
  }
}

function validateSnapshot(snapshot: ContextSnapshot): number {
  if (!Number.isFinite(snapshot.latitude) || snapshot.latitude < -90 || snapshot.latitude > 90) {
    throw new RangeError('ContextSnapshot latitude must be between -90 and 90')
  }
  if (!Number.isFinite(snapshot.longitude) || snapshot.longitude < -180 || snapshot.longitude > 180) {
    throw new RangeError('ContextSnapshot longitude must be between -180 and 180')
  }
  if (snapshot.accuracyMeters !== null &&
      (!Number.isFinite(snapshot.accuracyMeters) || snapshot.accuracyMeters < 0)) {
    throw new RangeError('ContextSnapshot accuracyMeters must be null or non-negative')
  }
  const timestamp = Date.parse(snapshot.capturedAt)
  if (!Number.isFinite(timestamp)) {
    throw new RangeError('ContextSnapshot capturedAt must be a valid timestamp')
  }
  return timestamp
}

function validateOptions(options: Required<ContextTimelineOptions>): void {
  if (!Number.isInteger(options.maxSamples) || options.maxSamples < 2) {
    throw new RangeError('maxSamples must be an integer of at least 2')
  }
  for (const [name, value] of Object.entries(options)) {
    if (name === 'maxSamples') continue
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be greater than 0`)
    }
  }
}

function unknownContext(sampleCount: number): MovementContext {
  return {
    state: 'unknown',
    sampleCount,
    durationMs: 0,
    totalDistanceMeters: 0,
    displacementMeters: 0,
    speedMetersPerSecond: 0,
    dwellDurationMs: 0,
  }
}

