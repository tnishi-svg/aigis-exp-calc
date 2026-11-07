import { describe, expect, it } from 'vitest'
import { evaluateFeeder } from './feeder'
import type { DropUnit } from './dropUnit'

const unit: DropUnit = { rarity: 'gold', gender: 'male', tier: 'pre', level: 1, sameClass: false }
const off = { saliet: false, boost: false }

describe('餌ユニットの育成', () => {
  it('Lv16〜20 付近が最も得で、差は Wiki の「EXP+1300〜1350」に収まる', () => {
    const r = evaluateFeeder(unit, off)
    expect(r.best).not.toBeNull()
    expect(r.best!.level).toBeGreaterThanOrEqual(16)
    expect(r.best!.level).toBeLessThanOrEqual(20)
    expect(r.best!.net).toBeGreaterThanOrEqual(1300)
    expect(r.best!.net).toBeLessThanOrEqual(1350)
  })

  it('Lv1 のままなら差は 0', () => {
    const row = evaluateFeeder(unit, off).rows[0]
    expect(row.net).toBe(0)
  })

  it('覚醒後のユニットは育てても得にならない場合がある(加算が大きい分、得は増える)', () => {
    const r = evaluateFeeder({ ...unit, tier: 'post' }, off)
    expect(r.best).not.toBeNull()
  })

  it('ブロンズ以下は Lv ごとの加算が +5 で、Wiki の例(銅 Lv3 = 80)と一致する', () => {
    const bronze: DropUnit = { rarity: 'bronze', gender: 'male', tier: 'low', level: 1, sameClass: false }
    const r = evaluateFeeder(bronze, off)
    expect(r.rows[0].exp).toBe(70)
    expect(r.rows[2].exp).toBe(80)
    expect(r.rows[19].exp).toBe(70 + 19 * 5)
  })

  it('得な Lv が無ければ best は null', () => {
    const r = evaluateFeeder({ rarity: 'bronze', gender: 'male', tier: 'low', level: 1, sameClass: false }, off)
    expect(r.best).toBeNull()
  })
})

