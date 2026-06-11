import { describe, expect, it } from 'vitest'
import {
  createOverlayObjectStore,
  deleteOverlayObject,
  moveOverlayObject,
  resizeOverlayObject,
  updateOverlayObjectFrame,
  updateHighlightObjectStyle,
  updateImageObjectStyle,
  updateInkObjectStyle,
  updateShapeObjectStyle,
  updateTextObjectContent,
} from '@/overlay/OverlayObjectStore'
import { saveDocument, type SavePdfBridgeRequest } from './SaveManager'

describe('SaveManager', () => {
  it('marks the overlay store clean only after a successful save', async () => {
    const overlayStore = createOverlayObjectStore().addTextObject(0, {
      x: 10,
      y: 20,
      width: 120,
      height: 60,
    })
    const result = await saveDocument({
      mode: 'direct',
      currentPath: '/tmp/exam.pdf',
      basePdfBytes: new Uint8Array([1, 2, 3]),
      overlayStore,
      bridge: {
        savePdf: async () => ({
          canceled: false,
          fileName: 'exam.pdf',
          filePath: '/tmp/exam.pdf',
          data: new Uint8Array([9, 8, 7]),
        }),
      },
      renderTextImages: async () => [],
    })

    expect(result.status).toBe('saved')
    expect(result.status === 'saved' ? result.overlayStore.isDirty : true).toBe(false)
  })

  it('does not clear dirty state when save-as is canceled', async () => {
    const overlayStore = createOverlayObjectStore().addTextObject(0, {
      x: 10,
      y: 20,
      width: 120,
      height: 60,
    })
    const result = await saveDocument({
      mode: 'save-as',
      currentPath: '/tmp/exam.pdf',
      basePdfBytes: new Uint8Array([1, 2, 3]),
      overlayStore,
      bridge: {
        savePdf: async () => ({ canceled: true }),
      },
      renderTextImages: async () => [],
    })

    expect(result).toEqual({ status: 'canceled' })
    expect(overlayStore.isDirty).toBe(true)
  })

  it('preserves dirty overlays when save fails', async () => {
    const overlayStore = createOverlayObjectStore().addTextObject(0, {
      x: 10,
      y: 20,
      width: 120,
      height: 60,
    })

    await expect(
      saveDocument({
        mode: 'direct',
        currentPath: '/tmp/exam.pdf',
        basePdfBytes: new Uint8Array([1, 2, 3]),
        overlayStore,
        bridge: {
          savePdf: async () => {
            throw new Error('disk full')
          },
        },
        renderTextImages: async () => [],
      }),
    ).rejects.toThrow('disk full')

    expect(overlayStore.isDirty).toBe(true)
    expect(overlayStore.objects).toHaveLength(1)
  })

  it('keeps saved text overlays editable in the current session', async () => {
    const overlayStore = createOverlayObjectStore().addTextObject(0, {
      x: 10,
      y: 20,
      width: 120,
      height: 60,
    })
    const objectId = overlayStore.objects[0].id
    const result = await saveDocument({
      mode: 'direct',
      currentPath: '/tmp/exam.pdf',
      basePdfBytes: new Uint8Array([1, 2, 3]),
      overlayStore,
      bridge: {
        savePdf: async () => ({
          canceled: false,
          fileName: 'exam.pdf',
          filePath: '/tmp/exam.pdf',
          data: new Uint8Array([9, 8, 7]),
        }),
      },
      renderTextImages: async () => [],
    })

    expect(result.status).toBe('saved')

    if (result.status !== 'saved') {
      return
    }

    const moved = moveOverlayObject(result.overlayStore, objectId, { dx: 5, dy: 6 })
    const resized = resizeOverlayObject(moved, objectId, 'bottom-right', { dx: 10, dy: 12 })
    const edited = updateTextObjectContent(resized, objectId, '<p>changed</p>')
    const deleted = deleteOverlayObject(edited, objectId)

    expect(result.overlayStore.objects[0].id).toBe(objectId)
    expect(moved.isDirty).toBe(true)
    expect(resized.objects[0].frame).toEqual({ x: 15, y: 26, width: 130, height: 72 })
    expect(edited.objects[0]).toMatchObject({ contentHtml: '<p>changed</p>' })
    expect(deleted.objects).toHaveLength(0)
  })

  it('sends image overlays to flattening and keeps them editable after save', async () => {
    const overlayStore = createOverlayObjectStore().addImageObject(
      0,
      { x: 15, y: 25, width: 120, height: 60 },
      {
        fileName: 'diagram.png',
        mimeType: 'image/png',
        data: new Uint8Array([1, 2, 3]),
        naturalWidth: 240,
        naturalHeight: 120,
      },
    )
    const objectId = overlayStore.objects[0].id
    const styledOverlayStore = updateImageObjectStyle(overlayStore, objectId, { opacity: 0.42 })
    const capturedRequests: SavePdfBridgeRequest[] = []

    const result = await saveDocument({
      mode: 'direct',
      currentPath: '/tmp/exam.pdf',
      basePdfBytes: new Uint8Array([1, 2, 3]),
      overlayStore: styledOverlayStore,
      bridge: {
        savePdf: async (request) => {
          capturedRequests.push(request)
          return {
            canceled: false,
            fileName: 'exam.pdf',
            filePath: '/tmp/exam.pdf',
            data: new Uint8Array([9, 8, 7]),
          }
        },
      },
      renderTextImages: async () => [],
    })

    expect(capturedRequests[0]?.imageOverlays).toHaveLength(1)
    expect(capturedRequests[0]?.imageOverlays[0]).toMatchObject({
      objectId,
      pageIndex: 0,
      frame: { x: 15, y: 25, width: 120, height: 60 },
      mimeType: 'image/png',
      opacity: 0.42,
    })

    expect(result.status).toBe('saved')

    if (result.status !== 'saved') {
      return
    }

    const moved = moveOverlayObject(result.overlayStore, objectId, { dx: 5, dy: 6 })
    const resized = resizeOverlayObject(moved, objectId, 'bottom-right', { dx: 60, dy: 1 })
    const inspected = updateOverlayObjectFrame(resized, objectId, { x: 30, y: 40, width: 180, height: 90 })
    const deleted = deleteOverlayObject(inspected, objectId)

    expect(result.overlayStore.objects[0].id).toBe(objectId)
    expect(result.overlayStore.isDirty).toBe(false)
    expect(resized.objects[0].frame).toMatchObject({ width: 180, height: 90 })
    expect(inspected.isDirty).toBe(true)
    expect(deleted.objects).toHaveLength(0)
  })

  it('sends highlight and ink overlays to flattening and keeps them editable after save', async () => {
    const withHighlight = createOverlayObjectStore().addHighlightObject(
      0,
      [{ x: 15, y: 25, width: 120, height: 18 }],
      { color: '#facc15', opacity: 0.5 },
    )
    const overlayStore = withHighlight.addInkObject(
      0,
      [
        { x: 30, y: 90 },
        { x: 50, y: 110 },
        { x: 75, y: 95 },
      ],
      { color: '#2563eb', width: 3, opacity: 0.8 },
    )
    const highlightId = overlayStore.objects[0].id
    const inkId = overlayStore.objects[1].id
    const capturedRequests: SavePdfBridgeRequest[] = []

    const result = await saveDocument({
      mode: 'direct',
      currentPath: '/tmp/exam.pdf',
      basePdfBytes: new Uint8Array([1, 2, 3]),
      overlayStore,
      bridge: {
        savePdf: async (request) => {
          capturedRequests.push(request)
          return {
            canceled: false,
            fileName: 'exam.pdf',
            filePath: '/tmp/exam.pdf',
            data: new Uint8Array([9, 8, 7]),
          }
        },
      },
      renderTextImages: async () => [],
    })

    expect(capturedRequests[0]?.highlightOverlays).toEqual([
      {
        objectId: highlightId,
        pageIndex: 0,
        rects: [{ x: 15, y: 25, width: 120, height: 18 }],
        color: '#facc15',
        opacity: 0.5,
      },
    ])
    expect(capturedRequests[0]?.inkOverlays).toEqual([
      {
        objectId: inkId,
        pageIndex: 0,
        points: [
          { x: 30, y: 90 },
          { x: 50, y: 110 },
          { x: 75, y: 95 },
        ],
        color: '#2563eb',
        width: 3,
        opacity: 0.8,
      },
    ])
    expect(result.status).toBe('saved')

    if (result.status !== 'saved') {
      return
    }

    const updatedHighlight = updateHighlightObjectStyle(result.overlayStore, highlightId, {
      color: '#fde047',
    })
    const updatedInk = updateInkObjectStyle(updatedHighlight, inkId, { opacity: 0.6 })
    const deletedHighlight = deleteOverlayObject(updatedInk, highlightId)
    const deletedInk = deleteOverlayObject(deletedHighlight, inkId)

    expect(result.overlayStore.isDirty).toBe(false)
    expect(updatedHighlight.isDirty).toBe(true)
    expect(updatedInk.objects[1]).toMatchObject({ style: { color: '#2563eb', width: 3, opacity: 0.6 } })
    expect(deletedInk.objects).toHaveLength(0)
  })

  it('sends shape overlays to flattening and keeps them editable after save', async () => {
    const style = {
      strokeColor: '#111827',
      fillColor: '#fef3c7',
      lineWidth: 3,
      lineStyle: 'solid' as const,
      opacity: 0.8,
    }
    const withRectangle = createOverlayObjectStore().addShapeObject(0, {
      kind: 'rectangle',
      frame: { x: 10, y: 20, width: 120, height: 80 },
      style,
    })
    const overlayStore = withRectangle.addShapeObject(0, {
      kind: 'arrow',
      start: { x: 160, y: 40 },
      end: { x: 220, y: 100 },
      style: { ...style, fillColor: null },
    })
    const rectangleId = overlayStore.objects[0].id
    const arrowId = overlayStore.objects[1].id
    const capturedRequests: SavePdfBridgeRequest[] = []

    const result = await saveDocument({
      mode: 'direct',
      currentPath: '/tmp/exam.pdf',
      basePdfBytes: new Uint8Array([1, 2, 3]),
      overlayStore,
      bridge: {
        savePdf: async (request) => {
          capturedRequests.push(request)
          return {
            canceled: false,
            fileName: 'exam.pdf',
            filePath: '/tmp/exam.pdf',
            data: new Uint8Array([9, 8, 7]),
          }
        },
      },
      renderTextImages: async () => [],
    })

    expect(capturedRequests[0]?.shapeOverlays).toEqual([
      {
        objectId: rectangleId,
        pageIndex: 0,
        kind: 'rectangle',
        frame: { x: 10, y: 20, width: 120, height: 80 },
        style,
      },
      {
        objectId: arrowId,
        pageIndex: 0,
        kind: 'arrow',
        frame: { x: 160, y: 40, width: 60, height: 60 },
        start: { x: 160, y: 40 },
        end: { x: 220, y: 100 },
        style: { ...style, fillColor: null },
      },
    ])
    expect(result.status).toBe('saved')

    if (result.status !== 'saved') {
      return
    }

    const moved = moveOverlayObject(result.overlayStore, rectangleId, { dx: 5, dy: 6 })
    const resized = resizeOverlayObject(moved, rectangleId, 'bottom-right', { dx: 10, dy: 12 })
    const styled = updateShapeObjectStyle(resized, rectangleId, { opacity: 0.5 })
    const deleted = deleteOverlayObject(styled, rectangleId)

    expect(result.overlayStore.isDirty).toBe(false)
    expect(moved.isDirty).toBe(true)
    expect(resized.objects[0].frame).toEqual({ x: 15, y: 26, width: 130, height: 92 })
    expect(styled.objects[0]).toMatchObject({ style: { ...style, opacity: 0.5 } })
    expect(deleted.objects).toHaveLength(1)
  })
})
