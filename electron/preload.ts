import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type UpdateStatus =
  | { status: 'unavailable'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'up-to-date'; message: string }
  | { status: 'available'; message: string; version: string }
  | { status: 'downloaded'; message: string; version: string }
  | { status: 'error'; message: string }

// Custom APIs for renderer
const api = {
  // 폴더 다이얼로그
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  setWorkspacePath: (path: string | null) => ipcRenderer.invoke('workspace:setPath', path),

  // 파일 시스템
  readFolder: (path: string) => ipcRenderer.invoke('fs:readFolder', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', path, content),
  deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),

  // 앱 경로
  getAppPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates') as Promise<UpdateStatus>,
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate') as Promise<UpdateStatus>,
  quitAndInstallUpdate: () => ipcRenderer.invoke('app:quitAndInstallUpdate') as Promise<boolean>,
  getUpdateStatus: () => ipcRenderer.invoke('app:getUpdateStatus') as Promise<UpdateStatus>,
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status)
    ipcRenderer.on('app:update-status', handler)
    return () => ipcRenderer.removeListener('app:update-status', handler)
  },

  // Finder에서 열기 요청된 파일 경로를 렌더러로 전달
  onOpenFile: (callback: (filePath: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
    ipcRenderer.on('app:open-file', handler)
    return () => ipcRenderer.removeListener('app:open-file', handler)
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}
