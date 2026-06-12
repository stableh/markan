import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  getNextZoom,
  getVisiblePageNumber,
  resolveFitPageScale,
  resolveFitWidthScale,
} from './viewerMath'

describe('viewerMath', () => {
  it('clamps zoom to the supported PDF viewer range', () => {
    expect(clampZoom(0.05)).toBe(0.25)
    expect(clampZoom(1)).toBe(1)
    expect(clampZoom(6)).toBe(4)
  })

  it('steps zoom in and out in predictable increments', () => {
    expect(getNextZoom(1, 'in')).toBe(1.1)
    expect(getNextZoom(1, 'out')).toBe(0.9)
  })

  it('calculates fit-width scale from container and page dimensions', () => {
    expect(resolveFitWidthScale({ containerWidth: 1000, pageWidth: 500 })).toBe(1.9)
  })

  it('calculates fit-page scale using the limiting dimension', () => {
    expect(
      resolveFitPageScale({
        containerWidth: 1000,
        containerHeight: 800,
        pageWidth: 500,
        pageHeight: 1000,
      }),
    ).toBe(0.75)
  })

  it('returns the page whose vertical center is closest to the viewport center', () => {
    expect(
      getVisiblePageNumber({
        scrollTop: 450,
        viewportHeight: 600,
        pages: [
          { pageNumber: 1, top: 0, height: 500 },
          { pageNumber: 2, top: 540, height: 500 },
          { pageNumber: 3, top: 1080, height: 500 },
        ],
      }),
    ).toBe(2)
  })
})
