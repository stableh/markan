import { toBlob } from 'html-to-image'
import type { MathOverlayObject } from '@/overlay/OverlayObject'
import type { FlattenTextImage } from '@/save/FlattenRenderer'
import { MATH_BOX_PADDING, renderMathToHtml } from './MathRenderer'

const FLATTEN_PIXEL_RATIO = 2

const resolveBackground = (object: MathOverlayObject) =>
  object.backgroundColor && object.backgroundColor !== 'transparent' ? object.backgroundColor : null

/**
 * Crash-proof fallback: draw the raw LaTeX source as text so a failed render still produces
 * *something* in the saved PDF (and never blocks save). Used when KaTeX fails or html-to-image
 * cannot rasterize the math (e.g. font embedding issues).
 */
const buildFallbackPng = async (object: MathOverlayObject, width: number, height: number) => {
  const scaleFactor = FLATTEN_PIXEL_RATIO
  const canvas = document.createElement('canvas')
  canvas.width = width * scaleFactor
  canvas.height = height * scaleFactor
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas unavailable for math fallback rendering')
  }

  context.scale(scaleFactor, scaleFactor)
  context.globalAlpha = Math.max(0, Math.min(1, object.opacity))

  const background = resolveBackground(object)
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
  }

  context.fillStyle = object.color
  context.font = `${object.fontSize}px ui-monospace, Menlo, monospace`
  context.textBaseline = 'top'
  const padding = MATH_BOX_PADDING
  const text = object.latex.trim() || '(empty)'
  context.fillText(text, padding, padding, Math.max(1, width - padding * 2))

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    throw new Error('Failed to encode math fallback image')
  }

  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Renders a Math Box to a PNG sized to its PDF-coordinate frame, mirroring the on-screen
 * MathBox layout at scale 1 (PDF units = px). The PNG is then drawn into the PDF by the
 * existing FlattenRenderer image path, so repeated saves never accumulate (base + overlays).
 */
export const renderMathObjectToImage = async (
  object: MathOverlayObject,
): Promise<FlattenTextImage> => {
  const width = Math.max(1, Math.ceil(object.frame.width))
  const height = Math.max(1, Math.ceil(object.frame.height))
  const rendered = renderMathToHtml(object.latex, object.displayMode)

  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
    padding: `${MATH_BOX_PADDING}px`,
    color: object.color,
    opacity: String(Math.max(0, Math.min(1, object.opacity))),
  } satisfies Partial<CSSStyleDeclaration>)

  const background = resolveBackground(object)
  if (background) {
    container.style.background = background
  }

  const inner = document.createElement('span')
  inner.style.pointerEvents = 'none'

  if (rendered.error || object.latex.trim().length === 0) {
    inner.textContent = object.latex.trim()
    inner.style.fontFamily = 'ui-monospace, Menlo, monospace'
    inner.style.fontSize = `${object.fontSize}px`
    inner.style.whiteSpace = 'pre-wrap'
  } else {
    inner.innerHTML = rendered.html
    inner.style.fontSize = `${object.fontSize}px`
  }

  container.appendChild(inner)
  document.body.appendChild(container)

  try {
    try {
      await document.fonts.ready
    } catch {
      // Font readiness is best-effort.
    }

    const blob = await toBlob(container, {
      pixelRatio: FLATTEN_PIXEL_RATIO,
      cacheBust: true,
    })

    if (!blob) {
      throw new Error('Math rasterization returned no blob')
    }

    const pngData = new Uint8Array(await blob.arrayBuffer())
    return { objectId: object.id, pageIndex: object.pageIndex, frame: object.frame, pngData }
  } catch (error) {
    console.error('Math flatten via html-to-image failed; using text fallback', error)
    const pngData = await buildFallbackPng(object, width, height)
    return { objectId: object.id, pageIndex: object.pageIndex, frame: object.frame, pngData }
  } finally {
    container.remove()
  }
}

export const renderMathObjectsToImages = (objects: MathOverlayObject[]) =>
  Promise.all(objects.map(renderMathObjectToImage))
