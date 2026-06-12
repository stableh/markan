import type { OverlayObject, PdfRect } from './OverlayObject'

export type SelectionState = {
  selectedObjectId: string | null
}

export const selectOverlayObject = (selectedObjectId: string): SelectionState => ({
  selectedObjectId,
})

export const clearSelection = (): SelectionState => ({
  selectedObjectId: null,
})

const getRectArea = (rect: PdfRect) => Math.max(0, rect.width) * Math.max(0, rect.height)

const getIntersectionArea = (left: PdfRect, right: PdfRect) => {
  const x1 = Math.max(left.x, right.x)
  const y1 = Math.max(left.y, right.y)
  const x2 = Math.min(left.x + left.width, right.x + right.width)
  const y2 = Math.min(left.y + left.height, right.y + right.height)

  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
}

export const findHighlightObjectIdsOverlappingRects = (
  objects: OverlayObject[],
  pageIndex: number,
  rects: PdfRect[],
  overlapThreshold = 0.6,
): string[] => {
  const matchingHighlightIds = objects
    .filter(
      (object) =>
        object.type === 'highlight' &&
        object.pageIndex === pageIndex &&
        object.rects.some((existingRect) =>
          rects.some((newRect) => {
            const smallerArea = Math.min(getRectArea(existingRect), getRectArea(newRect))

            if (smallerArea <= 0) {
              return false
            }

            return getIntersectionArea(existingRect, newRect) / smallerArea >= overlapThreshold
          }),
        ),
    )
    .sort((left, right) => right.zIndex - left.zIndex)
    .map((object) => object.id)

  return Array.from(new Set(matchingHighlightIds))
}
