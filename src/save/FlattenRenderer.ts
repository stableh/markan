import {
  PDFDocument,
  appendBezierCurve,
  closePath,
  fillAndStroke,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setDashPattern,
  setFillingColor,
  setLineWidth,
  setStrokingColor,
  stroke,
  type PDFPage,
} from 'pdf-lib'
import type { PdfPoint, PdfRect, ShapeKind, ShapeOverlayStyle } from '../overlay/OverlayObject'

export type FlattenTextImage = {
  objectId: string
  pageIndex: number
  frame: PdfRect
  pngData: Uint8Array
}

export type FlattenImage = {
  objectId: string
  pageIndex: number
  frame: PdfRect
  mimeType: 'image/png' | 'image/jpeg'
  data: Uint8Array
  opacity: number
}

export type FlattenHighlight = {
  objectId: string
  pageIndex: number
  rects: PdfRect[]
  color: string
  opacity: number
}

export type FlattenInk = {
  objectId: string
  pageIndex: number
  points: PdfPoint[]
  color: string
  width: number
  opacity: number
}

export type FlattenShape = {
  objectId: string
  pageIndex: number
  kind: ShapeKind
  frame: PdfRect
  start?: PdfPoint
  end?: PdfPoint
  style: ShapeOverlayStyle
}

export type PdfPageSize = {
  width: number
  height: number
}

export type PdfDrawInstruction = {
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  pngData: Uint8Array
}

export const createPdfDrawInstruction = (
  image: FlattenTextImage,
  pageSize: PdfPageSize,
): PdfDrawInstruction => ({
  pageIndex: image.pageIndex,
  x: image.frame.x,
  y: pageSize.height - image.frame.y - image.frame.height,
  width: image.frame.width,
  height: image.frame.height,
  pngData: image.pngData,
})

const hexToRgb = (hexColor: string) => {
  const normalized = hexColor.replace('#', '')
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '000000'

  return rgb(
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  )
}

const clampOpacity = (opacity: number) => Math.max(0, Math.min(1, opacity))
const getDashArray = (style: ShapeOverlayStyle) =>
  style.lineStyle === 'dashed' ? [style.lineWidth * 3, style.lineWidth * 2] : undefined

const ELLIPSE_KAPPA = 0.5522847498

/**
 * Writes a rectangle/ellipse as a real PDF markup annotation (/Square, /Circle) with an
 * appearance stream (/AP /N), instead of baking it into the page content. This keeps the shape
 * selectable / movable / deletable in other PDF apps (Preview, Acrobat). The appearance stream
 * guarantees it renders even in viewers that don't synthesize appearances (e.g. Preview).
 *
 * MarkAn itself still re-edits via the sidecar metadata, so this is purely for interop. Repeated
 * saves don't accumulate because every save rebuilds annotations from the base PDF.
 */
const addShapeAnnotation = (
  pdfDocument: PDFDocument,
  page: PDFPage,
  shape: FlattenShape,
) => {
  const { frame, style } = shape
  const width = Math.max(1, frame.width)
  const height = Math.max(1, frame.height)
  const lineWidth = Math.max(0.1, style.lineWidth)
  const { height: pageHeight } = page.getSize()
  const left = frame.x
  const bottom = pageHeight - frame.y - frame.height
  const strokeColor = hexToRgb(style.strokeColor)
  const fillColor = style.fillColor ? hexToRgb(style.fillColor) : null
  const dashed = style.lineStyle === 'dashed'
  const opacity = clampOpacity(style.opacity)

  const operators = [
    pushGraphicsState(),
    setLineWidth(lineWidth),
    setStrokingColor(strokeColor),
    ...(fillColor ? [setFillingColor(fillColor)] : []),
    ...(dashed ? [setDashPattern([lineWidth * 3, lineWidth * 2], 0)] : []),
  ]

  if (shape.kind === 'ellipse') {
    const cx = width / 2
    const cy = height / 2
    const rx = Math.max(0.1, width / 2 - lineWidth / 2)
    const ry = Math.max(0.1, height / 2 - lineWidth / 2)
    const ox = rx * ELLIPSE_KAPPA
    const oy = ry * ELLIPSE_KAPPA

    operators.push(
      moveTo(cx + rx, cy),
      appendBezierCurve(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry),
      appendBezierCurve(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy),
      appendBezierCurve(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry),
      appendBezierCurve(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy),
      closePath(),
    )
  } else {
    const min = lineWidth / 2
    const right = width - lineWidth / 2
    const top = height - lineWidth / 2
    operators.push(moveTo(min, min), lineTo(right, min), lineTo(right, top), lineTo(min, top), closePath())
  }

  operators.push(fillColor ? fillAndStroke() : stroke(), popGraphicsState())

  const appearance = pdfDocument.context.formXObject(operators, {
    BBox: [0, 0, width, height],
    Resources: {},
  })
  const appearanceRef = pdfDocument.context.register(appearance)

  const annotation = {
    Type: 'Annot',
    Subtype: shape.kind === 'ellipse' ? 'Circle' : 'Square',
    Rect: [left, bottom, left + width, bottom + height],
    C: [strokeColor.red, strokeColor.green, strokeColor.blue],
    CA: opacity,
    BS: dashed
      ? { W: lineWidth, S: 'D', D: [lineWidth * 3, lineWidth * 2] }
      : { W: lineWidth, S: 'S' },
    Border: [0, 0, 0],
    AP: { N: appearanceRef },
    F: 4,
    ...(fillColor ? { IC: [fillColor.red, fillColor.green, fillColor.blue] } : {}),
  }

  const annotationRef = pdfDocument.context.register(pdfDocument.context.obj(annotation))
  page.node.addAnnot(annotationRef)
}

