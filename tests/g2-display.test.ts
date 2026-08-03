import assert from 'node:assert/strict'
import test from 'node:test'

import { G2Display } from '../src/even/g2-display.ts'

const createBridge = () => {
  let updateCalls = 0
  let shutdownCalls = 0
  const bridge = {
    createStartUpPageContainer: async () => 0,
    textContainerUpgrade: async () => {
      updateCalls += 1
      return true
    },
    shutDownPageContainer: async () => {
      shutdownCalls += 1
      return true
    },
  }

  return {
    bridge,
    counts: () => ({ updateCalls, shutdownCalls }),
  }
}

test('cancels queued display updates when shutdown starts', async () => {
  const fake = createBridge()
  const display = new G2Display(fake.bridge)

  await display.create('initial')
  const queuedUpdate = display.show('queued')
  await display.shutdown()
  await queuedUpdate

  assert.deepEqual(fake.counts(), { updateCalls: 0, shutdownCalls: 1 })
})

test('rejects updates after shutdown', async () => {
  const fake = createBridge()
  const display = new G2Display(fake.bridge)

  await display.create('initial')
  await display.shutdown()

  await assert.rejects(display.show('too late'), /inactive G2 page/)
})
