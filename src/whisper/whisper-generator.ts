import type { ContextSnapshot } from '../context/context-snapshot.ts'

export interface WhisperGenerator {
  generate(snapshot: ContextSnapshot): string
}

