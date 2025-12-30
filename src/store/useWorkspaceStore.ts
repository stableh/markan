import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNoteStore, Note } from './useNoteStore';
import { generateFileName, joinPath } from '@/lib/fileUtils';
import type { FileDetail } from '@/types/electron';

interface WorkspaceState {
  workspacePath: string | null;
  isWorkspaceMode: boolean;

  // Actions
  setWorkspacePath: (path: string | null) => void;
  loadWorkspace: (path: string) => Promise<void>;
  saveAllNotes: () => Promise<void>;
  saveNote: (noteId: string) => Promise<void>;
  openFolder: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspacePath: null,
      isWorkspaceMode: false,

      setWorkspacePath: (path) => {
        set({
          workspacePath: path,
          isWorkspaceMode: !!path,
        });
      },

      loadWorkspace: async (path) => {
        try {
          // 폴더 내 .md 파일 읽기
          const fileDetails: FileDetail[] = await window.api.readFolder(path);

          // FileDetail을 Note로 변환
          const notes: Note[] = fileDetails.map((file) => ({
            id: crypto.randomUUID(),
            title: file.title,
            content: file.content,
            createdAt: file.createdTime,
            updatedAt: file.modifiedTime,
            filePath: file.filePath,
            isDirty: false,
            lastSavedContent: file.content,
          }));

          // NoteStore에 노트 설정
          useNoteStore.getState().setNotes(notes);

          // 첫 번째 노트 활성화
          if (notes.length > 0) {
            useNoteStore.getState().setActiveNote(notes[0].id);
          }

          // 워크스페이스 경로 설정
          set({
            workspacePath: path,
            isWorkspaceMode: true,
          });
        } catch (error) {
          console.error('Failed to load workspace:', error);
        }
      },

      saveAllNotes: async () => {
        const { workspacePath } = get();
        if (!workspacePath) return;

        const notes = useNoteStore.getState().notes;

        for (const note of notes) {
          if (note.isDirty || !note.filePath) {
            await get().saveNote(note.id);
          }
        }
      },

      saveNote: async (noteId) => {
        const { workspacePath } = get();
        if (!workspacePath) return;

        const note = useNoteStore.getState().notes.find((n) => n.id === noteId);
        if (!note) return;

        try {
          let filePath = note.filePath;

          // 파일 경로가 없으면 새로 생성
          if (!filePath) {
            // 기존 파일 목록 가져오기
            const files: FileDetail[] = await window.api.readFolder(workspacePath);
            const existingFiles = files.map((f) => f.fileName);

            // 중복되지 않는 파일명 생성
            const fileName = generateFileName(note.title, existingFiles);
            filePath = joinPath(workspacePath, fileName);

            // NoteStore에 파일 경로 설정
            useNoteStore.getState().setNoteFilePath(noteId, filePath);
          }

          // 파일 저장
          const success = await window.api.writeFile(filePath, note.content);

          if (success) {
            // 저장 성공 시 isDirty를 false로 설정
            useNoteStore.getState().markNoteAsSaved(noteId);
          }
        } catch (error) {
          console.error('Failed to save note:', error);
        }
      },

      openFolder: async () => {
        try {
          // 폴더 선택 다이얼로그
          const folderPath = await window.api.openFolder();
          if (!folderPath) return;

          // 현재 변경되지 않은 노트가 있는지 확인
          const notes = useNoteStore.getState().notes;
          const dirtyNotes = notes.filter((n) => n.isDirty);

          if (dirtyNotes.length > 0) {
            // TODO: 저장 여부 확인 다이얼로그
            // 지금은 일단 그냥 로드
            const shouldSave = window.confirm(
              `${dirtyNotes.length}개의 저장되지 않은 노트가 있습니다. 저장하시겠습니까?`
            );

            if (shouldSave) {
              // 선택한 폴더에 저장
              set({ workspacePath: folderPath, isWorkspaceMode: true });
              await get().saveAllNotes();
            }
          }

          // 폴더 로드
          await get().loadWorkspace(folderPath);
        } catch (error) {
          console.error('Failed to open folder:', error);
        }
      },
    }),
    {
      name: 'markan-workspace',
    }
  )
);
