import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  getNextZoom,
  getVisiblePageNumber,
  resolveFitPageScale,
  resolveFitWidthScale,
  resolvePageViewportSize,
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


  it('rounds fit-width scale down so rendered pages do not exceed available width', () => {
    const containerWidth = 1000
    const pageWidth = 526
    const scale = resolveFitWidthScale({ containerWidth, pageWidth })

    expect(pageWidth * scale).toBeLessThanOrEqual(containerWidth - 48)
    expect(scale).toBe(1.8)
  })

  it('rounds fit-page scale down so rendered pages do not exceed available height', () => {
    const containerHeight = 800
    const pageHeight = 943
    const scale = resolveFitPageScale({
      containerWidth: 1600,
      containerHeight,
      pageWidth: 500,
      pageHeight,
    })

    expect(pageHeight * scale).toBeLessThanOrEqual(containerHeight - 48)
    expect(scale).toBe(0.79)
  })

  it('resolves a page viewport from rendered size when available', () => {
    expect(
      resolvePageViewportSize({
        pageNumber: 2,
        pageSizes: { 2: { pageNumber: 2, width: 720, height: 960 } },
        pageBaseSize: { width: 600, height: 800 },
        scale: 1.5,
      }),
    ).toEqual({ width: 720, height: 960 })
  })

  it('falls back to base page size and scale before the page reports its rendered size', () => {
    expect(
      resolvePageViewportSize({
        pageNumber: 3,
        pageSizes: {},
        pageBaseSize: { width: 600, height: 800 },
        scale: 1.25,
      }),
    ).toEqual({ width: 750, height: 1000 })
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
