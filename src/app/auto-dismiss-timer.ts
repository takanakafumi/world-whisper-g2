export interface AutoDismissPort {
  schedule(callback: () => void, delayMs: number): void
  cancel(): void
}

export interface TimerScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

const defaultScheduler: TimerScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export class AutoDismissTimer implements AutoDismissPort {
  private readonly scheduler: TimerScheduler
  private handle: unknown = null
  private generation = 0

  constructor(scheduler: TimerScheduler = defaultScheduler) {
    this.scheduler = scheduler
  }

  schedule(callback: () => void, delayMs: number): void {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      throw new RangeError('delayMs must be greater than 0')
    }
    this.cancel()
    const generation = this.generation
    this.handle = this.scheduler.setTimeout(() => {
      if (generation !== this.generation) return
      this.handle = null
      callback()
    }, delayMs)
  }

  cancel(): void {
    this.generation += 1
    if (this.handle !== null) {
      this.scheduler.clearTimeout(this.handle)
      this.handle = null
    }
  }
}
