import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeEvenHubEvent } from '../src/even/event-normalizer.ts'

test('normalizes reported gesture event types', () => {
  assert.equal(normalizeEvenHubEvent({ textEvent: { eventType: 0 } }).kind, 'click')
  assert.equal(normalizeEvenHubEvent({ listEvent: { eventType: 1 } }).kind, 'scroll-up')
  assert.equal(normalizeEvenHubEvent({ sysEvent: { eventType: 2 } }).kind, 'scroll-down')
  assert.equal(normalizeEvenHubEvent({ sysEvent: { eventType: 3 } }).kind, 'double-click')
})

test('normalizes untyped real-device touch events as clicks', () => {
  for (const eventSource of [1, 2, 3]) {
    const gesture = normalizeEvenHubEvent({ sysEvent: { eventSource } })
    assert.equal(gesture.kind, 'click')
    assert.equal(gesture.compatibilityFallback, true)
    assert.equal(gesture.reportedEventType, undefined)
  }
})

test('does not treat dummy or missing event sources as clicks', () => {
  assert.equal(normalizeEvenHubEvent({ sysEvent: { eventSource: 0 } }).kind, 'unknown')
  assert.equal(normalizeEvenHubEvent({ sysEvent: {} }).kind, 'unknown')
})
