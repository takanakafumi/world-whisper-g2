import assert from 'node:assert/strict'
import test from 'node:test'

import { AppLocationAccuracy, type AppLocation } from '@evenrealities/even_hub_sdk'

import { EvenHubContextUpdateSource } from '../src/context/even-hub-context-update-source.ts'

test('uses SDK continuous location updates and converts events', async () => {
  let options: unknown
  let listener: ((location: AppLocation) => void) | null = null
  let unsubscribed = 0
  let stopped = 0
  const source = new EvenHubContextUpdateSource({
    async startAppLocationUpdates(value) { options = value; return true },
    async stopAppLocationUpdates() { stopped += 1; return true },
    onAppLocationChanged(callback) {
      listener = callback
      return () => { unsubscribed += 1 }
    },
  }, () => new Date('2026-08-04T00:00:00Z'), () => 'Asia/Tokyo')
  const snapshots: unknown[] = []

  await source.start((value) => snapshots.push(value), () => undefined)
  const emit = listener as ((location: AppLocation) => void) | null
  emit?.({ latitude: 35, longitude: 139, accuracy: 8 })
  await source.stop()

  assert.deepEqual(options, {
    accuracy: AppLocationAccuracy.Medium,
    intervalMs: 5_000,
    distanceFilter: 5,
  })
  assert.equal(snapshots.length, 1)
  assert.equal(unsubscribed, 1)
  assert.equal(stopped, 1)
})

test('cleans up the listener when SDK start fails', async () => {
  let unsubscribed = 0
  const source = new EvenHubContextUpdateSource({
    async startAppLocationUpdates() { return false },
    async stopAppLocationUpdates() { return true },
    onAppLocationChanged() { return () => { unsubscribed += 1 } },
  })

  await assert.rejects(() => source.start(() => undefined, () => undefined), /開始できませんでした/)
  assert.equal(unsubscribed, 1)
})

test('serializes stop behind an in-flight SDK start', async () => {
  let resolveStart!: (started: boolean) => void
  const pendingStart = new Promise<boolean>((resolve) => { resolveStart = resolve })
  const calls: string[] = []
  const source = new EvenHubContextUpdateSource({
    async startAppLocationUpdates() { calls.push('start'); return pendingStart },
    async stopAppLocationUpdates() { calls.push('stop'); return true },
    onAppLocationChanged() { return () => { calls.push('unsubscribe') } },
  })

  const starting = source.start(() => undefined, () => undefined)
  const stopping = source.stop()
  assert.deepEqual(calls, ['start', 'unsubscribe'])
  resolveStart(true)
  await Promise.all([starting, stopping])

  assert.deepEqual(calls, ['start', 'unsubscribe', 'stop'])
})
