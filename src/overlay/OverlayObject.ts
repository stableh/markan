export type PdfPoint = {
  x: number
  y: number
}

export type PdfRect = PdfPoint & {
  width: number
  height: number
}

export type OverlayObjectType = 'placeholder' | 'text' | 'image' | 'highlight' | 'ink' | 'shape' | 'math'

export type TextAlign = 'left' | 'center' | 'right'
export type TextFontWeight = 300 | 400 | 500 | 600 | 700

export type TextOverlayStyle = {
  fontFamily: string
  fontWeight: TextFontWeight
  fontSize: number
  textColor: string
  backgroundColor: string
  borderColor: string
  padding: number
  textAlign: TextAlign
  letterSpacing: number
  lineHeight: number
  opacity: number
}

export type BaseOverlayObject = {
  id: string
  type: OverlayObjectType
  pageIndex: number
  frame: PdfRect
  zIndex: number
  createdAt: string
  updatedAt: string
}

export type PlaceholderOverlayObject = BaseOverlayObject & {
  type: 'placeholder'
}

export type TextOverlayObject = BaseOverlayObject & {
  type: 'text'
  contentHtml: string
  style: TextOverlayStyle
}

export type ImageMimeType = 'image/png' | 'image/jpeg'

export type ImageOverlayData = {
  fileName: string
  mimeType: ImageMimeType
  data: Uint8Array
  naturalWidth: number
  naturalHeight: number
}

export type ImageOverlayStyle = {
  opacity: number
}

export type ImageOverlayObject = BaseOverlayObject & {
  type: 'image'
  image: ImageOverlayData
  style: ImageOverlayStyle
}

export type HighlightOverlayStyle = {
  color: string
  opacity: number
}

export type HighlightOverlayObject = BaseOverlayObject & {
  type: 'highlight'
  rects: PdfRect[]
  style: HighlightOverlayStyle
}

export type InkOverlayStyle = {
  color: string
  width: number
  opacity: number
}

export type InkOverlayObject = BaseOverlayObject & {
  type: 'ink'
  points: PdfPoint[]
  style: InkOverlayStyle
}

export type ShapeKind = 'rectangle' | 'ellipse' | 'line' | 'arrow'

export type ShapeLineStyle = 'solid' | 'dashed'

export type ShapeOverlayStyle = {
  strokeColor: string
  fillColor: string | null
  lineWidth: number
  lineStyle: ShapeLineStyle
  opacity: number
}

export type ShapeOverlayObject = BaseOverlayObject & {
  type: 'shape'
  kind: ShapeKind
  start?: PdfPoint
  end?: PdfPoint
  style: ShapeOverlayStyle
}

export type MathOverlayObject = BaseOverlayObject & {
  type: 'math'
  latex: string
  displayMode: boolean
  color: string
  backgroundColor: string
  opacity: number
  fontSize: number
}

export type OverlayObject =
  | PlaceholderOverlayObject
  | TextOverlayObject
  | ImageOverlayObject
  | HighlightOverlayObject
  | InkOverlayObject
  | ShapeOverlayObject
  | MathOverlayObject

export type ResizeHandlePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'right'
