import type { ContextSnapshot } from '../context/context-snapshot.ts'

export type DeepenIntent = 'background' | 'alternative' | 'reflection'

export interface WhisperGenerationOptions {
  perspectiveIndex?: number
  deepenIntent?: DeepenIntent
}

export interface WhisperGenerator {
  generate(snapshot: ContextSnapshot, options?: WhisperGenerationOptions): string
}

