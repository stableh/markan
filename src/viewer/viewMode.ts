export type PageViewMode = 'continuous' | 'single'

export type PageNavigationCommand = 'previous-page' | 'next-page' | 'first-page' | 'last-page'

export type ScrollPosition = {
  left: number
  top: number
}

export const DEFAULT_PAGE_VIEW_MODE: PageViewMode = 'single'

export const clampPageNumber = (pageNumber: number, pageCount: number) =>
  Math.min(Math.max(1, pageNumber), Math.max(1, pageCount))

export const getPageNumberForNavigation = (
  currentPage: number,
  pageCount: number,
  command: PageNavigationCommand,
) => {
  if (command === 'first-page') {
    return 1
  }

  if (command === 'last-page') {
    return Math.max(1, pageCount)
  }

  if (command === 'previous-page') {
    return clampPageNumber(currentPage - 1, pageCount)
  }

  return clampPageNumber(currentPage + 1, pageCount)
}

export const restoreScrollPosition = (
  target: { scrollLeft: number; scrollTop: number },
  position: ScrollPosition,
) => {
  target.scrollLeft = position.left
  target.scrollTop = position.top
}
