import { describe, expect, it } from 'vitest'
import { clearSelection, findHighlightObjectIdsOverlappingRects, selectOverlayObject } from './SelectionManager'

describe('SelectionManager', () => {
  it('tracks selected overlay object id', () => {
    expect(selectOverlayObject('overlay-1')).toEqual({ selectedObjectId: 'overlay-1' })
  })

  it('clears selection', () => {
    expect(clearSelection()).toEqual({ selectedObjectId: null })
  })

  it('finds highlight objects that substantially overlap selected PDF rects', () => {
    expect(
      findHighlightObjectIdsOverlappingRects(
        [
          {
            id: 'highlight-1',
            type: 'highlight',
            pageIndex: 0,
            frame: { x: 20, y: 10, width: 90, height: 20 },
            rects: [{ x: 20, y: 10, width: 90, height: 20 }],
            style: { color: '#facc15', opacity: 1 },
            zIndex: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        0,
        [{ x: 22, y: 11, width: 84, height: 18 }],
      ),
    ).toEqual(['highlight-1'])
  })

  it('does not match small overlaps or highlights on other pages', () => {
    expect(
      findHighlightObjectIdsOverlappingRects(
        [
          {
            id: 'highlight-small-overlap',
            type: 'highlight',
            pageIndex: 0,
            frame: { x: 10, y: 10, width: 90, height: 20 },
            rects: [{ x: 10, y: 10, width: 90, height: 20 }],
            style: { color: '#facc15', opacity: 1 },
            zIndex: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'highlight-1',
            type: 'highlight',
            pageIndex: 1,
            frame: { x: 10, y: 10, width: 90, height: 20 },
            rects: [{ x: 10, y: 10, width: 90, height: 20 }],
            style: { color: '#facc15', opacity: 1 },
            zIndex: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        0,
        [{ x: 80, y: 10, width: 90, height: 20 }],
      ),
    ).toEqual([])
  })
})
