import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, nativeTheme } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  flattenTextImagesOntoPdf,
  type FlattenHighlight,
  type FlattenImage,
  type FlattenInk,
  type FlattenShape,
  type FlattenTextImage,
} from '../src/save/FlattenRenderer'
import {
  getMetadataPathForPdf,
  isPdfanMetadata,
  type PdfanMetadata,
} from '../src/save/MetadataStore'
import { IPC_CHANNELS, type ViewerCommand } from './ipcChannels'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let rendererDirty = false
let closeApproved = false

type OpenPdfResult =
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

type SavePdfRequest = {
  mode: 'direct' | 'save-as'
  currentPath: string
  basePdfBytes: Uint8Array
  textImages: FlattenTextImage[]
  imageOverlays?: FlattenImage[]
  highlightOverlays?: FlattenHighlight[]
  inkOverlays?: FlattenInk[]
  shapeOverlays?: FlattenShape[]
  metadata: PdfanMetadata
}

type SavePdfResult =
  | {
      canceled: true
    }
  | {
      canceled: false
      fileName: string
      filePath: string
      data: Uint8Array
    }

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)

nativeTheme.themeSource = 'dark'

// Applies the app icon to the macOS Dock at runtime. (There is no .app packaging step yet, so
// this is how the icon is shown for the running app.) public/ is copied into out/renderer on
// build, and served from source in dev.
const applyDockIcon = () => {
  if (process.platform !== 'darwin' || !app.dock) {
    return
  }

  const iconPath = isDev
    ? path.join(__dirname, '../../public/logo/mac_logo_dark_background.png')
    : path.join(__dirname, '../renderer/logo/mac_logo_dark_background.png')
  const icon = nativeImage.createFromPath(iconPath)

  if (!icon.isEmpty()) {
    app.dock.setIcon(icon)
  }
}

const toUint8Array = (value: Uint8Array | ArrayBuffer | number[]) => {
  if (value instanceof Uint8Array) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  return new Uint8Array(value)
}

const bytesToBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')

const base64ToBytes = (base64: string) => new Uint8Array(Buffer.from(base64, 'base64'))

const getSupportedImageMimeType = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.png') {
    return 'image/png' as const
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg' as const
  }

  return null
}

// All editable metadata lives in one central app-managed store (keyed by the PDF's absolute
// path), so PDF folders stay clean. Editable data does not travel with the PDF — the saved PDF
// itself remains a standalone, viewable file.
const getMetadataStorePath = (pdfPath: string) => {
  const key = createHash('sha1').update(pdfPath).digest('hex')
  return path.join(app.getPath('userData'), 'pdfedit', `${key}.json`)
}

const isNotFoundError = (error: unknown) =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  (error as NodeJS.ErrnoException).code === 'ENOENT'

const readMetadataForPdf = async (
  pdfPath: string,
): Promise<{ metadata: PdfanMetadata | null; warning?: string }> => {
  // Prefer the central store; fall back to a legacy sibling .pdfedit.json so existing edits
  // still load (they migrate to the central store on the next save).
  const candidatePaths = [getMetadataStorePath(pdfPath), getMetadataPathForPdf(pdfPath)]

  for (const metadataPath of candidatePaths) {
    try {
      const metadataText = await readFile(metadataPath, 'utf8')
      const metadata = JSON.parse(metadataText)

      if (!isPdfanMetadata(metadata)) {
        return {
          metadata: null,
          warning: 'The saved edit metadata is invalid, so editable overlays were not restored.',
        }
      }

      return { metadata }
    } catch (error) {
      if (isNotFoundError(error)) {
        continue
      }

      console.warn('Metadata load failed', error)
      return {
        metadata: null,
        warning: 'The saved edit metadata could not be loaded, so editable overlays were not restored.',
      }
    }
  }

  return { metadata: null }
}

