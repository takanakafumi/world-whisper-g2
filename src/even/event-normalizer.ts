import {
  EventSourceType,
  OsEventTypeList,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk'

export type GestureKind = 'click' | 'scroll-up' | 'scroll-down' | 'double-click' | 'unknown'

export interface NormalizedGesture {
  kind: GestureKind
  reportedEventType: OsEventTypeList | undefined
  compatibilityFallback: boolean
}

export const normalizeEvenHubEvent = (event: EvenHubEvent): NormalizedGesture => {
  const reportedEventType =
    event.textEvent?.eventType ?? event.listEvent?.eventType ?? event.sysEvent?.eventType
  const touchSource = EventSourceType.fromJson(event.sysEvent?.eventSource)
  const compatibilityFallback =
    reportedEventType === undefined &&
    event.sysEvent !== undefined &&
    touchSource !== undefined &&
    touchSource !== EventSourceType.TOUCH_EVENT_FORM_DUMMY_NULL
  const effectiveEventType = compatibilityFallback
    ? OsEventTypeList.CLICK_EVENT
    : reportedEventType

  switch (effectiveEventType) {
    case OsEventTypeList.CLICK_EVENT:
      return { kind: 'click', reportedEventType, compatibilityFallback }
    case OsEventTypeList.SCROLL_TOP_EVENT:
      return { kind: 'scroll-up', reportedEventType, compatibilityFallback }
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      return { kind: 'scroll-down', reportedEventType, compatibilityFallback }
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      return { kind: 'double-click', reportedEventType, compatibilityFallback }
    default:
      return { kind: 'unknown', reportedEventType, compatibilityFallback }
  }
}
