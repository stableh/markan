import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeShortcut, resolvePlatformShortcut } from '@/lib/shortcuts';

export type CommandId =
  | 'file.open-folder'
  | 'file.save'
  | 'note.new'
  | 'panel.ai.toggle'
  | 'sidebar.toggle';

interface ShortcutDefinition {
  id: CommandId;
  category: 'File' | 'Note' | 'View' | 'Panel';
  label: string;
  defaultShortcut: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { id: 'file.open-folder', category: 'File', label: 'Open folder', defaultShortcut: 'CmdOrCtrl+O' },
  { id: 'file.save', category: 'File', label: 'Save note', defaultShortcut: 'CmdOrCtrl+S' },
  { id: 'note.new', category: 'Note', label: 'Create new note', defaultShortcut: 'CmdOrCtrl+N' },
  { id: 'panel.ai.toggle', category: 'Panel', label: 'Toggle AI panel', defaultShortcut: 'CmdOrCtrl+J' },
  { id: 'sidebar.toggle', category: 'View', label: 'Toggle sidebar', defaultShortcut: 'CmdOrCtrl+B' },
];

interface ShortcutState {
  userShortcuts: Partial<Record<CommandId, string>>;
  setShortcut: (commandId: CommandId, shortcut: string) => void;
  resetShortcut: (commandId: CommandId) => void;
  resetAllShortcuts: () => void;
  getEffectiveShortcuts: () => Record<CommandId, string>;
}

const getDefaultShortcuts = () => {
  const entries = SHORTCUT_DEFINITIONS.map((def) => [
    def.id,
    resolvePlatformShortcut(def.defaultShortcut),
  ]) as Array<[CommandId, string]>;

  return Object.fromEntries(entries) as Record<CommandId, string>;
};

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set, get) => ({
      userShortcuts: {},

      setShortcut: (commandId, shortcut) => {
        set((state) => ({
          userShortcuts: {
            ...state.userShortcuts,
            [commandId]: normalizeShortcut(shortcut),
          },
        }));
      },

      resetShortcut: (commandId) => {
        set((state) => {
          const next = { ...state.userShortcuts };
          delete next[commandId];
          return { userShortcuts: next };
        });
      },

      resetAllShortcuts: () => set({ userShortcuts: {} }),

      getEffectiveShortcuts: () => {
        const defaults = getDefaultShortcuts();
        const user = get().userShortcuts;

        return {
          ...defaults,
          ...(Object.fromEntries(
            Object.entries(user).map(([id, shortcut]) => [id, normalizeShortcut(shortcut as string)])
          ) as Partial<Record<CommandId, string>>),
        };
      },
    }),
    {
      name: 'markan-shortcuts',
    }
  )
);
