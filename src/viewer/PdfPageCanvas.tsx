import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TextLayer } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

type PdfPageCanvasProps = {
  document: PDFDocumentProxy
  pageNumber: number
  scale: number
  children?: ReactNode
  // Known/estimated page size, applied as a min-size so the surface reserves its space
  // immediately on mount. Without this, a freshly mounted page collapses to the bare <canvas>
  // default (~300x150) until the async render finishes — which makes the scroll container shrink
  // and clamps any scroll-position restore (e.g. single-page navigation while zoomed in).
  reservedSize?: { width: number; height: number } | null
  onSizeChange: (pageNumber: number, size: { width: number; height: number }) => void
}

export function PdfPageCanvas({
  children,
  document,
  pageNumber,
  scale,
  reservedSize,
  onSizeChange,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textLayerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null

    const renderPage = async () => {
      setError(null)
      const canvas = canvasRef.current

      if (!canvas) {
        return
      }

      try {
        const page = await document.getPage(pageNumber)

        if (canceled) {
          return
        }

        const viewport = page.getViewport({ scale })
        const context = canvas.getContext('2d')

        if (!context) {
          setError('Canvas unavailable')
          return
        }

        const outputScale = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        onSizeChange(pageNumber, { width: viewport.width, height: viewport.height })

        const textLayerElement = textLayerRef.current

        if (textLayerElement) {
          textLayerElement.replaceChildren()
          textLayerElement.style.width = `${viewport.width}px`
          textLayerElement.style.height = `${viewport.height}px`
          textLayerElement.style.setProperty('--scale-factor', String(scale))
          textLayerElement.style.setProperty('--total-scale-factor', String(scale))
        }

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        })

        const textLayerTask = textLayerElement
          ? new TextLayer({
              textContentSource: await page.getTextContent(),
              container: textLayerElement,
              viewport,
            })
          : null

        await Promise.all([renderTask.promise, textLayerTask?.render()])
      } catch (renderError) {
        if (!canceled && !(renderError instanceof Error && renderError.name === 'RenderingCancelledException')) {
          setError(renderError instanceof Error ? renderError.message : 'Page render failed')
        }
      }
    }

    void renderPage()

    return () => {
      canceled = true
      renderTask?.cancel()
    }
  }, [document, onSizeChange, pageNumber, scale])

  return (
    <section className="pdf-page" data-page-number={pageNumber}>
      {error ? <div className="pdf-page-error">{error}</div> : null}
      <div
        className="pdf-page-surface"
        style={
          reservedSize ? { minWidth: reservedSize.width, minHeight: reservedSize.height } : undefined
        }
      >
        <canvas ref={canvasRef} aria-label={`Page ${pageNumber}`} />
        <div ref={textLayerRef} className="textLayer pdf-text-layer" />
        {children}
      </div>
    </section>
  )
}
