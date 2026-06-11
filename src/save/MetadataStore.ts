import { createOverlayObjectStore } from '../overlay/OverlayObjectStore'
import type { OverlayObject } from '../overlay/OverlayObject'

export type PdfanMetadata = {
  schemaVersion: 1
  app: 'PDFan'
  sourcePdfPath: string
  savedAt: string
  basePdfDataBase64?: string
  objects: OverlayObject[]
}

const getRestartEditableObjects = (objects: OverlayObject[]) =>
  objects.filter((object) => object.type !== 'image')

export const getMetadataPathForPdf = (pdfPath: string) =>
  pdfPath.toLowerCase().endsWith('.pdf') ? pdfPath.replace(/\.pdf$/i, '.pdfedit.json') : `${pdfPath}.pdfedit.json`

export const createPdfanMetadata = ({
  sourcePdfPath,
  objects,
  savedAt = new Date().toISOString(),
  basePdfDataBase64,
}: {
  sourcePdfPath: string
  objects: OverlayObject[]
  savedAt?: string
  basePdfDataBase64?: string
}): PdfanMetadata => ({
  schemaVersion: 1,
  app: 'PDFan',
  sourcePdfPath,
  savedAt,
  basePdfDataBase64,
  objects: getRestartEditableObjects(objects),
})

export const isPdfanMetadata = (value: unknown): value is PdfanMetadata => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const metadata = value as PdfanMetadata

  return (
    metadata.schemaVersion === 1 &&
    metadata.app === 'PDFan' &&
    typeof metadata.sourcePdfPath === 'string' &&
    typeof metadata.savedAt === 'string' &&
    Array.isArray(metadata.objects)
  )
}

export const overlayStoreFromMetadata = (metadata: PdfanMetadata) =>
  createOverlayObjectStore(getRestartEditableObjects(metadata.objects), false)
