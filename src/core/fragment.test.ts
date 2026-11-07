import { describe, expect, it } from 'vitest'
import { DEFAULT_ENABLED_IDS, FIXED_MATERIALS } from '../data/materials'
import { cumExp } from './exp'
import { findFragment } from './fragment'
import type { SolveInput } from './solver'

function input(partial: Partial<SolveInput>): SolveInput {
  return {
    rarity: 'gold',
    awakening: 'none',
    level: 1,
    next: null,
    targetLevel: 60,
    forced: [],
    options: { saliet: false, boost: false, maxMerges: 1, carryOver: true, enabledIds: DEFAULT_ENABLED_IDS },
    ...partial,
  }
}

describe('端数の逆引き', () => {
  it('ベースで届かない分(gap)を、ドロップユニット1体で埋める条件を返す', () => {
    const r = findFragment(input({}))!
    expect(r.gap).toBeGreaterThan(0)
    expect(r.baseExp + r.gap).toBe(30333)
    expect(r.candidates.length).toBeGreaterThan(0)
    for (const c of r.candidates) {
      expect(c.exp - r.gap).toBe(c.surplus)
      expect(c.surplus).toBeGreaterThanOrEqual(0)
    }
  })

  it('余りの少ない順に並ぶ', () => {
    const r = findFragment(input({}))!
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i].surplus).toBeGreaterThanOrEqual(r.candidates[i - 1].surplus)
    }
  })

  it('ぴったり埋まるなら端数なし', () => {
    const r = findFragment(input({ rarity: 'black', targetLevel: 80 }))!
    expect(r.gap).toBe(0)
    expect(r.candidates).toHaveLength(0)
  })

  it('同クラスの有無を別候補として出す', () => {
    const r = findFragment(input({}))!
    const kinds = new Set(r.candidates.map((c) => c.unit.sameClass))
    expect(kinds.size).toBeGreaterThanOrEqual(1)
  })

  it('全素材を有効にしても短時間で求まる', () => {
    const all = FIXED_MATERIALS.map((m) => m.id)
    const start = performance.now()
    const r = findFragment(
      input({
        rarity: 'platinum',
        awakening: 'first',
        targetLevel: 90,
        options: { ...input({}).options, saliet: true, maxMerges: 3, enabledIds: all },
      }),
    )
    expect(r).not.toBeNull()
    expect(performance.now() - start).toBeLessThan(2000)
  })

  it('端数は、必要量からベースの合計を引いた値になる', () => {
    // Lv20 のゴールド(次まで 100)から Lv60 まで
    const need = 30333 - (cumExp('gold', 21) - 100)
    const r = findFragment(input({ level: 20, next: 100, targetLevel: 60 }))!
    expect(r.baseExp + r.gap).toBe(need)
  })
})