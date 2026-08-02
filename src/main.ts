import { CreateStartUpPageContainer, TextContainerProperty, waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
const bridge = await waitForEvenAppBridge()
const whisper = new TextContainerProperty({ xPosition: 0, yPosition: 0, width: 576, height: 288, borderWidth: 0, borderColor: 5, paddingLength: 12, containerID: 1, containerName: 'world-whisper', content: 'World Whisper\n\n世界のささやきを\nG2に届けます。', isEventCapture: 1 })
await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [whisper] }))
