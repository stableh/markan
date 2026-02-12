export interface FileDetail {
  filePath: string;
  fileName: string;
  title: string;
  content: string;
  extension: 'md' | 'txt';
  modifiedTime: number;
  createdTime: number;
}

export interface ElectronAPI {
  // 폴더 다이얼로그
  openFolder: () => Promise<string>;

  // 파일 시스템
  readFolder: (path: string) => Promise<FileDetail[]>;
  readFile: (path: string) => Promise<string | null>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  deleteFile: (path: string) => Promise<boolean>;
  exists: (path: string) => Promise<boolean>;

  // 앱 경로
  getAppPath: (name: string) => Promise<string>;

  // macOS Finder 연동: 연결된 문서를 앱에서 열기
  onOpenFile: (callback: (filePath: string) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
