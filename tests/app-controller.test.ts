import assert from 'node:assert/strict'
import test from 'node:test'

import { AppController } from '../src/app/controller.ts'
import type { ContextCaptureResult, ContextSnapshot } from '../src/context/context-snapshot.ts'

const context: ContextSnapshot = {
  latitude: 35.6812,
  longitude: 139.7671,
  accuracyMeters: 10,
  capturedAt: '2026-08-03T00:00:00.000Z',
  localHour: 18,
  timezone: 'Asia/Tokyo',
}

const createHarness = (capture: () => Promise<ContextCaptureResult>) => {
  const created: string[] = []
  const shown: string[] = []
  const statuses: string[] = []
  let shutdownCount = 0
  let generateCount = 0

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
    { capture },
    {
      generate: () => {
        generateCount += 1
        return '夕暮れの気配が、道をやわらかく包んでいます。'
      },
    },
  )

  return {
    controller,
    created,
    shown,
    statuses,
    counts: () => ({ shutdownCount, generateCount }),
  }
}

test('single tap captures context and displays one generated whisper', async () => {
  let captureCount = 0
  const harness = createHarness(async () => {
    captureCount += 1
    return { ok: true, snapshot: context }
  })

  await harness.controller.start()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })

  assert.equal(captureCount, 1)
  assert.equal(harness.counts().generateCount, 1)
  assert.match(harness.shown.at(-1) ?? '', /夕暮れの気配/)
  assert.match(harness.statuses.at(-1) ?? '', /生成成功/)
})

test('ignores additional single taps while generation is in progress', async () => {
  let resolveCapture!: (result: ContextCaptureResult) => void
  let captureCount = 0
  const pendingCapture = new Promise<ContextCaptureResult>((resolve) => { resolveCapture = resolve })
  const harness = createHarness(async () => {
    captureCount += 1
    return pendingCapture
  })

  await harness.controller.start()
  const firstTap = harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await Promise.resolve()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 2 } })
  resolveCapture({ ok: true, snapshot: context })
  await firstTap

  assert.equal(captureCount, 1)
  assert.equal(harness.counts().generateCount, 1)
})

test('double tap shuts down during capture and suppresses the late result', async () => {
  let resolveCapture!: (result: ContextCaptureResult) => void
  const pendingCapture = new Promise<ContextCaptureResult>((resolve) => { resolveCapture = resolve })
  const harness = createHarness(() => pendingCapture)

  await harness.controller.start()
  const firstTap = harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 1 } })
  await Promise.resolve()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventType: 3 } })
  resolveCapture({ ok: true, snapshot: context })
  await firstTap

  assert.equal(harness.counts().shutdownCount, 1)
  assert.equal(harness.counts().generateCount, 0)
  assert.doesNotMatch(harness.shown.at(-1) ?? '', /夕暮れの気配/)
})

test('shows a controlled message when context capture is unavailable', async () => {
  const harness = createHarness(async () => ({
    ok: false,
    reason: 'unavailable',
    message: 'location unavailable',
  }))

  await harness.controller.start()
  await harness.controller.handleEvenHubEvent({ sysEvent: { eventSource: 3 } })

  assert.equal(harness.counts().generateCount, 0)
  assert.match(harness.shown.at(-1) ?? '', /気配を受け取れません/)
  assert.match(harness.statuses.at(-1) ?? '', /location unavailable/)
})

