import { createOverlayObjectStore, type OverlayObjectStore } from '../overlay/OverlayObjectStore'
import type {
  HighlightOverlayObject,
  ImageOverlayObject,
  InkOverlayObject,
  MathOverlayObject,
  ShapeOverlayObject,
  TextOverlayObject,
} from '../overlay/OverlayObject'
import type {
  FlattenHighlight,
  FlattenImage,
  FlattenInk,
  FlattenShape,
  FlattenTextImage,
} from './FlattenRenderer'
import { createPdfanMetadata } from './MetadataStore'

export type SaveMode = 'direct' | 'save-as'

export type SaveBridgeResult =
  | {
      canceled: true
    }
  | {
      canceled: false
      fileName: string
      filePath: string
      data: Uint8Array
    }

export type SaveBridge = {
  savePdf: (request: SavePdfBridgeRequest) => Promise<SaveBridgeResult>
}

export type SavePdfBridgeRequest = {
  mode: SaveMode
  currentPath: string
  basePdfBytes: Uint8Array
  textImages: FlattenTextImage[]
  imageOverlays: FlattenImage[]
  highlightOverlays: FlattenHighlight[]
  inkOverlays: FlattenInk[]
  shapeOverlays: FlattenShape[]
  metadata: ReturnType<typeof createPdfanMetadata>
}

export type SaveDocumentRequest = {
  mode: SaveMode
  currentPath: string
  basePdfBytes: Uint8Array
  overlayStore: OverlayObjectStore
  bridge: SaveBridge
  renderTextImages: (objects: TextOverlayObject[]) => Promise<FlattenTextImage[]>
  renderMathImages?: (objects: MathOverlayObject[]) => Promise<FlattenTextImage[]>
}

export type SaveDocumentResult =
  | {
      status: 'canceled'
    }
  | {
      status: 'saved'
      fileName: string
      filePath: string
      data: Uint8Array
      overlayStore: OverlayObjectStore
    }

export const saveDocument = async ({
  mode,
  currentPath,
  basePdfBytes,
  overlayStore,
  bridge,
  renderTextImages,
  renderMathImages,
}: SaveDocumentRequest): Promise<SaveDocumentResult> => {
  const textObjects = overlayStore.objects.filter(
    (object): object is TextOverlayObject => object.type === 'text',
  )
  const mathObjects = overlayStore.objects.filter(
    (object): object is MathOverlayObject => object.type === 'math',
  )
  const imageObjects = overlayStore.objects.filter(
    (object): object is ImageOverlayObject => object.type === 'image',
  )
  const highlightObjects = overlayStore.objects.filter(
    (object): object is HighlightOverlayObject => object.type === 'highlight',
  )
  const inkObjects = overlayStore.objects.filter(
    (object): object is InkOverlayObject => object.type === 'ink',
  )
  const shapeObjects = overlayStore.objects.filter(
    (object): object is ShapeOverlayObject => object.type === 'shape',
  )
  // Math boxes flatten as PNG images on the same path as rich text — base PDF + current
  // overlays every save, so repeated saves never duplicate-stamp.
  const [renderedTextImages, renderedMathImages] = await Promise.all([
    renderTextImages(textObjects),
    renderMathImages ? renderMathImages(mathObjects) : Promise.resolve([]),
  ])
  const textImages = [...renderedTextImages, ...renderedMathImages]
  const imageOverlays = imageObjects.map((object) => ({
    objectId: object.id,
    pageIndex: object.pageIndex,
    frame: object.frame,
    mimeType: object.image.mimeType,
    data: object.image.data,
  }))
  const highlightOverlays = highlightObjects.map((object) => ({
    objectId: object.id,
    pageIndex: object.pageIndex,
    rects: object.rects,
    color: object.style.color,
    opacity: object.style.opacity,
  }))
  const inkOverlays = inkObjects.map((object) => ({
    objectId: object.id,
    pageIndex: object.pageIndex,
    points: object.points,
    color: object.style.color,
    width: object.style.width,
    opacity: object.style.opacity,
  }))
  const shapeOverlays = shapeObjects.map((object) => ({
    objectId: object.id,
    pageIndex: object.pageIndex,
    kind: object.kind,
    frame: object.frame,
    start: object.start,
    end: object.end,
    style: object.style,
  }))
  const metadata = createPdfanMetadata({
    sourcePdfPath: currentPath,
    objects: overlayStore.objects,
  })
  const result = await bridge.savePdf({
    mode,
    currentPath,
    basePdfBytes,
    textImages,
    imageOverlays,
    highlightOverlays,
    inkOverlays,
    shapeOverlays,
    metadata,
  })

  if (result.canceled) {
    return { status: 'canceled' }
  }

  return {
    status: 'saved',
    fileName: result.fileName,
    filePath: result.filePath,
    data: result.data,
    overlayStore: createOverlayObjectStore(overlayStore.objects, false),
  }
}
