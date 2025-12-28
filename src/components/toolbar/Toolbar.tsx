import { Copy, Sun, Moon, Sparkles, PanelLeft, Settings } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';
import { toast } from 'sonner';
import { SettingsModal } from '@/components/settings/SettingsModal';

export function Toolbar() {
  const { theme, toggleTheme, isAIPanelOpen, toggleAIPanel, isSidebarOpen, toggleSidebar } = useSettingsStore();
  const { getActiveNote, updateTitle } = useNoteStore();
  const activeNote = getActiveNote();

  const handleCopy = () => {
    if (activeNote?.content) {
      navigator.clipboard.writeText(activeNote.content);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <header className="relative h-14 flex items-center px-3 shrink-0 bg-background/50 backdrop-blur-sm z-10 titlebar-drag-region">
      {/* Left Actions */}
      <div className="flex items-center gap-1 z-20 titlebar-no-drag">
        <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
            <PanelLeft size={18} className={!isSidebarOpen ? "text-muted-foreground" : "text-foreground"} />
        </button>
      </div>

      {/* Centered Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-full max-w-[400px] titlebar-no-drag">
        <input
            type="text"
            value={activeNote?.title || ''}
            onChange={(e) => activeNote && updateTitle(activeNote.id, e.target.value)}
            placeholder="Untitled"
            className="bg-transparent text-xl font-medium text-center text-foreground/80 focus:outline-none focus:text-foreground placeholder:text-muted-foreground/50 w-full truncate"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-0.5 ml-auto titlebar-no-drag">
        <button
          onClick={handleCopy}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Copy Markdown"
        >
          <Copy size={16} />
        </button>

        <SettingsModal>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </SettingsModal>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={toggleAIPanel}
          className={`h-8 px-2 flex items-center justify-center rounded-md transition-colors ${
            isAIPanelOpen 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title={isAIPanelOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          <span className="font-brand text-lg">MAi</span>
        </button>
      </div>
    </header>
  );
}
