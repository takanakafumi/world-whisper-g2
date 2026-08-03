import assert from 'node:assert/strict'
import test from 'node:test'

import { AppLocationAccuracy } from '@evenrealities/even_hub_sdk'

import { EvenHubContextProvider } from '../src/context/even-hub-context-provider.ts'

test('creates a ContextSnapshot from an SDK location fix', async () => {
  let requestedOptions: unknown
  const provider = new EvenHubContextProvider(
    {
      async getAppLocation(options) {
        requestedOptions = options
        return {
          latitude: 35.681236,
          longitude: 139.767125,
          accuracy: 12.4,
          timestamp: Date.parse('2026-08-03T06:00:00.000Z'),
        }
      },
    },
    () => new Date('2026-08-03T07:00:00.000Z'),
    () => 'Asia/Tokyo',
  )

  assert.deepEqual(await provider.capture(), {
    ok: true,
    snapshot: {
      latitude: 35.681236,
      longitude: 139.767125,
      accuracyMeters: 12.4,
      capturedAt: '2026-08-03T06:00:00.000Z',
      localHour: 15,
      timezone: 'Asia/Tokyo',
    },
  })
  assert.deepEqual(requestedOptions, {
    accuracy: AppLocationAccuracy.High,
    timeoutMs: 10_000,
  })
})

test('uses the current time when the SDK omits a timestamp', async () => {
  const provider = new EvenHubContextProvider(
    {
      async getAppLocation() {
        return { latitude: 35, longitude: 139 }
      },
    },
    () => new Date('2026-08-03T21:30:00+09:00'),
    () => 'Asia/Tokyo',
  )

  const result = await provider.capture()
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.snapshot.accuracyMeters, null)
    assert.equal(result.snapshot.localHour, 21)
  }
})

test('reports null and invalid fixes as unavailable', async () => {
  for (const location of [null, { latitude: 200, longitude: 139 }]) {
    const provider = new EvenHubContextProvider({
      async getAppLocation() {
        return location
      },
    })
    const result = await provider.capture()

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.reason, 'unavailable')
    }
  }
})
