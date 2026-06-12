import type { PdfRect } from '@/overlay/OverlayObject'

const MIN_INTERSECTION_WIDTH = 0.75
const MIN_INTERSECTION_HEIGHT = 1
const MAX_VERTICAL_PADDING = 1.5
const VERTICAL_PADDING_RATIO = 0.05
const MAX_VERTICAL_OFFSET = 2
const VERTICAL_OFFSET_RATIO = 0.15
const LEFT_HORIZONTAL_EXTENSION = 1
const SAME_LINE_CENTER_TOLERANCE = 3
const SAME_LINE_OVERLAP_RATIO = 0.5

type HighlightRectInput = {
  selectionRects: PdfRect[]
  spanRects: PdfRect[]
}

const roundRectValue = (value: number) => Math.round(value * 1000) / 1000

const getRectBottom = (rect: PdfRect) => rect.y + rect.height

const getRectRight = (rect: PdfRect) => rect.x + rect.width

const getRectCenterY = (rect: PdfRect) => rect.y + rect.height / 2

const getVerticalOverlap = (a: PdfRect, b: PdfRect) =>
  Math.max(0, Math.min(getRectBottom(a), getRectBottom(b)) - Math.max(a.y, b.y))

const getIntersectionRect = (a: PdfRect, b: PdfRect): PdfRect | null => {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(getRectRight(a), getRectRight(b))
  const bottom = Math.min(getRectBottom(a), getRectBottom(b))
  const width = right - x
  const height = bottom - y

  if (width < MIN_INTERSECTION_WIDTH || height < MIN_INTERSECTION_HEIGHT) {
    return null
  }

  return { x, y, width, height }
}

const addSoftVerticalPadding = (rect: PdfRect): PdfRect => {
  const padding = Math.min(MAX_VERTICAL_PADDING, rect.height * VERTICAL_PADDING_RATIO)
  const verticalOffset = Math.min(MAX_VERTICAL_OFFSET, rect.height * VERTICAL_OFFSET_RATIO)
  const leftHorizontalExtension = Math.min(LEFT_HORIZONTAL_EXTENSION, rect.width / 4)

  return {
    x: rect.x - leftHorizontalExtension,
    y: rect.y - padding - verticalOffset,
    width: rect.width + leftHorizontalExtension,
    height: rect.height + padding * 2,
  }
}

const isSameLineRect = (a: PdfRect, b: PdfRect) => {
  const centerDistance = Math.abs(getRectCenterY(a) - getRectCenterY(b))
  const overlap = getVerticalOverlap(a, b)
  const minHeight = Math.min(a.height, b.height)

  return centerDistance <= SAME_LINE_CENTER_TOLERANCE || overlap / minHeight >= SAME_LINE_OVERLAP_RATIO
}

const mergeRectsOnSameLine = (rects: PdfRect[]) => {
  const sortedRects = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const mergedRects: PdfRect[] = []

  for (const rect of sortedRects) {
    const currentLine = mergedRects[mergedRects.length - 1]

    if (!currentLine || !isSameLineRect(currentLine, rect)) {
      mergedRects.push({ ...rect })
      continue
    }

    const x = Math.min(currentLine.x, rect.x)
    const y = Math.min(currentLine.y, rect.y)
    const right = Math.max(getRectRight(currentLine), getRectRight(rect))
    const bottom = Math.max(getRectBottom(currentLine), getRectBottom(rect))

    mergedRects[mergedRects.length - 1] = {
      x,
      y,
      width: right - x,
      height: bottom - y,
    }
  }

  return mergedRects
}

const roundRect = (rect: PdfRect): PdfRect => ({
  x: roundRectValue(rect.x),
  y: roundRectValue(rect.y),
  width: roundRectValue(rect.width),
  height: roundRectValue(rect.height),
})

export const buildHighlightRectsFromTextIntersections = ({
  selectionRects,
  spanRects,
}: HighlightRectInput): PdfRect[] => {
  const intersectionRects: PdfRect[] = []

  for (const selectionRect of selectionRects) {
    for (const spanRect of spanRects) {
      const intersectionRect = getIntersectionRect(selectionRect, spanRect)

      if (intersectionRect) {
        intersectionRects.push(addSoftVerticalPadding(intersectionRect))
      }
    }
  }

  return mergeRectsOnSameLine(intersectionRects).map(roundRect)
}
