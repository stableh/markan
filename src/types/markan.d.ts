declare global {
  type ViewerCommand =
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
    | 'settings'
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

  type MarkanMetadata = import('../save/MetadataStore').MarkanMetadata
  type SavePdfBridgeRequest = import('../save/SaveManager').SavePdfBridgeRequest
  type SaveBridgeResult = import('../save/SaveManager').SaveBridgeResult

  type OpenPdfResult =
    | {
        canceled: true
      }
    | {
        canceled: false
        fileName: string
        filePath: string
        data: Uint8Array
        metadata: MarkanMetadata | null
        metadataWarning?: string
      }

  type OpenImageResult =
    | {
        canceled: true
      }
    | {
        canceled: false
        fileName: string
        filePath: string
        mimeType: 'image/png' | 'image/jpeg'
        data: Uint8Array
      }

  type ClipboardPayload =
    | {
        kind: 'empty'
      }
    | {
        kind: 'text'
        text: string
      }
    | {
        kind: 'image'
        fileName: string
        mimeType: 'image/png'
        data: Uint8Array
        naturalWidth: number
        naturalHeight: number
      }

  interface Window {
    markan?: {
      openPdf: () => Promise<OpenPdfResult>
      openImage: () => Promise<OpenImageResult>
      readClipboard: () => Promise<ClipboardPayload>
      savePdf: (request: SavePdfBridgeRequest) => Promise<SaveBridgeResult>
      confirmUnsaved: () => Promise<'save' | 'discard' | 'cancel'>
      showErrorDialog: (title: string, message: string) => Promise<void>
      setDirtyState: (isDirty: boolean) => Promise<void>
      closeWindow: () => Promise<void>
      onMenuOpenPdf: (callback: () => void) => () => void
      onViewerCommand: (callback: (command: ViewerCommand) => void) => () => void
    }
  }
}

export {}
