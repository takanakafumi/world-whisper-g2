import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialInteractionState,
  transitionInteraction,
  type InteractionAction,
} from '../src/app/interaction-state.ts'

const apply = (actions: InteractionAction[]) =>
  actions.reduce(transitionInteraction, initialInteractionState)

test('supports notification, primary, deepen, next, and dismiss transitions', () => {
  assert.deepEqual(apply([{ type: 'NOTIFY' }]), {
    phase: 'notified',
    perspectiveIndex: 0,
  })
  assert.equal(apply([{ type: 'NOTIFY' }, { type: 'SHOW_PRIMARY' }]).phase, 'primary')
  assert.equal(apply([
    { type: 'NOTIFY' },
    { type: 'SHOW_PRIMARY' },
    { type: 'DEEPEN' },
  ]).phase, 'deepened')
  assert.deepEqual(apply([
    { type: 'NOTIFY' },
    { type: 'SHOW_PRIMARY' },
    { type: 'SHOW_NEXT' },
  ]), { phase: 'next', perspectiveIndex: 1 })
  assert.equal(apply([{ type: 'NOTIFY' }, { type: 'DISMISS' }]).phase, 'dismissed')
})

test('ignores out-of-order transitions', () => {
  assert.deepEqual(transitionInteraction(initialInteractionState, { type: 'DEEPEN' }), initialInteractionState)
  assert.deepEqual(transitionInteraction(initialInteractionState, { type: 'SHOW_NEXT' }), initialInteractionState)
  assert.deepEqual(transitionInteraction(initialInteractionState, { type: 'DISMISS' }), initialInteractionState)
})

test('a new notification resets the perspective index', () => {
  const next = apply([
    { type: 'NOTIFY' },
    { type: 'SHOW_PRIMARY' },
    { type: 'SHOW_NEXT' },
    { type: 'SHOW_NEXT' },
  ])

  assert.deepEqual(transitionInteraction(next, { type: 'NOTIFY' }), {
    phase: 'notified',
    perspectiveIndex: 0,
  })
})

