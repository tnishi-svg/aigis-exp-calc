import type { Rarity } from './rarity'

// 固定経験値の素材。sameRarityExp は「ベースと同レアリティ」のときの値、無ければ全ベースで exp を使う
export interface FixedMaterial {
  id: string
  name: string
  exp: number
  sameRarityExp?: number
  // 同レアリティ判定に使うレアリティ(レアリティ別の聖霊のみ)
  spiritOf?: Rarity
  // 合成できるベースのレアリティ。省略時は全レアリティ
  only?: readonly Rarity[]
  // 候補として自動で使うか(150,000EXP級の高額アイテムは指定したときだけ使う)
  auto: boolean
}

// 出典: 「経験値」ページの基本EXPの表、各聖霊ユニットのページ(レアリティ聖霊は同レアリティで1250、それ以外で500)
export const FIXED_MATERIALS: readonly FixedMaterial[] = [
  { id: 'iron-spirit', name: '鉄聖霊アイナ', exp: 500, sameRarityExp: 1250, spiritOf: 'iron', auto: false },
  { id: 'bronze-spirit', name: '銅聖霊サラ', exp: 500, sameRarityExp: 1250, spiritOf: 'bronze', auto: false },
  { id: 'silver-spirit', name: '銀聖霊シリル', exp: 500, sameRarityExp: 1250, spiritOf: 'silver', auto: false },
  { id: 'gold-spirit', name: '金聖霊ニナ', exp: 500, sameRarityExp: 1250, spiritOf: 'gold', auto: false },
  { id: 'platinum-spirit', name: '白金聖霊セリア', exp: 500, sameRarityExp: 1250, spiritOf: 'platinum', auto: false },
  { id: 'black-spirit', name: '黒聖霊フローリカ', exp: 500, sameRarityExp: 1250, spiritOf: 'black', auto: false },
  { id: 'amur', name: '小祝福銀聖霊アムール', exp: 4000, only: ['silver'], auto: true },
  { id: 'plaisir', name: '小祝福金聖霊プレジール', exp: 1750, only: ['gold'], auto: true },
  { id: 'allegria', name: '小祝福金聖霊アレグリア', exp: 18000, only: ['gold'], auto: true },
  { id: 'delight', name: '祝福金聖霊ディライト', exp: 150000, only: ['gold'], auto: false },
  { id: 'platinum-armor', name: 'プラチナアーマー', exp: 5000, auto: true },
  { id: 'freude', name: '小祝福白金聖霊フロイデ', exp: 19000, only: ['platinum'], auto: true },
  { id: 'black-armor', name: 'ブラックアーマー', exp: 40000, auto: true },
  { id: 'placer', name: '小祝福聖霊プラセル', exp: 10000, auto: true },
  { id: 'praise', name: '小祝福聖霊プレーゼ', exp: 18000, auto: true },
  { id: 'farah', name: '小祝福黒聖霊ファラハ', exp: 20000, only: ['black'], auto: true },
  { id: 'liebe', name: '小祝福青聖霊リーベ', exp: 19000, only: ['sapphire'], auto: true },
  { id: 'happy', name: '祝福聖霊ハッピー(ジョイ等)', exp: 150000, auto: false },
  { id: 'liel', name: '祝福青聖霊リール', exp: 150000, only: ['sapphire'], auto: false },
]

export function fixedMaterialExp(m: FixedMaterial, base: Rarity): number {
  if (m.sameRarityExp !== undefined && m.spiritOf === base) return m.sameRarityExp
  return m.exp
}

// レアリティ別の聖霊は全レアリティに合成できる(別レアリティには 500EXP)
export function fixedMaterialApplies(m: FixedMaterial, base: Rarity): boolean {
  return !m.only || m.only.includes(base)
}

// 初期状態で候補に使う素材。150,000EXP級と、レアリティ別の小さな聖霊は、必要なときに設定で足す
export const DEFAULT_ENABLED_IDS: readonly string[] = FIXED_MATERIALS.filter((m) => m.auto).map((m) => m.id)
