import type { PdfPoint, PdfRect } from '@/overlay/OverlayObject'

export type DomPointLike = {
  x: number
  y: number
}

export type DomRectLike = DomPointLike & {
  width: number
  height: number
}

export type PDFPageViewportLike = {
  scale: number
  width: number
  height: number
}

const normalizeViewportRect = (rect: DomRectLike): DomRectLike => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x
  const y = rect.height < 0 ? rect.y + rect.height : rect.y

  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  }
}

export const pdfPointToViewportPoint = (
  point: PdfPoint,
  viewport: PDFPageViewportLike,
): DomPointLike => ({
  x: point.x * viewport.scale,
  y: point.y * viewport.scale,
})

export const viewportPointToPdfPoint = (
  point: DomPointLike,
  viewport: PDFPageViewportLike,
): PdfPoint => ({
  x: point.x / viewport.scale,
  y: point.y / viewport.scale,
})

export const pdfRectToViewportRect = (
  rect: PdfRect,
  viewport: PDFPageViewportLike,
): DomRectLike => ({
  x: rect.x * viewport.scale,
  y: rect.y * viewport.scale,
  width: rect.width * viewport.scale,
  height: rect.height * viewport.scale,
})

export const viewportRectToPdfRect = (
  rect: DomRectLike,
  viewport: PDFPageViewportLike,
): PdfRect => {
  const normalized = normalizeViewportRect(rect)

  return {
    x: normalized.x / viewport.scale,
    y: normalized.y / viewport.scale,
    width: normalized.width / viewport.scale,
    height: normalized.height / viewport.scale,
  }
}

export const clientPointToPagePoint = (
  clientX: number,
  clientY: number,
  pageElement: HTMLElement,
  viewport: PDFPageViewportLike,
): PdfPoint => {
  const bounds = pageElement.getBoundingClientRect()
  return viewportPointToPdfPoint(
    {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    },
    viewport,
  )
}

export const pagePointToClientPoint = (
  point: PdfPoint,
  pageElement: HTMLElement,
  viewport: PDFPageViewportLike,
): DomPointLike => {
  const bounds = pageElement.getBoundingClientRect()
  const viewportPoint = pdfPointToViewportPoint(point, viewport)

  return {
    x: bounds.left + viewportPoint.x,
    y: bounds.top + viewportPoint.y,
  }
}
