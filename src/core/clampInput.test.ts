import { describe, expect, it } from 'vitest'
import { clampDigits } from './clampInput'

describe('clampDigits', () => {
  it('上限以下はそのまま', () => {
    expect(clampDigits('60', 99)).toBe('60')
  })
  it('上限を超えたら上限に収める', () => {
    expect(clampDigits('100', 99)).toBe('99')
    expect(clampDigits('99999999', 99)).toBe('99')
  })
  it('数字以外は取り除く', () => {
    expect(clampDigits('1e5', 99999)).toBe('15')
    expect(clampDigits('-5', 99)).toBe('5')
    expect(clampDigits('3.7', 99)).toBe('37')
    expect(clampDigits('1,234', 9999)).toBe('1234')
  })
  it('先頭の 0 は消す', () => {
    expect(clampDigits('007', 99)).toBe('7')
    expect(clampDigits('0', 99)).toBe('0')
  })
  it('空欄は空欄のまま', () => {
    expect(clampDigits('', 99)).toBe('')
    expect(clampDigits('abc', 99)).toBe('')
  })
  it('上限が 0 なら空欄にする', () => {
    expect(clampDigits('5', 0)).toBe('')
  })
})
