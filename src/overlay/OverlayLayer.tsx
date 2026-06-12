import { useEffect, useMemo, useRef, useState } from 'react'
import {
  clientPointToPagePoint,
  pdfRectToViewportRect,
  type PDFPageViewportLike,
} from '@/coordinates/PdfCoordinateConverter'
import {
  RichTextBox,
  type RichTextEditorHandle,
  type RichTextEditorState,
} from '@/text/RichTextBox'
import { MathBox } from '@/math/MathBox'
import type { EditorTool } from '@/tools/EditorTool'
import type {
  ImageOverlayObject,
  InkOverlayObject,
  OverlayObject,
  PdfPoint,
  ResizeHandlePosition,
  ShapeKind,
  ShapeOverlayObject,
  ShapeOverlayStyle,
  TextOverlayObject,
} from './OverlayObject'

type DragState =
  | {
      type: 'move'
      objectId: string
      duplicateSourceId?: string
      lastPoint: PdfPoint
    }
  | {
      type: 'resize'
      objectId: string
      handle: ResizeHandlePosition
      lastPoint: PdfPoint
    }

type OverlayLayerProps = {
  activeTool: EditorTool
  objects: OverlayObject[]
  pageIndex: number
  selectedObjectId: string | null
  editingObjectId: string | null
  inkDraftStyle: { color: string; width: number; opacity: number }
  shapeDraftStyle: ShapeOverlayStyle
  viewport: PDFPageViewportLike
  onClearSelection: () => void
  onCreatePlaceholder: (pageIndex: number, origin: PdfPoint) => void
  onCreateText: (pageIndex: number, origin: PdfPoint) => void
  onCreateInk: (pageIndex: number, points: PdfPoint[]) => void
  onCreateShape: (pageIndex: number, kind: ShapeKind, start: PdfPoint, end: PdfPoint, constrain: boolean) => void
  onCreateMath: (pageIndex: number, origin: PdfPoint) => void
  onBeginMathEdit: (objectId: string) => void
  onBeginTextEdit: (objectId: string) => void
  onChangeTextContent: (objectId: string, contentHtml: string) => void
  onCommitTextContent: (objectId: string, contentHtml: string) => void
  onDeleteEmptyText: (objectId: string) => void
  onSyncTextHeight: (objectId: string, height: number) => void
  onFinishTextEdit: () => void
  onRegisterTextEditor: (handle: RichTextEditorHandle | null) => void
  onTextEditorStateChange: (state: RichTextEditorState) => void
  onMoveObject: (objectId: string, delta: { dx: number; dy: number }) => void
  onDuplicateObject: (objectId: string) => string | null
  onResizeObject: (
    objectId: string,
    handle: ResizeHandlePosition,
    delta: { dx: number; dy: number },
  ) => void
  onSelectObject: (objectId: string) => void
}

const resizeHandles: ResizeHandlePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
// Text boxes auto-fit their height to the content, so only the width is adjustable.
const sideResizeHandles: ResizeHandlePosition[] = ['left', 'right']

const getHandleClassName = (handle: ResizeHandlePosition) => `resize-handle resize-handle-${handle}`

const getDelta = (current: PdfPoint, previous: PdfPoint) => ({
  dx: current.x - previous.x,
  dy: current.y - previous.y,
})

const getPointFromEvent = (
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
  layerElement: HTMLElement,
  viewport: PDFPageViewportLike,
) => clientPointToPagePoint(event.clientX, event.clientY, layerElement, viewport)

const bytesToArrayBuffer = (bytes: Uint8Array) => {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function ImageOverlayView({ object }: { object: ImageOverlayObject }) {
  const imageUrl = useMemo(() => {
    const blob = new Blob([bytesToArrayBuffer(object.image.data)], { type: object.image.mimeType })
    return URL.createObjectURL(blob)
  }, [object.image.data, object.image.mimeType])

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl])

  return (
    <img
      alt={object.image.fileName}
      className="overlay-image"
      draggable={false}
      src={imageUrl}
      style={{ opacity: object.style.opacity }}
    />
  )
}

