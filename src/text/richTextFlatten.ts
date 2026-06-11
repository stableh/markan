import type { TextAlign, TextOverlayObject, TextOverlayStyle } from '../overlay/OverlayObject'
import type { FlattenTextImage } from '../save/FlattenRenderer'

const FLATTEN_SCALE = 2
type TextSegment = {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
}

type TextBlock = {
  segments: TextSegment[]
  listKind: 'bullet' | 'number' | null
  listIndex: number | null
}

type LaidOutSegment = TextSegment & {
  x: number
  width: number
}

const clampOpacity = (opacity: number) => Math.max(0, Math.min(1, opacity))

const getFontFamily = (style: TextOverlayStyle) =>
  `"${style.fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

const getFont = (segment: Pick<TextSegment, 'bold' | 'italic'>, fontSize: number, style: TextOverlayStyle) => {
  const weight = segment.bold ? 700 : style.fontWeight
  return `${segment.italic ? 'italic ' : ''}${weight} ${fontSize}px ${getFontFamily(style)}`
}

const getTextWidth = (
  context: CanvasRenderingContext2D,
  text: string,
  segment: TextSegment,
  fontSize: number,
  style: TextOverlayStyle,
) => {
  context.font = getFont(segment, fontSize, style)
  return context.measureText(text).width + Math.max(0, text.length - 1) * style.letterSpacing
}

const normalizeText = (text: string) => text.replace(/\s+/g, ' ')

const collectSegments = (
  node: Node,
  inherited: Omit<TextSegment, 'text'>,
): TextSegment[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeText(node.textContent ?? '')
    return text ? [{ ...inherited, text }] : []
  }

  if (!(node instanceof HTMLElement)) {
    return []
  }

  const tagName = node.tagName.toLowerCase()
  const nextStyle = {
    bold: inherited.bold || tagName === 'strong' || tagName === 'b',
    italic: inherited.italic || tagName === 'em' || tagName === 'i',
    underline: inherited.underline || tagName === 'u',
    strike: inherited.strike || tagName === 's' || tagName === 'strike',
  }

  return Array.from(node.childNodes).flatMap((child) => collectSegments(child, nextStyle))
}

const getParagraphBlocks = (root: Document): TextBlock[] => {
  const blocks: TextBlock[] = []

  root.querySelectorAll('p').forEach((paragraph) => {
    if (paragraph.closest('li')) {
      return
    }

    blocks.push({
      segments: collectSegments(paragraph, {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
      }),
      listKind: null,
      listIndex: null,
    })
  })

  root.querySelectorAll('ul, ol').forEach((list) => {
    const ordered = list.tagName.toLowerCase() === 'ol'
    Array.from(list.children).forEach((item, index) => {
      blocks.push({
        segments: collectSegments(item, {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
        }),
        listKind: ordered ? 'number' : 'bullet',
        listIndex: ordered ? index + 1 : null,
      })
    })
  })

  return blocks.length > 0
    ? blocks
    : [
        {
          segments: [],
          listKind: null,
          listIndex: null,
        },
      ]
}

const createBlocks = (contentHtml: string) =>
  getParagraphBlocks(new DOMParser().parseFromString(contentHtml || '<p></p>', 'text/html'))

const splitWords = (segments: TextSegment[]) =>
  segments.flatMap((segment) =>
    segment.text
      .split(/(\s+)/)
      .filter(Boolean)
      .map((text) => ({ ...segment, text })),
  )

const getLineWidth = (line: LaidOutSegment[]) =>
  line.reduce((total, segment) => total + segment.width, 0)

const alignLine = (
  line: LaidOutSegment[],
  align: TextAlign,
  startX: number,
  availableWidth: number,
) => {
  const width = getLineWidth(line)
  const offset =
    align === 'center' ? Math.max(0, (availableWidth - width) / 2) : align === 'right' ? Math.max(0, availableWidth - width) : 0
  let x = startX + offset

  return line.map((segment) => {
    const nextSegment = { ...segment, x }
    x += segment.width
    return nextSegment
  })
}

const drawDecoration = (
  context: CanvasRenderingContext2D,
  segment: LaidOutSegment,
  baseline: number,
  fontSize: number,
) => {
  if (!segment.underline && !segment.strike) {
    return
  }

  context.beginPath()
  context.lineWidth = Math.max(1, fontSize / 14)

  if (segment.underline) {
    const y = baseline + fontSize * 0.12
    context.moveTo(segment.x, y)
    context.lineTo(segment.x + segment.width, y)
  }

  if (segment.strike) {
    const y = baseline - fontSize * 0.35
    context.moveTo(segment.x, y)
    context.lineTo(segment.x + segment.width, y)
  }

  context.stroke()
}

const drawText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  letterSpacing: number,
) => {
  if (letterSpacing === 0 || text.length <= 1) {
    context.fillText(text, x, baseline)
    return
  }

  let nextX = x
  for (const character of text) {
    context.fillText(character, nextX, baseline)
    nextX += context.measureText(character).width + letterSpacing
  }
}

export const renderRichTextObjectToImage = async (
  object: TextOverlayObject,
): Promise<FlattenTextImage> => {
  const width = Math.max(1, Math.ceil(object.frame.width))
  const height = Math.max(1, Math.ceil(object.frame.height))
  const canvas = document.createElement('canvas')
  canvas.width = width * FLATTEN_SCALE
  canvas.height = height * FLATTEN_SCALE
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas unavailable for PDF export')
  }

  const style = object.style
  const fontSize = style.fontSize
  const lineHeight = fontSize * style.lineHeight
  const padding = style.padding
  const contentX = padding
  const contentY = padding
  const contentWidth = Math.max(1, width - padding * 2)
  const markerWidth = fontSize * 1.4

  context.scale(FLATTEN_SCALE, FLATTEN_SCALE)
  context.globalAlpha = clampOpacity(style.opacity)

  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    context.fillStyle = style.backgroundColor
    context.fillRect(0, 0, width, height)
  }

  if (style.borderColor && style.borderColor !== 'transparent') {
    context.strokeStyle = style.borderColor
    context.lineWidth = 1
    context.strokeRect(0.5, 0.5, width - 1, height - 1)
  }

  context.fillStyle = style.textColor
  context.strokeStyle = style.textColor
  context.textBaseline = 'alphabetic'

  let baseline = contentY + fontSize

  for (const block of createBlocks(object.contentHtml)) {
    if (baseline > height - padding) {
      break
    }

    const marker =
      block.listKind === 'bullet' ? '•' : block.listKind === 'number' ? `${block.listIndex ?? 1}.` : ''
    const lineStartX = marker ? contentX + markerWidth : contentX
    const lineWidth = marker ? Math.max(1, contentWidth - markerWidth) : contentWidth
    const words = splitWords(block.segments)
    let currentLine: LaidOutSegment[] = []
    const flushLine = () => {
      if (currentLine.length === 0) {
        baseline += lineHeight
        return
      }

      const alignedLine = alignLine(currentLine, style.textAlign, lineStartX, lineWidth)

      if (marker) {
        context.font = getFont({ bold: false, italic: false }, fontSize, style)
        drawText(context, marker, contentX, baseline, style.letterSpacing)
      }

      for (const segment of alignedLine) {
        context.font = getFont(segment, fontSize, style)
        context.fillStyle = style.textColor
        context.strokeStyle = style.textColor
        drawText(context, segment.text, segment.x, baseline, style.letterSpacing)
        drawDecoration(context, segment, baseline, fontSize)
      }

      currentLine = []
      baseline += lineHeight
    }

    for (const word of words) {
      const wordWidth = getTextWidth(context, word.text, word, fontSize, style)
      const nextWidth = getLineWidth(currentLine) + wordWidth

      if (currentLine.length > 0 && nextWidth > lineWidth) {
        flushLine()
      }

      currentLine.push({ ...word, x: 0, width: wordWidth })
    }

    flushLine()
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result)
      } else {
        reject(new Error('Failed to encode rich text image'))
      }
    }, 'image/png')
  })

  return {
    objectId: object.id,
    pageIndex: object.pageIndex,
    frame: object.frame,
    pngData: new Uint8Array(await blob.arrayBuffer()),
  }
}

export const renderRichTextObjectsToImages = (objects: TextOverlayObject[]) =>
  Promise.all(objects.map(renderRichTextObjectToImage))