const openPdfFromDialog = async (): Promise<OpenPdfResult> => {
  const dialogOptions: Electron.OpenDialogOptions = {
    title: 'Open PDF',
    properties: ['openFile'],
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const filePath = result.filePaths[0]
  const data = await readFile(filePath)
  const { metadata, warning: metadataWarning } = await readMetadataForPdf(filePath)
  const basePdfData = metadata?.basePdfDataBase64 ? base64ToBytes(metadata.basePdfDataBase64) : data

  return {
    canceled: false,
    fileName: path.basename(filePath),
    filePath,
    data: new Uint8Array(basePdfData),
    metadata,
    metadataWarning,
  }
}

const openImageFromDialog = async (): Promise<OpenImageResult> => {
  const dialogOptions: Electron.OpenDialogOptions = {
    title: 'Open Image',
    properties: ['openFile'],
    filters: [
      { name: 'Supported Images', extensions: ['png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const filePath = result.filePaths[0]
  const mimeType = getSupportedImageMimeType(filePath)

  if (!mimeType) {
    throw new Error('Unsupported image format. Use PNG, JPG, or JPEG.')
  }

  const data = await readFile(filePath)

  return {
    canceled: false,
    fileName: path.basename(filePath),
    filePath,
    mimeType,
    data: new Uint8Array(data),
  }
}

const savePdf = async (_event: Electron.IpcMainInvokeEvent, request: SavePdfRequest): Promise<SavePdfResult> => {
  const targetPath =
    request.mode === 'save-as'
      ? await (async () => {
          const result = mainWindow
            ? await dialog.showSaveDialog(mainWindow, {
                title: 'Save PDF As',
                defaultPath: request.currentPath,
                filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
              })
            : await dialog.showSaveDialog({
                title: 'Save PDF As',
                defaultPath: request.currentPath,
                filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
              })

          return result.canceled || !result.filePath ? null : result.filePath
        })()
      : request.currentPath

  if (!targetPath) {
    return { canceled: true }
  }

  const basePdfBytes = toUint8Array(request.basePdfBytes)
  const textImages = request.textImages.map((image) => ({
    ...image,
    pngData: toUint8Array(image.pngData),
  }))
  const imageOverlays = (request.imageOverlays ?? []).map((image) => ({
    ...image,
    data: toUint8Array(image.data),
  }))
  const highlightOverlays = request.highlightOverlays ?? []
  const inkOverlays = request.inkOverlays ?? []
  const shapeOverlays = request.shapeOverlays ?? []
  const outputPdfBytes = await flattenTextImagesOntoPdf(
    basePdfBytes,
    textImages,
    imageOverlays,
    highlightOverlays,
    inkOverlays,
    shapeOverlays,
  )
  const outputBytes = new Uint8Array(outputPdfBytes)
  const metadata: PdfanMetadata = {
    ...request.metadata,
    sourcePdfPath: targetPath,
    savedAt: new Date().toISOString(),
    basePdfDataBase64: bytesToBase64(basePdfBytes),
  }

  await writeFile(targetPath, outputBytes)

  const metadataPath = getMetadataStorePath(targetPath)
  await mkdir(path.dirname(metadataPath), { recursive: true })
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')

  return {
    canceled: false,
    fileName: path.basename(targetPath),
    filePath: targetPath,
    data: outputBytes,
  }
}

const sendViewerCommand = (command: ViewerCommand) => {
  mainWindow?.webContents.send(IPC_CHANNELS.viewerCommand, command)
}

const showUnsavedChangesDialog = async () => {
  const result = mainWindow
    ? await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Save', 'Do Not Save', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'Do you want to save changes before continuing?',
        detail: 'Your annotations will be lost if you do not save them.',
      })
    : await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Save', 'Do Not Save', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'Do you want to save changes before continuing?',
        detail: 'Your annotations will be lost if you do not save them.',
      })

  if (result.response === 0) {
    return 'save' as const
  }

  if (result.response === 1) {
    return 'discard' as const
  }

  return 'cancel' as const
}

const createMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open PDF...',
          accelerator: 'CommandOrControl+O',
          click: () => sendViewerCommand('open'),
        },
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: () => sendViewerCommand('save'),
        },
        {
          label: 'Save As...',
          accelerator: 'Shift+CommandOrControl+S',
          click: () => sendViewerCommand('save-as'),
        },
        { type: 'separator' },
        {
          label: 'Close',
          accelerator: 'CommandOrControl+W',
          click: () => mainWindow?.close(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CommandOrControl+Z',
          click: () => sendViewerCommand('undo'),
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CommandOrControl+Z',
          click: () => sendViewerCommand('redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => sendViewerCommand('delete'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CommandOrControl+=',
          click: () => sendViewerCommand('zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CommandOrControl+-',
          click: () => sendViewerCommand('zoom-out'),
        },
        {
          label: 'Actual Size',
          accelerator: 'CommandOrControl+0',
          click: () => sendViewerCommand('actual-size'),
        },
        { type: 'separator' },
        {
          label: 'Fit Page',
          accelerator: 'CommandOrControl+9',
          click: () => sendViewerCommand('fit-page'),
        },
        {
          label: 'Fit Width',
          accelerator: 'CommandOrControl+8',
          click: () => sendViewerCommand('fit-width'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Thumbnails',
          click: () => sendViewerCommand('toggle-thumbnails'),
        },
        {
          label: 'Toggle Inspector',
          click: () => sendViewerCommand('toggle-inspector'),
        },
        { type: 'separator' },
        {
          label: 'Continuous Scroll',
          accelerator: 'CommandOrControl+Control+1',
          click: () => sendViewerCommand('continuous-scroll'),
        },
        {
          label: 'Single Page',
          accelerator: 'CommandOrControl+Control+2',
          click: () => sendViewerCommand('single-page'),
        },
        { type: 'separator' },
        {
          label: 'Previous Page',
          accelerator: 'PageUp',
          click: () => sendViewerCommand('previous-page'),
        },
        {
          label: 'Next Page',
          accelerator: 'PageDown',
          click: () => sendViewerCommand('next-page'),
        },
        {
          label: 'First Page',
          accelerator: 'Home',
          click: () => sendViewerCommand('first-page'),
        },
        {
          label: 'Last Page',
          accelerator: 'End',
          click: () => sendViewerCommand('last-page'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Select',
          accelerator: 'CommandOrControl+Control+V',
          click: () => sendViewerCommand('select'),
        },
        {
          label: 'Text',
          accelerator: 'CommandOrControl+Control+T',
          click: () => sendViewerCommand('text'),
        },
        {
          label: 'Highlight',
          accelerator: 'CommandOrControl+Control+H',
          click: () => sendViewerCommand('highlight'),
        },
        {
          label: 'Ink',
          accelerator: 'CommandOrControl+Control+P',
          click: () => sendViewerCommand('ink'),
        },
        {
          label: 'Image',
          accelerator: 'CommandOrControl+Control+I',
          click: () => sendViewerCommand('image'),
        },
        { type: 'separator' },
        {
          label: 'Rectangle',
          accelerator: 'CommandOrControl+Control+R',
          click: () => sendViewerCommand('rectangle'),
        },
        {
          label: 'Ellipse',
          accelerator: 'CommandOrControl+Control+O',
          click: () => sendViewerCommand('ellipse'),
        },
        {
          label: 'Line',
          accelerator: 'CommandOrControl+Control+L',
          click: () => sendViewerCommand('line'),
        },
        {
          label: 'Arrow',
          accelerator: 'CommandOrControl+Control+A',
          click: () => sendViewerCommand('arrow'),
        },
        { type: 'separator' },
        {
          label: 'Math',
          accelerator: 'CommandOrControl+Control+M',
          click: () => sendViewerCommand('math'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'PDFan Help',
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              title: 'PDFan Help',
              message: 'PDFan',
              detail: 'Open a PDF, add annotations, and save a flattened copy with editable sidecar metadata.',
            }),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 1090,
    minHeight: 680,
    title: 'PDFan',
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.on('close', (event) => {
    if (!rendererDirty || closeApproved) {
      return
    }

    event.preventDefault()
    sendViewerCommand('request-close')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  ipcMain.handle(IPC_CHANNELS.openPdf, openPdfFromDialog)
  ipcMain.handle(IPC_CHANNELS.openImage, openImageFromDialog)
  ipcMain.handle(IPC_CHANNELS.savePdf, savePdf)
  ipcMain.handle(IPC_CHANNELS.confirmUnsaved, showUnsavedChangesDialog)
  ipcMain.handle(IPC_CHANNELS.showErrorDialog, async (_event, payload: { title: string; message: string }) => {
    const title = payload.title || 'PDFan'
    const message = payload.message || 'An unexpected error occurred.'

    if (mainWindow) {
      await dialog.showMessageBox(mainWindow, { type: 'error', title, message })
      return
    }

    await dialog.showMessageBox({ type: 'error', title, message })
  })
  ipcMain.handle(IPC_CHANNELS.setDirtyState, (_event, isDirty: boolean) => {
    rendererDirty = isDirty
  })
  ipcMain.handle(IPC_CHANNELS.closeWindow, () => {
    closeApproved = true
    mainWindow?.close()
  })
  applyDockIcon()
  createMenu()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
