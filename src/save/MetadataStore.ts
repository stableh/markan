import { createOverlayObjectStore } from '../overlay/OverlayObjectStore'
import type { OverlayObject } from '../overlay/OverlayObject'

export type MarkanMetadata = {
  schemaVersion: 1
  app: 'MarkAn'
  sourcePdfPath: string
  savedAt: string
  basePdfDataBase64?: string
  objects: OverlayObject[]
}

const getRestartEditableObjects = (objects: OverlayObject[]) =>
  objects.filter((object) => object.type !== 'image')

export const getMetadataPathForPdf = (pdfPath: string) =>
  pdfPath.toLowerCase().endsWith('.pdf') ? pdfPath.replace(/\.pdf$/i, '.pdfedit.json') : `${pdfPath}.pdfedit.json`

export const createMarkanMetadata = ({
  sourcePdfPath,
  objects,
  savedAt = new Date().toISOString(),
  basePdfDataBase64,
}: {
  sourcePdfPath: string
  objects: OverlayObject[]
  savedAt?: string
  basePdfDataBase64?: string
}): MarkanMetadata => ({
  schemaVersion: 1,
  app: 'MarkAn',
  sourcePdfPath,
  savedAt,
  basePdfDataBase64,
  objects: getRestartEditableObjects(objects),
})

export const isMarkanMetadata = (value: unknown): value is MarkanMetadata => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const metadata = value as MarkanMetadata

  return (
    metadata.schemaVersion === 1 &&
    metadata.app === 'MarkAn' &&
    typeof metadata.sourcePdfPath === 'string' &&
    typeof metadata.savedAt === 'string' &&
    Array.isArray(metadata.objects)
  )
}

export const overlayStoreFromMetadata = (metadata: MarkanMetadata) =>
  createOverlayObjectStore(getRestartEditableObjects(metadata.objects), false)
