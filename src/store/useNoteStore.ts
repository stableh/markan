import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  filePath?: string;           // 파일 경로 (폴더 열기 시)
  isDirty: boolean;            // 변경 여부 추적
  lastSavedContent?: string;   // 마지막 저장된 내용
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  createNote: () => void;
  updateNote: (id: string, content: string) => void;
  updateTitle: (id: string, title: string) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string) => void;
  getActiveNote: () => Note | undefined;
  markNoteAsSaved: (id: string) => void;
  setNoteFilePath: (id: string, filePath: string) => void;
  setNotes: (notes: Note[]) => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],
      activeNoteId: null,

      createNote: () => {
        const newNote: Note = {
          id: crypto.randomUUID(),
          title: 'Untitled',
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDirty: true,  // 새로 생성된 노트는 저장되지 않음
          lastSavedContent: '',
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
          activeNoteId: newNote.id,
        }));
      },

      updateNote: (id, content) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === id) {
              const isDirty = content !== (note.lastSavedContent ?? '');
              return {
                ...note,
                content,
                updatedAt: Date.now(),
                isDirty,
              };
            }
            return note;
          }),
        }));
      },

      updateTitle: (id, title) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === id) {
              return {
                ...note,
                title,
                updatedAt: Date.now(),
                isDirty: true,  // 제목 변경도 dirty로 표시
              };
            }
            return note;
          }),
        }));
      },

      deleteNote: (id) => {
        set((state) => {
          const newNotes = state.notes.filter((n) => n.id !== id);
          let newActiveId = state.activeNoteId;
          
          if (state.activeNoteId === id) {
            newActiveId = newNotes.length > 0 ? newNotes[0].id : null;
          }
          
          return {
            notes: newNotes,
            activeNoteId: newActiveId,
          };
        });
      },

      setActiveNote: (id) => set({ activeNoteId: id }),

      getActiveNote: () => {
        const state = get();
        return state.notes.find((n) => n.id === state.activeNoteId);
      },

      markNoteAsSaved: (id) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === id) {
              return {
                ...note,
                isDirty: false,
                lastSavedContent: note.content,
              };
            }
            return note;
          }),
        }));
      },

      setNoteFilePath: (id, filePath) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id === id) {
              return {
                ...note,
                filePath,
              };
            }
            return note;
          }),
        }));
      },

      setNotes: (notes) => {
        set({ notes });
      },
    }),
    {
      name: 'markan-storage',
    }
  )
);
