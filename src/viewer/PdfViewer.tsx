import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import 'pdfjs-dist/web/pdf_viewer.css'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpRight,
  ArrowUpToLine,
  Bold,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  FolderOpen,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  LayoutList,
  List,
  ListOrdered,
  Maximize,
  MousePointer2,
  Minus,
  Pencil,
  Rows3,
  Save,
  Search,
  FileUp,
  Sigma,
  Square,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { OverlayLayer } from '@/overlay/OverlayLayer'
import {
  centerFrameInPage,
  createOverlayObjectStore,
  createImageFrame,
  createPlaceholderFrame,
  defaultMathOverlayStyle,
  defaultTextOverlayStyle,
  createShapeFrame,
  createTextFrame,
  defaultShapeOverlayStyle,
  deleteEmptyTextObject,
  deleteOverlayObject,
  duplicateOverlayObject,
  getObjectById,
  getObjectsForPage,
  isTextContentEmpty,
  moveOverlayObject,
  reorderOverlayObject,
  resizeOverlayObject,
  updateOverlayObjectFrame,
  updateHighlightObjectStyle,
  updateImageObjectStyle,
  updateInkObjectStyle,
  updateShapeObjectStyle,
  updateTextObjectContent,
  updateTextObjectStyle,
  updateMathObjectContent,
  updateMathObjectStyle,
  createMathFrame,
  syncTextObjectHeight,
  type LayerOrderCommand,
  type MathOverlayStyle,
} from '@/overlay/OverlayObjectStore'
import { MathInputModal } from '@/math/MathInputModal'
import {
  EditorButton,
  EditorIconButton,
  EditorTooltip,
  InspectorInput,
  InspectorSelect,
  InspectorSlider,
  PanelSeparator,
  ToolPaletteButton,
  TooltipProvider,
} from '@/components/editor/editor-ui'
import { measureMathSize } from '@/math/measureMath'
import { renderMathObjectsToImages } from '@/math/mathFlatten'
import { createBasePdfStore, type BasePdfStore } from '@/save/BasePdfStore'
import { overlayStoreFromMetadata } from '@/save/MetadataStore'
import { saveDocument, type SaveMode } from '@/save/SaveManager'
import { renderRichTextObjectsToImages } from '@/text/richTextFlatten'
import { normalizeSelectionRectForHighlight } from '@/annotations/selectionRects'
import { clearSelection, selectOverlayObject } from '@/overlay/SelectionManager'
import {
  createOverlayHistory,
  markOverlayHistorySaved,
  pushOverlayHistory,
  redoOverlayHistory,
  undoOverlayHistory,
  type OverlayHistory,
} from '@/overlay/OverlayHistory'
import type {
  HighlightOverlayStyle,
  ImageOverlayData,
  ImageOverlayObject,
  InkOverlayStyle,
  PdfPoint,
  PdfRect,
  ResizeHandlePosition,
  ShapeKind,
  ShapeOverlayStyle,
  TextAlign,
  TextOverlayObject,
  TextOverlayStyle,
} from '@/overlay/OverlayObject'
import type { RichTextEditorHandle, RichTextEditorState } from '@/text/RichTextBox'
import { plainTextToContentHtml } from '@/text/plainTextToContentHtml'
import type { EditorTool } from '@/tools/EditorTool'
import { isEditableShortcutTarget, resolveKeyboardCommand, setActiveTool } from '@/tools/ToolController'
import { getPdfOpenErrorMessage } from './pdfErrors'
import { PdfPageCanvas } from './PdfPageCanvas'
import { ThumbnailRail } from './ThumbnailRail'
import {
  DEFAULT_PAGE_VIEW_MODE,
  getPageNumberForNavigation,
  type PageNavigationCommand,
  type PageViewMode,
} from './viewMode'
import {
  getNextZoom,
  getVisiblePageNumber,
  resolveFitPageScale,
  resolveFitWidthScale,
} from './viewerMath'
import { viewportRectToPdfRect } from '@/coordinates/PdfCoordinateConverter'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type LoadedPdf = {
  document: PDFDocumentProxy
  fileName: string
  filePath: string
  pageCount: number
}

type PageBaseSize = {
  width: number
  height: number
}

type PageRenderedSize = PageBaseSize & {
  pageNumber: number
}

type SelectionPreviewRectsByPage = Record<number, PdfRect[]>

type ViewerMode = 'custom' | 'actual-size' | 'fit-page' | 'fit-width'

const toPercent = (scale: number) => `${Math.round(scale * 100)}%`
const createEmptyOverlayStore = () => createOverlayObjectStore()
const createInactiveTextEditorState = (): RichTextEditorState => ({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
})

const bytesToArrayBuffer = (bytes: Uint8Array) => {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

const decodeImageSize = async (data: Uint8Array, mimeType: ImageOverlayData['mimeType']) => {
  const blob = new Blob([bytesToArrayBuffer(data)], { type: mimeType })
  const url = URL.createObjectURL(blob)

  try {
    const image = new Image()
    const loaded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('Selected image could not be decoded.'))
    })

    image.src = url
    return await loaded
  } finally {
    URL.revokeObjectURL(url)
  }
}

const defaultHighlightStyle: HighlightOverlayStyle = {
  color: '#facc15',
  opacity: 0.45,
}
const defaultInkStyle: InkOverlayStyle = {
  color: '#2563eb',
  width: 3,
  opacity: 0.85,
}
const shapeTools: ShapeKind[] = ['rectangle', 'ellipse', 'line', 'arrow']
const isShapeTool = (tool: EditorTool): tool is ShapeKind => shapeTools.includes(tool as ShapeKind)
const createEmptyOverlayHistory = () => createOverlayHistory(createOverlayObjectStore())
const editorToolItems: Array<{
  tool: EditorTool
  ariaLabel: string
  icon: ReactNode
}> = [
  { tool: 'select', ariaLabel: 'Select tool', icon: <MousePointer2 size={16} /> },
  { tool: 'text', ariaLabel: 'Text tool', icon: <Type size={16} /> },
  { tool: 'highlight', ariaLabel: 'Highlight tool', icon: <Highlighter size={16} /> },
  { tool: 'ink', ariaLabel: 'Ink tool', icon: <Pencil size={16} /> },
  { tool: 'image', ariaLabel: 'Image tool', icon: <ImagePlus size={16} /> },
  { tool: 'rectangle', ariaLabel: 'Rectangle tool', icon: <Square size={16} /> },
  { tool: 'ellipse', ariaLabel: 'Ellipse tool', icon: <Circle size={16} /> },
  { tool: 'line', ariaLabel: 'Line tool', icon: <Minus size={16} /> },
  { tool: 'arrow', ariaLabel: 'Arrow tool', icon: <ArrowUpRight size={16} /> },
  { tool: 'math', ariaLabel: 'Math tool', icon: <Sigma size={16} /> },
]

const fontFamilyOptions = ['Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Times New Roman', 'Arial']
const fontWeightOptions = [
  { label: 'Light', value: 300 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'SemiBold', value: 600 },
  { label: 'Bold', value: 700 },
] as const

// ── Inspector presentational helpers ──────────────────────────
function InspectorSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="insp-section">
      {title ? <div className="insp-section-title">{title}</div> : null}
      {title ? <PanelSeparator className="insp-section-separator" /> : null}
      {children}
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
  allowTransparent,
  transparentFallback = '#ffffff',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  allowTransparent?: boolean
  transparentFallback?: string
}) {
  const isTransparent = value === 'transparent'
  const colorValue = isTransparent ? transparentFallback : value

  return (
    <div className="insp-row">
      <span className="insp-row-label">{label}</span>
      {allowTransparent ? (
        <label className="insp-none-toggle" title="투명">
          <input
            type="checkbox"
            className="insp-checkbox"
            checked={isTransparent}
            onChange={(event) => onChange(event.currentTarget.checked ? 'transparent' : transparentFallback)}
          />
          <span>투명</span>
        </label>
      ) : null}
      <InspectorInput
        type="color"
        className="insp-swatch"
        value={colorValue}
        onClick={() => {
          if (isTransparent) {
            onChange(transparentFallback)
          }
        }}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  )
}

function NumberRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  return (
    <label className="insp-row">
      <span className="insp-row-label">{label}</span>
      <InspectorInput
        type="number"
        className="insp-input insp-num"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  )
}

