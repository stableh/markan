import { useMemo } from 'react'
import type { MathOverlayObject } from '@/overlay/OverlayObject'
import { MATH_BOX_PADDING, renderMathToHtml } from './MathRenderer'

/**
 * On-screen rendering of a Math Box overlay.
 * KaTeX HTML is sized by the box's font size (PDF units) multiplied by the viewport scale, so
 * it stays aligned at any zoom — exactly like the flattened output, which renders in PDF units.
 * Invalid LaTeX shows the raw source as a fallback so the box never disappears.
 */
export function MathBox({
  object,
  viewportScale,
}: {
  object: MathOverlayObject
  viewportScale: number
}) {
  const rendered = useMemo(
    () => renderMathToHtml(object.latex, object.displayMode),
    [object.latex, object.displayMode],
  )
  const hasContent = object.latex.trim().length > 0
  const fontSize = object.fontSize * viewportScale

  return (
    <div
      className="math-box"
      style={{
        background:
          object.backgroundColor && object.backgroundColor !== 'transparent'
            ? object.backgroundColor
            : 'transparent',
        opacity: object.opacity,
        padding: MATH_BOX_PADDING * viewportScale,
        color: object.color,
      }}
    >
      {hasContent && !rendered.error ? (
        <span
          className="math-box-content"
          style={{ fontSize }}
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
      ) : (
        <span
          className={`math-box-fallback ${rendered.error ? 'math-box-fallback-error' : ''}`}
          style={{ fontSize }}
        >
          {hasContent ? object.latex : '수식'}
        </span>
      )}
    </div>
  )
}
