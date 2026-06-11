import { describe, expect, it } from 'vitest'
import { clampPageNumber, getPageNumberForNavigation } from './viewMode'

describe('viewMode', () => {
  it('clamps page numbers to the current document range', () => {
    expect(clampPageNumber(-10, 5)).toBe(1)
    expect(clampPageNumber(3, 5)).toBe(3)
    expect(clampPageNumber(12, 5)).toBe(5)
    expect(clampPageNumber(1, 0)).toBe(1)
  })

  it('navigates previous, next, first, and last pages without leaving range', () => {
    expect(getPageNumberForNavigation(1, 10, 'previous-page')).toBe(1)
    expect(getPageNumberForNavigation(4, 10, 'previous-page')).toBe(3)
    expect(getPageNumberForNavigation(4, 10, 'next-page')).toBe(5)
    expect(getPageNumberForNavigation(10, 10, 'next-page')).toBe(10)
    expect(getPageNumberForNavigation(4, 10, 'first-page')).toBe(1)
    expect(getPageNumberForNavigation(4, 10, 'last-page')).toBe(10)
  })
})
