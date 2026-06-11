export type BasePdfStore = {
  getBasePdfBytes: () => Uint8Array
  getLastSavedPdfBytes: () => Uint8Array | null
  recordSaveOutput: (pdfBytes: Uint8Array) => void
}

const cloneBytes = (bytes: Uint8Array) => new Uint8Array(bytes)

export const createBasePdfStore = (basePdfBytes: Uint8Array): BasePdfStore => {
  const baseBytes = cloneBytes(basePdfBytes)
  let lastSavedPdfBytes: Uint8Array | null = null

  return {
    getBasePdfBytes: () => cloneBytes(baseBytes),
    getLastSavedPdfBytes: () => (lastSavedPdfBytes ? cloneBytes(lastSavedPdfBytes) : null),
    recordSaveOutput: (pdfBytes) => {
      lastSavedPdfBytes = cloneBytes(pdfBytes)
    },
  }
}
