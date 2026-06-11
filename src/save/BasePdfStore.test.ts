import { describe, expect, it } from 'vitest'
import { createBasePdfStore } from './BasePdfStore'

describe('BasePdfStore', () => {
  it('keeps original base PDF bytes across repeated save outputs', () => {
    const original = new Uint8Array([1, 2, 3])
    const flattened = new Uint8Array([9, 8, 7])
    const store = createBasePdfStore(original)

    store.recordSaveOutput(flattened)

    expect(Array.from(store.getBasePdfBytes())).toEqual([1, 2, 3])
    expect(Array.from(store.getLastSavedPdfBytes() ?? [])).toEqual([9, 8, 7])
  })
})
