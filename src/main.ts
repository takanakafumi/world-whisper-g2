import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'

import { AppController } from './app/controller.ts'
import { DevelopmentControls } from './app/development-controls.ts'
import { ContextTimeline } from './context/context-timeline.ts'
import { EvenHubContextProvider } from './context/even-hub-context-provider.ts'
import { EvenHubContextUpdateSource } from './context/even-hub-context-update-source.ts'
import { LocationDiagnosticsController } from './context/location-diagnostics-controller.ts'
import { SamplingDiagnosticsController } from './context/sampling-diagnostics-controller.ts'
import { SamplingSession } from './context/sampling-session.ts'
import { DiagnosticsView } from './diagnostics/diagnostics-view.ts'
import { G2Display } from './even/g2-display.ts'
import { RuleBasedWhisperGenerator } from './whisper/rule-based-whisper-generator.ts'

const diagnostics = new DiagnosticsView('#diagnostic')

try {
  diagnostics.setStatus('Even Hubへ接続しています')
  const bridge = await waitForEvenAppBridge()
  const contextProvider = new EvenHubContextProvider(bridge)
  let samplingDiagnostics: SamplingDiagnosticsController | null = null
  const samplingSession = new SamplingSession(new EvenHubContextUpdateSource(bridge), new ContextTimeline(), {
    onChange: (state) => samplingDiagnostics?.render(state),
  })
  const controller = new AppController(
    new G2Display(bridge),
    diagnostics,
    contextProvider,
    new RuleBasedWhisperGenerator(),
    () => samplingSession.stop(),
  )
  new LocationDiagnosticsController(
    '#location-diagnostic-button',
    '#location-diagnostic',
    contextProvider,
  ).start()
  samplingDiagnostics = new SamplingDiagnosticsController(
    '#sampling-start-button',
    '#sampling-stop-button',
    '#sampling-diagnostic',
    samplingSession,
  )
  samplingDiagnostics.start()
  new DevelopmentControls(
    '#trigger-notification-button',
    '#dismiss-display-button',
    '#auto-dismiss-toggle',
    controller,
  ).start()

  bridge.onEvenHubEvent((event) => void controller.handleEvenHubEvent(event))
  window.addEventListener('pagehide', () => void samplingSession.stop(), { once: true })
  await controller.start()
} catch (error) {
  diagnostics.reportError(error)
}
