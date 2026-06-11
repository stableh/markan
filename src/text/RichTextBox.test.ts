import { describe, expect, it } from 'vitest'
import { shouldDeleteEmptyTextObjectOnBlur } from './RichTextBox'

describe('RichTextBox blur behavior', () => {
  it('deletes an empty text box when focus leaves the editor workspace', () => {
    expect(shouldDeleteEmptyTextObjectOnBlur('<p></p>', null)).toBe(true)
  })

  it('keeps an empty text box when focus moves into the inspector', () => {
    const inspectorInput = {
      closest: (selector: string) => (selector === '[data-preserve-empty-text-box="true"]' ? {} : null),
    } as unknown as EventTarget

    expect(shouldDeleteEmptyTextObjectOnBlur('<p></p>', inspectorInput)).toBe(false)
  })

  it('keeps non-empty text boxes on blur', () => {
    expect(shouldDeleteEmptyTextObjectOnBlur('<p>text</p>', null)).toBe(false)
  })
})
