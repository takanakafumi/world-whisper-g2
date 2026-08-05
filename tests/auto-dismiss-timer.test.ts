import assert from 'node:assert/strict'
import test from 'node:test'

import { AutoDismissTimer, type TimerScheduler } from '../src/app/auto-dismiss-timer.ts'

class FakeScheduler implements TimerScheduler {
  callbacks = new Map<number, () => void>()
  nextHandle = 1

  setTimeout(callback: () => void): unknown {
    const handle = this.nextHandle++
    this.callbacks.set(handle, callback)
    return handle
  }

  clearTimeout(handle: unknown): void {
    this.callbacks.delete(handle as number)
  }
}

test('keeps only the latest scheduled callback', () => {
  const scheduler = new FakeScheduler()
  const timer = new AutoDismissTimer(scheduler)
  let calls = 0

  timer.schedule(() => { calls += 1 }, 5_000)
  const stale = scheduler.callbacks.get(1)!
  timer.schedule(() => { calls += 10 }, 5_000)
  stale()
  scheduler.callbacks.get(2)!()

  assert.equal(calls, 10)
})

test('cancel prevents a stale callback from firing', () => {
  const scheduler = new FakeScheduler()
  const timer = new AutoDismissTimer(scheduler)
  let calls = 0
  timer.schedule(() => { calls += 1 }, 5_000)
  const stale = scheduler.callbacks.get(1)!

  timer.cancel()
  stale()

  assert.equal(calls, 0)
  assert.throws(() => timer.schedule(() => undefined, 0), RangeError)
})
