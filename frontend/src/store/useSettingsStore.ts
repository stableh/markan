import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  fontSize: number;
  isSidebarOpen: boolean;
  isAIPanelOpen: boolean;
  toggleTheme: () => void;
  setFontSize: (size: number) => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      fontSize: 16,
      isSidebarOpen: true,
      isAIPanelOpen: false,
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
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
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
