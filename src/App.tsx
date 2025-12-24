import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import MilkdownEditorWrapper from '@/components/editor/MilkdownEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Toaster } from 'sonner';

function App() {
  const { notes, activeNoteId, createNote, setActiveNote, updateNote, getActiveNote } = useNoteStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = useSettingsStore(); 

  useEffect(() => {
    // Initialize if empty
    const init = () => {
        if (useNoteStore.getState().notes.length === 0) {
            createNote();
        } else if (!useNoteStore.getState().activeNoteId) {
            const firstNote = useNoteStore.getState().notes[0];
            if (firstNote) setActiveNote(firstNote.id);
        }
    };
    init();
  }, []); // Run once on mount

  const activeNote = getActiveNote();

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background">
        {activeNote ? (
            <MilkdownEditorWrapper 
                key={activeNote.id} // Force re-render on note switch
                initialContent={activeNote.content}
                onChange={(content) => updateNote(activeNote.id, content)}
            />
        ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Loading...
            </div>
        )}
      </main>

      <AIPanel />
      <Toaster />
    </div>
  );
}

export default App;