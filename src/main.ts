import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'

import { AppController } from './app/controller.ts'
import { createBrowserGeolocationDiagnostic } from './context/geolocation-diagnostic.ts'
import { LocationDiagnosticsController } from './context/location-diagnostics-controller.ts'
import { DiagnosticsView } from './diagnostics/diagnostics-view.ts'
import { G2Display } from './even/g2-display.ts'

const diagnostics = new DiagnosticsView('#diagnostic')
new LocationDiagnosticsController(
  '#location-diagnostic-button',
  '#location-diagnostic',
  createBrowserGeolocationDiagnostic(),
).start()

try {
  diagnostics.setStatus('Even Hubへ接続しています')
  const bridge = await waitForEvenAppBridge()
  const controller = new AppController(new G2Display(bridge), diagnostics)

  bridge.onEvenHubEvent((event) => controller.handleEvenHubEvent(event))
  await controller.start()
} catch (error) {
  diagnostics.reportError(error)
}
