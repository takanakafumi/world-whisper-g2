import assert from 'node:assert/strict'
import test from 'node:test'

import type { ContextSnapshot } from '../src/context/context-snapshot.ts'
import {
  MAX_WHISPER_CHARACTERS,
  RuleBasedWhisperGenerator,
} from '../src/whisper/rule-based-whisper-generator.ts'

const generator = new RuleBasedWhisperGenerator()

function snapshot(localHour: number): ContextSnapshot {
  return {
    latitude: 35.6812,
    longitude: 139.7671,
    accuracyMeters: 10,
    capturedAt: '2026-08-03T00:00:00.000Z',
    localHour,
    timezone: 'Asia/Tokyo',
  }
}

test('generates a deterministic whisper for each time period', () => {
  const periods = [[5, 11], [12, 16], [17, 20], [21, 4]] as const

  for (const [firstHour, lastHour] of periods) {
    const first = generator.generate(snapshot(firstHour))
    const last = generator.generate(snapshot(lastHour))

    assert.equal(first, last)
    assert.equal(generator.generate(snapshot(firstHour)), first)
  }
})

test('all generated whispers are non-empty and at most 50 characters', () => {
  for (let hour = 0; hour < 24; hour += 1) {
    const whisper = generator.generate(snapshot(hour))

    assert.ok(whisper.length > 0)
    assert.ok(Array.from(whisper).length <= MAX_WHISPER_CHARACTERS)
  }
})

test('rejects invalid context values', () => {
  assert.throws(() => generator.generate(snapshot(-1)), RangeError)
  assert.throws(() => generator.generate(snapshot(24)), RangeError)
  assert.throws(() => generator.generate({ ...snapshot(12), latitude: 91 }), RangeError)
  assert.throws(() => generator.generate({ ...snapshot(12), longitude: Number.NaN }), RangeError)
})

test('returns deterministic alternative perspectives', () => {
  const primary = generator.generate(snapshot(12))
  const alternative = generator.generate(snapshot(12), { perspectiveIndex: 1 })

  assert.notEqual(alternative, primary)
  assert.equal(generator.generate(snapshot(12), { perspectiveIndex: 1 }), alternative)
  assert.throws(
    () => generator.generate(snapshot(12), { perspectiveIndex: -1 }),
    RangeError,
  )
})

test('generates distinct deterministic output for each deepening intent', () => {
  const intents = ['background', 'alternative', 'reflection'] as const
  const results = intents.map((deepenIntent) =>
    generator.generate(snapshot(12), { deepenIntent }))

  assert.equal(new Set(results).size, intents.length)
  for (const result of results) {
    assert.ok(Array.from(result).length <= MAX_WHISPER_CHARACTERS)
  }
})

