import { describe, expect, it } from 'vitest'
import { DEFAULT_ENABLED_IDS, FIXED_MATERIALS } from '../data/materials'
import { mergeCost } from './exp'
import { candidateItems, solve, type Item, type SolveInput } from './solver'

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

function must(r: ReturnType<typeof solve>) {
  if (!r.ok) throw new Error(r.error)
  return r.plan
}

// 総当たり: slots 個以内で合計が needed 以上になる組み合わせの最小の余り
function bruteSurplus(items: Item[], needed: number, slots: number): number {
  let best = Infinity
  const dfs = (idx: number, sum: number, left: number) => {
    if (sum >= needed) {
      best = Math.min(best, sum - needed)
      return
    }
    if (idx >= items.length || left === 0) return
    for (let c = 0; c <= left; c++) dfs(idx + 1, sum + c * items[idx].exp, left - c)
  }
  dfs(0, 0, slots)
  return best
}

describe('solve: Wiki の合成例', () => {
  it('ブラック Lv1→80 は黒鎧2体でぴったり(余り0)', () => {
    const plan = must(solve(input({ rarity: 'black', targetLevel: 80 })))
    expect(plan.surplus).toBe(0)
    expect(plan.totalGain).toBe(80000)
    expect(plan.merges).toHaveLength(1)
  })

  it('ゴールド Lv1→60 は 30333 以上で余り最小', () => {
    const plan = must(solve(input({})))
    expect(plan.needed).toBe(30333)
    expect(plan.shortage).toBe(0)
    expect(plan.totalGain).toBeGreaterThanOrEqual(30333)
  })

  it('サファイア Lv1→65 の必要経験値は 41209', () => {
    const plan = must(solve(input({ rarity: 'sapphire', targetLevel: 65 })))
    expect(plan.needed).toBe(41209)
  })

  it('すでに目標以上なら合成なし', () => {
    const r = solve(input({ level: 60, targetLevel: 60 }))
    expect(r.ok && r.alreadyReached).toBe(true)
  })
})

describe('solve: 余り最小(総当たりと一致)', () => {
  const cases: [string, Partial<SolveInput>][] = [
    ['金 Lv1→40', { targetLevel: 40 }],
    ['金 Lv20→60', { level: 20, next: 100, targetLevel: 60 }],
    ['プラチナ Lv1→70', { rarity: 'platinum', targetLevel: 70 }],
    ['シルバー Lv1→55', { rarity: 'silver', targetLevel: 55 }],
    ['ゴールド第一覚醒 Lv1→80(持ち越しなし)', { awakening: 'first', targetLevel: 80, options: { ...input({}).options, carryOver: false } }],
  ]
  it.each(cases)('%s', (_name, partial) => {
    const inp = input(partial)
    const plan = must(solve(inp))
    const items = candidateItems(inp.rarity, inp.options)
    expect(plan.surplus).toBe(bruteSurplus(items, plan.needed, 10))
  })

  it('サリエット有りでも総当たりと一致', () => {
    const inp = input({ options: { ...input({}).options, saliet: true } })
    const plan = must(solve(inp))
    const items = candidateItems(inp.rarity, inp.options)
    expect(plan.surplus).toBe(bruteSurplus(items, plan.needed, 10))
  })
})

describe('solve: 合成回数とゴールド', () => {
  it('合成回数が表示の合計ゴールドと一致する', () => {
    const plan = must(solve(input({ rarity: 'black', targetLevel: 99, awakening: 'second', options: { ...input({}).options, maxMerges: 3 } })))
    const sum = plan.merges.reduce((s, m) => s + m.gold, 0)
    expect(sum).toBe(plan.gold)
    for (const m of plan.merges) expect(m.itemCount).toBeLessThanOrEqual(10)
  })

  it('1回で収まるなら分割しない', () => {
    const plan = must(solve(input({ rarity: 'black', targetLevel: 80 })))
    expect(plan.merges).toHaveLength(1)
  })

  it('素材が限られて分割するとき、ゴールドの合計が各合成の費用の和になる', () => {
    const plan = must(solve(input({ awakening: 'second', targetLevel: 99, options: { ...input({}).options, maxMerges: 3, enabledIds: ['platinum-armor'] } })))
    expect(plan.merges.length).toBeGreaterThan(1)
    const expected = plan.merges.reduce((s, m) => s + mergeCost(m.baseLevel, m.itemCount), 0)
    expect(plan.gold).toBe(expected)
  })
})

