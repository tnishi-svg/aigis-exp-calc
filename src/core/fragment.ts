import { MAX_LEVEL, RARITIES, type Gender, type Rarity } from '../data/rarity'
import { MERGE_SLOTS } from './exp'
import {
  allowedTiers,
  dropUnitExp,
  isValidDropCombo,
  maxDropLevel,
  type ClassTier,
  type DropUnit,
} from './dropUnit'
import { candidateItems, prepare, type Item, type SolveInput } from './solver'

export interface FragmentCandidate {
  unit: DropUnit
  exp: number
  surplus: number
}

export interface FragmentResult {
  // 経験値ユニットと聖霊だけで届く最大の合計(必要量以下)
  baseExp: number
  baseItems: Item[]
  // ドロップユニット 1 体で埋めたい経験値
  gap: number
  candidates: FragmentCandidate[]
}

const MAX_CANDIDATES = 30
const GENDERS: Gender[] = ['female', 'male']

// 到達できない合計の個数。枠数の上限を必ず超える大きさにする
const UNREACHABLE = 1 << 29

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// slots 個以内で、合計が limit 以下で最大になる組み合わせ。合計ごとの最小個数を動的計画法で求める
function bestBelow(items: readonly Item[], limit: number, slots: number): Item[] {
  const unit = items.reduce((g, it) => gcd(g, it.exp), 0)
  const size = Math.floor(limit / unit) + 1
  const count = new Int32Array(size).fill(UNREACHABLE)
  const last = new Int32Array(size).fill(-1)
  count[0] = 0
  for (let s = 1; s < size; s++) {
    for (let i = 0; i < items.length; i++) {
      const u = items[i].exp / unit
      if (u <= s && count[s - u] + 1 < count[s]) {
        count[s] = count[s - u] + 1
        last[s] = i
      }
    }
  }
  // 到達できない合計(count が初期値のまま)は、枠数の上限を超えるものとして読み飛ばす
  let s = size - 1
  while (s > 0 && count[s] > slots) s--
  const out: Item[] = []
  while (s > 0) {
    const it = items[last[s]]
    out.push(it)
    s -= it.exp / unit
  }
  return out
}

export function allDropUnits(sameClass: boolean): DropUnit[] {
  const out: DropUnit[] = []
  for (const rarity of RARITIES) {
    for (const gender of GENDERS) {
      if (!isValidDropCombo(rarity, gender)) continue
      for (const tier of allowedTiers(rarity) as ClassTier[]) {
        for (let level = 1; level <= maxDropLevel(rarity, tier); level++) {
          out.push({ rarity, gender, tier, level, sameClass })
        }
      }
    }
  }
  return out
}

export function findFragment(input: SolveInput): FragmentResult | null {
  const prep = prepare(input)
  if (!prep.ok) return null
  const { setup } = prep
  const remaining = setup.needed - setup.forcedExp
  if (remaining <= 0) return null

  const items = candidateItems(input.rarity, input.options)
  const slots = input.options.maxMerges * MERGE_SLOTS - setup.forcedItems.length - 1
  if (items.length === 0 || slots < 0) return null

  const baseItems = bestBelow(items, remaining, slots)
  const baseExp = baseItems.reduce((s, x) => s + x.exp, 0)
  const gap = remaining - baseExp
  if (gap === 0) return { baseExp, baseItems, gap, candidates: [] }

  const candidates: FragmentCandidate[] = []
  for (const sameClass of [false, true]) {
    for (const unit of allDropUnits(sameClass)) {
      const exp = dropUnitExp(unit, input.options)
      if (exp !== null && exp >= gap) candidates.push({ unit, exp, surplus: exp - gap })
    }
  }
  candidates.sort(
    (a, b) =>
      a.surplus - b.surplus ||
      Number(a.unit.sameClass) - Number(b.unit.sameClass) ||
      a.unit.level - b.unit.level,
  )
  return { baseExp, baseItems, gap, candidates: dedupe(candidates).slice(0, MAX_CANDIDATES) }
}

// 同じ余りで同じ条件の並びが続く場合に、Lv が最小のものだけ残す
function dedupe(list: FragmentCandidate[]): FragmentCandidate[] {
  const seen = new Set<string>()
  const out: FragmentCandidate[] = []
  for (const c of list) {
    const key = `${c.unit.rarity}|${c.unit.gender}|${c.unit.tier}|${c.unit.sameClass}|${c.surplus}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

export function maxLevelOfRarity(rarity: Rarity): number {
  return MAX_LEVEL[rarity].second ?? MAX_LEVEL[rarity].none ?? 1
}
