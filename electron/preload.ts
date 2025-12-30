import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 폴더 다이얼로그
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // 파일 시스템
  readFolder: (path: string) => ipcRenderer.invoke('fs:readFolder', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', path, content),
  deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),

  // 앱 경로
  getAppPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
