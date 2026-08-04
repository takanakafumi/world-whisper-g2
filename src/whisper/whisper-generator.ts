import type { ContextSnapshot } from '../context/context-snapshot.ts'

export interface WhisperGenerationOptions {
  perspectiveIndex?: number
}

export interface WhisperGenerator {
  generate(snapshot: ContextSnapshot, options?: WhisperGenerationOptions): string
}