function OpacityRow({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const percent = Math.round(value * 100)

  return (
    <div className="insp-row">
      <InspectorSlider
        className="insp-slider"
        min={5}
        max={100}
        step={1}
        value={[percent]}
        onValueChange={([nextValue]) => onChange(nextValue / 100)}
        aria-label="불투명도"
      />
      <span className="insp-value-pill">{percent}%</span>
    </div>
  )
}

function LayerOrderSection({
  onReorder,
  onDelete,
}: {
  onReorder: (command: LayerOrderCommand) => void
  onDelete: () => void
}) {
  return (
    <InspectorSection title="레이어 순서">
      <div className="insp-layer-row">
        <div className="insp-layer-buttons">
          <EditorTooltip label="맨 앞으로">
            <EditorIconButton type="button" onClick={() => onReorder('front')} title="맨 앞으로">
            <ArrowUpToLine size={15} />
            </EditorIconButton>
          </EditorTooltip>
          <EditorTooltip label="앞으로">
            <EditorIconButton type="button" onClick={() => onReorder('forward')} title="앞으로">
            <ArrowUp size={15} />
            </EditorIconButton>
          </EditorTooltip>
          <EditorTooltip label="뒤로">
            <EditorIconButton type="button" onClick={() => onReorder('backward')} title="뒤로">
            <ArrowDown size={15} />
            </EditorIconButton>
          </EditorTooltip>
          <EditorTooltip label="맨 뒤로">
            <EditorIconButton type="button" onClick={() => onReorder('back')} title="맨 뒤로">
            <ArrowDownToLine size={15} />
            </EditorIconButton>
          </EditorTooltip>
        </div>
        <EditorIconButton type="button" className="insp-delete-btn" onClick={onDelete} title="삭제 (Delete)" aria-label="삭제">
          <Trash2 size={15} />
        </EditorIconButton>
      </div>
    </InspectorSection>
  )
}

function GeometrySection({
  frame,
  canEditWidth,
  canEditHeight,
  onGeometryChange,
  rotation,
  onRotationChange,
}: {
  frame: PdfRect
  canEditWidth: boolean
  canEditHeight: boolean
  onGeometryChange: (field: 'x' | 'y' | 'w' | 'h', value: number) => void
  rotation: number
  onRotationChange: (value: number) => void
}) {
  const round = (value: number) => Math.round(value * 10) / 10

  return (
    <InspectorSection title="위치 및 크기">
      <div className="insp-geo-grid">
        <label className="insp-geo-field">
          <span>X</span>
          <InspectorInput
            type="number"
            className="insp-input"
            value={round(frame.x)}
            onChange={(event) => onGeometryChange('x', Number(event.currentTarget.value))}
          />
        </label>
        <label className="insp-geo-field">
          <span>Y</span>
          <InspectorInput
            type="number"
            className="insp-input"
            value={round(frame.y)}
            onChange={(event) => onGeometryChange('y', Number(event.currentTarget.value))}
          />
        </label>
        <label className="insp-geo-field">
          <span>W</span>
          <InspectorInput
            type="number"
            className="insp-input"
            min={1}
            value={round(frame.width)}
            disabled={!canEditWidth}
            onChange={(event) => onGeometryChange('w', Number(event.currentTarget.value))}
          />
        </label>
        <label className="insp-geo-field">
          <span>H</span>
          <InspectorInput
            type="number"
            className="insp-input"
            min={1}
            value={round(frame.height)}
            disabled={!canEditHeight}
            onChange={(event) => onGeometryChange('h', Number(event.currentTarget.value))}
          />
        </label>
      </div>
      <label className="insp-rotation insp-row">
        <InspectorInput
          type="number"
          className="insp-input"
          value={rotation}
          min={-180}
          max={180}
          onChange={(event) => onRotationChange(Number(event.currentTarget.value))}
          aria-label="회전(도)"
        />
      </label>
    </InspectorSection>
  )
}

export function PdfViewer() {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const basePdfStoreRef = useRef<BasePdfStore | null>(null)
  const overlayHistoryRef = useRef<OverlayHistory>(createEmptyOverlayHistory())
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null)
  const [pageBaseSize, setPageBaseSize] = useState<PageBaseSize | null>(null)
  const [pageSizes, setPageSizes] = useState<Record<number, PageRenderedSize>>({})
  const [activeTool, setActiveToolState] = useState<EditorTool>('select')
  const [highlightStyle, setHighlightStyle] = useState<HighlightOverlayStyle>(defaultHighlightStyle)
  const [inkStyle, setInkStyle] = useState<InkOverlayStyle>(defaultInkStyle)
  const [shapeStyle, setShapeStyle] = useState<ShapeOverlayStyle>(defaultShapeOverlayStyle)
  const lastShapeFillColorRef = useRef('#ffffff')
  const [lastTextBackgroundColor, setLastTextBackgroundColor] = useState('#ffffff')
  const [lastTextBorderColor, setLastTextBorderColor] = useState('#2563eb')
  const [lastMathBackgroundColor, setLastMathBackgroundColor] = useState('#ffffff')
  // Last-used styles, remembered so each new object reuses the previous settings
  // (e.g. a transparent background stays transparent for the next one).
  const [textStyle, setTextStyle] = useState<TextOverlayStyle>(defaultTextOverlayStyle)
  const [mathStyle, setMathStyle] = useState<MathOverlayStyle>(defaultMathOverlayStyle)
  const [currentPage, setCurrentPage] = useState(0)
  const [scale, setScale] = useState(1)
  const [mode, setMode] = useState<ViewerMode>('actual-size')
  const [pageViewMode, setPageViewMode] = useState<PageViewMode>(DEFAULT_PAGE_VIEW_MODE)
  const [showThumbnails, setShowThumbnails] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [mathInput, setMathInput] = useState<
    | { mode: 'create'; pageIndex: number; origin: PdfPoint }
    | { mode: 'edit'; objectId: string }
    | null
  >(null)
  const [overlayStore, setOverlayStore] = useState(createEmptyOverlayStore)
  const overlayStoreRef = useRef(overlayStore)
  const [selection, setSelection] = useState(clearSelection)
  const [selectionPreviewRectsByPage, setSelectionPreviewRectsByPage] = useState<SelectionPreviewRectsByPage>({})
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null)
  const [activeTextEditor, setActiveTextEditor] = useState<RichTextEditorHandle | null>(null)
  const [textEditorState, setTextEditorState] = useState<RichTextEditorState>(createInactiveTextEditorState)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageNumbers = useMemo(
    () => (loadedPdf ? Array.from({ length: loadedPdf.pageCount }, (_, index) => index + 1) : []),
    [loadedPdf],
  )
  const visiblePageNumbers = useMemo(
    () => (pageViewMode === 'single' ? pageNumbers.filter((pageNumber) => pageNumber === (currentPage || 1)) : pageNumbers),
    [currentPage, pageNumbers, pageViewMode],
  )
  const selectedObject = useMemo(
    () => getObjectById(overlayStore.objects, selection.selectedObjectId),
    [overlayStore.objects, selection.selectedObjectId],
  )
  const selectedTextObject = selectedObject?.type === 'text' ? selectedObject : null
  const selectedImageObject = selectedObject?.type === 'image' ? selectedObject : null
  const selectedHighlightObject = selectedObject?.type === 'highlight' ? selectedObject : null
  const selectedInkObject = selectedObject?.type === 'ink' ? selectedObject : null
  const selectedShapeObject = selectedObject?.type === 'shape' ? selectedObject : null
  const selectedMathObject = selectedObject?.type === 'math' ? selectedObject : null
  const activeShapeKind = selectedShapeObject?.kind ?? (isShapeTool(activeTool) ? activeTool : null)
  const shapeInspectorStyle = selectedShapeObject?.style ?? shapeStyle
  const shapeSupportsFill = activeShapeKind === 'rectangle' || activeShapeKind === 'ellipse'
  useEffect(() => {
    if (shapeInspectorStyle.fillColor !== null) {
      lastShapeFillColorRef.current = shapeInspectorStyle.fillColor
    }
  }, [shapeInspectorStyle.fillColor])
  const canEditSelectedSize =
    !!selectedObject &&
    (selectedObject.type === 'image' ||
      selectedObject.type === 'text' ||
      selectedObject.type === 'math' ||
      selectedObject.type === 'placeholder' ||
      (selectedObject.type === 'shape' &&
        (selectedObject.kind === 'rectangle' || selectedObject.kind === 'ellipse')))
  const styleOpacity =
    selectedTextObject?.style.opacity ??
    selectedImageObject?.style.opacity ??
    selectedHighlightObject?.style.opacity ??
    (activeTool === 'highlight' ? highlightStyle.opacity : undefined) ??
    selectedInkObject?.style.opacity ??
    (activeTool === 'ink' ? inkStyle.opacity : undefined) ??
    (activeShapeKind ? shapeInspectorStyle.opacity : undefined) ??
    selectedMathObject?.opacity ??
    textStyle.opacity
  const saveStatus = saving ? '저장 중...' : overlayStore.isDirty ? '수정됨' : '저장됨'

  const getViewportSize = useCallback(() => {
    const container = scrollRef.current
    return {
      width: container?.clientWidth ?? 0,
      height: container?.clientHeight ?? 0,
    }
  }, [])

  const resetOverlayHistory = useCallback((nextStore = createOverlayObjectStore()) => {
    overlayHistoryRef.current = createOverlayHistory(nextStore)
    overlayStoreRef.current = nextStore
    setOverlayStore(nextStore)
  }, [])

  const commitOverlayStore = useCallback((nextStore: ReturnType<typeof createOverlayObjectStore>) => {
    overlayHistoryRef.current = pushOverlayHistory(overlayHistoryRef.current, nextStore)
    overlayStoreRef.current = nextStore
    setOverlayStore(nextStore)
  }, [])

  const updateOverlayStore = useCallback(
    (
      update: (currentStore: ReturnType<typeof createOverlayObjectStore>) => ReturnType<typeof createOverlayObjectStore>,
    ) => {
      setOverlayStore((currentStore) => {
        const nextStore = update(currentStore)
        overlayHistoryRef.current = pushOverlayHistory(overlayHistoryRef.current, nextStore)
        overlayStoreRef.current = nextStore
        return nextStore
      })
    },
    [],
  )

  const reportError = useCallback((title: string, message: string, errorDetail?: unknown) => {
    if (errorDetail) {
      console.error(title, errorDetail)
    }

    setError(message)
    void window.markan?.showErrorDialog(title, message)
  }, [])

  const clearEditingState = useCallback(() => {
    setEditingObjectId(null)
    setActiveTextEditor(null)
    setTextEditorState(createInactiveTextEditorState())
  }, [])

  const applyFitMode = useCallback(
    (nextMode: ViewerMode) => {
      if (nextMode === 'actual-size') {
        setMode('actual-size')
        setScale(1)
        return
      }

      if (!pageBaseSize) {
        return
      }

      const viewport = getViewportSize()

      if (nextMode === 'fit-width') {
        setMode('fit-width')
        setScale(resolveFitWidthScale({ containerWidth: viewport.width, pageWidth: pageBaseSize.width }))
        return
      }

      if (nextMode === 'fit-page') {
        setMode('fit-page')
        setScale(
          resolveFitPageScale({
            containerWidth: viewport.width,
            containerHeight: viewport.height,
            pageWidth: pageBaseSize.width,
            pageHeight: pageBaseSize.height,
          }),
        )
      }
    },
    [getViewportSize, pageBaseSize],
  )

  const updateCurrentPageFromScroll = useCallback(() => {
    const container = scrollRef.current

    if (!container || pageNumbers.length === 0) {
      return
    }

    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'))
    const pages = pageElements.map((element) => ({
      pageNumber: Number(element.dataset.pageNumber),
      top: element.offsetTop,
      height: element.offsetHeight,
    }))
    const visiblePage = getVisiblePageNumber({
      scrollTop: container.scrollTop,
      viewportHeight: container.clientHeight,
      pages,
    })

    if (visiblePage > 0) {
      setCurrentPage(visiblePage)
    }
  }, [pageNumbers.length])

  const handleOpenPdf = useCallback(async () => {
    if (!window.markan) {
      setError('Electron bridge unavailable')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await window.markan.openPdf()

      if (result.canceled) {
        return
      }

      const bytes = result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data)
      // pdf.js transfers (detaches) the buffer it receives, so hand it a copy and keep `bytes`
      // intact for createBasePdfStore below.
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) })
      const document = await loadingTask.promise
      const firstPage = await document.getPage(1)
      const firstViewport = firstPage.getViewport({ scale: 1 })

      setLoadedPdf({
        document,
        fileName: result.fileName,
        filePath: result.filePath,
        pageCount: document.numPages,
      })
      setPageBaseSize({ width: firstViewport.width, height: firstViewport.height })
      setPageSizes({})
      basePdfStoreRef.current = createBasePdfStore(bytes)
      resetOverlayHistory(result.metadata ? overlayStoreFromMetadata(result.metadata) : createOverlayObjectStore())
      setSelection(clearSelection())
      setEditingObjectId(null)
      clearEditingState()
      setActiveToolState('select')
      setCurrentPage(1)
      setMode('actual-size')
      setScale(1)
      if (result.metadataWarning) {
        setError(result.metadataWarning)
        void window.markan?.showErrorDialog('Metadata Warning', result.metadataWarning)
      }
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }))
    } catch (openError) {
      const friendly = getPdfOpenErrorMessage(openError)
      const detail = openError instanceof Error ? openError.message : String(openError)
      const message =
        friendly === 'The PDF could not be opened.' && detail ? `${friendly}\n\n${detail}` : friendly
      reportError('Open Failed', message, openError)
    } finally {
      setLoading(false)
    }
  }, [clearEditingState, reportError, resetOverlayHistory])

  const handlePageSizeChange = useCallback((pageNumber: number, size: PageBaseSize) => {
    setPageSizes((current) => ({
      ...current,
      [pageNumber]: { pageNumber, ...size },
    }))
  }, [])

  const getCurrentPageBaseSize = useCallback(() => {
    const renderedSize = pageSizes[currentPage]

    if (renderedSize) {
      return {
        width: renderedSize.width / scale,
        height: renderedSize.height / scale,
      }
    }

    return pageBaseSize
  }, [currentPage, pageBaseSize, pageSizes, scale])

  const handleImportImage = useCallback(async () => {
    if (!window.markan || !loadedPdf) {
      setError('Image import unavailable')
      setActiveToolState('select')
      return
    }

    const pageSize = getCurrentPageBaseSize()

    if (!pageSize) {
      setError('Image import unavailable until the current page is rendered')
      setActiveToolState('select')
      return
    }

    setError(null)
    setActiveToolState('image')

    try {
      const result = await window.markan.openImage()

      if (result.canceled) {
        setActiveToolState('select')
        return
      }

      const data = result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data)
      const imageSize = await decodeImageSize(data, result.mimeType)
      const frame = createImageFrame({ pageSize, imageSize })
      const pageIndex = Math.max(0, (currentPage || 1) - 1)

      setOverlayStore((currentStore) => {
        const nextStore = currentStore.addImageObject(pageIndex, frame, {
          fileName: result.fileName,
          mimeType: result.mimeType,
          data,
          naturalWidth: imageSize.width,
          naturalHeight: imageSize.height,
        })
        const createdObject = nextStore.objects[nextStore.objects.length - 1]

        if (createdObject) {
          setSelection(selectOverlayObject(createdObject.id))
          clearEditingState()
        }

        overlayStoreRef.current = nextStore
        return nextStore
      })
    } catch (imageError) {
      reportError(
        'Image Import Failed',
        imageError instanceof Error ? imageError.message : 'Image import failed',
        imageError,
      )
    } finally {
      setActiveToolState('select')
    }
  }, [clearEditingState, currentPage, getCurrentPageBaseSize, loadedPdf, reportError])

  const handleToolChange = useCallback(
    (nextTool: EditorTool) => {
      setSelectionPreviewRectsByPage({})

      if (nextTool === 'image') {
        void handleImportImage()
        return
      }

      setActiveToolState((currentTool) => setActiveTool(currentTool, nextTool).activeTool)
    },
    [handleImportImage],
  )

  const handleCreatePlaceholder = useCallback((pageIndex: number, origin: PdfPoint) => {
    updateOverlayStore((currentStore) => {
      const nextStore = currentStore.addPlaceholderObject(pageIndex, createPlaceholderFrame(origin))
      const createdObject = nextStore.objects[nextStore.objects.length - 1]

      if (createdObject) {
        setSelection(selectOverlayObject(createdObject.id))
        setActiveToolState('select')
      }

      return nextStore
    })
  }, [updateOverlayStore])

  const handleCreateText = useCallback((pageIndex: number, origin: PdfPoint) => {
    updateOverlayStore((currentStore) => {
      const nextStore = currentStore.addTextObject(pageIndex, createTextFrame(origin), textStyle)
      const createdObject = nextStore.objects[nextStore.objects.length - 1]

      if (createdObject) {
        setSelection(selectOverlayObject(createdObject.id))
        setEditingObjectId(createdObject.id)
        setActiveToolState('select')
      }

      return nextStore
    })
  }, [textStyle, updateOverlayStore])

  const handlePasteFromClipboard = useCallback(async () => {
    const bridge = window.markan

    if (!bridge || !loadedPdf) {
      return
    }

    const pageSize = getCurrentPageBaseSize()

    if (!pageSize) {
      return
    }

    try {
      const payload = await bridge.readClipboard()

      if (payload.kind === 'empty') {
        return
      }

      const pageIndex = Math.max(0, (currentPage || 1) - 1)

      if (payload.kind === 'image') {
        const data = payload.data instanceof Uint8Array ? payload.data : new Uint8Array(payload.data)
        const imageSize = { width: payload.naturalWidth, height: payload.naturalHeight }
        const frame = createImageFrame({ pageSize, imageSize })

        updateOverlayStore((currentStore) => {
          const nextStore = currentStore.addImageObject(pageIndex, frame, {
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            data,
            naturalWidth: imageSize.width,
            naturalHeight: imageSize.height,
          })
          const createdObject = nextStore.objects[nextStore.objects.length - 1]

          if (createdObject) {
            setSelection(selectOverlayObject(createdObject.id))
            clearEditingState()
            setActiveToolState('select')
          }

          return nextStore
        })
        return
      }

      const frame = centerFrameInPage(createTextFrame({ x: 0, y: 0 }), pageSize)
      const contentHtml = plainTextToContentHtml(payload.text)

      updateOverlayStore((currentStore) => {
        const withText = currentStore.addTextObject(pageIndex, frame, textStyle)
        const createdObject = withText.objects[withText.objects.length - 1]

        if (!createdObject) {
          return withText
        }

        setSelection(selectOverlayObject(createdObject.id))
        clearEditingState()
        setActiveToolState('select')
        return updateTextObjectContent(withText, createdObject.id, contentHtml)
      })
    } catch (pasteError) {
      reportError(
        'Paste Failed',
        pasteError instanceof Error ? pasteError.message : 'Clipboard paste failed',
        pasteError,
      )
    }
  }, [
    clearEditingState,
    currentPage,
    getCurrentPageBaseSize,
    loadedPdf,
    reportError,
    textStyle,
    updateOverlayStore,
  ])

  const handleCreateInk = useCallback(
    (pageIndex: number, points: PdfPoint[]) => {
      updateOverlayStore((currentStore) => {
        const nextStore = currentStore.addInkObject(pageIndex, points, inkStyle)
        const createdObject = nextStore.objects[nextStore.objects.length - 1]

        if (createdObject) {
          setSelection(selectOverlayObject(createdObject.id))
          setActiveToolState('select')
        }

        return nextStore
      })
    },
    [inkStyle, updateOverlayStore],
  )

  const handleCreateShape = useCallback(
    (pageIndex: number, kind: ShapeKind, start: PdfPoint, end: PdfPoint, constrain: boolean) => {
      const shape = createShapeFrame(start, end, kind, constrain)

      updateOverlayStore((currentStore) => {
        const nextStore = currentStore.addShapeObject(pageIndex, {
          ...shape,
          style: shapeStyle,
        })
        const createdObject = nextStore.objects[nextStore.objects.length - 1]

        if (createdObject) {
          setSelection(selectOverlayObject(createdObject.id))
          setActiveToolState('select')
        }

        return nextStore
      })
    },
    [shapeStyle, updateOverlayStore],
  )

  const handleBeginTextEdit = useCallback((objectId: string) => {
    setSelection(selectOverlayObject(objectId))
    setEditingObjectId(objectId)
  }, [])

  const handleChangeTextContent = useCallback((objectId: string, contentHtml: string) => {
    updateOverlayStore((currentStore) => updateTextObjectContent(currentStore, objectId, contentHtml))
  }, [updateOverlayStore])

  const handleCommitTextContent = useCallback((objectId: string, contentHtml: string) => {
    updateOverlayStore((currentStore) => updateTextObjectContent(currentStore, objectId, contentHtml))
  }, [updateOverlayStore])

  const handleDeleteEmptyText = useCallback((objectId: string) => {
    updateOverlayStore((currentStore) => deleteEmptyTextObject(currentStore, objectId))
    setSelection((currentSelection) =>
      currentSelection.selectedObjectId === objectId ? clearSelection() : currentSelection,
    )
  }, [updateOverlayStore])

  const handleFinishTextEdit = useCallback(() => {
    clearEditingState()
  }, [clearEditingState])

  // Auto-height: the editor reports its rendered height; sync it without touching history/dirty
  // since it's derived from content, not a user edit.
  const handleSyncTextHeight = useCallback((objectId: string, height: number) => {
    setOverlayStore((currentStore) => {
      const nextStore = syncTextObjectHeight(currentStore, objectId, height)
      overlayStoreRef.current = nextStore
      return nextStore
    })
  }, [])

  const handleMoveObject = useCallback((objectId: string, delta: { dx: number; dy: number }) => {
    updateOverlayStore((currentStore) => moveOverlayObject(currentStore, objectId, delta))
  }, [updateOverlayStore])

  const handleDuplicateObject = useCallback(
    (objectId: string) => {
      const result = duplicateOverlayObject(overlayStoreRef.current, objectId)
      const duplicatedObjectId = result.objectId

      if (duplicatedObjectId) {
        overlayHistoryRef.current = pushOverlayHistory(overlayHistoryRef.current, result.store)
        overlayStoreRef.current = result.store
        setOverlayStore(result.store)
        clearEditingState()
        setSelection(selectOverlayObject(duplicatedObjectId))
      }

      return duplicatedObjectId
    },
    [clearEditingState],
  )

  const handleResizeObject = useCallback(
    (objectId: string, handle: ResizeHandlePosition, delta: { dx: number; dy: number }) => {
      updateOverlayStore((currentStore) => resizeOverlayObject(currentStore, objectId, handle, delta))
    },
    [updateOverlayStore],
  )

  const handleDeleteSelection = useCallback(() => {
    setSelection((currentSelection) => {
      const selectedObjectId = currentSelection.selectedObjectId

      if (selectedObjectId) {
        updateOverlayStore((currentStore) => deleteOverlayObject(currentStore, selectedObjectId))
        setEditingObjectId((currentEditingObjectId) =>
          currentEditingObjectId === selectedObjectId ? null : currentEditingObjectId,
        )
      }

      return clearSelection()
    })
  }, [updateOverlayStore])

  const handleUpdateTextStyle = useCallback(
    (objectId: string, style: Partial<TextOverlayObject['style']>) => {
      updateOverlayStore((currentStore) => updateTextObjectStyle(currentStore, objectId, style))
      // Remember as the template for the next text box.
      setTextStyle((current) => ({ ...current, ...style }))

      if (style.textAlign) {
        activeTextEditor?.setTextAlign(style.textAlign)
      }
    },
    [activeTextEditor, updateOverlayStore],
  )

  const handleUpdateImageStyle = useCallback(
    (objectId: string, style: Partial<ImageOverlayObject['style']>) => {
      updateOverlayStore((currentStore) => updateImageObjectStyle(currentStore, objectId, style))
    },
    [updateOverlayStore],
  )

  const handleTextAlign = useCallback(
    (align: TextAlign) => {
      if (!selectedTextObject) {
        return
      }

      handleUpdateTextStyle(selectedTextObject.id, { textAlign: align })
    },
    [handleUpdateTextStyle, selectedTextObject],
  )

  const handleUpdateHighlightStyle = useCallback(
    (objectId: string, style: Partial<HighlightOverlayStyle>) => {
      updateOverlayStore((currentStore) => updateHighlightObjectStyle(currentStore, objectId, style))
      setHighlightStyle((current) => ({ ...current, ...style }))
    },
    [updateOverlayStore],
  )

  const handleUpdateInkStyle = useCallback((objectId: string, style: Partial<InkOverlayStyle>) => {
    updateOverlayStore((currentStore) => updateInkObjectStyle(currentStore, objectId, style))
    setInkStyle((current) => ({ ...current, ...style }))
  }, [updateOverlayStore])

  const handleUpdateShapeStyle = useCallback((objectId: string, style: Partial<ShapeOverlayStyle>) => {
    updateOverlayStore((currentStore) => updateShapeObjectStyle(currentStore, objectId, style))
  }, [updateOverlayStore])

  const handleShapeStyleChange = useCallback(
    (style: Partial<ShapeOverlayStyle>) => {
      if (selectedShapeObject) {
        handleUpdateShapeStyle(selectedShapeObject.id, style)
      }

      // Always remember the latest settings for the next shape.
      setShapeStyle((current) => ({
        ...current,
        ...style,
      }))
    },
    [handleUpdateShapeStyle, selectedShapeObject],
  )

  const handleUpdateImageFrame = useCallback((object: ImageOverlayObject, patch: Partial<PdfRect>) => {
    const aspectRatio = object.frame.width / object.frame.height
    let nextFrame: PdfRect = {
      ...object.frame,
      ...patch,
    }

    if (typeof patch.width === 'number' && typeof patch.height !== 'number') {
      nextFrame = {
        ...nextFrame,
        height: patch.width / aspectRatio,
      }
    }

    if (typeof patch.height === 'number' && typeof patch.width !== 'number') {
      nextFrame = {
        ...nextFrame,
        width: patch.height * aspectRatio,
      }
    }

    updateOverlayStore((currentStore) => updateOverlayObjectFrame(currentStore, object.id, nextFrame))
  }, [updateOverlayStore])

  const handleUpdateMathStyle = useCallback(
    (objectId: string, style: Partial<MathOverlayStyle>) => {
      updateOverlayStore((currentStore) => updateMathObjectStyle(currentStore, objectId, style))
      setMathStyle((current) => ({ ...current, ...style }))
    },
    [updateOverlayStore],
  )

  const handleUpdateMathContent = useCallback(
    (objectId: string, content: { latex: string; displayMode: boolean }) => {
      updateOverlayStore((currentStore) => updateMathObjectContent(currentStore, objectId, content))
    },
    [updateOverlayStore],
  )

  // Changing the math font size refits the box so larger text never gets clipped — keeping the
  // top-left anchor. (Manual resize still works for fine-tuning afterwards.)
  const handleMathFontSizeChange = useCallback(
    (objectId: string, fontSize: number) => {
      const object = getObjectById(overlayStore.objects, objectId)

      if (!object || object.type !== 'math' || Number.isNaN(fontSize)) {
        return
      }

      const size = measureMathSize(object.latex, object.displayMode, fontSize)

      updateOverlayStore((currentStore) => {
        const styled = updateMathObjectStyle(currentStore, objectId, { fontSize })
        return updateOverlayObjectFrame(styled, objectId, {
          ...object.frame,
          width: size.width,
          height: size.height,
        })
      })
      setMathStyle((current) => ({ ...current, fontSize }))
    },
    [overlayStore.objects, updateOverlayStore],
  )

  const handleCreateMath = useCallback((pageIndex: number, origin: PdfPoint) => {
    setMathInput({ mode: 'create', pageIndex, origin })
  }, [])

  const handleBeginMathEdit = useCallback((objectId: string) => {
    setSelection(selectOverlayObject(objectId))
    setMathInput({ mode: 'edit', objectId })
  }, [])

  const handleCancelMath = useCallback(() => {
    setMathInput(null)
  }, [])

  const handleApplyMath = useCallback(
    (latex: string, displayMode: boolean) => {
      if (!mathInput) {
        return
      }

      if (mathInput.mode === 'create') {
        const size = measureMathSize(latex, displayMode, mathStyle.fontSize)
        const frame = createMathFrame(mathInput.origin, size)

        updateOverlayStore((currentStore) => {
          const nextStore = currentStore.addMathObject(
            mathInput.pageIndex,
            frame,
            { latex, displayMode },
            mathStyle,
          )
          const createdObject = nextStore.objects[nextStore.objects.length - 1]

          if (createdObject) {
            setSelection(selectOverlayObject(createdObject.id))
          }

          return nextStore
        })
        setActiveToolState('select')
      } else {
        handleUpdateMathContent(mathInput.objectId, { latex, displayMode })
      }

      setMathInput(null)
    },
    [handleUpdateMathContent, mathInput, mathStyle, updateOverlayStore],
  )

  const handleReorderSelection = useCallback(
    (command: LayerOrderCommand) => {
      const selectedObjectId = selection.selectedObjectId

      if (!selectedObjectId) {
        return
      }

      updateOverlayStore((currentStore) => reorderOverlayObject(currentStore, selectedObjectId, command))
    },
    [selection.selectedObjectId, updateOverlayStore],
  )

  const handleGeometryChange = useCallback(
    (field: 'x' | 'y' | 'w' | 'h', value: number) => {
      if (!selectedObject || Number.isNaN(value)) {
        return
      }

      const { frame } = selectedObject

      if (field === 'x') {
        handleMoveObject(selectedObject.id, { dx: value - frame.x, dy: 0 })
        return
      }

      if (field === 'y') {
        handleMoveObject(selectedObject.id, { dx: 0, dy: value - frame.y })
        return
      }

      if (selectedObject.type === 'image') {
        handleUpdateImageFrame(
          selectedObject,
          field === 'w' ? { width: Math.max(1, value) } : { height: Math.max(1, value) },
        )
        return
      }

      const nextFrame =
        field === 'w'
          ? { ...frame, width: Math.max(1, value) }
          : { ...frame, height: Math.max(1, value) }

      updateOverlayStore((currentStore) => updateOverlayObjectFrame(currentStore, selectedObject.id, nextFrame))
    },
    [handleMoveObject, handleUpdateImageFrame, selectedObject, updateOverlayStore],
  )

  const handleSelectedOpacityChange = useCallback(
    (value: number) => {
      if (selectedTextObject) {
        handleUpdateTextStyle(selectedTextObject.id, { opacity: value })
        return
      }

      if (selectedImageObject) {
        handleUpdateImageStyle(selectedImageObject.id, { opacity: value })
        return
      }

      if (selectedHighlightObject) {
        handleUpdateHighlightStyle(selectedHighlightObject.id, { opacity: value })
        return
      }

      if (activeTool === 'highlight') {
        setHighlightStyle((current) => ({ ...current, opacity: value }))
        return
      }

      if (selectedInkObject) {
        handleUpdateInkStyle(selectedInkObject.id, { opacity: value })
        return
      }

      if (activeTool === 'ink') {
        setInkStyle((current) => ({ ...current, opacity: value }))
        return
      }

      if (selectedShapeObject || activeShapeKind) {
        handleShapeStyleChange({ opacity: value })
        return
      }

      if (selectedMathObject) {
        handleUpdateMathStyle(selectedMathObject.id, { opacity: value })
        return
      }

      setTextStyle((current) => ({ ...current, opacity: value }))
    },
    [
      activeShapeKind,
      activeTool,
      handleShapeStyleChange,
      handleUpdateHighlightStyle,
      handleUpdateImageStyle,
      handleUpdateInkStyle,
      handleUpdateMathStyle,
      handleUpdateTextStyle,
      selectedHighlightObject,
      selectedImageObject,
      selectedInkObject,
      selectedMathObject,
      selectedShapeObject,
      selectedTextObject,
    ],
  )

  const getCommittedOverlayStoreForSave = useCallback(() => {
    if (!editingObjectId || !activeTextEditor) {
      return overlayStore
    }

    const contentHtml = activeTextEditor.commit()

    if (contentHtml === null) {
      return overlayStore
    }

    const nextStore = isTextContentEmpty(contentHtml)
      ? deleteEmptyTextObject(overlayStore, editingObjectId)
      : updateTextObjectContent(overlayStore, editingObjectId, contentHtml)

    commitOverlayStore(nextStore)
    return nextStore
  }, [activeTextEditor, commitOverlayStore, editingObjectId, overlayStore])

  const handleClearSelection = useCallback(() => {
    if (editingObjectId && activeTextEditor) {
      const contentHtml = activeTextEditor.commit()

      if (contentHtml !== null) {
        const nextStore = isTextContentEmpty(contentHtml)
          ? deleteEmptyTextObject(overlayStore, editingObjectId)
          : updateTextObjectContent(overlayStore, editingObjectId, contentHtml)

        commitOverlayStore(nextStore)
      }
    }

    clearEditingState()
    setSelection(clearSelection())
  }, [activeTextEditor, clearEditingState, commitOverlayStore, editingObjectId, overlayStore])

  const handleSave = useCallback(
    async (mode: SaveMode) => {
      if (saving) {
        return false
      }

      const bridge = window.markan
      const basePdfStore = basePdfStoreRef.current

      if (!bridge || !loadedPdf || !basePdfStore) {
        reportError('Save Failed', 'Save is unavailable for the current document.')
        return false
      }

      setSaving(true)
      setError(null)

      try {
        const overlayStoreForSave = getCommittedOverlayStoreForSave()
        const result = await saveDocument({
          mode,
          currentPath: loadedPdf.filePath,
          basePdfBytes: basePdfStore.getBasePdfBytes(),
          overlayStore: overlayStoreForSave,
          bridge,
          renderTextImages: renderRichTextObjectsToImages,
          renderMathImages: renderMathObjectsToImages,
        })

        if (result.status === 'canceled') {
          return false
        }

        basePdfStore.recordSaveOutput(result.data)
        setLoadedPdf((current) =>
          current
            ? {
                ...current,
                fileName: result.fileName,
                filePath: result.filePath,
              }
            : current,
        )
        overlayHistoryRef.current = markOverlayHistorySaved(overlayHistoryRef.current, result.overlayStore)
        overlayStoreRef.current = result.overlayStore
        setOverlayStore(result.overlayStore)
        return true
      } catch (saveError) {
        reportError(
          mode === 'save-as' ? 'Save As Failed' : 'Save Failed',
          saveError instanceof Error ? saveError.message : 'Save failed',
          saveError,
        )
        return false
      } finally {
        setSaving(false)
      }
    },
    [getCommittedOverlayStoreForSave, loadedPdf, reportError, saving],
  )

  const confirmDiscardOrSaveChanges = useCallback(async () => {
    if (!overlayStore.isDirty) {
      return true
    }

    const decision = await window.markan?.confirmUnsaved()

    if (decision === 'cancel' || !decision) {
      return false
    }

    if (decision === 'discard') {
      return true
    }

    return handleSave('direct')
  }, [handleSave, overlayStore.isDirty])

  const handleOpenPdfWithPrompt = useCallback(async () => {
    if (!(await confirmDiscardOrSaveChanges())) {
      return
    }

    await handleOpenPdf()
  }, [confirmDiscardOrSaveChanges, handleOpenPdf])

  const handleCloseWithPrompt = useCallback(async () => {
    if (!(await confirmDiscardOrSaveChanges())) {
      return
    }

    await window.markan?.setDirtyState(false)
    await window.markan?.closeWindow()
  }, [confirmDiscardOrSaveChanges])

  const restoreHistorySelection = useCallback((history: OverlayHistory) => {
    const selectedId = selection.selectedObjectId

    if (selectedId && !history.present.objects.some((object) => object.id === selectedId)) {
      setSelection(clearSelection())
    }

    clearEditingState()
    overlayStoreRef.current = history.present
    setOverlayStore(history.present)
  }, [clearEditingState, selection.selectedObjectId])

  const handleUndo = useCallback(() => {
    const nextHistory = undoOverlayHistory(overlayHistoryRef.current)
    overlayHistoryRef.current = nextHistory
    restoreHistorySelection(nextHistory)
  }, [restoreHistorySelection])

  const handleRedo = useCallback(() => {
    const nextHistory = redoOverlayHistory(overlayHistoryRef.current)
    overlayHistoryRef.current = nextHistory
    restoreHistorySelection(nextHistory)
  }, [restoreHistorySelection])

  const navigateToPage = useCallback(
    (pageNumber: number) => {
      const nextPage = Math.min(Math.max(1, pageNumber), loadedPdf?.pageCount ?? 1)
      setCurrentPage(nextPage)

      if (pageViewMode === 'continuous') {
        requestAnimationFrame(() => {
          const container = scrollRef.current
          const page = container?.querySelector<HTMLElement>(`.pdf-page[data-page-number="${nextPage}"]`)

          if (container && page) {
            container.scrollTo({ top: Math.max(0, page.offsetTop - 18), behavior: 'smooth' })
          }
        })
      }
    },
    [loadedPdf?.pageCount, pageViewMode],
  )

  const navigateByCommand = useCallback(
    (command: PageNavigationCommand) => {
      if (!loadedPdf) {
        return
      }

      navigateToPage(getPageNumberForNavigation(currentPage || 1, loadedPdf.pageCount, command))
    },
    [currentPage, loadedPdf, navigateToPage],
  )

  const getSelectionRectsByPage = useCallback((browserSelection: Selection) => {
    if (browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
      return new Map<number, PdfRect[]>()
    }

    const range = browserSelection.getRangeAt(0)
    const clientRects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 0.5 && rect.height > 0.5,
    )
    const pageElements = Array.from(
      scrollRef.current?.querySelectorAll<HTMLElement>('.pdf-page-surface') ?? [],
    )
    const rectsByPage = new Map<number, PdfRect[]>()

    for (const clientRect of clientRects) {
      const pageElement = pageElements.find((element) => {
        const bounds = element.getBoundingClientRect()
        const centerX = clientRect.left + clientRect.width / 2
        const centerY = clientRect.top + clientRect.height / 2

        return (
          centerX >= bounds.left &&
          centerX <= bounds.right &&
          centerY >= bounds.top &&
          centerY <= bounds.bottom
        )
      })

      if (!pageElement) {
        continue
      }

      const pageSection = pageElement.closest<HTMLElement>('.pdf-page')
      const pageNumber = Number(pageSection?.dataset.pageNumber)

      if (!pageNumber) {
        continue
      }

      const pageBounds = pageElement.getBoundingClientRect()
      const highlightRect = normalizeSelectionRectForHighlight({
        x: clientRect.left - pageBounds.left,
        y: clientRect.top - pageBounds.top,
        width: clientRect.width,
        height: clientRect.height,
      })

      rectsByPage.set(pageNumber, [...(rectsByPage.get(pageNumber) ?? []), highlightRect])
    }

    return rectsByPage
  }, [])

  const createHighlightsFromSelection = useCallback(() => {
    const browserSelection = window.getSelection()

    if (!browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
      return
    }

    const selectionRectsByPage = getSelectionRectsByPage(browserSelection)
    const rectsByPage = new Map<number, PdfRect[]>()

    for (const [pageNumber, highlightRects] of selectionRectsByPage) {
      const pageBounds = scrollRef.current
        ?.querySelector<HTMLElement>(`.pdf-page[data-page-number="${pageNumber}"] .pdf-page-surface`)
        ?.getBoundingClientRect()

      if (!pageBounds) {
        continue
      }

      const pdfRects = highlightRects
        .map((highlightRect) =>
          viewportRectToPdfRect(highlightRect, {
          scale,
          width: pageSizes[pageNumber]?.width ?? pageBounds.width,
          height: pageSizes[pageNumber]?.height ?? pageBounds.height,
          }),
        )
        .filter((pdfRect) => pdfRect.width > 0 && pdfRect.height > 0)

      if (pdfRects.length === 0) {
        continue
      }

      const pageIndex = pageNumber - 1
      rectsByPage.set(pageIndex, [...(rectsByPage.get(pageIndex) ?? []), ...pdfRects])
    }

    browserSelection.removeAllRanges()
    setSelectionPreviewRectsByPage({})

    if (rectsByPage.size === 0) {
      return
    }

    updateOverlayStore((currentStore) => {
      let nextStore = currentStore
      let lastCreatedId: string | null = null

      for (const [pageIndex, rects] of rectsByPage) {
        nextStore = nextStore.addHighlightObject(pageIndex, rects, highlightStyle)
        lastCreatedId = nextStore.objects[nextStore.objects.length - 1]?.id ?? lastCreatedId
      }

      if (lastCreatedId) {
        setSelection(selectOverlayObject(lastCreatedId))
      }

      return nextStore
    })
  }, [getSelectionRectsByPage, highlightStyle, pageSizes, scale, updateOverlayStore])

  const handleViewerCommand = useCallback(
    (command: ViewerCommand) => {
      if (command === 'open') {
        void handleOpenPdfWithPrompt()
        return
      }

      if (command === 'request-close') {
        void handleCloseWithPrompt()
        return
      }

      if (command === 'save' || command === 'save-as') {
        void handleSave(command === 'save' ? 'direct' : 'save-as')
        return
      }

      if (command === 'undo') {
        handleUndo()
        return
      }

      if (command === 'redo') {
        handleRedo()
        return
      }

      if (command === 'delete') {
        handleDeleteSelection()
        return
      }

      if (command === 'paste') {
        if (isEditableShortcutTarget(document.activeElement)) {
          return
        }

        void handlePasteFromClipboard()
        return
      }

      if (
        command === 'select' ||
        command === 'text' ||
        command === 'highlight' ||
        command === 'ink' ||
        command === 'image' ||
        command === 'rectangle' ||
        command === 'ellipse' ||
        command === 'line' ||
        command === 'arrow' ||
        command === 'math'
      ) {
        handleToolChange(command)
        return
      }

      if (command === 'continuous-scroll' || command === 'single-page') {
        setPageViewMode(command === 'continuous-scroll' ? 'continuous' : 'single')
        return
      }

      if (command === 'toggle-thumbnails') {
        setShowThumbnails((current) => !current)
        return
      }

      if (command === 'toggle-inspector') {
        setShowInspector((current) => !current)
        return
      }

      if (
        command === 'previous-page' ||
        command === 'next-page' ||
        command === 'first-page' ||
        command === 'last-page'
      ) {
        navigateByCommand(command)
        return
      }

      if (command === 'zoom-in' || command === 'zoom-out') {
        setMode('custom')
        setScale((currentScale) => getNextZoom(currentScale, command === 'zoom-in' ? 'in' : 'out'))
        return
      }

      if (command === 'actual-size') {
        applyFitMode('actual-size')
        return
      }

      if (command === 'fit-page') {
        applyFitMode('fit-page')
        return
      }

      applyFitMode('fit-width')
    },
    [
      applyFitMode,
      handleCloseWithPrompt,
      handleDeleteSelection,
      handleOpenPdfWithPrompt,
      handlePasteFromClipboard,
      handleRedo,
      handleSave,
      handleToolChange,
      handleUndo,
      navigateByCommand,
    ],
  )

  useEffect(() => {
    return () => {
      void loadedPdf?.document.cleanup()
    }
  }, [loadedPdf])

  useEffect(() => {
    const bridge = window.markan

    if (!bridge) {
      return
    }

    const removeOpenListener = bridge.onMenuOpenPdf(() => {
      void handleOpenPdfWithPrompt()
    })
    const removeCommandListener = bridge.onViewerCommand(handleViewerCommand)

    return () => {
      removeOpenListener()
      removeCommandListener()
    }
  }, [handleOpenPdfWithPrompt, handleViewerCommand])

  useEffect(() => {
    void window.markan?.setDirtyState(overlayStore.isDirty)
  }, [overlayStore.isDirty])

  useEffect(() => {
    if (mode !== 'fit-page' && mode !== 'fit-width') {
      return
    }

    const onResize = () => applyFitMode(mode)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [applyFitMode, mode])

  useEffect(() => {
    requestAnimationFrame(updateCurrentPageFromScroll)
  }, [scale, pageSizes, updateCurrentPageFromScroll])

  const updateSelectionPreview = useCallback(() => {
    if (activeTool !== 'select' && activeTool !== 'highlight') {
      setSelectionPreviewRectsByPage({})
      return
    }

    const browserSelection = window.getSelection()

    if (!browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
      setSelectionPreviewRectsByPage({})
      return
    }

    const rectsByPage = getSelectionRectsByPage(browserSelection)
    const nextRectsByPage: SelectionPreviewRectsByPage = {}

    for (const [pageNumber, rects] of rectsByPage) {
      if (rects.length > 0) {
        nextRectsByPage[pageNumber] = rects
      }
    }

    setSelectionPreviewRectsByPage(nextRectsByPage)
  }, [activeTool, getSelectionRectsByPage])

  useEffect(() => {
    if (activeTool !== 'select' && activeTool !== 'highlight') {
      return
    }

    let frameId: number | null = null
    const handleSelectionChange = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      frameId = requestAnimationFrame(() => {
        frameId = null
        updateSelectionPreview()
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [activeTool, updateSelectionPreview])


  useEffect(() => {
    if (activeTool !== 'highlight') {
      return
    }

    let pointerDownPoint: { x: number; y: number } | null = null
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Element) || !target.closest('.pdf-page-surface')) {
        return
      }

      pointerDownPoint = { x: event.clientX, y: event.clientY }
    }

    const handlePointerUp = () => {
      const startPoint = pointerDownPoint
      pointerDownPoint = null

      requestAnimationFrame(() => {
        const selection = window.getSelection()
        const hasTextSelection = Boolean(selection && selection.rangeCount > 0 && !selection.isCollapsed)

        if (!hasTextSelection && startPoint) {
          setSelection(clearSelection())
        }

        createHighlightsFromSelection()
      })
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [activeTool, createHighlightsFromSelection])

  useEffect(() => {
    if (activeTool !== 'select' || (!selection.selectedObjectId && !editingObjectId)) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Element) || !target.closest('.pdf-page-surface')) {
        return
      }

      if (target.closest('.overlay-object, .resize-handle')) {
        return
      }

      handleClearSelection()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [activeTool, editingObjectId, handleClearSelection, selection.selectedObjectId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave(event.shiftKey ? 'save-as' : 'direct')
        return
      }

      if ((event.metaKey || event.ctrlKey) && activeTextEditor) {
        const key = event.key.toLowerCase()

        if (key === 'b') {
          event.preventDefault()
          activeTextEditor.toggleBold()
          return
        }

        if (key === 'i') {
          event.preventDefault()
          activeTextEditor.toggleItalic()
          return
        }

        if (key === 'u') {
          event.preventDefault()
          activeTextEditor.toggleUnderline()
          return
        }
      }

      if (isEditableShortcutTarget(event.target)) {
        return
      }

      const command = resolveKeyboardCommand({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
      })

      if (!command) {
        return
      }

      event.preventDefault()

      handleViewerCommand(command)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTextEditor, handleSave, handleViewerCommand])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableShortcutTarget(event.target)) {
        return
      }

      if (!loadedPdf) {
        return
      }

      event.preventDefault()
      void handlePasteFromClipboard()
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePasteFromClipboard, loadedPdf])

  const mathInitial = useMemo(() => {
    if (!mathInput) {
      return null
    }

    if (mathInput.mode === 'create') {
      return { latex: '', displayMode: false }
    }

    const object = getObjectById(overlayStore.objects, mathInput.objectId)

    return object?.type === 'math'
      ? { latex: object.latex, displayMode: object.displayMode }
      : { latex: '', displayMode: false }
  }, [mathInput, overlayStore.objects])

  const renderLayerAndGeometry = (frame: PdfRect) => (
    <>
      <LayerOrderSection onReorder={handleReorderSelection} onDelete={handleDeleteSelection} />
      <GeometrySection
        frame={frame}
        canEditWidth={canEditSelectedSize}
        canEditHeight={canEditSelectedSize && selectedObject?.type !== 'text'}
        onGeometryChange={handleGeometryChange}
        rotation={rotation}
        onRotationChange={setRotation}
      />
    </>
  )
  const titleBarText = loadedPdf
    ? `${overlayStore.isDirty ? '*' : ''}${loadedPdf.fileName}`
    : 'MarkAn'

  return (
    <TooltipProvider>
    <div className="app-shell">
      <header className="app-header">
        <div className="title-bar">
          <div className="title-bar-title" title={loadedPdf?.filePath ?? titleBarText}>
            {titleBarText}
          </div>

          <div className="title-bar-right">
            <EditorIconButton type="button" aria-label="검색" disabled>
              <Search size={16} />
            </EditorIconButton>
          </div>
        </div>

        <div className="tool-row">
          <div className="toolbar-group toolbar-file-group" aria-label="File">
            <EditorIconButton
              type="button"
              className="primary"
              onClick={() => void handleOpenPdfWithPrompt()}
              aria-label="Open PDF"
            >
              <FolderOpen size={16} />
            </EditorIconButton>
            <EditorIconButton
              type="button"
              onClick={() => void handleSave('direct')}
              aria-label="Save"
              disabled={!loadedPdf || saving}
            >
              <Save size={16} />
            </EditorIconButton>
            <EditorIconButton
              type="button"
              onClick={() => void handleSave('save-as')}
              aria-label="Save As"
              disabled={!loadedPdf || saving}
            >
              <FileUp size={16} />
            </EditorIconButton>
          </div>

          <div className="toolbar-group" aria-label="Editor tools">
            {editorToolItems.map((item) => (
              <ToolPaletteButton
                key={item.tool}
                type="button"
                active={activeTool === item.tool}
                onClick={() => handleToolChange(item.tool)}
                aria-label={item.ariaLabel}
                disabled={!loadedPdf}
              >
                {item.icon}
              </ToolPaletteButton>
            ))}
          </div>

          <div className="tool-row-right">
            <div className="toolbar-group" aria-label="Page view mode">
              <EditorIconButton
                type="button"
                onClick={() => handleViewerCommand('fit-page')}
                aria-label="Fit Page"
                disabled={!loadedPdf}
              >
                <Maximize size={16} />
              </EditorIconButton>
              <EditorIconButton
                type="button"
                onClick={() => handleViewerCommand('fit-width')}
                aria-label="Fit Width"
                disabled={!loadedPdf}
              >
                <ChevronsUpDown size={16} className="rotate-90" />
              </EditorIconButton>
              <EditorIconButton
                type="button"
                active={pageViewMode === 'continuous'}
                onClick={() => handleViewerCommand('continuous-scroll')}
                aria-label="Continuous Scroll"
                disabled={!loadedPdf}
              >
                <LayoutList size={16} />
              </EditorIconButton>
              <EditorIconButton
                type="button"
                active={pageViewMode === 'single'}
                onClick={() => handleViewerCommand('single-page')}
                aria-label="Single Page"
                disabled={!loadedPdf}
              >
                <Rows3 size={16} />
              </EditorIconButton>
            </div>
          </div>
        </div>
      </header>

      <main
        className={[
          'viewer-layout',
          !showThumbnails ? 'viewer-layout-no-thumbnails' : '',
          !showInspector ? 'viewer-layout-no-inspector' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showThumbnails ? (
        <aside className="thumbnail-sidebar" aria-label="Page thumbnails">
          {loadedPdf ? (
            <ThumbnailRail
              document={loadedPdf.document}
              pageNumbers={pageNumbers}
              currentPage={currentPage}
              onSelectPage={(pageNumber) => {
                setCurrentPage(pageNumber)

                if (pageViewMode === 'continuous') {
                  requestAnimationFrame(() => {
                    const container = scrollRef.current
                    const page = container?.querySelector<HTMLElement>(
                      `.pdf-page[data-page-number="${pageNumber}"]`,
                    )

                    if (container && page) {
                      container.scrollTo({
                        top: Math.max(0, page.offsetTop - 18),
                        behavior: 'smooth',
                      })
                    }
                  })
                }
              }}
            />
          ) : (
            <div className="thumbnail-list" />
          )}
          <button
            type="button"
            className="sidebar-edge-collapse sidebar-edge-collapse-left"
            onClick={() => setShowThumbnails(false)}
            title="페이지 패널 접기"
            aria-label="페이지 패널 접기"
          >
            <span>
              <ChevronLeft size={14} />
            </span>
          </button>
        </aside>
        ) : (
          <aside
            className="sidebar-rail sidebar-rail-left"
            role="button"
            tabIndex={0}
            onClick={() => setShowThumbnails(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setShowThumbnails(true)
              }
            }}
            title="페이지 패널 열기"
            aria-label="페이지 패널 열기"
          >
            <span
              className="sidebar-rail-button"
              aria-hidden="true"
            >
              <ChevronRight size={15} />
            </span>
          </aside>
        )}

        <section
          ref={scrollRef}
          className="document-scroll"
          onScroll={updateCurrentPageFromScroll}
          aria-label="PDF document"
        >
          {!loadedPdf ? (
            <div className="empty-state">
              <img className="empty-state-logo" src="./logo/logo.svg" alt="" aria-hidden="true" />
              <h1>MarkAn</h1>
              <EditorButton type="button" className="primary" onClick={() => void handleOpenPdfWithPrompt()}>
                <FolderOpen size={18} />
                <span>Open PDF</span>
              </EditorButton>
            </div>
          ) : (
            <div className={`page-stack page-stack-${pageViewMode}`}>
              {visiblePageNumbers.map((pageNumber) => (
                <PdfPageCanvas
                  key={`${loadedPdf.filePath}-${pageNumber}`}
                  document={loadedPdf.document}
                  pageNumber={pageNumber}
                  scale={scale}
                  onSizeChange={handlePageSizeChange}
                >
                  {selectionPreviewRectsByPage[pageNumber]?.length ? (
                    <div className="selection-preview-layer" aria-hidden="true">
                      {selectionPreviewRectsByPage[pageNumber].map((rect, index) => (
                        <span
                          key={`${pageNumber}-${index}-${rect.x}-${rect.y}`}
                          className="selection-preview-rect"
                          style={{
                            left: rect.x,
                            top: rect.y,
                            width: rect.width,
                            height: rect.height,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {pageSizes[pageNumber] ? (
                    <OverlayLayer
                      activeTool={activeTool}
                      objects={getObjectsForPage(overlayStore.objects, pageNumber - 1)}
                      pageIndex={pageNumber - 1}
                      selectedObjectId={selection.selectedObjectId}
                      editingObjectId={editingObjectId}
                      inkDraftStyle={inkStyle}
                      shapeDraftStyle={shapeStyle}
                      viewport={{
                        scale,
                        width: pageSizes[pageNumber].width,
                        height: pageSizes[pageNumber].height,
                      }}
                      onClearSelection={handleClearSelection}
                      onCreatePlaceholder={handleCreatePlaceholder}
                      onCreateText={handleCreateText}
                      onCreateInk={handleCreateInk}
                      onCreateShape={handleCreateShape}
                      onCreateMath={handleCreateMath}
                      onBeginMathEdit={handleBeginMathEdit}
                      onBeginTextEdit={handleBeginTextEdit}
                      onChangeTextContent={handleChangeTextContent}
                      onCommitTextContent={handleCommitTextContent}
                      onDeleteEmptyText={handleDeleteEmptyText}
                      onSyncTextHeight={handleSyncTextHeight}
                      onFinishTextEdit={handleFinishTextEdit}
                      onRegisterTextEditor={setActiveTextEditor}
                      onTextEditorStateChange={setTextEditorState}
                      onMoveObject={handleMoveObject}
                      onDuplicateObject={handleDuplicateObject}
                      onResizeObject={handleResizeObject}
                      onSelectObject={(objectId) => setSelection(selectOverlayObject(objectId))}
                    />
                  ) : null}
                </PdfPageCanvas>
              ))}
            </div>
          )}
        </section>

        {showInspector ? (
        <aside className="inspector-panel" aria-label="Inspector" data-preserve-empty-text-box="true">
          <div className="inspector-content">
              {selectedHighlightObject || activeTool === 'highlight' ? (
                <>
                  <InspectorSection title="색상">
                    <ColorRow
                      label="하이라이트 색상"
                      value={selectedHighlightObject?.style.color ?? highlightStyle.color}
                      onChange={(color) => {
                        if (selectedHighlightObject) {
                          handleUpdateHighlightStyle(selectedHighlightObject.id, { color })
                        } else {
                          setHighlightStyle((current) => ({ ...current, color }))
                        }
                      }}
                    />
                  </InspectorSection>
                  <InspectorSection title="스타일">
                    <div className="insp-label">불투명도</div>
                    <OpacityRow value={styleOpacity} onChange={handleSelectedOpacityChange} />
                  </InspectorSection>
                  {selectedHighlightObject ? renderLayerAndGeometry(selectedHighlightObject.frame) : null}
                </>
              ) : selectedInkObject || activeTool === 'ink' ? (
                <>
                  <InspectorSection title="색상">
                    <ColorRow
                      label="펜 색상"
                      value={selectedInkObject?.style.color ?? inkStyle.color}
                      onChange={(color) => {
                        if (selectedInkObject) {
                          handleUpdateInkStyle(selectedInkObject.id, { color })
                        } else {
                          setInkStyle((current) => ({ ...current, color }))
                        }
                      }}
                    />
                  </InspectorSection>
                  <InspectorSection title="스타일">
                    <NumberRow
                      label="두께"
                      min={1}
                      max={24}
                      value={selectedInkObject?.style.width ?? inkStyle.width}
                      onChange={(width) => {
                        if (selectedInkObject) {
                          handleUpdateInkStyle(selectedInkObject.id, { width })
                        } else {
                          setInkStyle((current) => ({ ...current, width }))
                        }
                      }}
                    />
                    <div className="insp-label">불투명도</div>
                    <OpacityRow value={styleOpacity} onChange={handleSelectedOpacityChange} />
                  </InspectorSection>
                  {selectedInkObject ? renderLayerAndGeometry(selectedInkObject.frame) : null}
                </>
              ) : activeShapeKind ? (
                <>
                  <InspectorSection title="색상">
                    <ColorRow
                      label="선 색상"
                      value={shapeInspectorStyle.strokeColor}
                      onChange={(strokeColor) => handleShapeStyleChange({ strokeColor })}
                    />
                    {shapeSupportsFill ? (
                      <>
                        <div className="insp-row">
                          <span className="insp-row-label">채움 없음</span>
                          <input
                            type="checkbox"
                            className="insp-checkbox"
                            checked={shapeInspectorStyle.fillColor === null}
                            onChange={(event) =>
                              handleShapeStyleChange({
                                fillColor: event.currentTarget.checked ? null : lastShapeFillColorRef.current,
                              })
                            }
                          />
                        </div>
                        <ColorRow
                          label="채움 색상"
                          value={shapeInspectorStyle.fillColor ?? '#ffffff'}
                          onChange={(fillColor) => {
                            lastShapeFillColorRef.current = fillColor
                            handleShapeStyleChange({ fillColor })
                          }}
                        />
                      </>
                    ) : null}
                  </InspectorSection>
                  <InspectorSection title="스타일">
                    <NumberRow
                      label="선 두께"
                      min={1}
                      max={48}
                      value={shapeInspectorStyle.lineWidth}
                      onChange={(lineWidth) => handleShapeStyleChange({ lineWidth })}
                    />
                    <label className="insp-row">
                      <span className="insp-row-label">선 스타일</span>
                      <InspectorSelect
                        className="insp-select"
                        value={shapeInspectorStyle.lineStyle}
                        onChange={(event) =>
                          handleShapeStyleChange({
                            lineStyle: event.currentTarget.value === 'dashed' ? 'dashed' : 'solid',
                          })
                        }
                      >
                        <option value="solid">실선</option>
                        <option value="dashed">점선</option>
                      </InspectorSelect>
                    </label>
                    <div className="insp-label">불투명도</div>
                    <OpacityRow value={styleOpacity} onChange={handleSelectedOpacityChange} />
                  </InspectorSection>
                  {selectedShapeObject ? renderLayerAndGeometry(selectedShapeObject.frame) : null}
                </>
              ) : selectedImageObject ? (
                <>
                  <InspectorSection title="스타일">
                    <div className="insp-label">불투명도</div>
                    <OpacityRow value={styleOpacity} onChange={handleSelectedOpacityChange} />
                  </InspectorSection>
                  {renderLayerAndGeometry(selectedImageObject.frame)}
                </>
              ) : selectedTextObject ? (
                <>
                  <InspectorSection>
                    <div className="insp-label">타이포</div>
                    <InspectorSelect
                      className="insp-select insp-field-full"
                      iconClassName="insp-font-select-chevron"
                      value={selectedTextObject.style.fontFamily}
                      onChange={(event) =>
                        handleUpdateTextStyle(selectedTextObject.id, { fontFamily: event.currentTarget.value })
                      }
                      aria-label="글꼴"
                    >
                      {fontFamilyOptions.map((family) => (
                        <option key={family} value={family}>
                          {family}
                        </option>
                      ))}
                    </InspectorSelect>
                    <div className="insp-type-row">
                      <InspectorSelect
                        className="insp-select"
                        value={selectedTextObject.style.fontWeight}
                        onChange={(event) =>
                          handleUpdateTextStyle(selectedTextObject.id, {
                            fontWeight: Number(event.currentTarget.value) as TextOverlayStyle['fontWeight'],
                          })
                        }
                        aria-label="굵기"
                      >
                        {fontWeightOptions.map((weight) => (
                          <option key={weight.value} value={weight.value}>
                            {weight.label}
                          </option>
                        ))}
                      </InspectorSelect>
                      <InspectorInput
                        type="number"
                        className="insp-input insp-num"
                        min={8}
                        max={96}
                        value={selectedTextObject.style.fontSize}
                        onChange={(event) =>
                          handleUpdateTextStyle(selectedTextObject.id, {
                            fontSize: Number(event.currentTarget.value),
                          })
                        }
                        aria-label="글자 크기"
                      />
                      <InspectorInput
                        type="color"
                        className="insp-swatch"
                        value={selectedTextObject.style.textColor}
                        onChange={(event) => {
                          const color = event.currentTarget.value
                          handleUpdateTextStyle(selectedTextObject.id, { textColor: color })
                          activeTextEditor?.setTextColor(color)
                        }}
                        aria-label="글자 색"
                      />
                    </div>
                    <div className="insp-btn-row" aria-label="텍스트 서식">
                      <EditorIconButton
                        type="button"
                        active={textEditorState.bold}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.toggleBold()}
                        title="Bold"
                        aria-label="굵게"
                        disabled={!activeTextEditor}
                      >
                        <Bold size={15} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        active={textEditorState.italic}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.toggleItalic()}
                        title="Italic"
                        aria-label="기울임"
                        disabled={!activeTextEditor}
                      >
                        <Italic size={15} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        active={textEditorState.underline}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.toggleUnderline()}
                        title="Underline"
                        aria-label="밑줄"
                        disabled={!activeTextEditor}
                      >
                        <Underline size={15} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        active={textEditorState.strike}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.toggleStrike()}
                        title="Strikethrough"
                        aria-label="취소선"
                        disabled={!activeTextEditor}
                      >
                        <Strikethrough size={15} />
                      </EditorIconButton>
                    </div>
                    <div className="insp-btn-row" aria-label="목록 및 들여쓰기">
                      <EditorIconButton
                        type="button"
                        active={textEditorState.bulletList}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.toggleBulletList()}
                        title="Bullet list"
                        aria-label="글머리 기호 목록"
                        disabled={!activeTextEditor}
                      >
                        <List size={16} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        active={textEditorState.orderedList}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.toggleOrderedList()}
                        title="Numbered list"
                        aria-label="번호 목록"
                        disabled={!activeTextEditor}
                      >
                        <ListOrdered size={16} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.outdent()}
                        title="Outdent"
                        aria-label="내어쓰기"
                        disabled={!activeTextEditor}
                      >
                        <IndentDecrease size={16} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => activeTextEditor?.indent()}
                        title="Indent"
                        aria-label="들여쓰기"
                        disabled={!activeTextEditor}
                      >
                        <IndentIncrease size={16} />
                      </EditorIconButton>
                    </div>
                    <div className="insp-btn-row" aria-label="텍스트 정렬">
                      <EditorIconButton
                        type="button"
                        active={selectedTextObject.style.textAlign === 'left'}
                        onClick={() => handleTextAlign('left')}
                        title="왼쪽 정렬"
                        aria-label="왼쪽 정렬"
                      >
                        <AlignLeft size={15} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        active={selectedTextObject.style.textAlign === 'center'}
                        onClick={() => handleTextAlign('center')}
                        title="가운데 정렬"
                        aria-label="가운데 정렬"
                      >
                        <AlignCenter size={15} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        active={selectedTextObject.style.textAlign === 'right'}
                        onClick={() => handleTextAlign('right')}
                        title="오른쪽 정렬"
                        aria-label="오른쪽 정렬"
                      >
                        <AlignRight size={15} />
                      </EditorIconButton>
                      <EditorIconButton
                        type="button"
                        title="양쪽 정렬 (준비 중)"
                        aria-label="양쪽 정렬"
                        disabled
                      >
                        <AlignJustify size={15} />
                      </EditorIconButton>
                    </div>
                  </InspectorSection>
                  <InspectorSection title="색상">
                    <ColorRow
                      label="배경"
                      value={selectedTextObject.style.backgroundColor}
                      allowTransparent
                      transparentFallback={lastTextBackgroundColor}
                      onChange={(backgroundColor) => {
                        if (backgroundColor === 'transparent' && selectedTextObject.style.backgroundColor !== 'transparent') {
                          setLastTextBackgroundColor(selectedTextObject.style.backgroundColor)
                        } else if (backgroundColor !== 'transparent') {
                          setLastTextBackgroundColor(backgroundColor)
                        }
                        handleUpdateTextStyle(selectedTextObject.id, { backgroundColor })
                      }}
                    />
                    <ColorRow
                      label="테두리"
                      value={selectedTextObject.style.borderColor}
                      allowTransparent
                      transparentFallback={lastTextBorderColor}
                      onChange={(borderColor) => {
                        if (borderColor === 'transparent' && selectedTextObject.style.borderColor !== 'transparent') {
                          setLastTextBorderColor(selectedTextObject.style.borderColor)
                        } else if (borderColor !== 'transparent') {
                          setLastTextBorderColor(borderColor)
                        }
                        handleUpdateTextStyle(selectedTextObject.id, { borderColor })
                      }}
                    />
                    <NumberRow
                      label="여백"
                      min={0}
                      max={48}
                      value={selectedTextObject.style.padding}
                      onChange={(padding) => handleUpdateTextStyle(selectedTextObject.id, { padding })}
                    />
                    <NumberRow
                      label="문자 간격"
                      step={0.5}
                      value={selectedTextObject.style.letterSpacing}
                      onChange={(letterSpacing) =>
                        handleUpdateTextStyle(selectedTextObject.id, { letterSpacing })
                      }
                    />
                    <NumberRow
                      label="줄 간격"
                      min={0.8}
                      max={3}
                      step={0.1}
                      value={selectedTextObject.style.lineHeight}
                      onChange={(lineHeight) => handleUpdateTextStyle(selectedTextObject.id, { lineHeight })}
                    />
                  </InspectorSection>
                  <InspectorSection title="스타일">
                    <div className="insp-label">불투명도</div>
                    <OpacityRow value={styleOpacity} onChange={handleSelectedOpacityChange} />
                  </InspectorSection>
                  {renderLayerAndGeometry(selectedTextObject.frame)}
                </>
              ) : selectedMathObject ? (
                <>
                  <InspectorSection>
                    <div className="insp-label">LaTeX</div>
                    <textarea
                      className="insp-textarea"
                      value={selectedMathObject.latex}
                      spellCheck={false}
                      rows={3}
                      onChange={(event) =>
                        handleUpdateMathContent(selectedMathObject.id, {
                          latex: event.currentTarget.value,
                          displayMode: selectedMathObject.displayMode,
                        })
                      }
                    />
                    <label className="insp-row">
                      <span className="insp-row-label">Display mode</span>
                      <input
                        type="checkbox"
                        className="insp-checkbox"
                        checked={selectedMathObject.displayMode}
                        onChange={(event) =>
                          handleUpdateMathContent(selectedMathObject.id, {
                            latex: selectedMathObject.latex,
                            displayMode: event.currentTarget.checked,
                          })
                        }
                      />
                    </label>
                  </InspectorSection>
                  <InspectorSection title="색상">
                    <NumberRow
                      label="글자 크기"
                      min={8}
                      max={96}
                      value={selectedMathObject.fontSize}
                      onChange={(fontSize) => handleMathFontSizeChange(selectedMathObject.id, fontSize)}
                    />
                    <ColorRow
                      label="수식 색상"
                      value={selectedMathObject.color}
                      onChange={(color) => handleUpdateMathStyle(selectedMathObject.id, { color })}
                    />
                    <ColorRow
                      label="배경"
                      value={selectedMathObject.backgroundColor}
                      allowTransparent
                      transparentFallback={lastMathBackgroundColor}
                      onChange={(backgroundColor) => {
                        if (backgroundColor === 'transparent' && selectedMathObject.backgroundColor !== 'transparent') {
                          setLastMathBackgroundColor(selectedMathObject.backgroundColor)
                        } else if (backgroundColor !== 'transparent') {
                          setLastMathBackgroundColor(backgroundColor)
                        }
                        handleUpdateMathStyle(selectedMathObject.id, { backgroundColor })
                      }}
                    />
                  </InspectorSection>
                  <InspectorSection title="스타일">
                    <div className="insp-label">불투명도</div>
                    <OpacityRow value={styleOpacity} onChange={handleSelectedOpacityChange} />
                  </InspectorSection>
                  {renderLayerAndGeometry(selectedMathObject.frame)}
                </>
              ) : (
                <div className="inspector-empty">선택된 항목이 없습니다.</div>
              )}
          </div>
          <button
            type="button"
            className="sidebar-edge-collapse sidebar-edge-collapse-right"
            onClick={() => setShowInspector(false)}
            title="속성 패널 접기"
            aria-label="속성 패널 접기"
          >
            <span>
              <ChevronRight size={14} />
            </span>
          </button>
        </aside>
        ) : (
          <aside
            className="sidebar-rail sidebar-rail-right"
            role="button"
            tabIndex={0}
            onClick={() => setShowInspector(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setShowInspector(true)
              }
            }}
            title="속성 패널 열기"
            aria-label="속성 패널 열기"
          >
            <span
              className="sidebar-rail-button"
              aria-hidden="true"
            >
              <ChevronLeft size={15} />
            </span>
          </aside>
        )}
      </main>

      <footer className="status-bar">
        <span>
          {loading ? '열기 중...' : saveStatus}
          {error ? <span className="status-error">· {error}</span> : null}
        </span>
        <span className="status-center">
          <span className="status-nav">
            <EditorIconButton
              type="button"
              className="status-nav-btn"
              onClick={() => handleViewerCommand('previous-page')}
              title="이전 페이지"
              aria-label="이전 페이지"
              disabled={!loadedPdf || (currentPage || 1) <= 1}
            >
              <ChevronLeft size={15} />
            </EditorIconButton>
            <span>{loadedPdf ? `${currentPage || 1} / ${loadedPdf.pageCount}` : '-'}</span>
            <EditorIconButton
              type="button"
              className="status-nav-btn"
              onClick={() => handleViewerCommand('next-page')}
              title="다음 페이지"
              aria-label="다음 페이지"
              disabled={!loadedPdf || (currentPage || 1) >= (loadedPdf?.pageCount ?? 1)}
            >
              <ChevronRight size={15} />
            </EditorIconButton>
          </span>
        </span>
        <span className="status-right">
          <span className="status-zoom-group">
            <EditorIconButton
              type="button"
              className="status-nav-btn"
              onClick={() => handleViewerCommand('zoom-out')}
              title="축소 (⌘-)"
              aria-label="축소"
              disabled={!loadedPdf}
            >
              <ZoomOut size={14} />
            </EditorIconButton>
            <EditorButton
              type="button"
              className="status-zoom"
              onClick={() => handleViewerCommand('actual-size')}
              title="실제 크기 (⌘0)"
              disabled={!loadedPdf}
            >
              {toPercent(scale)}
            </EditorButton>
            <EditorIconButton
              type="button"
              className="status-nav-btn"
              onClick={() => handleViewerCommand('zoom-in')}
              title="확대 (⌘+)"
              aria-label="확대"
              disabled={!loadedPdf}
            >
              <ZoomIn size={14} />
            </EditorIconButton>
          </span>
        </span>
      </footer>

      {mathInput && mathInitial ? (
        <MathInputModal
          mode={mathInput.mode}
          initialLatex={mathInitial.latex}
          initialDisplayMode={mathInitial.displayMode}
          onApply={handleApplyMath}
          onCancel={handleCancelMath}
        />
      ) : null}
    </div>
    </TooltipProvider>
  )
}
