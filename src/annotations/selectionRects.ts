import type { PdfRect } from '@/overlay/OverlayObject'

const MIN_RECT_HEIGHT_TO_TRIM = 6
const MAX_VERTICAL_TRIM = 3.5
const VERTICAL_TRIM_RATIO = 0.16
const TOP_TRIM_SHARE = 0.25

const roundRectValue = (value: number) => Math.round(value * 1000) / 1000

export const normalizeSelectionRectForHighlight = (rect: PdfRect): PdfRect => {
  if (rect.height <= MIN_RECT_HEIGHT_TO_TRIM) {
    return rect
  }

  const verticalTrim = Math.min(MAX_VERTICAL_TRIM, rect.height * VERTICAL_TRIM_RATIO)
  const topInset = verticalTrim * TOP_TRIM_SHARE

  return {
    x: roundRectValue(rect.x),
    y: roundRectValue(rect.y + topInset),
    width: roundRectValue(rect.width),
    height: roundRectValue(rect.height - verticalTrim),
  }
}
