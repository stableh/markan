import type { OverlayObjectStore } from './OverlayObjectStore'

// A history entry pairs the document state with the selection that was active when it was
// committed, so undo/redo can restore both together.
export type OverlaySnapshot = {
  store: OverlayObjectStore
  selectedObjectId: string | null
}

export type OverlayHistory = {
  past: OverlaySnapshot[]
  present: OverlaySnapshot
  future: OverlaySnapshot[]
}

// Cap the undo depth so long editing sessions can't grow memory without bound. Each entry holds
// a full store snapshot, so we keep a generous but finite window of recent edits.
const MAX_HISTORY_ENTRIES = 100

export const createOverlayHistory = (
  initialStore: OverlayObjectStore,
  selectedObjectId: string | null = null,
): OverlayHistory => ({
  past: [],
  present: { store: initialStore, selectedObjectId },
  future: [],
})

export const pushOverlayHistory = (
  history: OverlayHistory,
  nextStore: OverlayObjectStore,
  selectedObjectId: string | null = null,
): OverlayHistory => {
  if (nextStore === history.present.store) {
    return history
  }

  const past = [...history.past, history.present]

  return {
    ...history,
    past: past.length > MAX_HISTORY_ENTRIES ? past.slice(past.length - MAX_HISTORY_ENTRIES) : past,
    present: { store: nextStore, selectedObjectId },
    future: [],
  }
}

export const undoOverlayHistory = (history: OverlayHistory): OverlayHistory => {
  const previous = history.past[history.past.length - 1]

  if (!previous) {
    return history
  }

  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export const redoOverlayHistory = (history: OverlayHistory): OverlayHistory => {
  const next = history.future[0]

  if (!next) {
    return history
  }

  return {
    ...history,
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

export const markOverlayHistorySaved = (
  history: OverlayHistory,
  savedStore: OverlayObjectStore,
): OverlayHistory => ({
  past: history.past,
  present: { store: savedStore, selectedObjectId: history.present.selectedObjectId },
  future: history.future,
})
