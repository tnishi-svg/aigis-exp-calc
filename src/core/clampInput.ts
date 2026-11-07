// 数字以外を取り除き、先頭の 0 を消し、上限を超えたら上限に収める。空欄は空欄のまま返す
// 上限が 0 のときは、入力できる値がないので空欄にする
export function clampDigits(raw: string, max: number): string {
  if (max <= 0) return ''
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return ''
  const n = Number(digits)
  return n > max ? String(max) : digits
}
