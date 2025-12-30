/**
 * 파일명으로 사용할 수 없는 특수문자를 제거하고 안전한 파일명을 생성
 */
export function sanitizeFileName(title: string): string {
  if (!title || title.trim() === '') {
    return '';
  }

  return title
    .replace(/[/\\?%*:|"<>]/g, '-')  // 특수문자 제거
    .replace(/\s+/g, '-')             // 공백을 대시로
    .trim()
    .slice(0, 255);                   // 최대 길이 제한
}

/**
 * 중복되지 않는 파일명 생성
 * @param title 노트 제목
 * @param existingFiles 기존 파일명 목록
 * @returns 중복되지 않는 파일명 (확장자 포함)
 */
export function generateFileName(title: string, existingFiles: string[]): string {
  const baseName = sanitizeFileName(title) || 'Untitled';
  let fileName = `${baseName}.md`;
  let counter = 1;

  while (existingFiles.includes(fileName)) {
    fileName = `${baseName}-${counter}.md`;
    counter++;
  }

  return fileName;
}

/**
 * 파일 경로에서 파일명만 추출
 */
export function getFileNameFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '';
}

/**
 * 파일명에서 확장자 제거
 */
export function removeExtension(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

/**
 * 경로와 파일명을 합쳐서 전체 경로 생성
 */
export function joinPath(dirPath: string, fileName: string): string {
  const normalizedDir = dirPath.replace(/\\/g, '/').replace(/\/$/, '');
  return `${normalizedDir}/${fileName}`;
}
