export type AppStatus = 'starting' | 'ready' | 'shutting-down' | 'stopped' | 'error'

export interface AppState {
  status: AppStatus
  gestureCount: number
  rawEventCount: number
  isGenerating: boolean
  lastError?: string
}

export type AppAction =
  | { type: 'READY' }
  | { type: 'RAW_EVENT_RECEIVED' }
  | { type: 'GESTURE_HANDLED' }
  | { type: 'WHISPER_STARTED' }
  | { type: 'WHISPER_SUCCEEDED' }
  | { type: 'WHISPER_FAILED'; message: string }
  | { type: 'SHUTDOWN_STARTED' }
  | { type: 'SHUTDOWN_SUCCEEDED' }
  | { type: 'SHUTDOWN_FAILED'; message: string }
  | { type: 'ERROR'; message: string }

export const initialAppState: AppState = {
  status: 'starting',
  gestureCount: 0,
  rawEventCount: 0,
  isGenerating: false,
}

export const reduceAppState = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'READY':
      return { ...state, status: 'ready', lastError: undefined }
    case 'RAW_EVENT_RECEIVED':
      return { ...state, rawEventCount: state.rawEventCount + 1 }
    case 'GESTURE_HANDLED':
      return { ...state, gestureCount: state.gestureCount + 1 }
    case 'WHISPER_STARTED':
      return { ...state, isGenerating: true, lastError: undefined }
    case 'WHISPER_SUCCEEDED':
      return { ...state, isGenerating: false, lastError: undefined }
    case 'WHISPER_FAILED':
      return { ...state, isGenerating: false, lastError: action.message }
    case 'SHUTDOWN_STARTED':
      return { ...state, status: 'shutting-down', isGenerating: false }
    case 'SHUTDOWN_SUCCEEDED':
      return { ...state, status: 'stopped' }
    case 'SHUTDOWN_FAILED':
      return { ...state, status: 'ready', lastError: action.message }
    case 'ERROR':
      return { ...state, status: 'error', lastError: action.message }
  }
}
