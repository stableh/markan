import { describe, expect, it } from 'vitest'
import { getToolForShortcut, isEditableShortcutTarget, resolveKeyboardCommand, setActiveTool } from './ToolController'

describe('ToolController', () => {
  it('changes active tool explicitly', () => {
    expect(setActiveTool('select', 'placeholder')).toEqual({ activeTool: 'placeholder' })
    expect(setActiveTool('select', 'text')).toEqual({ activeTool: 'text' })
    expect(setActiveTool('select', 'image')).toEqual({ activeTool: 'image' })
    expect(setActiveTool('select', 'highlight')).toEqual({ activeTool: 'highlight' })
    expect(setActiveTool('select', 'ink')).toEqual({ activeTool: 'ink' })
    expect(setActiveTool('select', 'rectangle')).toEqual({ activeTool: 'rectangle' })
    expect(setActiveTool('select', 'ellipse')).toEqual({ activeTool: 'ellipse' })
    expect(setActiveTool('select', 'line')).toEqual({ activeTool: 'line' })
    expect(setActiveTool('select', 'arrow')).toEqual({ activeTool: 'arrow' })
    expect(setActiveTool('select', 'math')).toEqual({ activeTool: 'math' })
  })

  it('does not route legacy single-key tool shortcuts', () => {
    expect(getToolForShortcut('v')).toBeNull()
    expect(getToolForShortcut('t')).toBeNull()
    expect(getToolForShortcut('i')).toBeNull()
    expect(getToolForShortcut('h')).toBeNull()
    expect(getToolForShortcut('k')).toBeNull()
    expect(getToolForShortcut('r')).toBeNull()
    expect(getToolForShortcut('e')).toBeNull()
    expect(getToolForShortcut('l')).toBeNull()
    expect(getToolForShortcut('a')).toBeNull()
    expect(getToolForShortcut('p')).toBeNull()
    expect(getToolForShortcut('Escape')).toBe('select')
    expect(getToolForShortcut('Delete')).toBe('delete')
  })

  it('routes final macOS command-control tool shortcuts', () => {
    expect(resolveKeyboardCommand({ key: 'v', metaKey: true, ctrlKey: true })).toBe('select')
    expect(resolveKeyboardCommand({ key: 't', metaKey: true, ctrlKey: true })).toBe('text')
    expect(resolveKeyboardCommand({ key: 'h', metaKey: true, ctrlKey: true })).toBe('highlight')
    expect(resolveKeyboardCommand({ key: 'p', metaKey: true, ctrlKey: true })).toBe('ink')
    expect(resolveKeyboardCommand({ key: 'i', metaKey: true, ctrlKey: true })).toBe('image')
    expect(resolveKeyboardCommand({ key: 'r', metaKey: true, ctrlKey: true })).toBe('rectangle')
    expect(resolveKeyboardCommand({ key: 'o', metaKey: true, ctrlKey: true })).toBe('ellipse')
    expect(resolveKeyboardCommand({ key: 'l', metaKey: true, ctrlKey: true })).toBe('line')
    expect(resolveKeyboardCommand({ key: 'a', metaKey: true, ctrlKey: true })).toBe('arrow')
    expect(resolveKeyboardCommand({ key: 'm', metaKey: true, ctrlKey: true })).toBe('math')
  })

  it('routes final view, save, page, and undo shortcuts', () => {
    expect(resolveKeyboardCommand({ key: 'o', metaKey: true })).toBe('open')
    expect(resolveKeyboardCommand({ key: 'o', metaKey: true, ctrlKey: true })).toBe('ellipse')
    expect(resolveKeyboardCommand({ key: 'v', metaKey: true })).toBe('paste')
    expect(resolveKeyboardCommand({ key: 'v', metaKey: true, ctrlKey: true })).toBe('select')
    expect(resolveKeyboardCommand({ key: 's', metaKey: true })).toBe('save')
    expect(resolveKeyboardCommand({ key: 's', metaKey: true, shiftKey: true })).toBe('save-as')
    expect(resolveKeyboardCommand({ key: '+', metaKey: true })).toBe('zoom-in')
    expect(resolveKeyboardCommand({ key: '-', metaKey: true })).toBe('zoom-out')
    expect(resolveKeyboardCommand({ key: '0', metaKey: true })).toBe('actual-size')
    expect(resolveKeyboardCommand({ key: '1', metaKey: true, ctrlKey: true })).toBe('continuous-scroll')
    expect(resolveKeyboardCommand({ key: '2', metaKey: true, ctrlKey: true })).toBe('single-page')
    expect(resolveKeyboardCommand({ key: 'ArrowLeft' })).toBe('previous-page')
    expect(resolveKeyboardCommand({ key: 'PageDown' })).toBe('next-page')
    expect(resolveKeyboardCommand({ key: 'Home' })).toBe('first-page')
    expect(resolveKeyboardCommand({ key: 'End' })).toBe('last-page')
    expect(resolveKeyboardCommand({ key: 'z', metaKey: true })).toBe('undo')
    expect(resolveKeyboardCommand({ key: 'z', metaKey: true, shiftKey: true })).toBe('redo')
  })

  it('detects editable shortcut targets so typing does not route tool keys', () => {
    const input = { tagName: 'INPUT' } as unknown as EventTarget
    const editor = { isContentEditable: true, tagName: 'DIV' } as unknown as EventTarget
    const button = { tagName: 'BUTTON' } as unknown as EventTarget

    expect(isEditableShortcutTarget(input)).toBe(true)
    expect(isEditableShortcutTarget(editor)).toBe(true)
    expect(isEditableShortcutTarget(button)).toBe(false)
  })
})
