import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PdfThumbnail } from './PdfThumbnail'

type ThumbnailRailProps = {
  document: PDFDocumentProxy
  pageNumbers: number[]
  currentPage: number
  onSelectPage: (pageNumber: number) => void
}

// Virtualized thumbnail rail: only the visible thumbnails mount their <canvas> and fire a pdf.js
// render task, so large documents (100s of pages) don't exhaust the browser canvas memory limit
// or flood pdf.js with concurrent renders. Heights vary per page aspect ratio, so we estimate and
// let measureElement correct each row after its thumbnail renders.
//
// This lives in its own component because useVirtualizer returns functions that React Compiler
// can't safely memoize; isolating it keeps the compiler skip scoped here instead of the much
// larger PdfViewer.
export function ThumbnailRail({ document, pageNumbers, currentPage, onSelectPage }: ThumbnailRailProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: pageNumbers.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 210,
    overscan: 6,
  })

  // Keep the active thumbnail visible as the current page changes. The rail is virtualized, so the
  // active thumbnail may be unmounted — scroll by index rather than querying the DOM.
  useEffect(() => {
    virtualizer.scrollToIndex((currentPage || 1) - 1, { align: 'auto' })
  }, [currentPage, virtualizer])

  return (
    <div className="thumbnail-list" ref={listRef}>
      <div
        className="thumbnail-virtual-inner"
        style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const pageNumber = pageNumbers[virtualItem.index]

          return (
            <div
              key={virtualItem.key}
              className="thumbnail-virtual-item"
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <PdfThumbnail
                document={document}
                pageNumber={pageNumber}
                active={pageNumber === currentPage}
                onClick={() => onSelectPage(pageNumber)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
