export type PageViewMode = 'continuous' | 'single'

export type PageNavigationCommand = 'previous-page' | 'next-page' | 'first-page' | 'last-page'

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
