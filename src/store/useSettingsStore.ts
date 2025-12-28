import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  fontSize: number;
  uiFontSize: number;
  pageWidth: 'narrow' | 'wide';
  isSidebarOpen: boolean;
  isAIPanelOpen: boolean;
  showAIButton: boolean;
  toggleTheme: () => void;
  setFontSize: (size: number) => void;
  setUiFontSize: (size: number) => void;
  setPageWidth: (width: 'narrow' | 'wide') => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  toggleShowAIButton: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 16,
      uiFontSize: 14,
      pageWidth: 'narrow',
      isSidebarOpen: true,
      isAIPanelOpen: false,
      showAIButton: true,
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
      setFontSize: (size) => set({ fontSize: size }),
      setUiFontSize: (size) => set({ uiFontSize: size }),
      setPageWidth: (width) => set({ pageWidth: width }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
      toggleShowAIButton: () => set((state) => ({ showAIButton: !state.showAIButton })),
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
