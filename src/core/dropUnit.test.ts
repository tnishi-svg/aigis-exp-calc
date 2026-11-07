import { describe, expect, it } from 'vitest'
import { dropUnitExp, type DropUnit } from './dropUnit'

const off = { saliet: false, boost: false }

function unit(partial: Partial<DropUnit>): DropUnit {
  return { rarity: 'gold', gender: 'male', tier: 'pre', level: 1, sameClass: false, ...partial }
}

describe('ドロップユニットの獲得経験値(Wiki の例)', () => {
  it('例1: 銅のソルジャー Lv3 = 70 + 2×5 = 80', () => {
    expect(dropUnitExp(unit({ rarity: 'bronze', tier: 'low', level: 3 }), off)).toBe(80)
  })
  it('例2: 同クラスの金の男 Lv10 = 3000 + 9×160 + 640', () => {
    // Wiki の例は旧値(750, +7)なので、現行の基本EXP表と加算で再計算する
    expect(dropUnitExp(unit({ level: 10, sameClass: true }), off)).toBe(3000 + 9 * 160 + 640)
  })
  it('例3: 銀の女 Lv10 = 150 + 9×160 = 1590', () => {
    expect(dropUnitExp(unit({ rarity: 'silver', gender: 'female', level: 10 }), off)).toBe(150 + 9 * 160)
  })
  it('サリエットで 10% 増える', () => {
    expect(dropUnitExp(unit({}), { saliet: true, boost: false })).toBe(3300)
  })
  it('基本EXPアップ期間は基本EXPだけが変わる', () => {
    expect(dropUnitExp(unit({ rarity: 'platinum', level: 5 }), { saliet: false, boost: true })).toBe(
      21600 + 4 * 160,
    )
  })
  it('存在しない組み合わせは null', () => {
    expect(dropUnitExp(unit({ rarity: 'iron', gender: 'female', tier: 'low' }), off)).toBeNull()
  })
})