describe('solve: 不足', () => {
  it('素材の上限枠で届かなければ不足を返す', () => {
    const plan = must(solve(input({ rarity: 'black', awakening: 'second', targetLevel: 99, options: { ...input({}).options, enabledIds: ['platinum-armor'] } })))
    expect(plan.shortage).toBeGreaterThan(0)
    expect(plan.surplus).toBe(0)
  })
})

describe('solve: 必ず使う素材', () => {
  it('指定した素材は必ず含まれ、残りで最適化する', () => {
    const plan = must(
      solve(input({ rarity: 'black', targetLevel: 80, forced: [{ kind: 'fixed', id: 'farah', count: 1 }] })),
    )
    const used = plan.merges.flatMap((m) => m.items).some((l) => l.label.includes('ファラハ'))
    expect(used).toBe(true)
    expect(plan.totalGain).toBeGreaterThanOrEqual(80000)
  })

  it('指定だけで届くなら他は使わず、余りを返す', () => {
    const plan = must(
      solve(input({ rarity: 'black', targetLevel: 80, forced: [{ kind: 'fixed', id: 'black-armor', count: 3 }] })),
    )
    expect(plan.merges.flatMap((m) => m.items).reduce((s, l) => s + l.count, 0)).toBe(3)
    expect(plan.surplus).toBe(40000)
  })

  it('指定が10枠を超えるとエラー', () => {
    const r = solve(input({ forced: [{ kind: 'fixed', id: 'allegria', count: 11 }] }))
    expect(r).toEqual({ ok: false, error: 'tooManyForced' })
  })

  it('ドロップユニットも指定できる', () => {
    const r = solve(
      input({
        forced: [
          { kind: 'drop', unit: { rarity: 'gold', gender: 'male', tier: 'pre', level: 20, sameClass: false }, count: 2 },
        ],
      }),
    )
    expect(r.ok).toBe(true)
  })
})

describe('solve: 覚醒の持ち越し', () => {
  it('第一覚醒の上限を目標にすると、持ち越し分を余りに数えない', () => {
    const on = must(solve(input({ rarity: 'platinum', awakening: 'first', level: 89, next: 100, targetLevel: 90 })))
    const off = must(
      solve(
        input({
          rarity: 'platinum',
          awakening: 'first',
          level: 89,
          next: 100,
          targetLevel: 90,
          options: { ...input({}).options, carryOver: false },
        }),
      ),
    )
    expect(on.surplus).toBeLessThanOrEqual(off.surplus)
    expect(on.carried).toBeGreaterThanOrEqual(0)
  })

  it('ブラックは持ち越されない', () => {
    const plan = must(solve(input({ rarity: 'black', awakening: 'first', level: 90, next: 100, targetLevel: 99 })))
    expect(plan.carried).toBe(0)
  })
})

describe('solve: 素材の重複', () => {
  it('経験値が同じ素材は候補で 1 つにまとまる', () => {
    const ids = ['iron-spirit', 'bronze-spirit', 'silver-spirit', 'gold-spirit', 'platinum-spirit', 'black-spirit']
    const items = candidateItems('gold', { saliet: false, enabledIds: ids })
    // 同レアリティ(ゴールド)の聖霊だけ 1250、他の聖霊は 500 で同じ値になる
    expect(items.map((i) => i.exp).sort((a, b) => a - b)).toEqual([500, 1250])
  })

  it('全素材を有効にしても短時間で解ける', () => {
    const all = FIXED_MATERIALS.map((m) => m.id)
    const start = performance.now()
    must(solve(input({ options: { ...input({}).options, saliet: true, maxMerges: 3, enabledIds: all } })))
    expect(performance.now() - start).toBeLessThan(2000)
  })
})
