import assert from 'node:assert/strict'
import test from 'node:test'

import { AppController } from '../src/app/controller.ts'
import type { AutoDismissPort } from '../src/app/auto-dismiss-timer.ts'
import type { ContextCaptureResult, ContextSnapshot } from '../src/context/context-snapshot.ts'
import type { DeepenIntent } from '../src/whisper/whisper-generator.ts'

const context: ContextSnapshot = {
  latitude: 35.6812,
  longitude: 139.7671,
  accuracyMeters: 10,
  capturedAt: '2026-08-04T00:00:00.000Z',
  localHour: 18,
  timezone: 'Asia/Tokyo',
}

const createHarness = (
  capture: () => Promise<ContextCaptureResult>,
  autoDismiss: AutoDismissPort = { schedule: () => undefined, cancel: () => undefined },
) => {
  const created: string[] = []
  const shown: string[] = []
  const statuses: string[] = []
  const perspectiveIndexes: number[] = []
  const deepenIntents: Array<DeepenIntent | undefined> = []
  let shutdownCount = 0
  let captureCount = 0

  const controller = new AppController(
    {
      create: async (content) => { created.push(content) },
      show: async (content) => { shown.push(content) },
      shutdown: async () => { shutdownCount += 1 },
    },
    {
      setStatus: (message) => { statuses.push(message) },
      recordEvent: () => undefined,
      reportError: (error) => { throw error },
    },
    {
      capture: async () => {
        captureCount += 1
        return capture()
      },
    },
    {
      generate: (_snapshot, options) => {
        const index = options?.perspectiveIndex ?? 0
        perspectiveIndexes.push(index)
        deepenIntents.push(options?.deepenIntent)
        if (options?.deepenIntent) return `深掘り結果: ${options.deepenIntent}`
        return index === 0
          ? '夕暮れの気配が、道をやわらかく包んでいます。'
          : `別の視点 ${index} が見つかりました。`
      },
    },
    autoDismiss,
  )

  return {
    controller,
    created,
    shown,
    statuses,
    perspectiveIndexes,
    deepenIntents,
    counts: () => ({ shutdownCount, captureCount }),
  }
}

test('phone control displays a notification without capturing location', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()

  await harness.controller.triggerNotification()

  assert.equal(harness.counts().captureCount, 0)
  assert.match(harness.shown.at(-1) ?? '', /気づきのヒントがあります/)
})

test('single tap is ignored until a notification is active', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()

  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  assert.equal(harness.counts().captureCount, 0)
  assert.match(harness.statuses.at(-1) ?? '', /通知を発生/)
})

test('single tap deepens a notification into a primary whisper', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()
  await harness.controller.triggerNotification()

  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  assert.equal(harness.counts().captureCount, 1)
  assert.deepEqual(harness.perspectiveIndexes, [0])
  assert.match(harness.shown.at(-1) ?? '', /夕暮れの気配/)
})

test('single tap on a whisper opens choices and confirms the selected intent', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()
  await harness.controller.triggerNotification()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 2 } })

  assert.match(harness.shown.at(-1) ?? '', /この場所の背景/)
  await harness.controller.handleEvenHubEvent({ listEvent: { eventType: 2 } })
  assert.match(harness.shown.at(-1) ?? '', /› 別の見方/)
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 2 } })

  assert.equal(harness.counts().captureCount, 1)
  assert.equal(harness.deepenIntents.at(-1), 'alternative')
  assert.match(harness.shown.at(-1) ?? '', /深掘り結果: alternative/)
})

test('backward or down slide requests a different perspective', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()
  await harness.controller.triggerNotification()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  await harness.controller.handleEvenHubEvent({ listEvent: { eventType: 2 } })

  assert.deepEqual(harness.perspectiveIndexes, [0, 1])
  assert.match(harness.shown.at(-1) ?? '', /別の視点 1/)
})

test('forward or up slide dismisses the current display', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()
  await harness.controller.triggerNotification()

  await harness.controller.handleEvenHubEvent({ listEvent: { eventType: 1 } })

  assert.equal(harness.shown.at(-1), '\u00a0')
  assert.match(harness.statuses.at(-1) ?? '', /消去しました/)
})

