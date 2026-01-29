import { useEffect, useRef } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { StatusBar } from '@/components/statusbar/StatusBar';
import MilkdownEditorWrapper, { type MilkdownEditorRef } from '@/components/editor/MilkdownEditor';
import PlainTextEditor from '@/components/editor/PlainTextEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAutosave } from '@/hooks/useAutosave';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { Sparkles, FilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function App() {
  const { createNote, setActiveNote, updateNote, getActiveNote } = useNoteStore();
  const { isAIPanelOpen, toggleAIPanel, isSidebarOpen, uiFontSize, setEditorRef, editorMode } = useSettingsStore();
  const { workspacePath, saveNote, saveAllNotes } = useWorkspaceStore();
  const editorRef = useRef<MilkdownEditorRef>(null);

  // Autosave 훅 활성화
  useAutosave();

  useEffect(() => {
    setEditorRef(editorRef);
  }, [setEditorRef]);

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

    // Keyboard shortcuts
    const handleKeyDown = async (e: KeyboardEvent) => {
        // Cmd+J or Ctrl+J - AI Panel 토글
        if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
            e.preventDefault();
            toggleAIPanel();
        }

        // Cmd+S or Ctrl+S - 저장
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();

            if (!workspacePath) {
                // 폴더가 설정되지 않은 경우 - 폴더 선택 후 전체 저장
                const folderPath = await window.api.openFolder();
                if (folderPath) {
                    useWorkspaceStore.getState().setWorkspacePath(folderPath);
                    await saveAllNotes();
                    toast.success('All notes saved to folder');
                }
            } else {
                // 폴더가 설정된 경우 - 현재 노트만 저장
                const activeNote = getActiveNote();
                if (activeNote && activeNote.isDirty) {
                    await saveNote(activeNote.id);
                    toast.success('Note saved');
                } else if (activeNote) {
                    toast.info('No changes to save');
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNote, setActiveNote, toggleAIPanel, workspacePath, saveNote, saveAllNotes, getActiveNote]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiFontSize}px`;
  }, [uiFontSize]);

  const activeNote = getActiveNote();

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Wrapper */}
        <div 
          className={cn(
              "h-full transition-all duration-300 ease-in-out overflow-hidden border-r border-sidebar-border",
              isSidebarOpen ? "w-64 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full border-none"
          )}
        >
          <div className="w-64 h-full">
              <Sidebar />
          </div>
        </div>
        
        <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background transition-all duration-300 ease-in-out">
        <Toolbar />
        <div className="flex-1 relative overflow-hidden">
            {activeNote ? (
                editorMode === 'plain' ? (
                  <PlainTextEditor
                    ref={editorRef}
                    key={activeNote.id}
                    content={activeNote.content}
                    onChange={(content) => updateNote(activeNote.id, content)}
                  />
                ) : (
                  <MilkdownEditorWrapper
                    ref={editorRef}
                    key={activeNote.id} // Force re-render on note switch
                    initialContent={activeNote.content}
                    onChange={(content) => updateNote(activeNote.id, content)}
                  />
                )
            ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                    <Button 
                        variant="ghost" 
                        onClick={() => createNote()}
                        className="text-muted-foreground hover:text-foreground text-lg h-auto py-2 px-6"
                    >
                        <FilePlus className="size-6" />
                        Yes, it’s empty. Fix that.
                    </Button>
                </div>
            )}
            <StatusBar />
        </div>
      </main>

      {/* Right AI Panel Wrapper */}
      <div 
        className={cn(
            "h-full transition-all duration-300 ease-in-out overflow-hidden shadow-2xl z-20",
            isAIPanelOpen ? "w-[400px] opacity-100 translate-x-0 border-l border-sidebar-border" : "w-0 opacity-0 translate-x-full border-none"
        )}
      >
        <div className="w-[400px] h-full">
            <AIPanel />
        </div>
      </div>
      </div>
      
      <Toaster position="bottom-left" />
    </div>
  );
}

export default App;