function TextOverlayView({
  object,
  editing,
  scale,
  onHeightChange,
  onChangeContent,
  onCommitContent,
  onDeleteIfEmpty,
  onFinishEditing,
  onRegisterEditor,
  onEditorStateChange,
}: {
  object: TextOverlayObject
  editing: boolean
  scale: number
  onHeightChange: (objectId: string, height: number) => void
  onChangeContent: (objectId: string, contentHtml: string) => void
  onCommitContent: (objectId: string, contentHtml: string) => void
  onDeleteIfEmpty: (objectId: string) => void
  onFinishEditing: () => void
  onRegisterEditor: (handle: RichTextEditorHandle | null) => void
  onEditorStateChange: (state: RichTextEditorState) => void
}) {
  const measureRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = measureRef.current

    if (!element) {
      return
    }

    const report = () => onHeightChange(object.id, element.offsetHeight / scale)
    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [object.id, scale, onHeightChange])

  return (
    <div ref={measureRef} className="text-overlay-measure">
      <RichTextBox
        object={object}
        editing={editing}
        scale={scale}
        onChangeContent={onChangeContent}
        onCommitContent={onCommitContent}
        onDeleteIfEmpty={onDeleteIfEmpty}
        onFinishEditing={onFinishEditing}
        onRegisterEditor={onRegisterEditor}
        onEditorStateChange={onEditorStateChange}
      />
    </div>
  )
}

const getInkSvgGeometry = (object: InkOverlayObject, viewport: PDFPageViewportLike) => {
  const frameRect = pdfRectToViewportRect(object.frame, viewport)
  const points = object.points.map((point) => ({
    x: point.x * viewport.scale - frameRect.x,
    y: point.y * viewport.scale - frameRect.y,
  }))

  return {
    points,
    width: Math.max(1, frameRect.width),
    height: Math.max(1, frameRect.height),
  }
}

function InkOverlayView({ object, viewport }: { object: InkOverlayObject; viewport: PDFPageViewportLike }) {
  const geometry = getInkSvgGeometry(object, viewport)
  const points = geometry.points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <svg className="ink-svg" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={object.style.color}
        strokeWidth={object.style.width * viewport.scale}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={object.style.opacity}
      />
    </svg>
  )
}

const shapeTools: ShapeKind[] = ['rectangle', 'ellipse', 'line', 'arrow']
const isShapeTool = (tool: EditorTool): tool is ShapeKind => shapeTools.includes(tool as ShapeKind)

const getConstrainedShapeEnd = (
  start: PdfPoint,
  end: PdfPoint,
  kind: ShapeKind,
  constrain: boolean,
): PdfPoint => {
  if (!constrain) {
    return end
  }

  const width = end.x - start.x
  const height = end.y - start.y

  if (kind === 'line' || kind === 'arrow') {
    const angle = Math.atan2(height, width)
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
    const distance = Math.hypot(width, height)

    return {
      x: start.x + Math.cos(snappedAngle) * distance,
      y: start.y + Math.sin(snappedAngle) * distance,
    }
  }

  const size = Math.max(Math.abs(width), Math.abs(height))

  return {
    x: start.x + Math.sign(width || 1) * size,
    y: start.y + Math.sign(height || 1) * size,
  }
}

const getShapeFrameFromPoints = (start: PdfPoint, end: PdfPoint) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.max(1, Math.abs(end.x - start.x)),
  height: Math.max(1, Math.abs(end.y - start.y)),
})

const getShapeDraftGeometry = (draft: {
  kind: ShapeKind
  start: PdfPoint
  end: PdfPoint
  constrain: boolean
}) => {
  const end = getConstrainedShapeEnd(draft.start, draft.end, draft.kind, draft.constrain)

  if (draft.kind === 'line' || draft.kind === 'arrow') {
    return {
      frame: getShapeFrameFromPoints(draft.start, end),
      start: draft.start,
      end,
    }
  }

  return {
    frame: getShapeFrameFromPoints(draft.start, end),
    start: undefined,
    end: undefined,
  }
}

const getArrowHeadPoints = (start: { x: number; y: number }, end: { x: number; y: number }, lineWidth: number) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const headLength = Math.max(10, lineWidth * 4)
  const spread = Math.PI / 7

  return [
    {
      x: end.x - Math.cos(angle - spread) * headLength,
      y: end.y - Math.sin(angle - spread) * headLength,
    },
    {
      x: end.x - Math.cos(angle + spread) * headLength,
      y: end.y - Math.sin(angle + spread) * headLength,
    },
  ]
}

