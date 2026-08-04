import {
  AppLocationAccuracy,
  type AppLocation,
  type AppLocationOptions,
} from '@evenrealities/even_hub_sdk'

import type { ContextSnapshot, ContextUpdateSource } from './context-snapshot.ts'
import { contextSnapshotFromAppLocation } from './even-hub-context-provider.ts'

export interface AppLocationUpdateBridge {
  startAppLocationUpdates(options?: AppLocationOptions): Promise<boolean>
  stopAppLocationUpdates(): Promise<boolean>
  onAppLocationChanged(callback: (location: AppLocation) => void): () => void
}

export class EvenHubContextUpdateSource implements ContextUpdateSource {
  private readonly bridge: AppLocationUpdateBridge
  private readonly now: () => Date
  private readonly timezone: () => string
  private unsubscribe: (() => void) | null = null
  private startPromise: Promise<void> | null = null

  constructor(
    bridge: AppLocationUpdateBridge,
    now: () => Date = () => new Date(),
    timezone: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {
    this.bridge = bridge
    this.now = now
    this.timezone = timezone
  }

  async start(
    onSnapshot: (snapshot: ContextSnapshot) => void,
    onError: (error: unknown) => void,
  ): Promise<void> {
    if (this.unsubscribe) return
    const unsubscribe = this.bridge.onAppLocationChanged((location) => {
      const result = contextSnapshotFromAppLocation(location, this.now, this.timezone)
      if (result.ok) onSnapshot(result.snapshot)
      else onError(new Error(result.message))
    })
    this.unsubscribe = unsubscribe

    const startPromise = (async () => {
      const started = await this.bridge.startAppLocationUpdates({
        accuracy: AppLocationAccuracy.Medium,
        intervalMs: 5_000,
        distanceFilter: 5,
      })
      if (!started) throw new Error('Even Hub SDKの位置更新を開始できませんでした。')
    })()
    this.startPromise = startPromise

    try {
      await startPromise
    } catch (error) {
      if (this.unsubscribe === unsubscribe) {
        unsubscribe()
        this.unsubscribe = null
      }
      throw error
    } finally {
      if (this.startPromise === startPromise) this.startPromise = null
    }
  }

  async stop(): Promise<void> {
    const unsubscribe = this.unsubscribe
    const pendingStart = this.startPromise
    this.unsubscribe = null
    unsubscribe?.()
    if (!unsubscribe) return
    if (pendingStart) {
      try {
        await pendingStart
      } catch {
        return
      }
    }
    await this.bridge.stopAppLocationUpdates()
  }
}
