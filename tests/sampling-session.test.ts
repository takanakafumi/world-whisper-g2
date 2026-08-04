import assert from 'node:assert/strict'
import test from 'node:test'

import { ContextTimeline } from '../src/context/context-timeline.ts'
import type { ContextCaptureResult, ContextSnapshot } from '../src/context/context-snapshot.ts'
import { SamplingSession, type SamplingScheduler } from '../src/context/sampling-session.ts'

const snapshot = (seconds: number, latitude = 35): ContextSnapshot => ({
  latitude,
  longitude: 139,
  accuracyMeters: 0,
  capturedAt: new Date(Date.parse('2026-08-04T00:00:00Z') + seconds * 1000).toISOString(),
  localHour: 9,
  timezone: 'Asia/Tokyo',
})

class FakeScheduler implements SamplingScheduler {
  callback: (() => void) | null = null
  cleared = false

  setInterval(callback: () => void): unknown {
    this.callback = callback
    return 1
  }

  clearInterval(): void {
    this.cleared = true
    this.callback = null
  }
}

test('starts immediately, samples repeatedly, and stops cleanly', async () => {
  const scheduler = new FakeScheduler()
  const results: ContextCaptureResult[] = [
    { ok: true, snapshot: snapshot(0) },
    { ok: true, snapshot: snapshot(20, 35.0002) },
  ]
  let captures = 0
  const session = new SamplingSession(
    { async capture() { return results[captures++] } },
    new ContextTimeline(),
    { scheduler },
  )

  session.start()
  await session.captureOnce()
  assert.equal(captures, 1, 'overlapping manual capture is ignored')
  await new Promise((resolve) => setTimeout(resolve, 0))
  await session.captureOnce()

  assert.equal(session.getState().movement.sampleCount, 2)
  session.stop()
  assert.equal(session.getState().active, false)
  assert.equal(scheduler.cleared, true)
})

test('suppresses a capture result that resolves after stop', async () => {
  let resolveCapture!: (result: ContextCaptureResult) => void
  const capture = new Promise<ContextCaptureResult>((resolve) => { resolveCapture = resolve })
  const timeline = new ContextTimeline()
  const session = new SamplingSession({ capture: () => capture }, timeline, {
    scheduler: new FakeScheduler(),
  })

  session.start()
  session.stop()
  resolveCapture({ ok: true, snapshot: snapshot(0) })
  await capture
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(timeline.getSamples().length, 0)
})

test('recovers from provider failures without stopping the session', async () => {
  let attempt = 0
  const session = new SamplingSession({
    async capture() {
      attempt += 1
      return attempt === 1
        ? { ok: false, reason: 'unavailable', message: 'location unavailable' }
        : { ok: true, snapshot: snapshot(10) }
    },
  }, new ContextTimeline(), { scheduler: new FakeScheduler() })

  session.start()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(session.getState().error, 'location unavailable')
  assert.equal(session.getState().active, true)

  await session.captureOnce()
  assert.equal(session.getState().error, null)
  assert.equal(session.getState().movement.sampleCount, 1)
})

test('start is idempotent and validates the interval', () => {
  const scheduler = new FakeScheduler()
  let schedules = 0
  scheduler.setInterval = (callback) => {
    schedules += 1
    scheduler.callback = callback
    return 1
  }
  const session = new SamplingSession(
    { async capture() { return { ok: false, reason: 'unavailable', message: 'no fix' } } },
    new ContextTimeline(),
    { scheduler },
  )

  session.start()
  session.start()
  assert.equal(schedules, 1)
  assert.throws(() => new SamplingSession(
    { async capture() { return { ok: false, reason: 'unavailable', message: 'no fix' } } },
    new ContextTimeline(),
    { intervalMs: 0 },
  ), RangeError)
  session.stop()
})

test('a restarted session begins with an empty timeline', async () => {
  let seconds = 0
  const session = new SamplingSession(
    { async capture() { return { ok: true, snapshot: snapshot(seconds += 10) } } },
    new ContextTimeline(),
    { scheduler: new FakeScheduler() },
  )

  session.start()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(session.getState().movement.sampleCount, 1)
  session.stop()
  session.start()
  assert.equal(session.getState().movement.sampleCount, 0)
  session.stop()
})
