export const IPC_CHANNELS = {
  openPdf: 'pdfan:open-pdf',
  openImage: 'pdfan:open-image',
  readClipboard: 'pdfan:read-clipboard',
  savePdf: 'pdfan:save-pdf',
  confirmUnsaved: 'pdfan:confirm-unsaved',
  showErrorDialog: 'pdfan:show-error-dialog',
  setDirtyState: 'pdfan:set-dirty-state',
  closeWindow: 'pdfan:close-window',
  menuOpenPdf: 'pdfan:menu-open-pdf',
  viewerCommand: 'pdfan:viewer-command',
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
