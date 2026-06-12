import { pdfRectToViewportRect, type PDFPageViewportLike } from '@/coordinates/PdfCoordinateConverter'
import type { HighlightOverlayObject } from './OverlayObject'

type HighlightLayerProps = {
  objects: HighlightOverlayObject[]
  selectedObjectId: string | null
  viewport: PDFPageViewportLike
}

const colorWithOpacity = (hexColor: string, opacity: number) => {
  const normalized = hexColor.replace('#', '')
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '000000'
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const alpha = Math.max(0, Math.min(1, opacity))

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function HighlightLayer({ objects, selectedObjectId, viewport }: HighlightLayerProps) {
  return (
    <>
      {objects.map((object) => {
        const frameRect = pdfRectToViewportRect(object.frame, viewport)

        return (
          <span key={`${object.id}-selection`} className="highlight-object-frame" style={frameRect}>
            {object.id === selectedObjectId ? <span className="highlight-selection-outline" /> : null}
          </span>
        )
      })}
      {objects.flatMap((object) =>
        object.rects.map((rect, index) => {
          const viewportRect = pdfRectToViewportRect(rect, viewport)

          return (
            <span
              key={`${object.id}-${index}`}
              className="highlight-rect"
              style={{
                left: viewportRect.x,
                top: viewportRect.y,
                width: viewportRect.width,
                height: viewportRect.height,
                backgroundColor: colorWithOpacity(object.style.color, object.style.opacity),
              }}
            />
          )
        }),
      )}
    </>
  )
}
