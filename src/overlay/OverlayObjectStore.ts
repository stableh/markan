import type {
  HighlightOverlayObject,
  HighlightOverlayStyle,
  ImageOverlayData,
  ImageOverlayObject,
  ImageOverlayStyle,
  InkOverlayObject,
  InkOverlayStyle,
  MathOverlayObject,
  OverlayObject,
  PdfPoint,
  PdfRect,
  ResizeHandlePosition,
  ShapeKind,
  ShapeOverlayObject,
  ShapeOverlayStyle,
  TextOverlayObject,
  TextOverlayStyle,
} from './OverlayObject'

export type MathOverlayInput = {
  latex: string
  displayMode: boolean
}

export type MathOverlayStyle = Pick<
  MathOverlayObject,
  'color' | 'backgroundColor' | 'opacity' | 'fontSize'
>

export type AddShapeInput =
  | {
      kind: 'rectangle'
      frame: PdfRect
      style: ShapeOverlayStyle
    }
  | {
      kind: 'ellipse'
      frame: PdfRect
      style: ShapeOverlayStyle
    }
  | {
      kind: 'line'
      start: PdfPoint
      end: PdfPoint
      style: ShapeOverlayStyle
    }
  | {
      kind: 'arrow'
      start: PdfPoint
      end: PdfPoint
      style: ShapeOverlayStyle
    }

export type OverlayObjectStore = {
  objects: OverlayObject[]
  isDirty: boolean
  addPlaceholderObject: (pageIndex: number, frame: PdfRect) => OverlayObjectStore
  addTextObject: (pageIndex: number, frame: PdfRect, style?: Partial<TextOverlayStyle>) => OverlayObjectStore
  addImageObject: (
    pageIndex: number,
    frame: PdfRect,
    image: ImageOverlayData,
    style?: Partial<ImageOverlayStyle>,
  ) => OverlayObjectStore
  addHighlightObject: (
    pageIndex: number,
    rects: PdfRect[],
    style: HighlightOverlayStyle,
  ) => OverlayObjectStore
  addInkObject: (pageIndex: number, points: PdfPoint[], style: InkOverlayStyle) => OverlayObjectStore
  addShapeObject: (pageIndex: number, shape: AddShapeInput) => OverlayObjectStore
  addMathObject: (
    pageIndex: number,
    frame: PdfRect,
    content: MathOverlayInput,
    style?: Partial<MathOverlayStyle>,
  ) => OverlayObjectStore
}

const MIN_OBJECT_SIZE = 24

export const defaultTextOverlayStyle: TextOverlayStyle = {
  fontFamily: 'Pretendard',
  fontWeight: 400,
  fontSize: 16,
  textColor: '#111827',
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  padding: 8,
  textAlign: 'left',
  letterSpacing: 0,
  lineHeight: 1.4,
  opacity: 1,
}

export const defaultImageOverlayStyle: ImageOverlayStyle = {
  opacity: 1,
}

export const defaultMathOverlayStyle: MathOverlayStyle = {
  color: '#111827',
  backgroundColor: 'transparent',
  opacity: 1,
  fontSize: 18,
}