const getRelativeLinePoints = (
  frame: { x: number; y: number },
  start: PdfPoint | undefined,
  end: PdfPoint | undefined,
  viewport: PDFPageViewportLike,
) => ({
  start: {
    x: ((start?.x ?? frame.x) - frame.x) * viewport.scale,
    y: ((start?.y ?? frame.y) - frame.y) * viewport.scale,
  },
  end: {
    x: ((end?.x ?? frame.x) - frame.x) * viewport.scale,
    y: ((end?.y ?? frame.y) - frame.y) * viewport.scale,
  },
})

function ShapeSvg({
  kind,
  frame,
  start,
  end,
  style,
  viewport,
}: {
  kind: ShapeKind
  frame: { x: number; y: number; width: number; height: number }
  start?: PdfPoint
  end?: PdfPoint
  style: ShapeOverlayStyle
  viewport: PDFPageViewportLike
}) {
  const viewportFrame = pdfRectToViewportRect(frame, viewport)
  const width = Math.max(1, viewportFrame.width)
  const height = Math.max(1, viewportFrame.height)
  const strokeWidth = Math.max(1, style.lineWidth * viewport.scale)
  const dashArray = style.lineStyle === 'dashed' ? `${strokeWidth * 3} ${strokeWidth * 2}` : undefined
  const commonProps = {
    stroke: style.strokeColor,
    strokeWidth,
    strokeDasharray: dashArray,
    opacity: style.opacity,
    vectorEffect: 'non-scaling-stroke' as const,
  }

  if (kind === 'rectangle') {
    return (
      <svg className="shape-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(1, width - strokeWidth)}
          height={Math.max(1, height - strokeWidth)}
          fill={style.fillColor ?? 'none'}
          {...commonProps}
        />
      </svg>
    )
  }

  if (kind === 'ellipse') {
    return (
      <svg className="shape-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={Math.max(1, width / 2 - strokeWidth / 2)}
          ry={Math.max(1, height / 2 - strokeWidth / 2)}
          fill={style.fillColor ?? 'none'}
          {...commonProps}
        />
      </svg>
    )
  }

  const points = getRelativeLinePoints(frame, start, end, viewport)
  const [arrowLeft, arrowRight] = getArrowHeadPoints(points.start, points.end, strokeWidth)

  return (
    <svg className="shape-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line
        x1={points.start.x}
        y1={points.start.y}
        x2={points.end.x}
        y2={points.end.y}
        fill="none"
        strokeLinecap="round"
        {...commonProps}
      />
      {kind === 'arrow' ? (
        <>
          <line x1={points.end.x} y1={points.end.y} x2={arrowLeft.x} y2={arrowLeft.y} strokeLinecap="round" {...commonProps} />
          <line x1={points.end.x} y1={points.end.y} x2={arrowRight.x} y2={arrowRight.y} strokeLinecap="round" {...commonProps} />
        </>
      ) : null}
    </svg>
  )
}

function ShapeOverlayView({ object, viewport }: { object: ShapeOverlayObject; viewport: PDFPageViewportLike }) {
  return (
    <ShapeSvg
      kind={object.kind}
      frame={object.frame}
      start={object.start}
      end={object.end}
      style={object.style}
      viewport={viewport}
    />
  )
}

