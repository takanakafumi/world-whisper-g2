import type { ContextSnapshot } from '../context/context-snapshot.ts'
import type { WhisperGenerator } from './whisper-generator.ts'

export const MAX_WHISPER_CHARACTERS = 50

const WHISPERS = {
  morning: '朝の光が、足もとの世界を静かにほどいています。',
  daytime: '昼の景色にも、まだ気づいていない表情があります。',
  evening: '夕暮れが、見慣れた道の輪郭をやわらげています。',
  night: '夜の静けさが、遠くの気配をそっと近づけています。',
} as const

export class RuleBasedWhisperGenerator implements WhisperGenerator {
  generate(snapshot: ContextSnapshot): string {
    validateSnapshot(snapshot)

    const whisper = selectWhisper(snapshot.localHour)
    if (Array.from(whisper).length > MAX_WHISPER_CHARACTERS) {
      throw new Error('Generated whisper exceeds the character limit')
    }

    return whisper
  }
}

function selectWhisper(localHour: number): string {
  if (localHour >= 5 && localHour < 12) return WHISPERS.morning
  if (localHour >= 12 && localHour < 17) return WHISPERS.daytime
  if (localHour >= 17 && localHour < 21) return WHISPERS.evening
  return WHISPERS.night
}

function validateSnapshot(snapshot: ContextSnapshot): void {
  if (!Number.isFinite(snapshot.latitude) || snapshot.latitude < -90 || snapshot.latitude > 90) {
    throw new RangeError('ContextSnapshot latitude must be between -90 and 90')
  }
  if (!Number.isFinite(snapshot.longitude) || snapshot.longitude < -180 || snapshot.longitude > 180) {
    throw new RangeError('ContextSnapshot longitude must be between -180 and 180')
  }
  if (!Number.isInteger(snapshot.localHour) || snapshot.localHour < 0 || snapshot.localHour > 23) {
    throw new RangeError('ContextSnapshot localHour must be an integer between 0 and 23')
  }
}

