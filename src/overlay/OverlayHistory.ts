import type { OverlayObjectStore } from './OverlayObjectStore'

export type OverlayHistory = {
  past: OverlayObjectStore[]
  present: OverlayObjectStore
  future: OverlayObjectStore[]
  baseline: OverlayObjectStore
}

export const createOverlayHistory = (initialStore: OverlayObjectStore): OverlayHistory => ({
  past: [],
  present: initialStore,
  future: [],
  baseline: initialStore,
})

export const pushOverlayHistory = (
  history: OverlayHistory,
  nextStore: OverlayObjectStore,
): OverlayHistory => {
  if (nextStore === history.present) {
    return history
  }

  return {
    ...history,
    past: [...history.past, history.present],
    present: nextStore,
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
  present: savedStore,
  future: history.future,
  baseline: savedStore,
})
