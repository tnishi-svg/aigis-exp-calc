import { MAX_LEVEL, type Gender, type Rarity } from '../data/rarity'
import { applySaliet } from './exp'

export type ClassTier = 'low' | 'chibi' | 'pre' | 'post'

// 素材 Lv 1 つあたりの加算(Wiki「1LvごとのEXP増加量」)
export const TIER_ADD: Record<ClassTier, number> = { low: 5, chibi: 56, pre: 160, post: 400 }

// Wiki「基本EXP」の表。null は存在しない組み合わせ
const BASE_EXP: Record<Rarity, Record<Gender, number | null>> = {
  iron: { female: null, male: 40 },
  bronze: { female: null, male: 70 },
  silver: { female: 150, male: 300 },
  gold: { female: 250, male: 3000 },
  platinum: { female: 1000, male: 9000 },
  black: { female: 5000, male: 13000 },
  sapphire: { female: 250, male: null },
}

// Wiki「基本EXPアップ時」の表。表に無い組み合わせは通常の基本 EXP のまま
const BOOSTED_EXP: Partial<Record<Rarity, Partial<Record<Gender, number>>>> = {
  silver: { female: 600, male: 600 },
  gold: { female: 3000, male: 9000 },
  platinum: { female: 9000, male: 21600 },
  black: { female: 21000 },
}

const SAME_CLASS_BONUS: Record<Rarity, number> = {
  iron: 10,
  bronze: 30,
  silver: 400,
  gold: 640,
  platinum: 800,
  black: 2400,
  sapphire: 720,
}

export interface DropUnit {
  rarity: Rarity
  gender: Gender
  tier: ClassTier
  level: number
  sameClass: boolean
}

export interface ExpOptions {
  saliet: boolean
  boost: boolean
}

export function isValidDropCombo(rarity: Rarity, gender: Gender): boolean {
  return BASE_EXP[rarity][gender] !== null
}

export function allowedTiers(rarity: Rarity): ClassTier[] {
  return rarity === 'iron' || rarity === 'bronze' ? ['low'] : ['pre', 'post']
}

export function maxDropLevel(rarity: Rarity, tier: ClassTier): number {
  if (tier === 'post') return MAX_LEVEL[rarity].second ?? MAX_LEVEL[rarity].none ?? 1
  return MAX_LEVEL[rarity].none ?? 1
}

export function dropUnitExp(unit: DropUnit, options: ExpOptions): number | null {
  const normal = BASE_EXP[unit.rarity][unit.gender]
  if (normal === null) return null
  const boosted = options.boost ? BOOSTED_EXP[unit.rarity]?.[unit.gender] : undefined
  const base = boosted ?? normal
  const bonus = unit.sameClass ? SAME_CLASS_BONUS[unit.rarity] : 0
  const raw = base + bonus + (unit.level - 1) * TIER_ADD[unit.tier]
  return applySaliet(raw, options.saliet)
}
