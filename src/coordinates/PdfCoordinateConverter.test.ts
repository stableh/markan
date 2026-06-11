import { describe, expect, it } from 'vitest'
import {
  clientPointToPagePoint,
  pdfRectToViewportRect,
  viewportPointToPdfPoint,
  viewportRectToPdfRect,
} from './PdfCoordinateConverter'

const viewport = {
  scale: 2,
  width: 1000,
  height: 1400,
}

describe('PdfCoordinateConverter', () => {
  it('converts viewport points to PDF page coordinates', () => {
    expect(viewportPointToPdfPoint({ x: 240, y: 320 }, viewport)).toEqual({ x: 120, y: 160 })
  })

  it('converts PDF rects to viewport rects without mutating the persistent frame', () => {
    const frame = { x: 10, y: 20, width: 100, height: 80 }

    expect(pdfRectToViewportRect(frame, viewport)).toEqual({ x: 20, y: 40, width: 200, height: 160 })
    expect(frame).toEqual({ x: 10, y: 20, width: 100, height: 80 })
  })

  it('keeps the same PDF rect when round-tripping through 50, 100, and 200 percent zoom', () => {
    const frame = { x: 72, y: 96, width: 180, height: 120 }

    for (const scale of [0.5, 1, 2]) {
      const scaledViewport = { scale, width: 612 * scale, height: 792 * scale }
      const viewportRect = pdfRectToViewportRect(frame, scaledViewport)

      expect(viewportRectToPdfRect(viewportRect, scaledViewport)).toEqual(frame)
    }
  })

  it('normalizes viewport rects before storing PDF page coordinates', () => {
    expect(viewportRectToPdfRect({ x: 260, y: 300, width: -120, height: -80 }, viewport)).toEqual({
      x: 70,
      y: 110,
      width: 60,
      height: 40,
    })
  })

  it('converts client coordinates through the page element boundary', () => {
    const pageElement = {
      getBoundingClientRect: () => ({ left: 50, top: 80 }),
    } as HTMLElement

    expect(clientPointToPagePoint(250, 280, pageElement, viewport)).toEqual({ x: 100, y: 100 })
  })
})
