import { describe, expect, it } from 'vitest'
import type { OverlayObject } from '@/overlay/OverlayObject'
import {
  createPdfanMetadata,
  getMetadataPathForPdf,
  isPdfanMetadata,
  overlayStoreFromMetadata,
} from './MetadataStore'

describe('MetadataStore', () => {
  it('derives the .pdfedit.json path next to the target PDF', () => {
    expect(getMetadataPathForPdf('/tmp/exam.pdf')).toBe('/tmp/exam.pdfedit.json')
  })

  it('stores overlays as the re-editing layer and restores a clean overlay store', () => {
    const object: OverlayObject = {
      id: 'text-1',
      type: 'text',
      pageIndex: 0,
      frame: { x: 10, y: 20, width: 120, height: 60 },
      zIndex: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      contentHtml: '<p>안녕 hello</p>',
      style: {
        fontSize: 16,
        textColor: '#111827',
        backgroundColor: '#ffffff',
        borderColor: '#2563eb',
        padding: 8,
        textAlign: 'left',
      },
    }
    const metadata = createPdfanMetadata({
      sourcePdfPath: '/tmp/exam.pdf',
      objects: [object],
    })
    const store = overlayStoreFromMetadata(metadata)

    expect(metadata.schemaVersion).toBe(1)
    expect(metadata.objects).toEqual([object])
    expect(store.objects).toEqual([object])
    expect(store.isDirty).toBe(false)
  })

  it('rejects invalid metadata without throwing', () => {
    expect(isPdfanMetadata(null)).toBe(false)
    expect(isPdfanMetadata({ schemaVersion: 1, app: 'PDFan' })).toBe(false)
    expect(
      isPdfanMetadata({
        schemaVersion: 1,
        app: 'PDFan',
        sourcePdfPath: '/tmp/exam.pdf',
        savedAt: '2026-01-01T00:00:00.000Z',
        objects: [],
      }),
    ).toBe(true)
  })
})
