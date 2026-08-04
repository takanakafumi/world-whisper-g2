import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'

import { AppController } from './app/controller.ts'
import { DevelopmentControls } from './app/development-controls.ts'
import { EvenHubContextProvider } from './context/even-hub-context-provider.ts'
import { LocationDiagnosticsController } from './context/location-diagnostics-controller.ts'
import { DiagnosticsView } from './diagnostics/diagnostics-view.ts'
import { G2Display } from './even/g2-display.ts'
import { RuleBasedWhisperGenerator } from './whisper/rule-based-whisper-generator.ts'

const diagnostics = new DiagnosticsView('#diagnostic')

try {
  diagnostics.setStatus('Even Hubへ接続しています')
  const bridge = await waitForEvenAppBridge()
  const contextProvider = new EvenHubContextProvider(bridge)
  const controller = new AppController(
    new G2Display(bridge),
    diagnostics,
    contextProvider,
    new RuleBasedWhisperGenerator(),
  )
  new LocationDiagnosticsController(
    '#location-diagnostic-button',
    '#location-diagnostic',
    contextProvider,
  ).start()
  new DevelopmentControls(
    '#trigger-notification-button',
    '#dismiss-display-button',
    controller,
  ).start()

  bridge.onEvenHubEvent((event) => void controller.handleEvenHubEvent(event))
  await controller.start()
} catch (error) {
  diagnostics.reportError(error)
}
