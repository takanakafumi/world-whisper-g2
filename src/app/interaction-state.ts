export type InteractionPhase =
  | 'idle'
  | 'notified'
  | 'primary'
  | 'choices'
  | 'deepened'
  | 'next'
  | 'dismissed'

export interface InteractionState {
  phase: InteractionPhase
  perspectiveIndex: number
  selectedChoiceIndex: number
}

export type InteractionAction =
  | { type: 'NOTIFY' }
  | { type: 'SHOW_PRIMARY' }
  | { type: 'OPEN_CHOICES' }
  | { type: 'SELECT_NEXT_CHOICE'; choiceCount: number }
  | { type: 'DEEPEN' }
  | { type: 'SHOW_NEXT' }
  | { type: 'DISMISS' }

export const initialInteractionState: InteractionState = {
  phase: 'idle',
  perspectiveIndex: 0,
  selectedChoiceIndex: 0,
}

export const transitionInteraction = (
  state: InteractionState,
  action: InteractionAction,
): InteractionState => {
  switch (action.type) {
    case 'NOTIFY':
      return { phase: 'notified', perspectiveIndex: 0, selectedChoiceIndex: 0 }
    case 'SHOW_PRIMARY':
      return state.phase === 'notified'
        ? { phase: 'primary', perspectiveIndex: 0, selectedChoiceIndex: 0 }
        : state
    case 'OPEN_CHOICES':
      return state.phase === 'primary' || state.phase === 'next' || state.phase === 'deepened'
        ? { ...state, phase: 'choices', selectedChoiceIndex: 0 }
        : state
    case 'SELECT_NEXT_CHOICE':
      return state.phase === 'choices' && action.choiceCount > 0
        ? { ...state, selectedChoiceIndex: (state.selectedChoiceIndex + 1) % action.choiceCount }
        : state
    case 'DEEPEN':
      return state.phase === 'choices'
        ? { ...state, phase: 'deepened' }
        : state
    case 'SHOW_NEXT':
      return state.phase === 'primary' || state.phase === 'next' || state.phase === 'deepened'
        ? { phase: 'next', perspectiveIndex: state.perspectiveIndex + 1, selectedChoiceIndex: 0 }
        : state
    case 'DISMISS':
      return state.phase === 'idle' || state.phase === 'dismissed'
        ? state
        : { ...state, phase: 'dismissed' }
  }
}

