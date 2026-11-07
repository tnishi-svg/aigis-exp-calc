import { useEffect, useState } from 'react'

const KEY = 'aigis-exp-calc:v1'

export function useStoredState<T extends object>(initial: T): [T, (patch: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...initial, ...(JSON.parse(raw) as Partial<T>) }
    } catch {
      // 壊れた保存値は無視して初期値で始める
    }
    return initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // 保存できない環境(プライベートモードなど)では保存しない
    }
  }, [state])

  return [state, (patch) => setState((s) => ({ ...s, ...patch })), () => setState(initial)]
}
