import { describe, expect, it } from 'vitest'
import { buildHighlightRectsFromTextIntersections } from './selectionRects'

describe('selection rect normalization', () => {
  it('uses the intersection of browser selection rects and PDF text spans', () => {
    expect(
      buildHighlightRectsFromTextIntersections({
        selectionRects: [{ x: 10, y: 8, width: 120, height: 28 }],
        spanRects: [
          { x: 16, y: 14, width: 80, height: 16 },
          { x: 140, y: 14, width: 24, height: 16 },
        ],
      }),
    ).toEqual([{ x: 15, y: 11.2, width: 81, height: 17.6 }])
  })

  it('keeps partial horizontal selections instead of expanding to the whole span', () => {
    expect(
      buildHighlightRectsFromTextIntersections({
        selectionRects: [{ x: 42, y: 10, width: 30, height: 24 }],
        spanRects: [{ x: 10, y: 14, width: 120, height: 16 }],
      }),
    ).toEqual([{ x: 41, y: 11.2, width: 31, height: 17.6 }])
  })

  it('merges same-line adjacent text intersections into a single highlight rect', () => {
    expect(
      buildHighlightRectsFromTextIntersections({
        selectionRects: [{ x: 10, y: 10, width: 150, height: 24 }],
        spanRects: [
          { x: 12, y: 14, width: 40, height: 16 },
          { x: 60, y: 14.5, width: 44, height: 15 },
        ],
      }),
    ).toEqual([{ x: 11, y: 11.2, width: 93, height: 17.6 }])
  })

  it('keeps multi-line selections as separate rects', () => {
    expect(
      buildHighlightRectsFromTextIntersections({
        selectionRects: [
          { x: 10, y: 10, width: 150, height: 24 },
          { x: 10, y: 42, width: 140, height: 24 },
        ],
        spanRects: [
          { x: 12, y: 14, width: 80, height: 16 },
          { x: 12, y: 46, width: 88, height: 16 },
        ],
      }),
    ).toEqual([
      { x: 11, y: 11.2, width: 81, height: 17.6 },
      { x: 11, y: 43.2, width: 89, height: 17.6 },
    ])
  })
})
