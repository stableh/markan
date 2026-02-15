export interface FileDetail {
  filePath: string;
  fileName: string;
  title: string;
  content: string;
  extension: 'md' | 'txt';
  modifiedTime: number;
  createdTime: number;
}

export type UpdateStatus =
  | { status: 'unavailable'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'up-to-date'; message: string }
  | { status: 'available'; message: string; version: string }
  | { status: 'downloaded'; message: string; version: string }
  | { status: 'error'; message: string };

export interface ElectronAPI {
  // 폴더 다이얼로그
  openFolder: () => Promise<string | null>;
  setWorkspacePath: (path: string | null) => Promise<boolean>;

  // 파일 시스템
  readFolder: (path: string) => Promise<FileDetail[]>;
  readFile: (path: string) => Promise<string | null>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  deleteFile: (path: string) => Promise<boolean>;
  exists: (path: string) => Promise<boolean>;

  // 앱 경로
  getAppPath: (name: string) => Promise<string>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<UpdateStatus>;
  downloadUpdate: () => Promise<UpdateStatus>;
  quitAndInstallUpdate: () => Promise<boolean>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;

  // macOS Finder 연동: 연결된 문서를 앱에서 열기
  onOpenFile: (callback: (filePath: string) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
