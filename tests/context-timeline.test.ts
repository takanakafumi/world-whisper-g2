import assert from 'node:assert/strict'
import test from 'node:test'

import { ContextTimeline } from '../src/context/context-timeline.ts'
import type { ContextSnapshot } from '../src/context/context-snapshot.ts'
import { geographicDistanceMeters } from '../src/context/geo-distance.ts'

const baseTime = Date.parse('2026-08-04T00:00:00.000Z')

function sample(
  minute: number,
  latitude = 35,
  longitude = 139,
  accuracyMeters: number | null = 5,
): ContextSnapshot {
  return {
    latitude,
    longitude,
    accuracyMeters,
    capturedAt: new Date(baseTime + minute * 60_000).toISOString(),
    localHour: 9,
    timezone: 'Asia/Tokyo',
  }
}

test('returns unknown until two samples are available', () => {
  const timeline = new ContextTimeline()

  assert.equal(timeline.analyze().state, 'unknown')
  assert.equal(timeline.add(sample(0)).state, 'unknown')
})

test('calculates deterministic geographic distance', () => {
  const distance = geographicDistanceMeters(sample(0), sample(1, 35.001, 139))

  assert.ok(distance > 111 && distance < 112)
})

test('suppresses GPS jitter inside the accuracy envelope', () => {
  const timeline = new ContextTimeline()
  timeline.add(sample(0, 35, 139, 10))
  const movement = timeline.add(sample(1, 35.00005, 139, 10))

  assert.equal(movement.state, 'stationary')
  assert.equal(movement.totalDistanceMeters, 0)
})

test('classifies meaningful distance and speed as moving', () => {
  const timeline = new ContextTimeline()
  timeline.add(sample(0))
  const movement = timeline.add(sample(1, 35.001, 139))

  assert.equal(movement.state, 'moving')
  assert.ok(movement.totalDistanceMeters > 100)
  assert.ok(movement.speedMetersPerSecond > 1.5)
})

test('classifies sustained low motion as dwelling', () => {
  const timeline = new ContextTimeline({ dwellThresholdMs: 5 * 60_000 })
  timeline.add(sample(0, 35, 139, 10))
  timeline.add(sample(3, 35.00003, 139, 10))
  const movement = timeline.add(sample(6, 35.00004, 139, 10))

  assert.equal(movement.state, 'dwelling')
  assert.equal(movement.dwellDurationMs, 6 * 60_000)
})

test('prunes samples by maximum age and count', () => {
  const timeline = new ContextTimeline({ maxSamples: 3, maxAgeMs: 5 * 60_000 })
  timeline.add(sample(0))
  timeline.add(sample(1))
  timeline.add(sample(2))
  timeline.add(sample(3))
  assert.deepEqual(timeline.getSamples().map(({ capturedAt }) => capturedAt), [
    sample(1).capturedAt,
    sample(2).capturedAt,
    sample(3).capturedAt,
  ])

  const movement = timeline.add(sample(10))
  assert.equal(movement.state, 'unknown')
  assert.deepEqual(timeline.getSamples().map(({ capturedAt }) => capturedAt), [sample(10).capturedAt])
})

test('rejects invalid and out-of-order samples', () => {
  const timeline = new ContextTimeline()
  timeline.add(sample(1))

  assert.throws(() => timeline.add(sample(0)), /strictly increasing/)
  assert.throws(() => new ContextTimeline().add({ ...sample(0), latitude: 91 }), RangeError)
  assert.throws(() => new ContextTimeline().add({ ...sample(0), capturedAt: 'invalid' }), RangeError)
  assert.throws(() => new ContextTimeline().add({ ...sample(0), accuracyMeters: -1 }), RangeError)
})

test('returns copies and can clear all samples', () => {
  const timeline = new ContextTimeline()
  timeline.add(sample(0))
  const copy = timeline.getSamples()
  copy[0].latitude = 0

  assert.equal(timeline.getSamples()[0].latitude, 35)
  timeline.clear()
  assert.equal(timeline.analyze().state, 'unknown')
})

