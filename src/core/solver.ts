import { FIXED_MATERIALS, fixedMaterialApplies, fixedMaterialExp } from '../data/materials'
import { CARRIES_OVER, MAX_LEVEL, type Awakening, type Rarity } from '../data/rarity'
import { dropUnitExp, type DropUnit } from './dropUnit'
import {
  MERGE_SLOTS,
  applySaliet,
  cumExp,
  currentExpFromInput,
  levelFromExp,
  mergeCost,
  remainingToNext,
  stageCap,
} from './exp'

export type ForcedItem =
  | { kind: 'fixed'; id: string; count: number }
  | { kind: 'drop'; unit: DropUnit; count: number }

export interface SolveOptions {
  saliet: boolean
  boost: boolean
  maxMerges: number
  carryOver: boolean
  enabledIds: readonly string[]
}

export interface SolveInput {
  rarity: Rarity
  awakening: Awakening
  level: number
  next: number | null
  targetLevel: number
  forced: readonly ForcedItem[]
  options: SolveOptions
}

export interface MaterialLine {
  label: string
  count: number
  exp: number
}

export interface MergeStep {
  baseLevel: number
  items: MaterialLine[]
  itemCount: number
  gain: number
  gold: number
  levelAfter: number
  nextAfter: number | null
}

export interface Plan {
  startExp: number
  targetExp: number
  needed: number
  merges: MergeStep[]
  totalGain: number
  // 余り経験値。不足のときは 0
  surplus: number
  // 不足している経験値。足りているときは 0
  shortage: number
  gold: number
  // 覚醒をまたいで持ち越され、余りに数えなかった分
  carried: number
}

export type SolveError =
  | 'invalidAwakening'
  | 'invalidLevel'
  | 'invalidNext'
  | 'nextTooLarge'
  | 'invalidTarget'
  | 'tooManyForced'
  | 'invalidForced'

export type SolveResult = { ok: true; plan: Plan; alreadyReached: boolean } | { ok: false; error: SolveError }

export interface Item {
  label: string
  exp: number
}

const ENUM_LIMIT = 20000
const NODE_LIMIT = 2_000_000

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// 経験値が同じ素材は 1 つにまとめる(同じ組み合わせを何度も探索しないため)。表示名は「/」でつなぐ
export function candidateItems(
  rarity: Rarity,
  options: Pick<SolveOptions, 'saliet' | 'enabledIds'>,
): Item[] {
  const byExp = new Map<number, string[]>()
  for (const m of FIXED_MATERIALS) {
    if (!options.enabledIds.includes(m.id) || !fixedMaterialApplies(m, rarity)) continue
    const exp = applySaliet(fixedMaterialExp(m, rarity), options.saliet)
    byExp.set(exp, [...(byExp.get(exp) ?? []), m.name])
  }
  return [...byExp.entries()].map(([exp, names]) => ({ label: names.join(' / '), exp }))
}

export function forcedItemList(
  rarity: Rarity,
  forced: readonly ForcedItem[],
  options: Pick<SolveOptions, 'saliet' | 'boost'>,
): Item[] | null {
  const out: Item[] = []
  for (const f of forced) {
    if (!Number.isInteger(f.count) || f.count < 1) return null
    let item: Item
    if (f.kind === 'fixed') {
      const m = FIXED_MATERIALS.find((x) => x.id === f.id)
      if (!m || !fixedMaterialApplies(m, rarity)) return null
      item = { label: m.name, exp: applySaliet(fixedMaterialExp(m, rarity), options.saliet) }
    } else {
      const exp = dropUnitExp(f.unit, options)
      if (exp === null) return null
      item = { label: dropUnitLabel(f.unit), exp }
    }
    for (let i = 0; i < f.count; i++) out.push(item)
  }
  return out
}

const RARITY_NAMES: Record<Rarity, string> = {
  iron: 'アイアン',
  bronze: 'ブロンズ',
  silver: 'シルバー',
  gold: 'ゴールド',
  platinum: 'プラチナ',
  black: 'ブラック',
  sapphire: 'サファイア',
}

export function rarityName(r: Rarity): string {
  return RARITY_NAMES[r]
}

const TIER_NAMES = { low: 'ブロンズ以下', chibi: 'ちび', pre: '覚醒前', post: '覚醒後' } as const

export function dropUnitLabel(u: DropUnit): string {
  const g = u.gender === 'male' ? '男' : '女'
  return `${RARITY_NAMES[u.rarity]}${g}(${TIER_NAMES[u.tier]}) Lv${u.level}${u.sameClass ? ' 同クラス' : ''}`
}

interface Arrangement {
  groups: Item[][]
  gold: number
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr.slice()]
  const out: T[][] = []
  arr.forEach((x, i) => {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1))
    for (const p of permutations(rest)) out.push([x, ...p])
  })
  return out
}

