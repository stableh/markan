export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4
export const ZOOM_STEP = 0.1
export const VIEWER_HORIZONTAL_PADDING = 80
export const FIT_PAGE_VERTICAL_CHROME = 96

export type ZoomDirection = 'in' | 'out'

export type FitWidthInput = {
  containerWidth: number
  pageWidth: number
}

export type FitPageInput = FitWidthInput & {
  containerHeight: number
  pageHeight: number
}

export type PagePosition = {
  pageNumber: number
  top: number
  height: number
}

export type VisiblePageInput = {
  scrollTop: number
  viewportHeight: number
  pages: PagePosition[]
}

const roundZoom = (value: number) => Math.round(value * 100) / 100

export const clampZoom = (value: number) => {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, roundZoom(value)))
}

export const getNextZoom = (currentZoom: number, direction: ZoomDirection) => {
  const delta = direction === 'in' ? ZOOM_STEP : -ZOOM_STEP
  return clampZoom(currentZoom + delta)
}

export const resolveFitWidthScale = ({ containerWidth, pageWidth }: FitWidthInput) => {
  if (containerWidth <= 0 || pageWidth <= 0) {
    return 1
  }

  return clampZoom((containerWidth - VIEWER_HORIZONTAL_PADDING) / pageWidth)
}

export const resolveFitPageScale = ({
  containerWidth,
  containerHeight,
  pageWidth,
  pageHeight,
}: FitPageInput) => {
  if (containerWidth <= 0 || containerHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return 1
  }

  const widthScale = (containerWidth - VIEWER_HORIZONTAL_PADDING) / pageWidth
  const heightScale = (containerHeight - FIT_PAGE_VERTICAL_CHROME) / pageHeight
  return clampZoom(Math.min(widthScale, heightScale))
}

export const getVisiblePageNumber = ({ scrollTop, viewportHeight, pages }: VisiblePageInput) => {
  if (pages.length === 0) {
    return 0
  }

  const viewportCenter = scrollTop + viewportHeight / 2
  return pages.reduce((closest, page) => {
    const closestDistance = Math.abs(closest.top + closest.height / 2 - viewportCenter)
    const pageDistance = Math.abs(page.top + page.height / 2 - viewportCenter)
    return pageDistance < closestDistance ? page : closest
  }).pageNumber
}
