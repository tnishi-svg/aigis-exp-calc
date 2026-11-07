import { cumExp } from './exp'
import { dropUnitExp, maxDropLevel, type DropUnit, type ExpOptions } from './dropUnit'

export interface FeederRow {
  level: number
  // 餌として合成したときの経験値
  exp: number
  // 餌を Lv まで育てるのに使う経験値
  cost: number
  // Lv1 のまま使う場合との差
  net: number
}

export interface FeederResult {
  rows: FeederRow[]
  best: FeederRow | null
}

// 餌の育成に使う素材の経験値。サリエットがあると 10% 少なく済む
function growCost(unit: DropUnit, level: number): number {
  return cumExp(unit.rarity, level)
}

export function evaluateFeeder(unit: DropUnit, options: ExpOptions, maxLevel = 40): FeederResult {
  const base = dropUnitExp({ ...unit, level: 1 }, options)
  if (base === null) return { rows: [], best: null }
  const top = Math.min(maxLevel, maxDropLevel(unit.rarity, unit.tier))
  const rows: FeederRow[] = []
  for (let level = 1; level <= top; level++) {
    const exp = dropUnitExp({ ...unit, level }, options)!
    const cost = level === 1 ? 0 : growCost(unit, level)
    rows.push({ level, exp, cost, net: exp - base - cost })
  }
  const positive = rows.filter((r) => r.net > 0)
  const best = positive.length === 0 ? null : positive.reduce((a, b) => (b.net > a.net ? b : a))
  return { rows, best }
}

