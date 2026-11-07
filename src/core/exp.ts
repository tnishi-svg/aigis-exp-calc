import { CUMULATIVE_EXP } from '../data/expTable'
import { EXP_TABLE_OF, MAX_LEVEL, type Awakening, type Rarity } from '../data/rarity'

export const MERGE_SLOTS = 10

export function cumTable(rarity: Rarity): readonly number[] {
  return CUMULATIVE_EXP[EXP_TABLE_OF[rarity]]
}

// lv は 1 以上、表の長さ以下
export function cumExp(rarity: Rarity, lv: number): number {
  return cumTable(rarity)[lv - 1]
}

export function stageCap(rarity: Rarity, awakening: Awakening): number | null {
  return MAX_LEVEL[rarity][awakening]
}

// exp 以下で最大の Lv(cap を超えない)
export function levelFromExp(rarity: Rarity, exp: number, cap: number): number {
  const table = cumTable(rarity)
  let lv = 1
  for (let i = 1; i < cap && i < table.length; i++) {
    if (table[i] <= exp) lv = i + 1
    else break
  }
  return lv
}

// ゲーム画面の「次のレベルまで」。上限 Lv では表示されないので null
export function remainingToNext(rarity: Rarity, exp: number, cap: number): number | null {
  const lv = levelFromExp(rarity, exp, cap)
  if (lv >= cap) return null
  return cumExp(rarity, lv + 1) - exp
}

// 「次のレベルまで」に入力できる最大値。現在の Lv が上限、または不明なら 0(入力不要)
export function maxNextInput(rarity: Rarity, level: number, cap: number): number {
  if (!Number.isInteger(level) || level < 1 || level >= cap) return 0
  return cumExp(rarity, level + 1) - cumExp(rarity, level)
}

// 合成費用 = (160 + ベースの Lv × 40) × 素材の数
export function mergeCost(baseLevel: number, count: number): number {
  return (160 + baseLevel * 40) * count
}

// 育成聖霊サリエットは合成経験値を +10%(小数点以下は切り捨てとみなす)
export function applySaliet(exp: number, saliet: boolean): number {
  return saliet ? Math.floor((exp * 11) / 10) : exp
}

export type ParseResult = { ok: true; exp: number } | { ok: false; error: string }

// 現在の Lv と「次のレベルまで」から累計経験値を逆算する
export function currentExpFromInput(
  rarity: Rarity,
  awakening: Awakening,
  level: number,
  next: number | null,
): ParseResult {
  const cap = stageCap(rarity, awakening)
  if (cap === null) return { ok: false, error: 'invalidAwakening' }
  if (!Number.isInteger(level) || level < 1 || level > cap) return { ok: false, error: 'invalidLevel' }
  if (level === cap) return { ok: true, exp: cumExp(rarity, level) }
  if (next === null || next === 0) return { ok: true, exp: cumExp(rarity, level) }
  if (!Number.isInteger(next) || next < 0) return { ok: false, error: 'invalidNext' }
  const need = cumExp(rarity, level + 1) - cumExp(rarity, level)
  if (next > need) return { ok: false, error: 'nextTooLarge' }
  return { ok: true, exp: cumExp(rarity, level + 1) - next }
}
