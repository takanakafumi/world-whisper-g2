import assert from 'node:assert/strict'
import test from 'node:test'

import { GeolocationDiagnostic } from '../src/context/geolocation-diagnostic.ts'

const environment = { isSecureContext: true, href: 'https://example.test/' }

test('returns a normalized successful location without persisting it', async () => {
  const diagnostic = new GeolocationDiagnostic(
    {
      getCurrentPosition(success) {
        success({
          coords: {
            latitude: 35.681236,
            longitude: 139.767125,
            accuracy: 12.4,
          },
          timestamp: Date.parse('2026-08-03T06:00:00.000Z'),
        })
      },
    },
    environment,
  )

  assert.deepEqual(await diagnostic.capture(), {
    ok: true,
    latitude: 35.681236,
    longitude: 139.767125,
    accuracyMeters: 12.4,
    capturedAt: '2026-08-03T06:00:00.000Z',
    environment,
  })
})

test('classifies permission, unavailable, and timeout failures', async () => {
  const expected = new Map([
    [1, 'permission-denied'],
    [2, 'position-unavailable'],
    [3, 'timeout'],
    [99, 'unknown'],
  ])

  for (const [code, reason] of expected) {
    const diagnostic = new GeolocationDiagnostic(
      {
        getCurrentPosition(_success, error) {
          error?.({ code, message: `error-${code}` })
        },
      },
      environment,
    )
    const result = await diagnostic.capture()
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.reason, reason)
    }
  }
})

test('reports unsupported environments without requesting permission', async () => {
  const result = await new GeolocationDiagnostic(undefined, {
    isSecureContext: false,
    href: 'http://192.168.0.29:5173/',
  }).capture()

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.reason, 'unsupported')
    assert.equal(result.environment.isSecureContext, false)
  }
})