function chunk(items: Item[], size: number): Item[][] {
  const out: Item[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// 素材を合成回数ぶんのグループに分け、並べ替えて、ゴールドが最小になる配置を返す
export function arrange(rarity: Rarity, cap: number, startExp: number, items: readonly Item[]): Arrangement {
  const desc = items.slice().sort((a, b) => b.exp - a.exp)
  const asc = desc.slice().reverse()
  let best: Arrangement | null = null
  for (const sorted of [desc, asc]) {
    const groups = chunk(sorted, MERGE_SLOTS)
    for (const order of permutations(groups)) {
      let exp = startExp
      let gold = 0
      for (const g of order) {
        gold += mergeCost(levelFromExp(rarity, exp, cap), g.length)
        exp += g.reduce((s, x) => s + x.exp, 0)
      }
      if (best === null || gold < best.gold) best = { groups: order, gold }
    }
  }
  return best ?? { groups: [], gold: 0 }
}

function toLines(group: readonly Item[]): MaterialLine[] {
  const map = new Map<string, MaterialLine>()
  for (const it of group) {
    const key = `${it.label}|${it.exp}`
    const line = map.get(key)
    if (line) line.count++
    else map.set(key, { label: it.label, count: 1, exp: it.exp })
  }
  return [...map.values()].sort((a, b) => b.exp - a.exp)
}

export function buildMerges(rarity: Rarity, cap: number, startExp: number, groups: readonly Item[][]): MergeStep[] {
  const steps: MergeStep[] = []
  let exp = startExp
  for (const g of groups) {
    const baseLevel = levelFromExp(rarity, exp, cap)
    const gain = g.reduce((s, x) => s + x.exp, 0)
    exp += gain
    steps.push({
      baseLevel,
      items: toLines(g),
      itemCount: g.length,
      gain,
      gold: mergeCost(baseLevel, g.length),
      levelAfter: levelFromExp(rarity, exp, cap),
      nextAfter: remainingToNext(rarity, exp, cap),
    })
  }
  return steps
}

interface Knapsack {
  unit: number
  size: number
  count: Int32Array
  last: Int32Array
}

const INF = 1 << 29

function knapsack(items: readonly Item[], maxSum: number): Knapsack {
  const unit = items.reduce((g, it) => gcd(g, it.exp), 0)
  const size = Math.floor(maxSum / unit) + 1
  const count = new Int32Array(size).fill(INF)
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
  return { unit, size, count, last }
}

function reconstruct(k: Knapsack, items: readonly Item[], s: number): Item[] {
  const out: Item[] = []
  while (s > 0) {
    const i = k.last[s]
    out.push(items[i])
    s -= items[i].exp / k.unit
  }
  return out
}

// 合計がちょうど s になる組み合わせを、スロット数以内で列挙する
function enumerate(k: Knapsack, items: readonly Item[], s: number, slots: number): Item[][] {
  const results: Item[][] = []
  const units = items.map((it) => it.exp / k.unit)
  const chosen: number[] = new Array(items.length).fill(0)
  let nodes = 0
  const dfs = (idx: number, rem: number, left: number): void => {
    if (results.length >= ENUM_LIMIT || nodes++ > NODE_LIMIT) return
    if (rem === 0) {
      const list: Item[] = []
      chosen.forEach((c, i) => {
        for (let j = 0; j < c; j++) list.push(items[i])
      })
      results.push(list)
      return
    }
    if (idx >= items.length || k.count[rem] > left) return
    const max = Math.min(Math.floor(rem / units[idx]), left)
    for (let c = max; c >= 0; c--) {
      chosen[idx] = c
      dfs(idx + 1, rem - c * units[idx], left - c)
    }
    chosen[idx] = 0
  }
  dfs(0, s, slots)
  return results
}

function sumExp(items: readonly Item[]): number {
  return items.reduce((s, x) => s + x.exp, 0)
}

export interface Setup {
  startExp: number
  targetExp: number
  needed: number
  cap: number
  forcedItems: Item[]
  forcedExp: number
}

export function prepare(input: SolveInput): { ok: true; setup: Setup } | { ok: false; error: SolveError } {
  const { rarity, awakening, level, next, targetLevel, forced, options } = input
  const cur = currentExpFromInput(rarity, awakening, level, next)
  if (!cur.ok) return { ok: false, error: cur.error as SolveError }
  const cap = stageCap(rarity, awakening)!
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > cap) {
    return { ok: false, error: 'invalidTarget' }
  }
  const forcedItems = forcedItemList(rarity, forced, options)
  if (forcedItems === null) return { ok: false, error: 'invalidForced' }
  if (forcedItems.length > MERGE_SLOTS) return { ok: false, error: 'tooManyForced' }
  const startExp = cur.exp
  const targetExp = cumExp(rarity, targetLevel)
  return {
    ok: true,
    setup: {
      startExp,
      targetExp,
      needed: Math.max(0, targetExp - startExp),
      cap,
      forcedItems,
      forcedExp: sumExp(forcedItems),
    },
  }
}

// 第一覚醒を目標にしたとき、第二覚醒へ持ち越される経験値の余地。持ち越しの設定がオフ、または該当しなければ 0
export function carryRoom(input: SolveInput, setup: Setup): number {
  if (!input.options.carryOver || !CARRIES_OVER[input.rarity]) return 0
  if (input.awakening !== 'first' || input.targetLevel !== setup.cap) return 0
  const second = MAX_LEVEL[input.rarity].second
  if (second === null) return 0
  return Math.max(0, cumExp(input.rarity, second) - setup.targetExp)
}

function finalize(input: SolveInput, setup: Setup, items: readonly Item[], room: number): Plan {
  const { rarity } = input
  const arr = arrange(rarity, setup.cap, setup.startExp, items)
  const merges = buildMerges(rarity, setup.cap, setup.startExp, arr.groups)
  const totalGain = sumExp(items)
  const over = totalGain - setup.needed
  const carried = Math.min(Math.max(0, over), room)
  return {
    startExp: setup.startExp,
    targetExp: setup.targetExp,
    needed: setup.needed,
    merges,
    totalGain,
    surplus: Math.max(0, over - carried),
    shortage: Math.max(0, -over),
    gold: arr.gold,
    carried,
  }
}

export function solve(input: SolveInput): SolveResult {
  const prep = prepare(input)
  if (!prep.ok) return prep
  const { setup } = prep
  const { options, rarity } = input
  const room = carryRoom(input, setup)

  if (setup.needed === 0) {
    return { ok: true, alreadyReached: true, plan: finalize(input, setup, [], 0) }
  }

  const remaining = setup.needed - setup.forcedExp
  if (remaining <= 0) {
    return { ok: true, alreadyReached: false, plan: finalize(input, setup, setup.forcedItems, room) }
  }

  const items = candidateItems(rarity, options)
  const slots = options.maxMerges * MERGE_SLOTS - setup.forcedItems.length
  if (items.length === 0 || slots <= 0) {
    return { ok: true, alreadyReached: false, plan: finalize(input, setup, setup.forcedItems, room) }
  }

  const maxItem = Math.max(...items.map((i) => i.exp))
  const k = knapsack(items, remaining + room + maxItem)
  const sMin = Math.ceil(remaining / k.unit)

  // 足りない場合は、経験値の大きい素材で全枠を埋める
  if (maxItem * slots < remaining) {
    const best = items.reduce((a, b) => (b.exp > a.exp ? b : a))
    const filled = [...setup.forcedItems, ...Array.from({ length: slots }, () => best)]
    return { ok: true, alreadyReached: false, plan: finalize(input, setup, filled, room) }
  }

  const free = (n: number) => Math.ceil((n + setup.forcedItems.length) / MERGE_SLOTS)
  const limit = Math.min(k.size - 1, sMin + Math.ceil((maxItem + room) / k.unit))
  let bestKey: [number, number] | null = null
  let bestSums: number[] = []
  for (let s = sMin; s <= limit; s++) {
    if (k.count[s] > slots) continue
    const over = Math.max(0, s * k.unit - remaining - room)
    const key: [number, number] = [over, free(k.count[s])]
    if (bestKey === null || key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
      bestKey = key
      bestSums = [s]
    } else if (key[0] === bestKey[0] && key[1] === bestKey[1]) {
      bestSums.push(s)
    }
  }
  if (bestKey === null) {
    return { ok: true, alreadyReached: false, plan: finalize(input, setup, setup.forcedItems, room) }
  }

  const merges = bestKey[1]
  const withForced = (list: Item[]) => [...setup.forcedItems, ...list]
  let chosenSum = bestSums[0]
  if (bestSums.length > 1) {
    let bestGold = Infinity
    for (const s of bestSums) {
      const g = arrange(rarity, setup.cap, setup.startExp, withForced(reconstruct(k, items, s))).gold
      if (g < bestGold) {
        bestGold = g
        chosenSum = s
      }
    }
  }

  const maxCount = merges * MERGE_SLOTS - setup.forcedItems.length
  let bestList = reconstruct(k, items, chosenSum)
  let bestGold = arrange(rarity, setup.cap, setup.startExp, withForced(bestList)).gold
  for (const list of enumerate(k, items, chosenSum, maxCount)) {
    const g = arrange(rarity, setup.cap, setup.startExp, withForced(list)).gold
    if (g < bestGold || (g === bestGold && list.length < bestList.length)) {
      bestGold = g
      bestList = list
    }
  }
  return { ok: true, alreadyReached: false, plan: finalize(input, setup, withForced(bestList), room) }
}
