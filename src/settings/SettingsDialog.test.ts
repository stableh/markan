import { describe, expect, it, vi } from 'vitest'
import { preventSettingsDialogAutoFocus } from './SettingsDialog'

describe('SettingsDialog', () => {
  it('prevents Radix from auto-focusing the language select when opened', () => {
    const event = {
      preventDefault: vi.fn(),
    } as unknown as Event

    preventSettingsDialogAutoFocus(event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })
})
