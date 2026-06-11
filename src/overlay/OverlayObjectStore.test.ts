import { describe, expect, it } from 'vitest'
import {
  createOverlayObjectStore,
  deleteEmptyTextObject,
  deleteOverlayObject,
  moveOverlayObject,
  resizeOverlayObject,
  updateOverlayObjectFrame,
  updateHighlightObjectStyle,
  updateInkObjectStyle,
  updateShapeObjectStyle,
  updateTextObjectContent,
  updateTextObjectStyle,
} from './OverlayObjectStore'

describe('OverlayObjectStore', () => {
  it('creates placeholder objects with frames stored in PDF page coordinates', () => {
    const store = createOverlayObjectStore()
    const next = store.addPlaceholderObject(2, { x: 120, y: 80, width: 180, height: 90 })

    expect(next.objects[0]).toMatchObject({
      pageIndex: 2,
      type: 'placeholder',
      frame: { x: 120, y: 80, width: 180, height: 90 },
    })
    expect(next.isDirty).toBe(true)
  })

  it('moves and resizes objects by PDF-coordinate deltas', () => {
    const initial = createOverlayObjectStore().addPlaceholderObject(0, {
      x: 100,
      y: 100,
      width: 100,
      height: 80,
    })
    const id = initial.objects[0].id
    const moved = moveOverlayObject(initial, id, { dx: 15, dy: -10 })
    const resized = resizeOverlayObject(moved, id, 'bottom-right', { dx: 20, dy: 30 })

    expect(resized.objects[0].frame).toEqual({ x: 115, y: 90, width: 120, height: 110 })
    expect(resized.isDirty).toBe(true)
  })

  it('preserves pageIndex while moving and resizing an object', () => {
    const initial = createOverlayObjectStore().addPlaceholderObject(3, {
      x: 25,
      y: 35,
      width: 80,
      height: 60,
    })
    const id = initial.objects[0].id
    const moved = moveOverlayObject(initial, id, { dx: 10, dy: 20 })
    const resized = resizeOverlayObject(moved, id, 'top-left', { dx: -5, dy: -10 })

    expect(resized.objects[0].pageIndex).toBe(3)
    expect(resized.objects[0].frame).toEqual({ x: 30, y: 45, width: 85, height: 70 })
  })

  it('deletes selected objects and keeps unrelated objects', () => {
    const first = createOverlayObjectStore().addPlaceholderObject(0, { x: 0, y: 0, width: 80, height: 60 })
    const second = first.addPlaceholderObject(1, { x: 10, y: 10, width: 80, height: 60 })
    const deleted = deleteOverlayObject(second, first.objects[0].id)

    expect(deleted.objects).toHaveLength(1)
    expect(deleted.objects[0].id).toBe(second.objects[1].id)
    expect(deleted.isDirty).toBe(true)
  })

  it('creates text objects with rich text defaults and PDF-coordinate frames', () => {
    const next = createOverlayObjectStore().addTextObject(1, { x: 40, y: 50, width: 220, height: 120 })

    expect(next.objects[0]).toMatchObject({
      pageIndex: 1,
      type: 'text',
      frame: { x: 40, y: 50, width: 220, height: 120 },
      contentHtml: '',
      style: {
        fontSize: 16,
        textColor: '#111827',
        backgroundColor: '#ffffff',
        borderColor: 'transparent',
        padding: 8,
        textAlign: 'left',
      },
    })
    expect(next.isDirty).toBe(true)
  })

  it('commits text content and style changes as dirty updates', () => {
    const initial = createOverlayObjectStore().addTextObject(0, { x: 0, y: 0, width: 220, height: 120 })
    const id = initial.objects[0].id
    const withContent = updateTextObjectContent(initial, id, '<p>안녕 hello</p>')
    const withStyle = updateTextObjectStyle(withContent, id, { fontSize: 20, textAlign: 'center' })

    expect(withStyle.objects[0]).toMatchObject({
      contentHtml: '<p>안녕 hello</p>',
      style: expect.objectContaining({ fontSize: 20, textAlign: 'center' }),
    })
    expect(withStyle.isDirty).toBe(true)
  })

  it('removes empty text boxes on blur but keeps non-empty text boxes', () => {
    const initial = createOverlayObjectStore().addTextObject(0, { x: 0, y: 0, width: 220, height: 120 })
    const id = initial.objects[0].id

    expect(deleteEmptyTextObject(initial, id).objects).toHaveLength(0)

    const nonEmpty = updateTextObjectContent(initial, id, '<p>text</p>')
    expect(deleteEmptyTextObject(nonEmpty, id).objects).toHaveLength(1)
  })

  it('creates image objects with PDF-coordinate frames and intrinsic image data', () => {
    const next = createOverlayObjectStore().addImageObject(
      0,
      { x: 40, y: 50, width: 200, height: 100 },
      {
        fileName: 'diagram.png',
        mimeType: 'image/png',
        data: new Uint8Array([1, 2, 3]),
        naturalWidth: 400,
        naturalHeight: 200,
      },
    )

    expect(next.objects[0]).toMatchObject({
      type: 'image',
      pageIndex: 0,
      frame: { x: 40, y: 50, width: 200, height: 100 },
      image: {
        fileName: 'diagram.png',
        mimeType: 'image/png',
        naturalWidth: 400,
        naturalHeight: 200,
      },
    })
    expect(next.isDirty).toBe(true)
  })

  it('preserves image aspect ratio when resizing', () => {
    const initial = createOverlayObjectStore().addImageObject(
      0,
      { x: 0, y: 0, width: 200, height: 100 },
      {
        fileName: 'diagram.jpg',
        mimeType: 'image/jpeg',
        data: new Uint8Array([1, 2, 3]),
        naturalWidth: 400,
        naturalHeight: 200,
      },
    )
    const id = initial.objects[0].id
    const resized = resizeOverlayObject(initial, id, 'bottom-right', { dx: 100, dy: 10 })

    expect(resized.objects[0].frame).toMatchObject({ width: 300, height: 150 })
  })

  it('updates image frames from Inspector values as PDF-coordinate dirty updates', () => {
    const initial = createOverlayObjectStore().addImageObject(
      1,
      { x: 10, y: 20, width: 200, height: 100 },
      {
        fileName: 'diagram.png',
        mimeType: 'image/png',
        data: new Uint8Array([1, 2, 3]),
        naturalWidth: 400,
        naturalHeight: 200,
      },
    )
    const id = initial.objects[0].id
    const updated = updateOverlayObjectFrame(initial, id, { x: 30, y: 40, width: 240, height: 120 })

    expect(updated.objects[0]).toMatchObject({
      pageIndex: 1,
      frame: { x: 30, y: 40, width: 240, height: 120 },
    })
    expect(updated.isDirty).toBe(true)
  })

  it('creates highlight objects with PDF-coordinate rects and editable style', () => {
    const next = createOverlayObjectStore().addHighlightObject(
      2,
      [
        { x: 40, y: 50, width: 120, height: 18 },
        { x: 40, y: 74, width: 80, height: 18 },
      ],
      { color: '#facc15', opacity: 0.45 },
    )
    const id = next.objects[0].id
    const updated = updateHighlightObjectStyle(next, id, { opacity: 0.6 })

    expect(next.objects[0]).toMatchObject({
      type: 'highlight',
      pageIndex: 2,
      rects: [
        { x: 40, y: 50, width: 120, height: 18 },
        { x: 40, y: 74, width: 80, height: 18 },
      ],
      style: { color: '#facc15', opacity: 0.45 },
    })
    expect(updated.objects[0]).toMatchObject({
      style: { color: '#facc15', opacity: 0.6 },
    })
    expect(updated.isDirty).toBe(true)
  })

  it('creates ink objects with PDF-coordinate points and editable style', () => {
    const next = createOverlayObjectStore().addInkObject(
      1,
      [
        { x: 10, y: 20 },
        { x: 20, y: 30 },
        { x: 32, y: 28 },
      ],
      { color: '#ef4444', width: 4, opacity: 0.75 },
    )
    const id = next.objects[0].id
    const updated = updateInkObjectStyle(next, id, { width: 6 })

    expect(next.objects[0]).toMatchObject({
      type: 'ink',
      pageIndex: 1,
      points: [
        { x: 10, y: 20 },
        { x: 20, y: 30 },
        { x: 32, y: 28 },
      ],
      style: { color: '#ef4444', width: 4, opacity: 0.75 },
    })
    expect(updated.objects[0]).toMatchObject({
      style: { color: '#ef4444', width: 6, opacity: 0.75 },
    })
    expect(updated.isDirty).toBe(true)
  })

  it('creates rectangle and ellipse shape objects with PDF-coordinate frames and editable style', () => {
    const style = {
      strokeColor: '#111827',
      fillColor: '#fef3c7',
      lineWidth: 3,
      lineStyle: 'solid' as const,
      opacity: 0.8,
    }
    const withRectangle = createOverlayObjectStore().addShapeObject(
      0,
      { kind: 'rectangle', frame: { x: 20, y: 30, width: 120, height: 80 }, style },
    )
    const withEllipse = withRectangle.addShapeObject(
      1,
      { kind: 'ellipse', frame: { x: 40, y: 50, width: 90, height: 60 }, style },
    )
    const updated = updateShapeObjectStyle(withEllipse, withRectangle.objects[0].id, {
      fillColor: null,
      lineStyle: 'dashed',
    })

    expect(withEllipse.objects[0]).toMatchObject({
      type: 'shape',
      pageIndex: 0,
      kind: 'rectangle',
      frame: { x: 20, y: 30, width: 120, height: 80 },
      style,
    })
    expect(withEllipse.objects[1]).toMatchObject({
      type: 'shape',
      pageIndex: 1,
      kind: 'ellipse',
      frame: { x: 40, y: 50, width: 90, height: 60 },
    })
    expect(updated.objects[0]).toMatchObject({
      style: { ...style, fillColor: null, lineStyle: 'dashed' },
    })
    expect(updated.isDirty).toBe(true)
  })

  it('creates line and arrow shape objects with PDF-coordinate start and end points', () => {
    const style = {
      strokeColor: '#2563eb',
      fillColor: null,
      lineWidth: 4,
      lineStyle: 'dashed' as const,
      opacity: 0.9,
    }
    const withLine = createOverlayObjectStore().addShapeObject(0, {
      kind: 'line',
      start: { x: 20, y: 30 },
      end: { x: 120, y: 90 },
      style,
    })
    const withArrow = withLine.addShapeObject(0, {
      kind: 'arrow',
      start: { x: 140, y: 80 },
      end: { x: 80, y: 130 },
      style,
    })
    const moved = moveOverlayObject(withArrow, withLine.objects[0].id, { dx: 5, dy: -10 })
    const resized = resizeOverlayObject(moved, withLine.objects[0].id, 'bottom-right', { dx: 20, dy: 10 })

    expect(withArrow.objects[0]).toMatchObject({
      type: 'shape',
      kind: 'line',
      frame: { x: 20, y: 30, width: 100, height: 60 },
      start: { x: 20, y: 30 },
      end: { x: 120, y: 90 },
    })
    expect(withArrow.objects[1]).toMatchObject({
      type: 'shape',
      kind: 'arrow',
      frame: { x: 80, y: 80, width: 60, height: 50 },
      start: { x: 140, y: 80 },
      end: { x: 80, y: 130 },
    })
    expect(moved.objects[0]).toMatchObject({
      start: { x: 25, y: 20 },
      end: { x: 125, y: 80 },
    })
    expect(resized.objects[0]).toMatchObject({
      start: { x: 25, y: 20 },
      end: { x: 145, y: 90 },
    })
  })
})
