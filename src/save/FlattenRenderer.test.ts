import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import type { FlattenHighlight, FlattenImage, FlattenInk, FlattenShape, FlattenTextImage } from './FlattenRenderer'
import { createPdfDrawInstruction, flattenTextImagesOntoPdf } from './FlattenRenderer'

describe('FlattenRenderer', () => {
  it('converts top-left PDF page frame into pdf-lib bottom-left draw coordinates', () => {
    const image: FlattenTextImage = {
      objectId: 'text-1',
      pageIndex: 0,
      frame: { x: 20, y: 40, width: 180, height: 90 },
      pngData: new Uint8Array([1, 2, 3]),
    }

    expect(createPdfDrawInstruction(image, { width: 612, height: 792 })).toEqual({
      pageIndex: 0,
      x: 20,
      y: 662,
      width: 180,
      height: 90,
      pngData: image.pngData,
    })
  })

  it('repeatedly flattens from the same base PDF without growing the output', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = await pdf.save()
    const image: FlattenTextImage = {
      objectId: 'text-1',
      pageIndex: 0,
      frame: { x: 20, y: 30, width: 40, height: 20 },
      pngData: new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
        8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255,
        31, 0, 3, 3, 2, 0, 239, 191, 167, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    }
    const first = await flattenTextImagesOntoPdf(basePdfBytes, [image])
    const second = await flattenTextImagesOntoPdf(basePdfBytes, [image])
    const third = await flattenTextImagesOntoPdf(basePdfBytes, [image])

    expect(first.byteLength).toBe(second.byteLength)
    expect(second.byteLength).toBe(third.byteLength)
  })

  it('flattens png image overlays onto the base PDF', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = await pdf.save()
    const image: FlattenImage = {
      objectId: 'image-1',
      pageIndex: 0,
      frame: { x: 20, y: 30, width: 40, height: 20 },
      mimeType: 'image/png',
      data: new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
        8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255,
        31, 0, 3, 3, 2, 0, 239, 191, 167, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    }

    const output = await flattenTextImagesOntoPdf(basePdfBytes, [], [image])
    const loaded = await PDFDocument.load(output)

    expect(output.byteLength).toBeGreaterThan(basePdfBytes.byteLength)
    expect(loaded.getPageCount()).toBe(1)
  })

  it('flattens highlight and ink overlays from the same base PDF without duplicate growth', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = await pdf.save()
    const highlight: FlattenHighlight = {
      objectId: 'highlight-1',
      pageIndex: 0,
      rects: [
        { x: 20, y: 30, width: 90, height: 16 },
        { x: 20, y: 52, width: 70, height: 16 },
      ],
      color: '#facc15',
      opacity: 0.45,
    }
    const ink: FlattenInk = {
      objectId: 'ink-1',
      pageIndex: 0,
      points: [
        { x: 30, y: 120 },
        { x: 60, y: 140 },
        { x: 100, y: 130 },
      ],
      color: '#2563eb',
      width: 4,
      opacity: 0.8,
    }

    const first = await flattenTextImagesOntoPdf(basePdfBytes, [], [], [highlight], [ink])
    const second = await flattenTextImagesOntoPdf(basePdfBytes, [], [], [highlight], [ink])
    const loaded = await PDFDocument.load(first)

    expect(first.byteLength).toBe(second.byteLength)
    expect(first.byteLength).toBeGreaterThan(basePdfBytes.byteLength)
    expect(loaded.getPageCount()).toBe(1)
  })

  it('flattens shape overlays from the same base PDF without duplicate growth', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = await pdf.save()
    const shapes: FlattenShape[] = [
      {
        objectId: 'rectangle-1',
        pageIndex: 0,
        kind: 'rectangle',
        frame: { x: 20, y: 30, width: 90, height: 50 },
        style: { strokeColor: '#111827', fillColor: '#fef3c7', lineWidth: 3, lineStyle: 'solid', opacity: 0.8 },
      },
      {
        objectId: 'ellipse-1',
        pageIndex: 0,
        kind: 'ellipse',
        frame: { x: 120, y: 30, width: 70, height: 50 },
        style: { strokeColor: '#ef4444', fillColor: null, lineWidth: 2, lineStyle: 'dashed', opacity: 0.7 },
      },
      {
        objectId: 'line-1',
        pageIndex: 0,
        kind: 'line',
        frame: { x: 30, y: 110, width: 90, height: 40 },
        start: { x: 30, y: 110 },
        end: { x: 120, y: 150 },
        style: { strokeColor: '#2563eb', fillColor: null, lineWidth: 4, lineStyle: 'solid', opacity: 0.9 },
      },
      {
        objectId: 'arrow-1',
        pageIndex: 0,
        kind: 'arrow',
        frame: { x: 150, y: 120, width: 70, height: 30 },
        start: { x: 150, y: 150 },
        end: { x: 220, y: 120 },
        style: { strokeColor: '#16a34a', fillColor: null, lineWidth: 4, lineStyle: 'solid', opacity: 1 },
      },
    ]

    const first = await flattenTextImagesOntoPdf(basePdfBytes, [], [], [], [], shapes)
    const second = await flattenTextImagesOntoPdf(basePdfBytes, [], [], [], [], shapes)
    const loaded = await PDFDocument.load(first)

    expect(first.byteLength).toBe(second.byteLength)
    expect(first.byteLength).toBeGreaterThan(basePdfBytes.byteLength)
    expect(loaded.getPageCount()).toBe(1)
  })

  it('writes rectangle/ellipse as editable native annotations with appearance streams', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([300, 200])
    const basePdfBytes = await pdf.save()
    const shapes: FlattenShape[] = [
      {
        objectId: 'rectangle-1',
        pageIndex: 0,
        kind: 'rectangle',
        frame: { x: 20, y: 30, width: 90, height: 50 },
        style: { strokeColor: '#111827', fillColor: '#fef3c7', lineWidth: 3, lineStyle: 'solid', opacity: 0.8 },
      },
      {
        objectId: 'ellipse-1',
        pageIndex: 0,
        kind: 'ellipse',
        frame: { x: 120, y: 30, width: 70, height: 50 },
        style: { strokeColor: '#ef4444', fillColor: null, lineWidth: 2, lineStyle: 'dashed', opacity: 0.7 },
      },
      {
        objectId: 'line-1',
        pageIndex: 0,
        kind: 'line',
        frame: { x: 30, y: 110, width: 90, height: 40 },
        start: { x: 30, y: 110 },
        end: { x: 120, y: 150 },
        style: { strokeColor: '#2563eb', fillColor: null, lineWidth: 4, lineStyle: 'solid', opacity: 0.9 },
      },
    ]

    const output = await flattenTextImagesOntoPdf(basePdfBytes, [], [], [], [], shapes)
    const loaded = await PDFDocument.load(output)
    const annots = loaded.getPage(0).node.Annots()

    // Rectangle + ellipse become annotations; the line stays flattened (no annotation).
    expect(annots?.size()).toBe(2)

    const subtypes = (annots?.asArray() ?? []).map((ref) => {
      const dict = loaded.context.lookup(ref, PDFDict)
      return dict.get(PDFName.of('Subtype'))?.toString()
    })
    expect(subtypes).toContain('/Square')
    expect(subtypes).toContain('/Circle')

    // Each annotation carries an appearance stream so it renders without app-side synthesis.
    for (const ref of annots?.asArray() ?? []) {
      const dict = loaded.context.lookup(ref, PDFDict)
      expect(dict.get(PDFName.of('AP'))).toBeDefined()
    }
  })
})
