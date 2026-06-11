import { describe, expect, it } from 'vitest'
import {
  createMathFrame,
  createOverlayObjectStore,
  deleteOverlayObject,
  moveOverlayObject,
  reorderOverlayObject,
  resizeOverlayObject,
  updateMathObjectContent,
  updateMathObjectStyle,
} from './OverlayObjectStore'

const seed = () =>
  createOverlayObjectStore().addMathObject(
    1,
    createMathFrame({ x: 50, y: 60 }, { width: 120, height: 40 }),
    { latex: 'E=mc^2', displayMode: false },
  )

describe('math overlay store', () => {
  it('adds a math object in PDF coordinates with defaults and marks dirty', () => {
    const store = seed()
    expect(store.isDirty).toBe(true)

    const object = store.objects[0]
    expect(object.type).toBe('math')
    expect(object.pageIndex).toBe(1)
    expect(object.frame).toEqual({ x: 50, y: 60, width: 120, height: 40 })

    if (object.type === 'math') {
      expect(object.latex).toBe('E=mc^2')
      expect(object.displayMode).toBe(false)
      expect(object.fontSize).toBe(18)
      expect(object.color).toBe('#111827')
      expect(object.backgroundColor).toBe('transparent')
      expect(object.opacity).toBe(1)
    }
  })

  it('preserves the raw latex and updates display mode', () => {
    const store = seed()
    const id = store.objects[0].id
    const next = updateMathObjectContent(store, id, { latex: '\\frac{a}{b}', displayMode: true })
    const object = next.objects[0]

    if (object.type === 'math') {
      expect(object.latex).toBe('\\frac{a}{b}')
      expect(object.displayMode).toBe(true)
    }
  })

  it('updates style without losing latex', () => {
    const store = seed()
    const id = store.objects[0].id
    const next = updateMathObjectStyle(store, id, { color: '#ff0000', opacity: 0.5, fontSize: 24 })
    const object = next.objects[0]

    if (object.type === 'math') {
      expect(object.color).toBe('#ff0000')
      expect(object.opacity).toBe(0.5)
      expect(object.fontSize).toBe(24)
      expect(object.latex).toBe('E=mc^2')
    }
  })

  it('moves and resizes using PDF coordinates', () => {
    const store = seed()
    const id = store.objects[0].id

    const moved = moveOverlayObject(store, id, { dx: 10, dy: -5 })
    expect(moved.objects[0].frame.x).toBe(60)
    expect(moved.objects[0].frame.y).toBe(55)

    const resized = resizeOverlayObject(store, id, 'bottom-right', { dx: 20, dy: 10 })
    expect(resized.objects[0].frame.width).toBe(140)
    expect(resized.objects[0].frame.height).toBe(50)
  })

  it('reorders and deletes', () => {
    const store = seed().addMathObject(1, createMathFrame({ x: 0, y: 0 }), {
      latex: 'x',
      displayMode: false,
    })
    const firstId = store.objects[0].id

    const front = reorderOverlayObject(store, firstId, 'front')
    const movedZ = front.objects.find((object) => object.id === firstId)!.zIndex
    const otherZ = front.objects.find((object) => object.id !== firstId)!.zIndex
    expect(movedZ).toBeGreaterThan(otherZ)

    const deleted = deleteOverlayObject(store, firstId)
    expect(deleted.objects.some((object) => object.id === firstId)).toBe(false)
  })
})
