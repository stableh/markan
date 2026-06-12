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

    expect(undone.present.store.objects).toHaveLength(0)
    expect(redone.present.store.objects).toHaveLength(1)
    expect(redone.present.store.objects[0].frame).toEqual({ x: 10, y: 20, width: 80, height: 60 })
  })

  it('undoes and redoes object movement while preserving dirty state from the restored store', () => {
    const initial = createOverlayObjectStore()
    const added = initial.addPlaceholderObject(0, { x: 10, y: 20, width: 80, height: 60 })
    const moved = moveOverlayObject(added, added.objects[0].id, { dx: 5, dy: 10 })
    const history = pushOverlayHistory(pushOverlayHistory(createOverlayHistory(initial), added), moved)
    const undone = undoOverlayHistory(history)
    const redone = redoOverlayHistory(undone)

    expect(undone.present.store.objects[0].frame).toEqual({ x: 10, y: 20, width: 80, height: 60 })
    expect(undone.present.store.isDirty).toBe(true)
    expect(redone.present.store.objects[0].frame).toEqual({ x: 15, y: 30, width: 80, height: 60 })
    expect(redone.present.store.isDirty).toBe(true)
  })

  it('marks the current clean save baseline without dropping undo history', () => {
    const initial = createOverlayObjectStore()
    const added = initial.addPlaceholderObject(0, { x: 10, y: 20, width: 80, height: 60 })
    const clean = createOverlayObjectStore(added.objects, false)
    const savedHistory = markOverlayHistorySaved(pushOverlayHistory(createOverlayHistory(initial), added), clean)

    expect(savedHistory.present.store.isDirty).toBe(false)
    expect(savedHistory.present.store).toBe(clean)
    expect(undoOverlayHistory(savedHistory).present.store.objects).toHaveLength(0)
  })

  it('restores the selection captured with each snapshot', () => {
    const initial = createOverlayObjectStore()
    const added = initial.addPlaceholderObject(0, { x: 0, y: 0, width: 10, height: 10 })
    const addedId = added.objects[0].id
    const moved = moveOverlayObject(added, addedId, { dx: 5, dy: 0 })

    const history = pushOverlayHistory(
      pushOverlayHistory(createOverlayHistory(initial, null), added, addedId),
      moved,
      addedId,
    )

    expect(history.present.selectedObjectId).toBe(addedId)
    // Undo back to the empty document restores its "nothing selected" snapshot.
    expect(undoOverlayHistory(undoOverlayHistory(history)).present.selectedObjectId).toBeNull()
    // Redo returns to the selection that was active at that point.
    expect(redoOverlayHistory(undoOverlayHistory(history)).present.selectedObjectId).toBe(addedId)
  })

  it('ignores pushes that do not change the store reference', () => {
    const initial = createOverlayObjectStore()
    const history = createOverlayHistory(initial)

    expect(pushOverlayHistory(history, initial)).toBe(history)
  })

  it('caps the undo depth so memory stays bounded', () => {
    let store = createOverlayObjectStore()
    let history = createOverlayHistory(store)

    for (let index = 0; index < 150; index += 1) {
      store = store.addPlaceholderObject(0, { x: index, y: 0, width: 10, height: 10 })
      history = pushOverlayHistory(history, store)
    }

    expect(history.past.length).toBe(100)
    expect(history.present.store.objects).toHaveLength(150)
  })
})
