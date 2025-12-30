import { useEffect } from 'react';
import { useNoteStore } from '@/store/useNoteStore';
import { sanitizeFileName } from '@/lib/fileUtils';

const AUTOSAVE_INTERVAL = 10000; // 10초

export function useAutosave() {
  const notes = useNoteStore((state) => state.notes);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // autosave 폴더 경로 가져오기
        const userDataPath = await window.api.getAppPath('userData');
        const autosaveFolder = `${userDataPath}/autosave`;

        // dirty한 노트만 autosave
        const dirtyNotes = notes.filter((note) => note.isDirty);

        for (const note of dirtyNotes) {
          const fileName = sanitizeFileName(note.title) || `Untitled-${note.id.slice(0, 8)}`;
          const filePath = `${autosaveFolder}/${fileName}.md`;

          await window.api.writeFile(filePath, note.content);
        }

        if (dirtyNotes.length > 0) {
          console.log(`Autosaved ${dirtyNotes.length} note(s)`);
        }
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [notes]);
}
