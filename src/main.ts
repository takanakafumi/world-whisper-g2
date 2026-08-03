import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'

import { AppController } from './app/controller.ts'
import { DiagnosticsView } from './diagnostics/diagnostics-view.ts'
import { G2Display } from './even/g2-display.ts'

const diagnostics = new DiagnosticsView('#diagnostic')

try {
  diagnostics.setStatus('Even Hubへ接続しています')
  const bridge = await waitForEvenAppBridge()
  const controller = new AppController(new G2Display(bridge), diagnostics)

  bridge.onEvenHubEvent((event) => controller.handleEvenHubEvent(event))
  await controller.start()
} catch (error) {
  diagnostics.reportError(error)
}
