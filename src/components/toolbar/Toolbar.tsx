import { Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';

export function Toolbar() {
  const { isAIPanelOpen, toggleAIPanel } = useSettingsStore();
  const { getActiveNote } = useNoteStore();
  const activeNote = getActiveNote();

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="font-medium text-sm text-muted-foreground truncate max-w-[300px]">
          {activeNote?.title || 'Untitled'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleAIPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            isAIPanelOpen 
              ? 'bg-primary/10 text-primary hover:bg-primary/20' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title={isAIPanelOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">AI Assistant</span>
          {isAIPanelOpen ? <PanelRightClose size={16} className="opacity-50" /> : <PanelRightOpen size={16} className="opacity-50" />}
        </button>
      </div>
    </header>
  );
}
