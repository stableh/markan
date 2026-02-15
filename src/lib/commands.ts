import { toast } from 'sonner';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { CommandId } from '@/store/useShortcutStore';

const saveActiveNote = async () => {
  const workspaceStore = useWorkspaceStore.getState();
  const noteStore = useNoteStore.getState();
  const { workspacePath, saveNote, saveAllNotes, setWorkspacePath } = workspaceStore;
  const activeNote = noteStore.getActiveNote();

  if (!workspacePath) {
    const folderPath = await window.api.openFolder();
    if (!folderPath) return;
    setWorkspacePath(folderPath);
    await saveAllNotes();
    toast.success('All notes saved to folder');
    return;
  }

  if (!activeNote) return;

  if (activeNote.isDirty) {
    await saveNote(activeNote.id);
    toast.success('Note saved');
    return;
  }

  toast.info('No changes to save');
};

const openFolder = async () => {
  await useWorkspaceStore.getState().openFolder();
};

const createNewNote = () => {
  useNoteStore.getState().createNote();
};

const toggleAiPanel = () => {
  useSettingsStore.getState().toggleAIPanel();
};

const toggleSidebar = () => {
  useSettingsStore.getState().toggleSidebar();
};

const COMMAND_HANDLERS: Record<CommandId, () => void | Promise<void>> = {
  'file.open-folder': openFolder,
  'file.save': saveActiveNote,
  'note.new': createNewNote,
  'panel.ai.toggle': toggleAiPanel,
  'sidebar.toggle': toggleSidebar,
};

export const executeCommand = async (commandId: CommandId) => {
  const handler = COMMAND_HANDLERS[commandId];
  if (!handler) return;
  await handler();
};
