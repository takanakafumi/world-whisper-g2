import assert from 'node:assert/strict'
import test from 'node:test'

import { initialAppState } from '../src/app/state.ts'
import {
  ObservationLog,
  observationSchemaVersion,
  type ObservationLabel,
} from '../src/context/observation-log.ts'
import type { SamplingSessionState } from '../src/context/sampling-session.ts'

const activeSamplingState = (): SamplingSessionState => ({
  active: true,
  transitioning: false,
  movement: {
    state: 'changed',
    sampleCount: 4,
    durationMs: 30_000,
    totalDistanceMeters: 42.5,
    displacementMeters: 38.25,
    speedMetersPerSecond: 1.42,
    dwellDurationMs: 0,
  },
  receivedEventCount: 5,
  acceptedEventCount: 4,
  ignoredEventCount: 1,
  latestCapturedAt: '2026-08-05T00:00:30.000Z',
  latestAccuracyMeters: 8,
  error: null,
})

test('records a labeled diagnostic snapshot with a deterministic schema', () => {
  const log = new ObservationLog(() => new Date('2026-08-05T01:02:03.000Z'))
  const result = log.record('walking', activeSamplingState(), initialAppState)

  assert.equal(result.ok, true)
  assert.deepEqual(JSON.parse(log.exportJson()), {
    schemaVersion: observationSchemaVersion,
    records: [{
      sequence: 1,
      label: 'walking',
      recordedAt: '2026-08-05T01:02:03.000Z',
      elapsedMs: 30_000,
      receivedEventCount: 5,
      acceptedSampleCount: 4,
      ignoredEventCount: 1,
      movementState: 'changed',
      totalDistanceMeters: 42.5,
      displacementMeters: 38.25,
      calculatedSpeedMetersPerSecond: 1.42,
      dwellDurationMs: 0,
      latestAccuracyMeters: 8,
      appState: {
        status: 'starting',
        interactionPhase: 'idle',
        isGenerating: false,
      },
    }],
  })
})

test('supports every explicit ground-truth label', () => {
  const labels: ObservationLabel[] = ['stationary', 'walking', 'dwelling', 'vehicle', 'other']
  const log = new ObservationLog(() => new Date('2026-08-05T00:00:00.000Z'))
  for (const label of labels) log.record(label, activeSamplingState(), initialAppState)
  assert.deepEqual(log.getRecords().map((record) => record.label), labels)
})

test('does not accept records while sampling is inactive or transitioning', () => {
  const log = new ObservationLog()
  assert.deepEqual(
    log.record('stationary', { ...activeSamplingState(), active: false }, initialAppState),
    { ok: false, reason: 'sampling-inactive' },
  )
  assert.deepEqual(
    log.record('stationary', { ...activeSamplingState(), transitioning: true }, initialAppState),
    { ok: false, reason: 'sampling-inactive' },
  )
  assert.equal(log.getRecords().length, 0)
})

test('exports no coordinates, place names, or raw history', () => {
  const log = new ObservationLog(() => new Date('2026-08-05T00:00:00.000Z'))
  log.record('walking', activeSamplingState(), initialAppState)
  const json = log.exportJson()
  assert.doesNotMatch(json, /"(?:latitude|longitude|placeName|locationHistory)"|35\.6812|139\.7671/i)
})

test('clear removes all in-memory records and resets sequence numbering', () => {
  const log = new ObservationLog(() => new Date('2026-08-05T00:00:00.000Z'))
  log.record('stationary', activeSamplingState(), initialAppState)
  log.clear()
  const result = log.record('other', activeSamplingState(), initialAppState)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.record.sequence, 1)
  assert.equal(log.getRecords().length, 1)
})

test('returned records cannot mutate the in-memory log', () => {
  const log = new ObservationLog(() => new Date('2026-08-05T00:00:00.000Z'))
  log.record('stationary', activeSamplingState(), initialAppState)
  const records = log.getRecords()
  records[0].label = 'vehicle'
  assert.equal(log.getRecords()[0].label, 'stationary')
})
