import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

type PdfThumbnailProps = {
  document: PDFDocumentProxy
  pageNumber: number
  active: boolean
  onClick: () => void
}

const THUMBNAIL_WIDTH = 112

export function PdfThumbnail({ document, pageNumber, active, onClick }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [height, setHeight] = useState(150)

  useEffect(() => {
    let canceled = false
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null

    const renderThumbnail = async () => {
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      const page = await document.getPage(pageNumber)

      if (canceled) {
        return
      }

      const baseViewport = page.getViewport({ scale: 1 })
      const scale = THUMBNAIL_WIDTH / baseViewport.width
      const viewport = page.getViewport({ scale })
      const context = canvas.getContext('2d')

      if (!context) {
        return
      }

      const outputScale = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      setHeight(viewport.height)

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      })

      await renderTask.promise
    }

    void renderThumbnail()

    return () => {
      canceled = true
      renderTask?.cancel()
    }
  }, [document, pageNumber])

  return (
    <button
      type="button"
      className={`thumbnail ${active ? 'thumbnail-active' : ''}`}
      onClick={onClick}
      title={`Go to page ${pageNumber}`}
      style={{ minHeight: height + 34 }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span>{pageNumber}</span>
    </button>
  )
}
