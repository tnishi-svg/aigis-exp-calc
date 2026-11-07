import type { Awakening, Gender } from '../data/rarity'
import type { ClassTier } from '../core/dropUnit'
import type { SolveError } from '../core/solver'

export const MSG = {
  title: '強化合成計算機',
  subtitle: '千年戦争アイギス',
  sections: {
    target: '育成対象',
    forced: '必ず使う素材',
    settings: '設定',
    result: '結果',
    fragment: '端数を埋めるドロップユニット',
    feeder: '餌ユニットを育てるか',
  },
  fields: {
    rarity: 'レアリティ',
    awakening: '覚醒段階',
    level: '現在の Lv',
    next: '「次のレベルまで」',
    nextHint: '空欄なら Lv ちょうど',
    target: '目標 Lv',
    count: '個数',
    unitLevel: 'Lv',
    gender: '性別',
    tier: 'クラス区分',
    sameClass: '同クラスボーナスあり',
    material: '素材',
  },
  awakening: { none: '覚醒前', first: '第一覚醒', second: '第二覚醒' } satisfies Record<Awakening, string>,
  gender: { female: '女', male: '男' } satisfies Record<Gender, string>,
  tier: {
    low: 'ブロンズ以下(+5)',
    chibi: 'ちび(+56)',
    pre: '覚醒前(+160)',
    post: '覚醒後(+400)',
  } satisfies Record<ClassTier, string>,
  settings: {
    saliet: '育成聖霊サリエットを持っている(+10%)',
    boost: '基本 EXP アップ期間',
    maxMerges: '合成回数の上限',
    maxMergesUnit: '回',
    carryOver: '第一覚醒の持ち越し分を余りに数えない',
    materials: '候補に使う素材',
    materialsHint: '150,000EXP級や各レアリティの聖霊は、使うものだけチェックしてください。',
    reset: '入力と設定を初期化',
  },
  buttons: {
    add: '追加',
    addDrop: 'ドロップユニットを追加',
    remove: '削除',
    close: '閉じる',
  },
  result: {
    reached: 'すでに目標に届いています。',
    summary: {
      needed: '必要経験値',
      gain: '獲得経験値',
      surplus: '余り経験値',
      shortage: '不足経験値',
      merges: '合成回数',
      gold: 'ゴールド合計',
      carried: '第二覚醒に持ち越される経験値',
    },
    merge: (i: number) => `${i}回目の合成`,
    base: (lv: number) => `合成前 Lv${lv}`,
    after: (lv: number, next: number | null) =>
      next === null ? `合成後 Lv${lv}(上限)` : `合成後 Lv${lv} / 次のレベルまで ${next.toLocaleString()}`,
    items: (n: number) => `${n}枠`,
    gold: (g: number) => `${g.toLocaleString()}G`,
    shortageNote: '候補の素材だけでは届きません。素材や合成回数の上限を見直してください。',
  },
  forced: {
    perUnit: (exp: number | null) => (exp === null ? 'この組み合わせはありません' : `1体 ${exp.toLocaleString()} EXP`),
  },
  fragment: {
    desc: (base: number, gap: number) =>
      `ベースの素材(${base.toLocaleString()} EXP)に、あと ${gap.toLocaleString()} EXP を足せば目標に届きます。ドロップユニット 1 体で埋めるなら、次の条件が余りの少ない順です。`,
    none: '端数はありません。',
    noCandidates: '1 体で埋められるドロップユニットはありません。',
    surplus: (s: number) => `余り ${s.toLocaleString()}`,
    exp: (e: number) => `${e.toLocaleString()} EXP`,
  },
  feeder: {
    enable: '餌のドロップユニットを育ててから使う場合を比較する',
    desc: '餌を Lv1 のまま使う場合との差です。育てるのに使う経験値も差し引いています。',
    best: (lv: number, net: number) => `Lv${lv} まで育てると、${net.toLocaleString()} EXP 得です。`,
    none: 'この条件では、育てても得になる Lv はありません。',
    cols: { level: 'Lv', exp: '餌の経験値', cost: '育成コスト', net: '差' },
    invalid: 'この組み合わせのユニットはありません。',
  },
  errors: {
    invalidAwakening: 'このレアリティにその覚醒段階はありません。',
    invalidLevel: '現在の Lv が範囲外です。',
    invalidNext: '「次のレベルまで」が正しくありません。',
    nextTooLarge: '「次のレベルまで」が、そのレベルの必要経験値を超えています。',
    invalidTarget: '目標 Lv が範囲外です。',
    tooManyForced: '必ず使う素材が 10 枠を超えています。',
    invalidForced: '必ず使う素材の指定が正しくありません。',
  } satisfies Record<SolveError, string>,
  pwa: {
    update: '新しい版があります。',
    reload: '再読み込み',
  },
} as const

