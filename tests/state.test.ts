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
    interaction: {
      phase: 'idle',
      perspectiveIndex: 0,
      selectedChoiceIndex: 0,
      choiceReturnPhase: null,
    },
    lastError: undefined,
  })
})

test('tracks Phase 2 interaction transitions', () => {
  const ready = reduceAppState(initialAppState, { type: 'READY' })
  const notified = reduceAppState(ready, { type: 'NOTIFICATION_TRIGGERED' })
  const primary = reduceAppState(notified, { type: 'PRIMARY_SHOWN' })
  const next = reduceAppState(primary, { type: 'NEXT_SHOWN' })
  const dismissed = reduceAppState(next, { type: 'DISPLAY_DISMISSED' })

  assert.equal(notified.interaction.phase, 'notified')
  assert.equal(primary.interaction.phase, 'primary')
  assert.deepEqual(next.interaction, {
    phase: 'next',
    perspectiveIndex: 1,
    selectedChoiceIndex: 0,
    choiceReturnPhase: null,
  })
  assert.equal(dismissed.interaction.phase, 'dismissed')
})

test('tracks deepening menu selection and confirmation', () => {
  const ready = reduceAppState(initialAppState, { type: 'READY' })
  const notified = reduceAppState(ready, { type: 'NOTIFICATION_TRIGGERED' })
  const primary = reduceAppState(notified, { type: 'PRIMARY_SHOWN' })
  const choices = reduceAppState(primary, { type: 'DEEPENING_CHOICES_OPENED' })
  const selected = reduceAppState(choices, { type: 'NEXT_DEEPENING_CHOICE', choiceCount: 3 })
  const deepened = reduceAppState(selected, { type: 'DEEPENED' })

  assert.equal(choices.interaction.phase, 'choices')
  assert.equal(selected.interaction.selectedChoiceIndex, 1)
  assert.equal(deepened.interaction.phase, 'deepened')
})

test('tracks previous choice selection and menu cancellation', () => {
  const primary = reduceAppState(
    reduceAppState(
      reduceAppState(initialAppState, { type: 'READY' }),
      { type: 'NOTIFICATION_TRIGGERED' },
    ),
    { type: 'PRIMARY_SHOWN' },
  )
  const choices = reduceAppState(primary, { type: 'DEEPENING_CHOICES_OPENED' })
  const selected = reduceAppState(choices, { type: 'PREVIOUS_DEEPENING_CHOICE', choiceCount: 3 })
  const cancelled = reduceAppState(selected, { type: 'DEEPENING_CHOICES_CANCELLED' })

  assert.equal(selected.interaction.selectedChoiceIndex, 2)
  assert.equal(cancelled.interaction.phase, 'primary')
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
