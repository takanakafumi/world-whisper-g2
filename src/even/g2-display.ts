import {
  CreateStartUpPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  TextContainerUpgrade,
  type EvenAppBridge,
} from '@evenrealities/even_hub_sdk'

const containerID = 1
const containerName = 'world-whisper'

export interface G2DisplayPort {
  create(content: string): Promise<void>
  show(content: string): Promise<void>
  shutdown(): Promise<void>
}

export class G2Display implements G2DisplayPort {
  private active = false
  private pendingUpdate = Promise.resolve()
  private readonly bridge: EvenAppBridge

  constructor(bridge: EvenAppBridge) {
    this.bridge = bridge
  }

  async create(content: string) {
    const text = new TextContainerProperty({
      xPosition: 0,
      yPosition: 0,
      width: 576,
      height: 288,
      borderWidth: 0,
      borderColor: 5,
      paddingLength: 12,
      containerID,
      containerName,
      content,
      isEventCapture: 1,
    })
    const result = await this.bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [text] }),
    )

    if (result !== StartUpPageCreateResult.success) {
      throw new Error(`Failed to create the G2 page: ${StartUpPageCreateResult[result]}`)
    }
    this.active = true
  }

  show(content: string) {
    if (!this.active) {
      return Promise.reject(new Error('Cannot update an inactive G2 page'))
    }

    this.pendingUpdate = this.pendingUpdate
      .catch(() => undefined)
      .then(async () => {
        if (!this.active) {
          return
        }
        const didUpdate = await this.bridge.textContainerUpgrade(
          new TextContainerUpgrade({
            containerID,
            containerName,
            contentOffset: 0,
            contentLength: content.length,
            content,
          }),
        )
        if (!didUpdate) {
          throw new Error('Failed to update the G2 page')
        }
      })

    return this.pendingUpdate
  }

  async shutdown() {
    this.active = false
    await this.pendingUpdate.catch(() => undefined)
    const didShutDown = await this.bridge.shutDownPageContainer(0)
    if (!didShutDown) {
      this.active = true
      throw new Error('Failed to shut down the G2 page')
    }
  }
}
