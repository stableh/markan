import { useEffect, useRef } from 'react';
import { useNoteStore } from '@/store/useNoteStore';
import { joinPath } from '@/lib/fileUtils';

const AUTOSAVE_INTERVAL = 10000; // 10초

export function useAutosave() {
  const notes = useNoteStore((state) => state.notes);
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // autosave 폴더 경로 가져오기
        const userDataPath = await window.api.getAppPath('userData');
        const autosaveFolder = joinPath(userDataPath, 'autosave');

        // dirty한 노트만 autosave
        const dirtyNotes = notesRef.current.filter((note) => note.isDirty);

        for (const note of dirtyNotes) {
          const extension = note.extension === 'txt' ? 'txt' : 'md';
          const fileName = `note-${note.id}.${extension}`;
          const filePath = joinPath(autosaveFolder, fileName);

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
  }, []);
}
