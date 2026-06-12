import { describe, expect, it } from 'vitest'
import { clearSelection, findHighlightObjectAtPoint, selectOverlayObject } from './SelectionManager'

describe('SelectionManager', () => {
  it('tracks selected overlay object id', () => {
    expect(selectOverlayObject('overlay-1')).toEqual({ selectedObjectId: 'overlay-1' })
  })

  it('clears selection', () => {
    expect(clearSelection()).toEqual({ selectedObjectId: null })
  })

  it('finds the topmost highlight object at a PDF page point', () => {
    expect(
      findHighlightObjectAtPoint(
        [
          {
            id: 'lower-highlight',
            type: 'highlight',
            pageIndex: 0,
            frame: { x: 10, y: 10, width: 90, height: 20 },
            rects: [{ x: 10, y: 10, width: 90, height: 20 }],
            style: { color: '#facc15', opacity: 0.45 },
            zIndex: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'upper-highlight',
            type: 'highlight',
            pageIndex: 0,
            frame: { x: 20, y: 10, width: 90, height: 20 },
            rects: [{ x: 20, y: 10, width: 90, height: 20 }],
            style: { color: '#facc15', opacity: 0.45 },
            zIndex: 2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        0,
        { x: 25, y: 15 },
      ),
    ).toBe('upper-highlight')
  })

  it('does not hit highlights on other pages or outside their rects', () => {
    expect(
      findHighlightObjectAtPoint(
        [
          {
            id: 'highlight-1',
            type: 'highlight',
            pageIndex: 1,
            frame: { x: 10, y: 10, width: 90, height: 20 },
            rects: [{ x: 10, y: 10, width: 90, height: 20 }],
            style: { color: '#facc15', opacity: 0.45 },
            zIndex: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        0,
        { x: 25, y: 15 },
      ),
    ).toBeNull()
  })
})
