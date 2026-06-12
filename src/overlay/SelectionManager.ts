import type { OverlayObject, PdfPoint, PdfRect } from './OverlayObject'

export type SelectionState = {
  selectedObjectId: string | null
}

export const selectOverlayObject = (selectedObjectId: string): SelectionState => ({
  selectedObjectId,
})

export const clearSelection = (): SelectionState => ({
  selectedObjectId: null,
})

const isPointInRect = (point: PdfPoint, rect: PdfRect) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

export const findHighlightObjectAtPoint = (
  objects: OverlayObject[],
  pageIndex: number,
  point: PdfPoint,
): string | null => {
  const matchingHighlights = objects
    .filter(
      (object) =>
        object.type === 'highlight' &&
        object.pageIndex === pageIndex &&
        object.rects.some((rect) => isPointInRect(point, rect)),
    )
    .sort((left, right) => right.zIndex - left.zIndex)

  return matchingHighlights[0]?.id ?? null
}
