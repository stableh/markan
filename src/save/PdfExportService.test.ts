import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import type { FlattenImage, FlattenTextImage } from './FlattenRenderer'
import { createPdfExportArtifacts } from './PdfExportService'

const onePixelPng = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
  8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255,
  31, 0, 3, 3, 2, 0, 239, 191, 167, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
])

describe('PdfExportService', () => {
  it('creates a restart base PDF with image overlays baked in but editable overlays excluded', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = new Uint8Array(await pdf.save())
    const imageOverlay: FlattenImage = {
      objectId: 'image-1',
      pageIndex: 0,
      frame: { x: 20, y: 30, width: 40, height: 20 },
      mimeType: 'image/png',
      opacity: 1,
      data: onePixelPng,
    }
    const textImage: FlattenTextImage = {
      objectId: 'text-1',
      pageIndex: 0,
      frame: { x: 80, y: 30, width: 40, height: 20 },
      pngData: onePixelPng,
    }

    const artifacts = await createPdfExportArtifacts({
      basePdfBytes,
      textImages: [textImage],
      imageOverlays: [imageOverlay],
      highlightOverlays: [],
      inkOverlays: [],
      shapeOverlays: [],
    })

    expect(artifacts.restartBasePdfBytes.byteLength).toBeGreaterThan(basePdfBytes.byteLength)
    expect(artifacts.outputPdfBytes.byteLength).toBeGreaterThanOrEqual(
      artifacts.restartBasePdfBytes.byteLength,
    )
    expect(Array.from(artifacts.restartBasePdfBytes)).not.toEqual(Array.from(artifacts.outputPdfBytes))
  })

  it('keeps the original restart base when there are no non-editable image overlays', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = new Uint8Array(await pdf.save())

    const artifacts = await createPdfExportArtifacts({
      basePdfBytes,
      textImages: [],
      imageOverlays: [],
      highlightOverlays: [],
      inkOverlays: [],
      shapeOverlays: [],
    })

    expect(Array.from(artifacts.restartBasePdfBytes)).toEqual(Array.from(basePdfBytes))
  })
})
