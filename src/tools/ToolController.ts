import type { EditorTool, ToolCommand } from './EditorTool'

export type KeyboardCommand =
  | ToolCommand
  | 'open'
  | 'save'
  | 'save-as'
  | 'zoom-in'
  | 'zoom-out'
  | 'actual-size'
  | 'fit-page'
  | 'fit-width'
  | 'continuous-scroll'
  | 'single-page'
  | 'previous-page'
  | 'next-page'
  | 'first-page'
  | 'last-page'
  | 'paste'
  | 'undo'
  | 'redo'

export type KeyboardShortcutLike = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
}

export type ToolState = {
  activeTool: EditorTool
}

export const setActiveTool = (_currentTool: EditorTool, nextTool: EditorTool): ToolState => ({
  activeTool: nextTool,
})

type ShortcutTargetLike = EventTarget & {
  isContentEditable?: boolean
  tagName?: string
}

export const isEditableShortcutTarget = (target: EventTarget | null) => {
  if (!target || typeof target !== 'object') {
    return false
  }

  const targetLike = target as ShortcutTargetLike

  return (
    targetLike.isContentEditable === true ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(targetLike.tagName))
  )
}

export const getToolForShortcut = (key: string): ToolCommand | null => {
  if (key === 'Escape') {
    return 'select'
  }

  if (key === 'Delete' || key === 'Backspace') {
    return 'delete'
  }

  return null
}

export const resolveKeyboardCommand = ({
  key,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
}: KeyboardShortcutLike): KeyboardCommand | null => {
  const normalized = key.toLowerCase()

  if (metaKey && normalized === 's') {
    return shiftKey ? 'save-as' : 'save'
  }

  if (metaKey && normalized === 'z') {
    return shiftKey ? 'redo' : 'undo'
  }

  if (metaKey && (key === '+' || key === '=')) {
    return 'zoom-in'
  }

  if (metaKey && key === '-') {
    return 'zoom-out'
  }

  if (metaKey && key === '0') {
    return 'actual-size'
  }

  if (metaKey && ctrlKey) {
    if (normalized === '1') {
      return 'continuous-scroll'
    }

    if (normalized === '2') {
      return 'single-page'
    }

    const toolShortcuts: Record<string, EditorTool> = {
      v: 'select',
      t: 'text',
      h: 'highlight',
      p: 'ink',
      i: 'image',
      r: 'rectangle',
      o: 'ellipse',
      l: 'line',
      a: 'arrow',
      m: 'math',
    }

    return toolShortcuts[normalized] ?? null
  }

  if (metaKey && normalized === 'v') {
    return 'paste'
  }

  if (metaKey && normalized === 'o') {
    return 'open'
  }

  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') {
    return 'previous-page'
  }

  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') {
    return 'next-page'
  }

  if (key === 'Home') {
    return 'first-page'
  }

  if (key === 'End') {
    return 'last-page'
  }

  return getToolForShortcut(key)
}
