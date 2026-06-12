export const IPC_CHANNELS = {
  openPdf: 'markan:open-pdf',
  openImage: 'markan:open-image',
  readClipboard: 'markan:read-clipboard',
  savePdf: 'markan:save-pdf',
  confirmUnsaved: 'markan:confirm-unsaved',
  showErrorDialog: 'markan:show-error-dialog',
  setDirtyState: 'markan:set-dirty-state',
  closeWindow: 'markan:close-window',
  menuOpenPdf: 'markan:menu-open-pdf',
  viewerCommand: 'markan:viewer-command',
} as const

export type ViewerCommand =
  | 'open'
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
  | 'toggle-thumbnails'
  | 'toggle-inspector'
  | 'paste'
  | 'save'
  | 'save-as'
  | 'undo'
  | 'redo'
  | 'delete'
  | 'select'
  | 'placeholder'
  | 'text'
  | 'highlight'
  | 'ink'
  | 'image'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'math'
  | 'request-close'
