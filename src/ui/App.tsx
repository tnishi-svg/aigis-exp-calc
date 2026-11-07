import { useMemo, useState } from 'react'
import { allowedTiers, dropUnitExp, maxDropLevel, type ClassTier, type DropUnit } from '../core/dropUnit'
import { clampDigits } from '../core/clampInput'
import { MERGE_SLOTS, applySaliet, maxNextInput } from '../core/exp'
import { evaluateFeeder } from '../core/feeder'
import { findFragment } from '../core/fragment'
import { dropUnitLabel, rarityName, solve, type ForcedItem, type SolveInput } from '../core/solver'
import { DEFAULT_ENABLED_IDS, FIXED_MATERIALS, fixedMaterialApplies, fixedMaterialExp } from '../data/materials'
import {
  MAX_LEVEL,
  RARITIES,
  availableAwakenings,
  type Awakening,
  type Gender,
  type Rarity,
} from '../data/rarity'
import { isValidDropCombo } from '../core/dropUnit'
import { MSG } from './messages'
import { useServiceWorkerUpdate } from './pwa'
import { useStoredState } from './storage'

interface DropForm {
  rarity: Rarity
  gender: Gender
  tier: ClassTier
  level: number
  sameClass: boolean
}

interface State {
  rarity: Rarity
  awakening: Awakening
  level: string
  next: string
  target: string
  forcedFixed: Record<string, number>
  forcedDrops: (DropForm & { count: number })[]
  saliet: boolean
  boost: boolean
  maxMerges: number
  carryOver: boolean
  enabledIds: string[]
  feederOn: boolean
  feeder: DropForm
}

const DEFAULT_DROP: DropForm = { rarity: 'gold', gender: 'male', tier: 'pre', level: 1, sameClass: false }

const INITIAL: State = {
  rarity: 'gold',
  awakening: 'none',
  level: '1',
  next: '',
  target: '60',
  forcedFixed: {},
  forcedDrops: [],
  saliet: false,
  boost: false,
  maxMerges: 1,
  carryOver: true,
  enabledIds: [...DEFAULT_ENABLED_IDS],
  feederOn: false,
  feeder: DEFAULT_DROP,
}

