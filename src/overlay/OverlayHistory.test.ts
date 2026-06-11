import { describe, expect, it } from 'vitest'
import {
  createOverlayHistory,
  markOverlayHistorySaved,
  pushOverlayHistory,
  redoOverlayHistory,
  undoOverlayHistory,
} from './OverlayHistory'
import { createOverlayObjectStore, moveOverlayObject } from './OverlayObjectStore'

describe('OverlayHistory', () => {
  it('undoes and redoes object additions', () => {
    const initial = createOverlayObjectStore()
    const added = initial.addPlaceholderObject(0, { x: 10, y: 20, width: 80, height: 60 })
    const history = pushOverlayHistory(createOverlayHistory(initial), added)
    const undone = undoOverlayHistory(history)
    const redone = redoOverlayHistory(undone)

    expect(undone.present.objects).toHaveLength(0)
    expect(redone.present.objects).toHaveLength(1)
    expect(redone.present.objects[0].frame).toEqual({ x: 10, y: 20, width: 80, height: 60 })
  })

  it('undoes and redoes object movement while preserving dirty state from the restored store', () => {
    const initial = createOverlayObjectStore()
    const added = initial.addPlaceholderObject(0, { x: 10, y: 20, width: 80, height: 60 })
    const moved = moveOverlayObject(added, added.objects[0].id, { dx: 5, dy: 10 })
    const history = pushOverlayHistory(pushOverlayHistory(createOverlayHistory(initial), added), moved)
    const undone = undoOverlayHistory(history)
    const redone = redoOverlayHistory(undone)

    expect(undone.present.objects[0].frame).toEqual({ x: 10, y: 20, width: 80, height: 60 })
    expect(undone.present.isDirty).toBe(true)
    expect(redone.present.objects[0].frame).toEqual({ x: 15, y: 30, width: 80, height: 60 })
    expect(redone.present.isDirty).toBe(true)
  })

  it('marks the current clean save baseline without dropping undo history', () => {
    const initial = createOverlayObjectStore()
    const added = initial.addPlaceholderObject(0, { x: 10, y: 20, width: 80, height: 60 })
    const clean = createOverlayObjectStore(added.objects, false)
    const savedHistory = markOverlayHistorySaved(pushOverlayHistory(createOverlayHistory(initial), added), clean)

    expect(savedHistory.present.isDirty).toBe(false)
    expect(savedHistory.baseline).toBe(clean)
    expect(undoOverlayHistory(savedHistory).present.objects).toHaveLength(0)
  })
})
