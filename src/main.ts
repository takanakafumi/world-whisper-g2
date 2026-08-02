import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from '@evenrealities/even_hub_sdk'

const bridge = await waitForEvenAppBridge()
const releaseLabel = 'GESTURE TEST v0.2.0'
let isShuttingDown = false
let gestureCount = 0
let pendingTextUpdate = Promise.resolve()

const initialContent = [
  releaseLabel,
  '',
  '操作確認画面に更新済み',
  'タップ: 表示更新',
  '上下スライド: 表示更新',
  'ダブルタップ: 終了',
].join('\n')

const showGesture = (label: string) => {
  gestureCount += 1
  const content = [
    releaseLabel,
    '',
    `検出: ${label}`,
    `操作回数: ${gestureCount}`,
    '',
    'ダブルタップで終了',
  ].join('\n')

  // Keep rapid slide events in order instead of sending overlapping bridge requests.
  pendingTextUpdate = pendingTextUpdate
    .catch(() => undefined)
    .then(async () => {
      const didUpdate = await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 1,
          containerName: 'world-whisper',
          contentOffset: 0,
          contentLength: content.length,
          content,
        }),
      )

      if (!didUpdate) {
        throw new Error('Failed to update the gesture display')
      }
    })
}

bridge.onEvenHubEvent((event) => {
  const eventType =
    event.textEvent?.eventType ?? event.listEvent?.eventType ?? event.sysEvent?.eventType

  if (isShuttingDown) {
    return
  }

  switch (eventType) {
    case OsEventTypeList.CLICK_EVENT:
      showGesture('シングルタップ')
      break
    case OsEventTypeList.SCROLL_TOP_EVENT:
      showGesture('上方向スライド')
      break
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      showGesture('下方向スライド')
      break
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      isShuttingDown = true
      void bridge
        .shutDownPageContainer(0)
        .then((didShutDown) => {
          if (!didShutDown) {
            isShuttingDown = false
          }
        })
        .catch(() => {
          isShuttingDown = false
        })
      break
    default:
      break
  }
})

const whisper = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 12,
  containerID: 1,
  containerName: 'world-whisper',
  content: initialContent,
  isEventCapture: 1,
})

await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [whisper] }),
)
