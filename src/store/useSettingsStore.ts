import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MilkdownEditorRef } from '@/components/editor/MilkdownEditor';

interface SettingsState {
  theme: 'light' | 'dark';
  editorMode: 'rich' | 'plain';
  fontSize: number;
  uiFontSize: number;
  pageWidth: 'narrow' | 'wide';
  isSidebarOpen: boolean;
  isAIPanelOpen: boolean;
  showAIButton: boolean;
  editorRef: React.RefObject<MilkdownEditorRef> | null;
  toggleTheme: () => void;
  toggleEditorMode: () => void;
  setFontSize: (size: number) => void;
  setUiFontSize: (size: number) => void;
  setPageWidth: (width: 'narrow' | 'wide') => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  toggleShowAIButton: () => void;
  setEditorRef: (ref: React.RefObject<MilkdownEditorRef> | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      editorMode: 'rich',
      fontSize: 16,
      uiFontSize: 14,
      pageWidth: 'narrow',
      isSidebarOpen: true,
      isAIPanelOpen: false,
      showAIButton: true,
      editorRef: null,
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme: newTheme };
        }),
      toggleEditorMode: () =>
        set((state) => ({
          editorMode: state.editorMode === 'rich' ? 'plain' : 'rich',
        })),
      setFontSize: (size) => set({ fontSize: size }),
      setUiFontSize: (size) => set({ uiFontSize: size }),
      setPageWidth: (width) => set({ pageWidth: width }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
      toggleShowAIButton: () => set((state) => ({ showAIButton: !state.showAIButton })),
      setEditorRef: (ref) => set({ editorRef: ref }),
    }),
    {
      name: 'markan-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
    }
  )
);
