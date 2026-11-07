import { describe, expect, it } from 'vitest'
import { cumExp, currentExpFromInput, levelFromExp, mergeCost, remainingToNext } from './exp'

describe('経験値テーブル(Wiki の累計経験値と一致)', () => {
  it.each([
    ['gold', 60, 30333],
    ['gold', 80, 69333],
    ['gold', 99, 126504],
    ['platinum', 70, 51334],
    ['platinum', 90, 107334],
    ['platinum', 99, 136235],
    ['black', 80, 80000],
    ['black', 99, 145967],
    ['sapphire', 65, 41209],
    ['sapphire', 85, 89615],
    ['silver', 55, 21492],
    ['bronze', 50, 14666],
    ['iron', 40, 6667],
  ] as const)('%s Lv%i = %i', (rarity, lv, exp) => {
    expect(cumExp(rarity, lv)).toBe(exp)
  })

  it('サファイアはプラチナと同じ必要経験値', () => {
    for (let lv = 1; lv <= 99; lv++) expect(cumExp('sapphire', lv)).toBe(cumExp('platinum', lv))
  })
})

describe('合成費用(Wiki のサンプル)', () => {
  it.each([
    [8, 4800],
    [21, 10000],
    [33, 14800],
    [46, 20000],
    [58, 24800],
    [71, 30000],
    [83, 34800],
    [96, 40000],
  ])('Lv%i の素材10体 = %iG', (lv, gold) => {
    expect(mergeCost(lv, 10)).toBe(gold)
  })
})

describe('入力からの逆算', () => {
  it('現在 Lv の累計から「次のレベルまで」を引く', () => {
    const r = currentExpFromInput('gold', 'none', 39, 301)
    expect(r).toEqual({ ok: true, exp: cumExp('gold', 40) - 301 })
  })
  it('「次のレベルまで」が空なら Lv ちょうど', () => {
    expect(currentExpFromInput('gold', 'none', 10, null)).toEqual({ ok: true, exp: cumExp('gold', 10) })
  })
  it('必要経験値を超える値はエラー', () => {
    expect(currentExpFromInput('gold', 'none', 10, 99999)).toEqual({ ok: false, error: 'nextTooLarge' })
  })
  it('上限を超える Lv はエラー', () => {
    expect(currentExpFromInput('gold', 'none', 61, null)).toEqual({ ok: false, error: 'invalidLevel' })
  })
  it('存在しない覚醒段階はエラー', () => {
    expect(currentExpFromInput('silver', 'first', 1, null)).toEqual({ ok: false, error: 'invalidAwakening' })
  })
  it('逆算した経験値から Lv と「次のレベルまで」が戻る', () => {
    const r = currentExpFromInput('platinum', 'none', 36, 433)
    if (!r.ok) throw new Error('unexpected')
    expect(levelFromExp('platinum', r.exp, 70)).toBe(36)
    expect(remainingToNext('platinum', r.exp, 70)).toBe(433)
  })
})