function toInt(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export default function App() {
  const [st, set, reset] = useStoredState<State>(INITIAL)
  const update = useServiceWorkerUpdate()

  const awakenings = availableAwakenings(st.rarity)
  const awakening = awakenings.includes(st.awakening) ? st.awakening : 'none'
  const cap = MAX_LEVEL[st.rarity][awakening] ?? 1
  const nextMax = maxNextInput(st.rarity, Number(st.level), cap)

  const forced: ForcedItem[] = useMemo(
    () => [
      ...Object.entries(st.forcedFixed)
        .filter(([, n]) => n > 0)
        .map(([id, count]): ForcedItem => ({ kind: 'fixed', id, count })),
      ...st.forcedDrops.map((d): ForcedItem => ({ kind: 'drop', unit: d, count: d.count })),
    ],
    [st.forcedFixed, st.forcedDrops],
  )

  const input: SolveInput = useMemo(
    () => ({
      rarity: st.rarity,
      awakening,
      level: Number(st.level),
      next: toInt(st.next),
      targetLevel: Number(st.target),
      forced,
      options: {
        saliet: st.saliet,
        boost: st.boost,
        maxMerges: st.maxMerges,
        carryOver: st.carryOver,
        enabledIds: st.enabledIds,
      },
    }),
    [st.rarity, awakening, st.level, st.next, st.target, forced, st.saliet, st.boost, st.maxMerges, st.carryOver, st.enabledIds],
  )

  const result = useMemo(() => solve(input), [input])
  const fragment = useMemo(() => (result.ok ? findFragment(input) : null), [input, result.ok])

  const onRarity = (rarity: Rarity) => {
    const aw = availableAwakenings(rarity)
    const next = aw.includes(st.awakening) ? st.awakening : 'none'
    set({ rarity, awakening: next, target: String(MAX_LEVEL[rarity][next] ?? 1), level: '1', next: '' })
  }
  // Lv を変えたら、入力済みの「次のレベルまで」も新しい Lv の上限に収める
  const onLevel = (level: string) => {
    const max = maxNextInput(st.rarity, Number(level), cap)
    set({ level, next: clampDigits(st.next, max) })
  }
  const onAwakening = (a: Awakening) =>
    set({ awakening: a, target: String(MAX_LEVEL[st.rarity][a] ?? 1), level: '1', next: '' })

  return (
    <main>
      <h1>
        {MSG.title}
        <small>{MSG.subtitle}</small>
      </h1>

      <section>
        <h2>{MSG.sections.target}</h2>
        <label>
          {MSG.fields.rarity}
          <select value={st.rarity} onChange={(e) => onRarity(e.target.value as Rarity)}>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {rarityName(r)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {MSG.fields.awakening}
          <select value={awakening} onChange={(e) => onAwakening(e.target.value as Awakening)}>
            {awakenings.map((a) => (
              <option key={a} value={a}>
                {MSG.awakening[a]}(Lv{MAX_LEVEL[st.rarity][a]})
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <label>
            {MSG.fields.level}
            <input
              type="text"
              inputMode="numeric"
              maxLength={String(cap).length}
              value={st.level}
              onChange={(e) => onLevel(clampDigits(e.target.value, cap))}
            />
          </label>
          <label>
            {MSG.fields.next}
            <input
              type="text"
              inputMode="numeric"
              maxLength={String(nextMax).length}
              placeholder={MSG.fields.nextHint}
              value={st.next}
              onChange={(e) => set({ next: clampDigits(e.target.value, nextMax) })}
            />
          </label>
        </div>
        <label>
          {MSG.fields.target}
          <input
            type="text"
            inputMode="numeric"
            maxLength={String(cap).length}
            value={st.target}
            onChange={(e) => set({ target: clampDigits(e.target.value, cap) })}
          />
        </label>
      </section>

      <section>
        <h2>{MSG.sections.settings}</h2>
        <label className="check">
          <input type="checkbox" checked={st.saliet} onChange={(e) => set({ saliet: e.target.checked })} />
          {MSG.settings.saliet}
        </label>
        <label className="check">
          <input type="checkbox" checked={st.boost} onChange={(e) => set({ boost: e.target.checked })} />
          {MSG.settings.boost}
        </label>
        <label className="check">
          <input type="checkbox" checked={st.carryOver} onChange={(e) => set({ carryOver: e.target.checked })} />
          {MSG.settings.carryOver}
        </label>
        <label>
          {MSG.settings.maxMerges}
          <select value={st.maxMerges} onChange={(e) => set({ maxMerges: Number(e.target.value) })}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
                {MSG.settings.maxMergesUnit}
              </option>
            ))}
          </select>
        </label>
        <details>
          <summary>{MSG.settings.materials}</summary>
          <p className="hint">{MSG.settings.materialsHint}</p>
          {FIXED_MATERIALS.filter((m) => fixedMaterialApplies(m, st.rarity)).map((m) => (
            <label key={m.id} className="check">
              <input
                type="checkbox"
                checked={st.enabledIds.includes(m.id)}
                onChange={(e) =>
                  set({
                    enabledIds: e.target.checked
                      ? [...st.enabledIds, m.id]
                      : st.enabledIds.filter((x) => x !== m.id),
                  })
                }
              />
              {m.name}
            </label>
          ))}
        </details>
        <button type="button" className="secondary" onClick={reset}>
          {MSG.settings.reset}
        </button>
      </section>

      <section>
        <h2>{MSG.sections.forced}</h2>
        {FIXED_MATERIALS.filter((m) => fixedMaterialApplies(m, st.rarity)).map((m) => (
          <label key={m.id} className="row count">
            <span>
              {m.name}
              <small className="exp">
                {MSG.forced.perUnit(applySaliet(fixedMaterialExp(m, st.rarity), st.saliet))}
              </small>
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={st.forcedFixed[m.id] ?? 0}
              onChange={(e) =>
                set({ forcedFixed: { ...st.forcedFixed, [m.id]: Number(clampDigits(e.target.value, MERGE_SLOTS) || 0) } })
              }
            />
          </label>
        ))}
        {st.forcedDrops.map((d, i) => (
          <div key={i} className="drop">
            <span>
              {dropUnitLabel(d)}
              <small className="exp">{MSG.forced.perUnit(dropUnitExp(d, { saliet: st.saliet, boost: st.boost }))}</small>
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={d.count}
              onChange={(e) =>
                set({
                  forcedDrops: st.forcedDrops.map((x, j) =>
                    j === i ? { ...x, count: Math.max(1, Number(clampDigits(e.target.value, MERGE_SLOTS) || 1)) } : x,
                  ),
                })
              }
            />
            <button type="button" className="secondary" onClick={() => set({ forcedDrops: st.forcedDrops.filter((_, j) => j !== i) })}>
              {MSG.buttons.remove}
            </button>
          </div>
        ))}
        <DropPicker
          saliet={st.saliet}
          boost={st.boost}
          onAdd={(d) => set({ forcedDrops: [...st.forcedDrops, { ...d, count: 1 }] })}
        />
      </section>

      <section>
        <h2>{MSG.sections.result}</h2>
        {!result.ok ? (
          <p className="error">{MSG.errors[result.error]}</p>
        ) : result.alreadyReached ? (
          <p>{MSG.result.reached}</p>
        ) : (
          <>
            <dl className="summary">
              <dt>{MSG.result.summary.needed}</dt>
              <dd>{result.plan.needed.toLocaleString()}</dd>
              <dt>{MSG.result.summary.gain}</dt>
              <dd>{result.plan.totalGain.toLocaleString()}</dd>
              {result.plan.shortage > 0 ? (
                <>
                  <dt>{MSG.result.summary.shortage}</dt>
                  <dd className="error">{result.plan.shortage.toLocaleString()}</dd>
                </>
              ) : (
                <>
                  <dt>{MSG.result.summary.surplus}</dt>
                  <dd>{result.plan.surplus.toLocaleString()}</dd>
                </>
              )}
              {result.plan.carried > 0 && (
                <>
                  <dt>{MSG.result.summary.carried}</dt>
                  <dd>{result.plan.carried.toLocaleString()}</dd>
                </>
              )}
              <dt>{MSG.result.summary.merges}</dt>
              <dd>{result.plan.merges.length}</dd>
              <dt>{MSG.result.summary.gold}</dt>
              <dd>{MSG.result.gold(result.plan.gold)}</dd>
            </dl>
            {result.plan.shortage > 0 && <p className="error">{MSG.result.shortageNote}</p>}
            {result.plan.merges.map((m, i) => (
              <div key={i} className="merge">
                <h3>
                  {MSG.result.merge(i + 1)}
                  <small>
                    {MSG.result.base(m.baseLevel)} / {MSG.result.items(m.itemCount)} / {MSG.result.gold(m.gold)}
                  </small>
                </h3>
                <ul>
                  {m.items.map((l) => (
                    <li key={`${l.label}${l.exp}`}>
                      <span>{l.label}</span>
                      <span>
                        × {l.count}
                        <small> ({l.exp.toLocaleString()} EXP)</small>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="after">{MSG.result.after(m.levelAfter, m.nextAfter)}</p>
              </div>
            ))}
          </>
        )}
      </section>

      {fragment && (
        <section>
          <h2>{MSG.sections.fragment}</h2>
          {fragment.gap === 0 ? (
            <p>{MSG.fragment.none}</p>
          ) : (
            <>
              <p>{MSG.fragment.desc(fragment.baseExp, fragment.gap)}</p>
              {fragment.candidates.length === 0 ? (
                <p>{MSG.fragment.noCandidates}</p>
              ) : (
                <ul className="candidates">
                  {fragment.candidates.map((c, i) => (
                    <li key={i}>
                      <span>{dropUnitLabel(c.unit)}</span>
                      <span>
                        {MSG.fragment.exp(c.exp)} / {MSG.fragment.surplus(c.surplus)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      <section>
        <h2>{MSG.sections.feeder}</h2>
        <label className="check">
          <input type="checkbox" checked={st.feederOn} onChange={(e) => set({ feederOn: e.target.checked })} />
          {MSG.feeder.enable}
        </label>
        {st.feederOn && <Feeder unit={st.feeder} saliet={st.saliet} boost={st.boost} onChange={(f) => set({ feeder: f })} />}
      </section>
      {update.waiting && (
        <div className="update">
          <span>{MSG.pwa.update}</span>
          <button type="button" onClick={update.reload}>
            {MSG.pwa.reload}
          </button>
        </div>
      )}
    </main>
  )
}

function DropPicker({ onAdd, saliet, boost }: { onAdd: (d: DropForm) => void; saliet: boolean; boost: boolean }) {
  const [d, setD] = useState<DropForm>(DEFAULT_DROP)
  return (
    <details>
      <summary>{MSG.buttons.addDrop}</summary>
      <DropFields value={d} onChange={setD} />
      <p className="exp">{MSG.forced.perUnit(dropUnitExp(d, { saliet, boost }))}</p>
      <button type="button" disabled={!isValidDropCombo(d.rarity, d.gender)} onClick={() => onAdd(d)}>
        {MSG.buttons.add}
      </button>
    </details>
  )
}

function tierOptions(rarity: Rarity): ClassTier[] {
  const tiers = allowedTiers(rarity)
  return tiers.includes('pre') ? [...tiers, 'chibi'] : tiers
}

// レアリティを変えたとき、その区分と Lv の範囲に収まるよう揃える
function withRarity(value: DropForm, rarity: Rarity): DropForm {
  const tier = tierOptions(rarity).includes(value.tier) ? value.tier : tierOptions(rarity)[0]
  return { ...value, rarity, tier, level: Math.min(value.level, maxDropLevel(rarity, tier)) }
}

function DropFields({ value, onChange }: { value: DropForm; onChange: (d: DropForm) => void }) {
  const tiers = tierOptions(value.rarity)
  const max = maxDropLevel(value.rarity, value.tier)
  return (
    <div className="dropfields">
      <label>
        {MSG.fields.rarity}
        <select value={value.rarity} onChange={(e) => onChange(withRarity(value, e.target.value as Rarity))}>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {rarityName(r)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {MSG.fields.gender}
        <select value={value.gender} onChange={(e) => onChange({ ...value, gender: e.target.value as Gender })}>
          <option value="female">{MSG.gender.female}</option>
          <option value="male">{MSG.gender.male}</option>
        </select>
      </label>
      <label>
        {MSG.fields.tier}
        <select
          value={value.tier}
          onChange={(e) => {
            const tier = e.target.value as ClassTier
            onChange({ ...value, tier, level: Math.min(value.level, maxDropLevel(value.rarity, tier)) })
          }}
        >
          {tiers.map((t) => (
            <option key={t} value={t}>
              {MSG.tier[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {MSG.fields.unitLevel}
        <input
          type="text"
          inputMode="numeric"
          maxLength={String(max).length}
          value={value.level}
          onChange={(e) => onChange({ ...value, level: Math.max(1, Number(clampDigits(e.target.value, max) || 1)) })}
        />
      </label>
      <label className="check">
        <input type="checkbox" checked={value.sameClass} onChange={(e) => onChange({ ...value, sameClass: e.target.checked })} />
        {MSG.fields.sameClass}
      </label>
    </div>
  )
}

function Feeder({
  unit,
  saliet,
  boost,
  onChange,
}: {
  unit: DropForm
  saliet: boolean
  boost: boolean
  onChange: (d: DropForm) => void
}) {
  const valid = isValidDropCombo(unit.rarity, unit.gender)
  const result = useMemo(
    () => (valid ? evaluateFeeder(unit as DropUnit, { saliet, boost }) : null),
    [unit, saliet, boost, valid],
  )
  return (
    <div>
      <DropFields value={unit} onChange={onChange} />
      {!result ? (
        <p className="error">{MSG.feeder.invalid}</p>
      ) : (
        <>
          <p>{MSG.feeder.desc}</p>
          <p className={result.best ? '' : 'hint'}>
            {result.best ? MSG.feeder.best(result.best.level, result.best.net) : MSG.feeder.none}
          </p>
          <table>
            <thead>
              <tr>
                <th>{MSG.feeder.cols.level}</th>
                <th>{MSG.feeder.cols.exp}</th>
                <th>{MSG.feeder.cols.cost}</th>
                <th>{MSG.feeder.cols.net}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.level} className={result.best?.level === r.level ? 'best' : ''}>
                  <td>{r.level}</td>
                  <td>{r.exp.toLocaleString()}</td>
                  <td>{r.cost.toLocaleString()}</td>
                  <td>{r.net.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}