test('phone dismiss cancels an in-flight capture and suppresses its result', async () => {
  let resolveCapture!: (result: ContextCaptureResult) => void
  const pendingCapture = new Promise<ContextCaptureResult>((resolve) => { resolveCapture = resolve })
  const harness = createHarness(() => pendingCapture)
  await harness.controller.start()
  await harness.controller.triggerNotification()

  const tap = harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await Promise.resolve()
  await harness.controller.dismissDisplay()
  resolveCapture({ ok: true, snapshot: context })
  await tap

  assert.deepEqual(harness.perspectiveIndexes, [])
  assert.equal(harness.shown.at(-1), '\u00a0')
})

test('double tap has no app action outside the choice menu', async () => {
  const harness = createHarness(async () => ({ ok: true, snapshot: context }))
  await harness.controller.start()

  await harness.controller.handleEvenHubEvent({ sysEvent: { eventType: 3 } })

  assert.equal(harness.counts().shutdownCount, 0)
  assert.match(harness.statuses.at(-1) ?? '', /長押しで終了/)
})

test('choice navigation pauses auto-dismiss and supports both directions', async () => {
  const callbacks: Array<() => void> = []
  let cancelCount = 0
  const harness = createHarness(
    async () => ({ ok: true, snapshot: context }),
    {
      schedule: (callback) => { callbacks.push(callback) },
      cancel: () => { cancelCount += 1 },
    },
  )
  await harness.controller.start()
  await harness.controller.triggerNotification()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  assert.equal(callbacks.length, 1)
  assert.equal(harness.controller.getState().interaction.selectedChoiceIndex, 0)
  await harness.controller.handleEvenHubEvent({ listEvent: { eventType: 2 } })
  assert.equal(harness.controller.getState().interaction.selectedChoiceIndex, 1)
  await harness.controller.handleEvenHubEvent({ listEvent: { eventType: 1 } })
  assert.equal(harness.controller.getState().interaction.selectedChoiceIndex, 0)
  assert.equal(callbacks.length, 1)
  assert.ok(cancelCount >= 2)
})

test('double tap closes choices, restores the whisper, and starts a fresh timer', async () => {
  const callbacks: Array<() => void> = []
  const harness = createHarness(
    async () => ({ ok: true, snapshot: context }),
    { schedule: (callback) => { callbacks.push(callback) }, cancel: () => undefined },
  )
  await harness.controller.start()
  await harness.controller.triggerNotification()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  const primary = harness.shown.at(-1)
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  await harness.controller.handleEvenHubEvent({ sysEvent: { eventType: 3 } })

  assert.equal(harness.controller.getState().interaction.phase, 'primary')
  assert.equal(harness.shown.at(-1), primary)
  assert.equal(callbacks.length, 2)
  assert.equal(harness.counts().shutdownCount, 0)
})

test('primary, deepened, and next displays receive fresh auto-dismiss timers', async () => {
  const callbacks: Array<() => void> = []
  let cancelCount = 0
  const harness = createHarness(
    async () => ({ ok: true, snapshot: context }),
    {
      schedule: (callback, delayMs) => {
        assert.equal(delayMs, 5_000)
        callbacks.push(callback)
      },
      cancel: () => { cancelCount += 1 },
    },
  )
  await harness.controller.start()
  await harness.controller.triggerNotification()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await harness.controller.handleEvenHubEvent({ listEvent: { eventType: 2 } })

  assert.equal(callbacks.length, 3)
  callbacks.at(-1)!()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(harness.shown.at(-1), '\u00a0')
  assert.ok(cancelCount >= 2)
})

test('auto-dismiss can be disabled and re-enabled for the current display', async () => {
  const callbacks: Array<() => void> = []
  let cancelCount = 0
  const harness = createHarness(
    async () => ({ ok: true, snapshot: context }),
    {
      schedule: (callback) => { callbacks.push(callback) },
      cancel: () => { cancelCount += 1 },
    },
  )
  await harness.controller.start()
  await harness.controller.triggerNotification()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  harness.controller.setAutoDismissEnabled(false)
  harness.controller.setAutoDismissEnabled(true)

  assert.equal(callbacks.length, 2)
  assert.ok(cancelCount >= 2)
})
