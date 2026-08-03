export type InteractionPhase =
  | 'idle'
  | 'notified'
  | 'primary'
  | 'deepened'
  | 'next'
  | 'dismissed'

export interface InteractionState {
  phase: InteractionPhase
  perspectiveIndex: number
}

export type InteractionAction =
  | { type: 'NOTIFY' }
  | { type: 'SHOW_PRIMARY' }
  | { type: 'DEEPEN' }
  | { type: 'SHOW_NEXT' }
  | { type: 'DISMISS' }

export const initialInteractionState: InteractionState = {
  phase: 'idle',
  perspectiveIndex: 0,
}

export const transitionInteraction = (
  state: InteractionState,
  action: InteractionAction,
): InteractionState => {
  switch (action.type) {
    case 'NOTIFY':
      return { phase: 'notified', perspectiveIndex: 0 }
    case 'SHOW_PRIMARY':
      return state.phase === 'notified'
        ? { phase: 'primary', perspectiveIndex: 0 }
        : state
    case 'DEEPEN':
      return state.phase === 'primary' || state.phase === 'next' || state.phase === 'deepened'
        ? { ...state, phase: 'deepened' }
        : state
    case 'SHOW_NEXT':
      return state.phase === 'primary' || state.phase === 'next' || state.phase === 'deepened'
        ? { phase: 'next', perspectiveIndex: state.perspectiveIndex + 1 }
        : state
    case 'DISMISS':
      return state.phase === 'idle' || state.phase === 'dismissed'
        ? state
        : { ...state, phase: 'dismissed' }
  }
}

