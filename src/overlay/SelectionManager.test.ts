import { describe, expect, it } from 'vitest'
import { clearSelection, selectOverlayObject } from './SelectionManager'

describe('SelectionManager', () => {
  it('tracks selected overlay object id', () => {
    expect(selectOverlayObject('overlay-1')).toEqual({ selectedObjectId: 'overlay-1' })
  })

  it('clears selection', () => {
    expect(clearSelection()).toEqual({ selectedObjectId: null })
  })
})
