import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
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
              return {
                ...note,
                content,
                updatedAt: Date.now(),
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
    }),
    {
      name: 'markan-storage',
    }
  )
);