export function OverlayLayer({
  activeTool,
  objects,
  pageIndex,
  selectedObjectId,
  editingObjectId,
  inkDraftStyle,
  shapeDraftStyle,
  viewport,
  onClearSelection,
  onCreatePlaceholder,
  onCreateText,
  onCreateInk,
  onCreateShape,
  onCreateMath,
  onBeginMathEdit,
  onBeginTextEdit,
  onChangeTextContent,
  onCommitTextContent,
  onDeleteEmptyText,
  onSyncTextHeight,
  onFinishTextEdit,
  onRegisterTextEditor,
  onTextEditorStateChange,
  onMoveObject,
  onDuplicateObject,
  onResizeObject,
  onSelectObject,
}: OverlayLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  // Manual double-click detection: a drag start calls preventDefault() on pointerdown, which
  // suppresses the native dblclick in the Select tool. We detect a quick second press here so
  // double-click-to-edit works regardless of tool or selection state.
  const lastPointerDownRef = useRef<{ id: string; time: number } | null>(null)
  const [inkDraft, setInkDraft] = useState<PdfPoint[] | null>(null)
  const [shapeDraft, setShapeDraft] = useState<{
    kind: ShapeKind
    start: PdfPoint
    end: PdfPoint
    constrain: boolean
  } | null>(null)

  const startDrag = (event: React.PointerEvent, dragState: DragState) => {
    event.preventDefault()
    event.stopPropagation()
    dragStateRef.current = dragState

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const layer = layerRef.current
      const dragState = dragStateRef.current

      if (!layer || !dragState) {
        return
      }

      const currentPoint = getPointFromEvent(pointerEvent, layer, viewport)
      const delta = getDelta(currentPoint, dragState.lastPoint)

      if (dragState.type === 'move') {
        const objectId = dragState.duplicateSourceId
          ? onDuplicateObject(dragState.duplicateSourceId)
          : dragState.objectId

        if (!objectId) {
          return
        }

        onMoveObject(objectId, delta)
        dragStateRef.current = {
          ...dragState,
          objectId,
          duplicateSourceId: undefined,
          lastPoint: currentPoint,
        }
        return
      } else {
        onResizeObject(dragState.objectId, dragState.handle, delta)
      }

      dragStateRef.current = {
        ...dragState,
        lastPoint: currentPoint,
      }
    }

    const handlePointerUp = () => {
      dragStateRef.current = null
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleLayerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (activeTool === 'placeholder') {
      onCreatePlaceholder(
        pageIndex,
        clientPointToPagePoint(event.clientX, event.clientY, event.currentTarget, viewport),
      )
      return
    }

    if (activeTool === 'text') {
      onCreateText(
        pageIndex,
        clientPointToPagePoint(event.clientX, event.clientY, event.currentTarget, viewport),
      )
      return
    }

    if (activeTool === 'math') {
      onCreateMath(
        pageIndex,
        clientPointToPagePoint(event.clientX, event.clientY, event.currentTarget, viewport),
      )
      return
    }

    if (activeTool === 'ink') {
      const firstPoint = clientPointToPagePoint(event.clientX, event.clientY, event.currentTarget, viewport)
      setInkDraft([firstPoint])

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const layer = layerRef.current

        if (!layer) {
          return
        }

        const point = clientPointToPagePoint(pointerEvent.clientX, pointerEvent.clientY, layer, viewport)
        setInkDraft((currentDraft) => (currentDraft ? [...currentDraft, point] : currentDraft))
      }

      const handlePointerUp = () => {
        setInkDraft((currentDraft) => {
          if (currentDraft && currentDraft.length >= 2) {
            onCreateInk(pageIndex, currentDraft)
          }

          return null
        })
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return
    }

    if (isShapeTool(activeTool)) {
      const startPoint = clientPointToPagePoint(event.clientX, event.clientY, event.currentTarget, viewport)
      let latestDraft = {
        kind: activeTool,
        start: startPoint,
        end: startPoint,
        constrain: event.shiftKey,
      }
      setShapeDraft(latestDraft)

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const layer = layerRef.current

        if (!layer) {
          return
        }

        latestDraft = {
          ...latestDraft,
          end: clientPointToPagePoint(pointerEvent.clientX, pointerEvent.clientY, layer, viewport),
          constrain: pointerEvent.shiftKey,
        }
        setShapeDraft(latestDraft)
      }

      const handlePointerUp = () => {
        setShapeDraft(null)

        const dx = latestDraft.end.x - latestDraft.start.x
        const dy = latestDraft.end.y - latestDraft.start.y

        if (Math.hypot(dx, dy) >= 3) {
          onCreateShape(
            pageIndex,
            latestDraft.kind,
            latestDraft.start,
            latestDraft.end,
            latestDraft.constrain,
          )
        }

        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return
    }

    onClearSelection()
  }

  return (
    <div
      ref={layerRef}
      className={`overlay-layer overlay-layer-tool-${activeTool}`}
      style={{ width: viewport.width, height: viewport.height }}
      onPointerDown={handleLayerPointerDown}
    >
      {objects.map((object) => {
        const rect = pdfRectToViewportRect(object.frame, viewport)
        const selected = object.id === selectedObjectId
        const editing = object.id === editingObjectId
        const isAutoHeight = object.type === 'text'
        const style: React.CSSProperties = {
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: isAutoHeight ? 'auto' : rect.height,
          zIndex: object.zIndex,
        }
        const objectHandles = object.type === 'text' ? sideResizeHandles : resizeHandles

        return (
          <div
            key={object.id}
            className={[
              'overlay-object',
              `overlay-object-${object.type}`,
              selected ? 'overlay-object-selected' : '',
              editing ? 'overlay-object-editing' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={style}
            onPointerDown={(event) => {
              const layer = layerRef.current

              if (!layer) {
                return
              }

              if (activeTool !== 'select' && activeTool !== 'placeholder') {
                return
              }

              if (object.type === 'text' && editing) {
                event.stopPropagation()
                return
              }

              if (event.altKey) {
                lastPointerDownRef.current = null
                startDrag(event, {
                  type: 'move',
                  objectId: object.id,
                  duplicateSourceId: object.id,
                  lastPoint: getPointFromEvent(event.nativeEvent, layer, viewport),
                })
                return
              }

              const now = event.timeStamp
              const previous = lastPointerDownRef.current
              const isDoubleClick =
                !!previous && previous.id === object.id && now - previous.time < 400
              lastPointerDownRef.current = { id: object.id, time: now }

              if (isDoubleClick && (object.type === 'text' || object.type === 'math')) {
                event.preventDefault()
                event.stopPropagation()
                lastPointerDownRef.current = null
                onSelectObject(object.id)

                if (object.type === 'text') {
                  onBeginTextEdit(object.id)
                } else {
                  onBeginMathEdit(object.id)
                }

                return
              }

              onSelectObject(object.id)
              startDrag(event, {
                type: 'move',
                objectId: object.id,
                lastPoint: getPointFromEvent(event.nativeEvent, layer, viewport),
              })
            }}
            onDoubleClick={(event) => {
              if (object.type === 'math') {
                event.preventDefault()
                event.stopPropagation()
                onSelectObject(object.id)
                onBeginMathEdit(object.id)
                return
              }

              if (object.type !== 'text') {
                return
              }

              event.preventDefault()
              event.stopPropagation()
              onSelectObject(object.id)
              onBeginTextEdit(object.id)
            }}
          >
            {object.type === 'text' ? (
              <TextOverlayView
                object={object}
                editing={editing}
                scale={viewport.scale}
                onHeightChange={onSyncTextHeight}
                onChangeContent={onChangeTextContent}
                onCommitContent={onCommitTextContent}
                onDeleteIfEmpty={onDeleteEmptyText}
                onFinishEditing={onFinishTextEdit}
                onRegisterEditor={onRegisterTextEditor}
                onEditorStateChange={onTextEditorStateChange}
              />
            ) : object.type === 'image' ? (
              <ImageOverlayView object={object} />
            ) : object.type === 'ink' ? (
              <InkOverlayView object={object} viewport={viewport} />
            ) : object.type === 'shape' ? (
              <ShapeOverlayView object={object} viewport={viewport} />
            ) : object.type === 'math' ? (
              <MathBox object={object} viewportScale={viewport.scale} />
            ) : (
              <span className="overlay-object-label">Placeholder</span>
            )}
            {selected && object.type !== 'highlight' && object.type !== 'ink'
              ? objectHandles.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    aria-label={`Resize ${handle}`}
                    className={getHandleClassName(handle)}
                    onPointerDown={(event) => {
                      const layer = layerRef.current

                      if (!layer) {
                        return
                      }

                      onSelectObject(object.id)
                      startDrag(event, {
                        type: 'resize',
                        objectId: object.id,
                        handle,
                        lastPoint: getPointFromEvent(event.nativeEvent, layer, viewport),
                      })
                    }}
                  />
                ))
              : null}
          </div>
        )
      })}
      {inkDraft && inkDraft.length > 1 ? (
        <svg className="ink-draft-svg" aria-hidden="true">
          <polyline
            points={inkDraft.map((point) => `${point.x * viewport.scale},${point.y * viewport.scale}`).join(' ')}
            fill="none"
            stroke={inkDraftStyle.color}
            strokeWidth={inkDraftStyle.width * viewport.scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={inkDraftStyle.opacity}
          />
        </svg>
      ) : null}
      {shapeDraft ? (
        <ShapeDraftPreview draft={shapeDraft} style={shapeDraftStyle} viewport={viewport} />
      ) : null}
    </div>
  )
}

function ShapeDraftPreview({
  draft,
  style,
  viewport,
}: {
  draft: { kind: ShapeKind; start: PdfPoint; end: PdfPoint; constrain: boolean }
  style: ShapeOverlayStyle
  viewport: PDFPageViewportLike
}) {
  const geometry = getShapeDraftGeometry(draft)
  const rect = pdfRectToViewportRect(geometry.frame, viewport)

  return (
    <div
      className="shape-draft"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      <ShapeSvg
        kind={draft.kind}
        frame={geometry.frame}
        start={geometry.start}
        end={geometry.end}
        style={style}
        viewport={viewport}
      />
    </div>
  )
}