const toPdfPoint = (point: PdfPoint, pageHeight: number) => ({
  x: point.x,
  y: pageHeight - point.y,
})

const drawArrowHead = (
  page: ReturnType<PDFDocument['getPages']>[number],
  start: PdfPoint,
  end: PdfPoint,
  pageHeight: number,
  style: ShapeOverlayStyle,
) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const headLength = Math.max(10, style.lineWidth * 4)
  const spread = Math.PI / 7
  const left = {
    x: end.x - Math.cos(angle - spread) * headLength,
    y: end.y - Math.sin(angle - spread) * headLength,
  }
  const right = {
    x: end.x - Math.cos(angle + spread) * headLength,
    y: end.y - Math.sin(angle + spread) * headLength,
  }
  const lineOptions = {
    thickness: style.lineWidth,
    color: hexToRgb(style.strokeColor),
    opacity: clampOpacity(style.opacity),
  }

  page.drawLine({
    start: toPdfPoint(end, pageHeight),
    end: toPdfPoint(left, pageHeight),
    ...lineOptions,
  })
  page.drawLine({
    start: toPdfPoint(end, pageHeight),
    end: toPdfPoint(right, pageHeight),
    ...lineOptions,
  })
}

export const flattenTextImagesOntoPdf = async (
  basePdfBytes: Uint8Array,
  images: FlattenTextImage[],
  imageOverlays: FlattenImage[] = [],
  highlightOverlays: FlattenHighlight[] = [],
  inkOverlays: FlattenInk[] = [],
  shapeOverlays: FlattenShape[] = [],
) => {
  const pdfDocument = await PDFDocument.load(basePdfBytes)
  const pages = pdfDocument.getPages()

  for (const image of [
    ...images.map((textImage) => ({
      objectId: textImage.objectId,
      pageIndex: textImage.pageIndex,
      frame: textImage.frame,
      mimeType: 'image/png' as const,
      data: textImage.pngData,
      opacity: 1,
    })),
    ...imageOverlays,
  ]) {
    const page = pages[image.pageIndex]

    if (!page) {
      continue
    }

    const embeddedImage =
      image.mimeType === 'image/png'
        ? await pdfDocument.embedPng(image.data)
        : await pdfDocument.embedJpg(image.data)
    const { width, height } = page.getSize()
    const instruction = createPdfDrawInstruction(
      {
        objectId: image.objectId,
        pageIndex: image.pageIndex,
        frame: image.frame,
        pngData: image.data,
      },
      { width, height },
    )

    page.drawImage(embeddedImage, {
      x: instruction.x,
      y: instruction.y,
      width: instruction.width,
      height: instruction.height,
      opacity: clampOpacity(image.opacity),
    })
  }

  for (const highlight of highlightOverlays) {
    const page = pages[highlight.pageIndex]

    if (!page) {
      continue
    }

    const { height } = page.getSize()
    const color = hexToRgb(highlight.color)

    for (const rect of highlight.rects) {
      page.drawRectangle({
        x: rect.x,
        y: height - rect.y - rect.height,
        width: rect.width,
        height: rect.height,
        color,
        opacity: clampOpacity(highlight.opacity),
        borderOpacity: 0,
      })
    }
  }

  for (const ink of inkOverlays) {
    const page = pages[ink.pageIndex]

    if (!page || ink.points.length < 2) {
      continue
    }

    const { height } = page.getSize()
    const color = hexToRgb(ink.color)

    for (let index = 1; index < ink.points.length; index += 1) {
      const start = ink.points[index - 1]
      const end = ink.points[index]

      page.drawLine({
        start: { x: start.x, y: height - start.y },
        end: { x: end.x, y: height - end.y },
        thickness: ink.width,
        color,
        opacity: clampOpacity(ink.opacity),
      })
    }
  }

  for (const shape of shapeOverlays) {
    const page = pages[shape.pageIndex]

    if (!page) {
      continue
    }

    // Rectangle/ellipse become editable native annotations; line/arrow stay flattened for now.
    if (shape.kind === 'rectangle' || shape.kind === 'ellipse') {
      addShapeAnnotation(pdfDocument, page, shape)
      continue
    }

    const { height } = page.getSize()
    const style = shape.style
    const borderColor = hexToRgb(style.strokeColor)
    const opacity = clampOpacity(style.opacity)
    const dashArray = getDashArray(style)

    if (shape.start && shape.end) {
      page.drawLine({
        start: toPdfPoint(shape.start, height),
        end: toPdfPoint(shape.end, height),
        thickness: style.lineWidth,
        color: borderColor,
        opacity,
        dashArray,
      })

      if (shape.kind === 'arrow') {
        drawArrowHead(page, shape.start, shape.end, height, style)
      }
    }
  }

  return pdfDocument.save()
}
