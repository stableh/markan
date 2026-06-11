import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type ViewerCommand } from './ipcChannels'
import type { SavePdfBridgeRequest, SaveBridgeResult } from '../src/save/SaveManager'
import type { PdfanMetadata } from '../src/save/MetadataStore'

export type OpenPdfResult =
  | {
      canceled: true
    }
  | {
      canceled: false
      fileName: string
      filePath: string
      data: Uint8Array
      metadata: PdfanMetadata | null
      metadataWarning?: string
    }

export type OpenImageResult =
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

export type PdfanBridge = {
  openPdf: () => Promise<OpenPdfResult>
  openImage: () => Promise<OpenImageResult>
  savePdf: (request: SavePdfBridgeRequest) => Promise<SaveBridgeResult>
  confirmUnsaved: () => Promise<'save' | 'discard' | 'cancel'>
  showErrorDialog: (title: string, message: string) => Promise<void>
  setDirtyState: (isDirty: boolean) => Promise<void>
  closeWindow: () => Promise<void>
  onMenuOpenPdf: (callback: () => void) => () => void
  onViewerCommand: (callback: (command: ViewerCommand) => void) => () => void
}

const bridge: PdfanBridge = {
  openPdf: () => ipcRenderer.invoke(IPC_CHANNELS.openPdf),
  openImage: () => ipcRenderer.invoke(IPC_CHANNELS.openImage),
  savePdf: (request) => ipcRenderer.invoke(IPC_CHANNELS.savePdf, request),
  confirmUnsaved: () => ipcRenderer.invoke(IPC_CHANNELS.confirmUnsaved),
  showErrorDialog: (title, message) => ipcRenderer.invoke(IPC_CHANNELS.showErrorDialog, { title, message }),
  setDirtyState: (isDirty) => ipcRenderer.invoke(IPC_CHANNELS.setDirtyState, isDirty),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.closeWindow),
  onMenuOpenPdf: (callback) => {
    const listener = () => callback()
    ipcRenderer.on(IPC_CHANNELS.menuOpenPdf, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.menuOpenPdf, listener)
  },
  onViewerCommand: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, command: ViewerCommand) => callback(command)
    ipcRenderer.on(IPC_CHANNELS.viewerCommand, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.viewerCommand, listener)
  },
}

contextBridge.exposeInMainWorld('pdfan', bridge)