export const defaultShapeOverlayStyle: ShapeOverlayStyle = {
  strokeColor: '#111827',
  fillColor: null,
  lineWidth: 2,
  lineStyle: 'solid',
  opacity: 1,
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createTimestamp = () => new Date().toISOString()

const normalizeFrame = (frame: PdfRect): PdfRect => ({
  x: frame.width < 0 ? frame.x + frame.width : frame.x,
  y: frame.height < 0 ? frame.y + frame.height : frame.y,
  width: Math.max(MIN_OBJECT_SIZE, Math.abs(frame.width)),
  height: Math.max(MIN_OBJECT_SIZE, Math.abs(frame.height)),
})

const normalizeRect = (rect: PdfRect): PdfRect => ({
  x: rect.width < 0 ? rect.x + rect.width : rect.x,
  y: rect.height < 0 ? rect.y + rect.height : rect.y,
  width: Math.abs(rect.width),
  height: Math.abs(rect.height),
})

const getRectBounds = (rects: PdfRect[]): PdfRect => {
  const normalized = rects.map(normalizeRect)
  const minX = Math.min(...normalized.map((rect) => rect.x))
  const minY = Math.min(...normalized.map((rect) => rect.y))
  const maxX = Math.max(...normalized.map((rect) => rect.x + rect.width))
  const maxY = Math.max(...normalized.map((rect) => rect.y + rect.height))

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

const getPointBounds = (points: PdfPoint[]): PdfRect => {
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

const getLineBounds = (start: PdfPoint, end: PdfPoint): PdfRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.max(1, Math.abs(end.x - start.x)),
  height: Math.max(1, Math.abs(end.y - start.y)),
})

const createShapeObject = (
  pageIndex: number,
  shape: AddShapeInput,
  zIndex: number,
): ShapeOverlayObject => {
  const timestamp = createTimestamp()
  const frame =
    shape.kind === 'line' || shape.kind === 'arrow'
      ? getLineBounds(shape.start, shape.end)
      : normalizeFrame(shape.frame)

  return {
    id: createId(),
    type: 'shape',
    pageIndex,
    frame,
    zIndex,
    createdAt: timestamp,
    updatedAt: timestamp,
    kind: shape.kind,
    start: shape.kind === 'line' || shape.kind === 'arrow' ? shape.start : undefined,
    end: shape.kind === 'line' || shape.kind === 'arrow' ? shape.end : undefined,
    style: shape.style,
  }
}

const transformLinePoint = (point: PdfPoint, from: PdfRect, to: PdfRect): PdfPoint => ({
  x: to.x + ((point.x - from.x) / Math.max(1, from.width)) * to.width,
  y: to.y + ((point.y - from.y) / Math.max(1, from.height)) * to.height,
})

const withObject = (
  store: OverlayObjectStore,
  id: string,
  update: (object: OverlayObject) => OverlayObject,
): OverlayObjectStore => ({
  ...store,
  isDirty: true,
  objects: store.objects.map((object) => (object.id === id ? update(object) : object)),
})

export const createOverlayObjectStore = (
  objects: OverlayObject[] = [],
  isDirty = false,
): OverlayObjectStore => ({
  objects,
  isDirty,
  addPlaceholderObject: (pageIndex, frame) => {
    const timestamp = createTimestamp()
    const object: OverlayObject = {
      id: createId(),
      type: 'placeholder',
      pageIndex,
      frame: normalizeFrame(frame),
      zIndex: objects.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    return createOverlayObjectStore([...objects, object], true)
  },
  addTextObject: (pageIndex, frame, style) => {
    const timestamp = createTimestamp()
    const object: TextOverlayObject = {
      id: createId(),
      type: 'text',
      pageIndex,
      frame: normalizeFrame(frame),
      zIndex: objects.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      contentHtml: '',
      style: { ...defaultTextOverlayStyle, ...style },
    }

    return createOverlayObjectStore([...objects, object], true)
  },
  addImageObject: (pageIndex, frame, image, style) => {
    const timestamp = createTimestamp()
    const object: ImageOverlayObject = {
      id: createId(),
      type: 'image',
      pageIndex,
      frame: normalizeFrame(frame),
      zIndex: objects.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      image,
      style: { ...defaultImageOverlayStyle, ...style },
    }

    return createOverlayObjectStore([...objects, object], true)
  },
  addHighlightObject: (pageIndex, rects, style) => {
    const timestamp = createTimestamp()
    const normalizedRects = rects.map(normalizeRect).filter((rect) => rect.width > 0 && rect.height > 0)
    const object: HighlightOverlayObject = {
      id: createId(),
      type: 'highlight',
      pageIndex,
      frame: getRectBounds(normalizedRects),
      zIndex: objects.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      rects: normalizedRects,
      style,
    }

    return createOverlayObjectStore([...objects, object], true)
  },
  addInkObject: (pageIndex, points, style) => {
    const timestamp = createTimestamp()
    const object: InkOverlayObject = {
      id: createId(),
      type: 'ink',
      pageIndex,
      frame: getPointBounds(points),
      zIndex: objects.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      points,
      style,
    }

    return createOverlayObjectStore([...objects, object], true)
  },
  addShapeObject: (pageIndex, shape) =>
    createOverlayObjectStore([...objects, createShapeObject(pageIndex, shape, objects.length)], true),
  addMathObject: (pageIndex, frame, content, style) => {
    const timestamp = createTimestamp()
    const object: MathOverlayObject = {
      id: createId(),
      type: 'math',
      pageIndex,
      frame: normalizeFrame(frame),
      zIndex: objects.length,
      createdAt: timestamp,
      updatedAt: timestamp,
      latex: content.latex,
      displayMode: content.displayMode,
      ...defaultMathOverlayStyle,
      ...style,
    }

    return createOverlayObjectStore([...objects, object], true)
  },
})

export const moveOverlayObject = (
  store: OverlayObjectStore,
  id: string,
  delta: { dx: number; dy: number },
): OverlayObjectStore =>
  withObject(store, id, (object) => {
    const frame = {
      ...object.frame,
      x: object.frame.x + delta.dx,
      y: object.frame.y + delta.dy,
    }

    if (object.type === 'highlight') {
      return {
        ...object,
        frame,
        rects: object.rects.map((rect) => ({
          ...rect,
          x: rect.x + delta.dx,
          y: rect.y + delta.dy,
        })),
        updatedAt: createTimestamp(),
      }
    }

    if (object.type === 'ink') {
      return {
        ...object,
        frame,
        points: object.points.map((point) => ({
          x: point.x + delta.dx,
          y: point.y + delta.dy,
        })),
        updatedAt: createTimestamp(),
      }
    }

    if (object.type === 'shape' && object.start && object.end) {
      return {
        ...object,
        frame,
        start: {
          x: object.start.x + delta.dx,
          y: object.start.y + delta.dy,
        },
        end: {
          x: object.end.x + delta.dx,
          y: object.end.y + delta.dy,
        },
        updatedAt: createTimestamp(),
      }
    }

    return {
      ...object,
      frame,
      updatedAt: createTimestamp(),
    }
  })

export const updateOverlayObjectFrame = (
  store: OverlayObjectStore,
  id: string,
  frame: PdfRect,
): OverlayObjectStore =>
  withObject(store, id, (object) => ({
    ...object,
    frame: normalizeFrame(frame),
    updatedAt: createTimestamp(),
  }))

// Auto-height sync for text objects. Driven by the rendered editor height, so it must NOT
// flip isDirty or create history — it is a derived value, not a user edit.
export const syncTextObjectHeight = (
  store: OverlayObjectStore,
  id: string,
  height: number,
): OverlayObjectStore => {
  const object = getObjectById(store.objects, id)

  if (!object || object.type !== 'text' || Math.abs(object.frame.height - height) < 0.5) {
    return store
  }

  return {
    ...store,
    objects: store.objects.map((current) =>
      current.id === id ? { ...current, frame: { ...current.frame, height } } : current,
    ),
  }
}

export const resizeOverlayObject = (
  store: OverlayObjectStore,
  id: string,
  handle: ResizeHandlePosition,
  delta: { dx: number; dy: number },
): OverlayObjectStore =>
  withObject(store, id, (object) => {
    const frame = object.frame
    let nextFrame: PdfRect = frame
    const preserveAspectRatio = (candidate: PdfRect): PdfRect => {
      if (object.type !== 'image') {
        return candidate
      }

      const aspectRatio = frame.width / frame.height
      const widthDriven = Math.abs(delta.dx) >= Math.abs(delta.dy)
      const nextWidth = widthDriven ? candidate.width : candidate.height * aspectRatio
      const nextHeight = widthDriven ? candidate.width / aspectRatio : candidate.height

      if (handle === 'top-left') {
        return {
          x: frame.x + frame.width - nextWidth,
          y: frame.y + frame.height - nextHeight,
          width: nextWidth,
          height: nextHeight,
        }
      }

      if (handle === 'top-right') {
        return {
          x: frame.x,
          y: frame.y + frame.height - nextHeight,
          width: nextWidth,
          height: nextHeight,
        }
      }

      if (handle === 'bottom-left') {
        return {
          x: frame.x + frame.width - nextWidth,
          y: frame.y,
          width: nextWidth,
          height: nextHeight,
        }
      }

      return {
        x: frame.x,
        y: frame.y,
        width: nextWidth,
        height: nextHeight,
      }
    }

    if (handle === 'top-left') {
      nextFrame = {
        x: frame.x + delta.dx,
        y: frame.y + delta.dy,
        width: frame.width - delta.dx,
        height: frame.height - delta.dy,
      }
    }

    if (handle === 'top-right') {
      nextFrame = {
        x: frame.x,
        y: frame.y + delta.dy,
        width: frame.width + delta.dx,
        height: frame.height - delta.dy,
      }
    }

    if (handle === 'bottom-left') {
      nextFrame = {
        x: frame.x + delta.dx,
        y: frame.y,
        width: frame.width - delta.dx,
        height: frame.height + delta.dy,
      }
    }

    if (handle === 'bottom-right') {
      nextFrame = {
        x: frame.x,
        y: frame.y,
        width: frame.width + delta.dx,
        height: frame.height + delta.dy,
      }
    }

    if (handle === 'left') {
      nextFrame = {
        x: frame.x + delta.dx,
        y: frame.y,
        width: frame.width - delta.dx,
        height: frame.height,
      }
    }

    if (handle === 'right') {
      nextFrame = {
        x: frame.x,
        y: frame.y,
        width: frame.width + delta.dx,
        height: frame.height,
      }
    }

    const normalizedFrame = normalizeFrame(preserveAspectRatio(nextFrame))

    if (object.type === 'shape' && object.start && object.end) {
      return {
        ...object,
        frame: normalizedFrame,
        start: transformLinePoint(object.start, frame, normalizedFrame),
        end: transformLinePoint(object.end, frame, normalizedFrame),
        updatedAt: createTimestamp(),
      }
    }

    return {
      ...object,
      frame: normalizedFrame,
      updatedAt: createTimestamp(),
    }
  })

export const deleteOverlayObject = (
  store: OverlayObjectStore,
  id: string,
): OverlayObjectStore =>
  createOverlayObjectStore(
    store.objects.filter((object) => object.id !== id),
    true,
  )

export type LayerOrderCommand = 'front' | 'back' | 'forward' | 'backward'

export const reorderOverlayObject = (
  store: OverlayObjectStore,
  id: string,
  command: LayerOrderCommand,
): OverlayObjectStore => {
  const target = getObjectById(store.objects, id)

  if (!target) {
    return store
  }

  const pageObjects = store.objects
    .filter((object) => object.pageIndex === target.pageIndex)
    .sort((a, b) => a.zIndex - b.zIndex)
  const index = pageObjects.findIndex((object) => object.id === id)

  if (index === -1) {
    return store
  }

  const lastIndex = pageObjects.length - 1
  let nextIndex = index

  if (command === 'front') {
    nextIndex = lastIndex
  } else if (command === 'back') {
    nextIndex = 0
  } else if (command === 'forward') {
    nextIndex = Math.min(lastIndex, index + 1)
  } else if (command === 'backward') {
    nextIndex = Math.max(0, index - 1)
  }

  if (nextIndex === index) {
    return store
  }

  const reordered = [...pageObjects]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(nextIndex, 0, moved)

  const baseZIndex = Math.min(...pageObjects.map((object) => object.zIndex))
  const zIndexById = new Map(reordered.map((object, position) => [object.id, baseZIndex + position]))
  const timestamp = createTimestamp()

  return createOverlayObjectStore(
    store.objects.map((object) => {
      const nextZIndex = zIndexById.get(object.id)

      if (nextZIndex === undefined || nextZIndex === object.zIndex) {
        return object
      }

      return {
        ...object,
        zIndex: nextZIndex,
        updatedAt: object.id === id ? timestamp : object.updatedAt,
      }
    }),
    true,
  )
}

export const updateTextObjectContent = (
  store: OverlayObjectStore,
  id: string,
  contentHtml: string,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'text'
      ? {
          ...object,
          contentHtml,
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateTextObjectStyle = (
  store: OverlayObjectStore,
  id: string,
  style: Partial<TextOverlayStyle>,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'text'
      ? {
          ...object,
          style: {
            ...object.style,
            ...style,
          },
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateImageObjectStyle = (
  store: OverlayObjectStore,
  id: string,
  style: Partial<ImageOverlayStyle>,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'image'
      ? {
          ...object,
          style: {
            ...object.style,
            ...style,
          },
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateHighlightObjectStyle = (
  store: OverlayObjectStore,
  id: string,
  style: Partial<HighlightOverlayStyle>,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'highlight'
      ? {
          ...object,
          style: {
            ...object.style,
            ...style,
          },
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateInkObjectStyle = (
  store: OverlayObjectStore,
  id: string,
  style: Partial<InkOverlayStyle>,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'ink'
      ? {
          ...object,
          style: {
            ...object.style,
            ...style,
          },
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateShapeObjectStyle = (
  store: OverlayObjectStore,
  id: string,
  style: Partial<ShapeOverlayStyle>,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'shape'
      ? {
          ...object,
          style: {
            ...object.style,
            ...style,
          },
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateMathObjectContent = (
  store: OverlayObjectStore,
  id: string,
  content: MathOverlayInput,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'math'
      ? {
          ...object,
          latex: content.latex,
          displayMode: content.displayMode,
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const updateMathObjectStyle = (
  store: OverlayObjectStore,
  id: string,
  style: Partial<MathOverlayStyle>,
): OverlayObjectStore =>
  withObject(store, id, (object) =>
    object.type === 'math'
      ? {
          ...object,
          ...style,
          updatedAt: createTimestamp(),
        }
      : object,
  )

export const createMathFrame = (origin: PdfPoint, size?: { width: number; height: number }): PdfRect => ({
  x: origin.x,
  y: origin.y,
  width: size?.width ?? 160,
  height: size?.height ?? 48,
})

export const createShapeFrame = (
  start: PdfPoint,
  end: PdfPoint,
  kind: ShapeKind,
  constrain = false,
): AddShapeInput => {
  const width = end.x - start.x
  const height = end.y - start.y

  if (kind === 'line' || kind === 'arrow') {
    let nextEnd = end

    if (constrain) {
      const angle = Math.atan2(height, width)
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
      const distance = Math.hypot(width, height)
      nextEnd = {
        x: start.x + Math.cos(snappedAngle) * distance,
        y: start.y + Math.sin(snappedAngle) * distance,
      }
    }

    return {
      kind,
      start,
      end: nextEnd,
      style: defaultShapeOverlayStyle,
    }
  }

  let nextWidth = width
  let nextHeight = height

  if (constrain) {
    const size = Math.max(Math.abs(width), Math.abs(height))
    nextWidth = Math.sign(width || 1) * size
    nextHeight = Math.sign(height || 1) * size
  }

  return {
    kind,
    frame: {
      x: start.x,
      y: start.y,
      width: nextWidth,
      height: nextHeight,
    },
    style: defaultShapeOverlayStyle,
  }
}

export const isTextContentEmpty = (contentHtml: string) =>
  contentHtml
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim().length === 0

export const deleteEmptyTextObject = (
  store: OverlayObjectStore,
  id: string,
): OverlayObjectStore => {
  const object = getObjectById(store.objects, id)

  if (object?.type !== 'text' || !isTextContentEmpty(object.contentHtml)) {
    return store
  }

  return deleteOverlayObject(store, id)
}

export const getObjectsForPage = (objects: OverlayObject[], pageIndex: number) =>
  objects.filter((object) => object.pageIndex === pageIndex).sort((a, b) => a.zIndex - b.zIndex)

export const getObjectById = (objects: OverlayObject[], id: string | null) =>
  id ? objects.find((object) => object.id === id) ?? null : null

export const createPlaceholderFrame = (origin: PdfPoint): PdfRect => ({
  x: origin.x,
  y: origin.y,
  width: 160,
  height: 96,
})

export const createTextFrame = (origin: PdfPoint): PdfRect => ({
  x: origin.x,
  y: origin.y,
  width: 240,
  // Height auto-fits the content; this is just an initial one-line estimate that the
  // editor measures and corrects via syncTextObjectHeight once rendered.
  height: 40,
})

export const createImageFrame = ({
  pageSize,
  imageSize,
  margin = 40,
}: {
  pageSize: { width: number; height: number }
  imageSize: { width: number; height: number }
  margin?: number
}): PdfRect => {
  const maxWidth = Math.max(1, pageSize.width - margin * 2)
  const maxHeight = Math.max(1, pageSize.height - margin * 2)
  const scale = Math.min(1, maxWidth / imageSize.width, maxHeight / imageSize.height)
  const width = Math.max(1, imageSize.width * scale)
  const height = Math.max(1, imageSize.height * scale)

  return {
    x: Math.max(0, (pageSize.width - width) / 2),
    y: Math.max(0, (pageSize.height - height) / 2),
    width,
    height,
  }
}
