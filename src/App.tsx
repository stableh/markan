import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { StatusBar } from '@/components/statusbar/StatusBar';
import MilkdownEditorWrapper from '@/components/editor/MilkdownEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Toaster } from 'sonner';
import { Sparkles } from 'lucide-react';

function App() {
  const { notes, activeNoteId, createNote, setActiveNote, updateNote, getActiveNote } = useNoteStore();
  const { theme, isAIPanelOpen, toggleAIPanel } = useSettingsStore(); 

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

    // Keyboard shortcut for AI Panel (Cmd+J or Ctrl+J)
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
            e.preventDefault();
            toggleAIPanel();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNote, setActiveNote, toggleAIPanel]);

  const activeNote = getActiveNote();

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background transition-all duration-300 ease-in-out">
        <Toolbar />
        <div className="flex-1 relative overflow-hidden">
            {activeNote ? (
                <MilkdownEditorWrapper 
                    key={activeNote.id} // Force re-render on note switch
                    initialContent={activeNote.content}
                    onChange={(content) => updateNote(activeNote.id, content)}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
                    Loading...
                </div>
            )}
            
            {/* Floating AI Button */}
            <button
                onClick={toggleAIPanel}
                className={`absolute bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                    isAIPanelOpen 
                    ? 'bg-background border border-border text-muted-foreground hover:text-foreground' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
                title="Toggle AI Assistant (Cmd+J)"
            >
                <Sparkles size={24} className={isAIPanelOpen ? "opacity-50" : ""} />
            </button>
        </div>
        <StatusBar />
      </main>

      {isAIPanelOpen && <AIPanel />}
      <Toaster />
    </div>
  );
}

export default App;