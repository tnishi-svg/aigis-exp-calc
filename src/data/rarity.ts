import type { ExpTableKey } from './expTable'

export type Rarity = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'black' | 'sapphire'
export type Awakening = 'none' | 'first' | 'second'
export type Gender = 'female' | 'male'

export const RARITIES: readonly Rarity[] = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'black', 'sapphire']

export const EXP_TABLE_OF: Record<Rarity, ExpTableKey> = {
  iron: 'iron',
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
  platinum: 'platinum',
  black: 'black',
  sapphire: 'platinum',
}

// 出典: 「経験値」ページの上限Lvの表。null は存在しない覚醒段階
export const MAX_LEVEL: Record<Rarity, Record<Awakening, number | null>> = {
  iron: { none: 40, first: null, second: null },
  bronze: { none: 50, first: null, second: null },
  silver: { none: 55, first: null, second: null },
  gold: { none: 60, first: 80, second: 99 },
  platinum: { none: 70, first: 90, second: 99 },
  black: { none: 80, first: 99, second: 99 },
  sapphire: { none: 65, first: 85, second: 99 },
}

// 第一覚醒の上限を超えた経験値が第二覚醒に持ち越されるレアリティ(ブラック以外)
export const CARRIES_OVER: Record<Rarity, boolean> = {
  iron: false,
  bronze: false,
  silver: false,
  gold: true,
  platinum: true,
  black: false,
  sapphire: true,
}

export function availableAwakenings(rarity: Rarity): Awakening[] {
  return (['none', 'first', 'second'] as const).filter((a) => MAX_LEVEL[rarity][a] !== null)
}
