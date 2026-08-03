import assert from 'node:assert/strict'
import test from 'node:test'

import { initialAppState, reduceAppState } from '../src/app/state.ts'

test('tracks ready, event, and gesture state', () => {
  const ready = reduceAppState(initialAppState, { type: 'READY' })
  const received = reduceAppState(ready, { type: 'RAW_EVENT_RECEIVED' })
  const handled = reduceAppState(received, { type: 'GESTURE_HANDLED' })

  assert.deepEqual(handled, {
    status: 'ready',
    gestureCount: 1,
    rawEventCount: 1,
    isGenerating: false,
    lastError: undefined,
  })
})

test('tracks whisper generation without blocking shutdown', () => {
  const ready = reduceAppState(initialAppState, { type: 'READY' })
  const generating = reduceAppState(ready, { type: 'WHISPER_STARTED' })
  assert.equal(generating.isGenerating, true)

  const stopped = reduceAppState(generating, { type: 'SHUTDOWN_STARTED' })
  assert.equal(stopped.status, 'shutting-down')
  assert.equal(stopped.isGenerating, false)
})

test('prevents normal handling while shutting down and recovers on failure', () => {
  const shuttingDown = reduceAppState(
    { ...initialAppState, status: 'ready' },
    { type: 'SHUTDOWN_STARTED' },
  )
  assert.equal(shuttingDown.status, 'shutting-down')

  const recovered = reduceAppState(shuttingDown, {
    type: 'SHUTDOWN_FAILED',
    message: 'bridge rejected shutdown',
  })
  assert.equal(recovered.status, 'ready')
  assert.equal(recovered.lastError, 'bridge rejected shutdown')
})
