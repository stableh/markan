import { describe, expect, it } from 'vitest'
import { normalizeSelectionRectForHighlight } from './selectionRects'

describe('selection rect normalization', () => {
  it('trims oversized browser text selection rects mostly from the bottom', () => {
    expect(
      normalizeSelectionRectForHighlight({
        x: 12,
        y: 30,
        width: 180,
        height: 20,
      }),
    ).toEqual({
      x: 12,
      y: 30.8,
      width: 180,
      height: 16.8,
    })
  })

  it('does not over-trim large text selection rects', () => {
    expect(
      normalizeSelectionRectForHighlight({
        x: 14,
        y: 40,
        width: 240,
        height: 48,
      }),
    ).toEqual({
      x: 14,
      y: 40.875,
      width: 240,
      height: 44.5,
    })
  })

  it('keeps very short rects stable so small text remains selectable', () => {
    expect(
      normalizeSelectionRectForHighlight({
        x: 10,
        y: 20,
        width: 80,
        height: 4,
      }),
    ).toEqual({
      x: 10,
      y: 20,
      width: 80,
      height: 4,
    })
  })
})
