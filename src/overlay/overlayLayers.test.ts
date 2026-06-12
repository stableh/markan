import { describe, expect, it } from 'vitest'
import type { OverlayObject } from './OverlayObject'
import { splitHighlightOverlayObjects } from './overlayLayers'

describe('overlayLayers', () => {
  it('separates highlight overlays from editable object overlays', () => {
    const objects: OverlayObject[] = [
      {
        id: 'text-1',
        type: 'text',
        pageIndex: 0,
        frame: { x: 10, y: 10, width: 100, height: 30 },
        contentHtml: '<p>Text</p>',
        style: {
          fontFamily: 'Pretendard',
          fontWeight: 400,
          fontSize: 16,
          textColor: '#111111',
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          padding: 0,
          textAlign: 'left',
          letterSpacing: 0,
          lineHeight: 1.4,
          opacity: 1,
        },
        zIndex: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'highlight-1',
        type: 'highlight',
        pageIndex: 0,
        frame: { x: 10, y: 50, width: 100, height: 20 },
        rects: [{ x: 10, y: 50, width: 100, height: 20 }],
        style: { color: '#facc15', opacity: 0.45 },
        zIndex: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    expect(splitHighlightOverlayObjects(objects)).toEqual({
      highlightObjects: [objects[1]],
      nonHighlightObjects: [objects[0]],
    })
  })
})
