import assert from 'node:assert/strict'
import test from 'node:test'

import { ContextTimeline } from '../src/context/context-timeline.ts'
import type { ContextSnapshot, ContextUpdateSource } from '../src/context/context-snapshot.ts'
import { SamplingSession } from '../src/context/sampling-session.ts'

const snapshot = (seconds: number, latitude = 35): ContextSnapshot => ({
  latitude,
  longitude: 139,
  accuracyMeters: 0,
  capturedAt: new Date(Date.parse('2026-08-04T00:00:00Z') + seconds * 1000).toISOString(),
  localHour: 9,
  timezone: 'Asia/Tokyo',
})

class FakeSource implements ContextUpdateSource {
  starts = 0
  stops = 0
  onSnapshot: ((value: ContextSnapshot) => void) | null = null
  onError: ((error: unknown) => void) | null = null

  async start(
    onSnapshot: (value: ContextSnapshot) => void,
    onError: (error: unknown) => void,
  ): Promise<void> {
    this.starts += 1
    this.onSnapshot = onSnapshot
    this.onError = onError
  }

  async stop(): Promise<void> {
    this.stops += 1
    this.onSnapshot = null
    this.onError = null
  }

  emit(value: ContextSnapshot): void {
    this.onSnapshot?.(value)
  }
}

test('starts the SDK source once and consumes pushed snapshots', async () => {
  const source = new FakeSource()
  const session = new SamplingSession(source, new ContextTimeline())

  await session.start()
  await session.start()
  source.emit(snapshot(0))
  source.emit(snapshot(20, 35.0002))

  assert.equal(source.starts, 1)
  assert.equal(session.getState().movement.sampleCount, 2)
  assert.equal(session.getState().active, true)
})

test('stops the SDK source and suppresses events from an old subscription', async () => {
  const source = new FakeSource()
  const timeline = new ContextTimeline()
  const session = new SamplingSession(source, timeline)
  await session.start()
  const staleListener = source.onSnapshot

  await session.stop()
  staleListener?.(snapshot(0))

  assert.equal(source.stops, 1)
  assert.equal(timeline.getSamples().length, 0)
  assert.equal(session.getState().active, false)
})

test('reports source errors without terminating an active session', async () => {
  const source = new FakeSource()
  const session = new SamplingSession(source, new ContextTimeline())
  await session.start()

  source.onError?.(new Error('location unavailable'))
  assert.equal(session.getState().error, 'location unavailable')
  assert.equal(session.getState().active, true)

  source.emit(snapshot(10))
  assert.equal(session.getState().error, null)
})

test('ignores duplicate and stale SDK timestamps', async () => {
  const source = new FakeSource()
  const session = new SamplingSession(source, new ContextTimeline())
  await session.start()

  source.emit(snapshot(10))
  source.emit(snapshot(10, 35.0002))
  source.emit(snapshot(5, 35.0003))

  assert.equal(session.getState().movement.sampleCount, 1)
  assert.equal(session.getState().error, null)
})

test('reports SDK start and stop failures', async () => {
  const startFailure = new SamplingSession({
    async start() { throw new Error('start failed') },
    async stop() {},
  }, new ContextTimeline())
  await startFailure.start()
  assert.equal(startFailure.getState().active, false)
  assert.equal(startFailure.getState().error, 'start failed')

  const stopFailure = new SamplingSession({
    async start() {},
    async stop() { throw new Error('stop failed') },
  }, new ContextTimeline())
  await stopFailure.start()
  await stopFailure.stop()
  assert.equal(stopFailure.getState().active, false)
  assert.equal(stopFailure.getState().error, 'stop failed')
})

test('a restarted session begins with an empty timeline', async () => {
  const source = new FakeSource()
  const session = new SamplingSession(source, new ContextTimeline())
  await session.start()
  source.emit(snapshot(10))
  assert.equal(session.getState().movement.sampleCount, 1)

  await session.stop()
  await session.start()
  assert.equal(session.getState().movement.sampleCount, 0)
})
