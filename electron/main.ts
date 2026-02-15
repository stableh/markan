import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs/promises'
import path from 'path'

let mainWindowRef: BrowserWindow | null = null
const pendingOpenFiles: string[] = []
let currentWorkspacePath: string | null = null
const allowedExternalFiles = new Set<string>()

function normalizePath(inputPath: string): string {
  return path.resolve(inputPath)
}

function isPathInside(targetPath: string, basePath: string): boolean {
  const relative = path.relative(basePath, targetPath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function isAllowedPath(targetPath: string): boolean {
  const resolvedTarget = normalizePath(targetPath)
  const userDataPath = normalizePath(app.getPath('userData'))

  if (isPathInside(resolvedTarget, userDataPath)) return true
  if (currentWorkspacePath && isPathInside(resolvedTarget, currentWorkspacePath)) return true
  if (allowedExternalFiles.has(resolvedTarget)) return true

  return false
}

function getIconPath(): string {
  const iconName = nativeTheme.shouldUseDarkColors
    ? 'logo/dock/logo_black_background.png'
    : 'logo/dock/logo_white_background.png'
  
  if (is.dev) {
    return join(__dirname, '../../public', iconName)
  }
  return join(__dirname, '../renderer', iconName)
}

function updateAppIcon(window: BrowserWindow | null) {
  const iconPath = getIconPath()
  
  // Update Dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath)
  }
  
  // Update Window icon (Windows/Linux)
  if (window) {
    window.setIcon(iconPath)
  }
}

function setupFileSystemHandlers(): void {
  // 폴더 선택 다이얼로그
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    const selectedPath = result.filePaths[0]
    if (!selectedPath) return null

    currentWorkspacePath = normalizePath(selectedPath)
    return currentWorkspacePath
  })

  ipcMain.handle('workspace:setPath', async (_, workspacePath: string | null) => {
    if (!workspacePath) {
      currentWorkspacePath = null
      return true
    }

    try {
      const resolvedPath = normalizePath(workspacePath)
      const stats = await fs.stat(resolvedPath)
      if (!stats.isDirectory()) return false
      currentWorkspacePath = resolvedPath
      return true
    } catch (error) {
      console.error('Failed to set workspace path:', error)
      return false
    }
  })

  // 폴더 내 .md 파일 읽기
  ipcMain.handle('fs:readFolder', async (_, folderPath: string) => {
    try {
      const resolvedFolder = normalizePath(folderPath)
      if (!isAllowedPath(resolvedFolder)) {
        console.warn('Blocked unauthorized folder read:', folderPath)
        return []
      }

      const files = await fs.readdir(resolvedFolder)
      const noteFiles = files.filter((f) => {
        const ext = path.extname(f).toLowerCase()
        return ext === '.md' || ext === '.txt'
      })

      const fileDetails = await Promise.all(
        noteFiles.map(async (file) => {
          const filePath = path.join(resolvedFolder, file)
          const stats = await fs.stat(filePath)
          const content = await fs.readFile(filePath, 'utf-8')
          const extension = path.extname(file).toLowerCase() === '.txt' ? 'txt' : 'md'

          // 파일명에서 제목 추출 (확장자 제거)
          const title = file.replace(/\.(md|txt)$/i, '')

          return {
            filePath,
            fileName: file,
            title,
            content,
            extension,
            modifiedTime: stats.mtimeMs,
            createdTime: stats.birthtimeMs
          }
        })
      )

      // 수정 시간 기준 최신순 정렬
      return fileDetails.sort((a, b) => b.modifiedTime - a.modifiedTime)
    } catch (error) {
      console.error('Error reading folder:', error)
      return []
    }
  })

  // 파일 읽기
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const resolvedPath = normalizePath(filePath)
      if (!isAllowedPath(resolvedPath)) {
        console.warn('Blocked unauthorized file read:', filePath)
        return null
      }

      const content = await fs.readFile(resolvedPath, 'utf-8')
      return content
    } catch (error) {
      console.error('Error reading file:', error)
      return null
    }
  })

  // 파일 저장
  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      const resolvedPath = normalizePath(filePath)
      if (!isAllowedPath(resolvedPath)) {
        console.warn('Blocked unauthorized file write:', filePath)
        return false
      }

      // 디렉토리가 없으면 생성
      const dir = path.dirname(resolvedPath)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(resolvedPath, content, 'utf-8')
      return true
    } catch (error) {
      console.error('Error writing file:', error)
      return false
    }
  })

  // 파일 삭제
  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    try {
      const resolvedPath = normalizePath(filePath)
      if (!isAllowedPath(resolvedPath)) {
        console.warn('Blocked unauthorized file delete:', filePath)
        return false
      }

      await fs.unlink(resolvedPath)
      return true
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  })

  // 앱 데이터 경로
  ipcMain.handle('app:getPath', async (_, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0])
  })

  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion()
  })

  // 파일 존재 여부 확인
  ipcMain.handle('fs:exists', async (_, filePath: string) => {
    try {
      const resolvedPath = normalizePath(filePath)
      if (!isAllowedPath(resolvedPath)) {
        console.warn('Blocked unauthorized file exists check:', filePath)
        return false
      }

      await fs.access(resolvedPath)
      return true
    } catch {
      return false
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 17 },
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      sandbox: false
    }
  })

  // Initial icon set
  updateAppIcon(mainWindow)
  mainWindowRef = mainWindow

  // Listen for theme changes
  nativeTheme.on('updated', () => {
    updateAppIcon(mainWindow)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingOpenFiles.length === 0) return
    for (const filePath of pendingOpenFiles) {
      mainWindow.webContents.send('app:open-file', filePath)
    }
    pendingOpenFiles.length = 0
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // File system IPC handlers
  setupFileSystemHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  const normalizedPath = normalizePath(filePath)
  allowedExternalFiles.add(normalizedPath)

  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('app:open-file', normalizedPath)
    return
  }

  pendingOpenFiles.push(normalizedPath)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
