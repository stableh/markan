export type SelectionState = {
  selectedObjectId: string | null
}

export const selectOverlayObject = (selectedObjectId: string): SelectionState => ({
  selectedObjectId,
})

export const clearSelection = (): SelectionState => ({
  selectedObjectId: null,
})
