import type { ContextSnapshot } from '../context/context-snapshot.ts'
import type {
  DeepenIntent,
  WhisperGenerationOptions,
  WhisperGenerator,
} from './whisper-generator.ts'

export const MAX_WHISPER_CHARACTERS = 50

const WHISPERS = {
  morning: [
    '朝の光が、足もとの世界を静かにほどいています。',
    '朝の空気に、昨日とは違う音を探してみませんか。',
    '伸びる影の先に、今日最初の発見がありそうです。',
  ],
  daytime: [
    '昼の景色にも、まだ気づいていない表情があります。',
    '人の流れから、この場所のリズムを感じてみませんか。',
    'いつもの道にも、立ち止まると別の輪郭が現れます。',
  ],
  evening: [
    '夕暮れが、見慣れた道の輪郭をやわらげています。',
    '灯り始めた窓に、それぞれの時間が流れています。',
    '昼と夜の境目で、街の音も変わり始めています。',
  ],
  night: [
    '夜の静けさが、遠くの気配をそっと近づけています。',
    '暗がりの中で、光が場所の形を描き直しています。',
    '昼には隠れていた音が、夜の道に残っています。',
  ],
} as const

const DEEPENED_WHISPERS: Record<DeepenIntent, string> = {
  background: 'この場所にも、今の景色へ続く時間の積み重なりがあります。',
  alternative: '見えているものより、見落としているものを探してみませんか。',
  reflection: 'この景色のどこに、いまの自分の気持ちが重なりますか。',
}

export class RuleBasedWhisperGenerator implements WhisperGenerator {
  generate(snapshot: ContextSnapshot, options: WhisperGenerationOptions = {}): string {
    validateSnapshot(snapshot)

    if (options.deepenIntent) {
      return validateLength(DEEPENED_WHISPERS[options.deepenIntent])
    }

    const candidates = selectWhispers(snapshot.localHour)
    const requestedIndex = options.perspectiveIndex ?? 0
    const whisper = candidates[normalizeIndex(requestedIndex, candidates.length)]
    return validateLength(whisper)
  }
}

function validateLength(whisper: string): string {
  if (Array.from(whisper).length > MAX_WHISPER_CHARACTERS) {
    throw new Error('Generated whisper exceeds the character limit')
  }
  return whisper
}

function selectWhispers(localHour: number): readonly string[] {
  if (localHour >= 5 && localHour < 12) return WHISPERS.morning
  if (localHour >= 12 && localHour < 17) return WHISPERS.daytime
  if (localHour >= 17 && localHour < 21) return WHISPERS.evening
  return WHISPERS.night
}

function normalizeIndex(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError('perspectiveIndex must be a non-negative integer')
  }
  return index % length
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

