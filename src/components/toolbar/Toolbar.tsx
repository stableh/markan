import { Copy, PanelLeft, Settings, Save, SaveOff } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';
import { toast } from 'sonner';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { cn } from '@/lib/utils';
import { normalizeForClipboard } from '@/lib/markdown';

export function Toolbar() {
  const { isAIPanelOpen, toggleAIPanel, isSidebarOpen, toggleSidebar, showAIButton, editorRef } = useSettingsStore();
  const { getActiveNote, updateTitle } = useNoteStore();
  const activeNote = getActiveNote();

  const handleCopy = () => {
    if (activeNote?.content) {
      navigator.clipboard.writeText(normalizeForClipboard(activeNote.content));
      toast.success('Copied to clipboard');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      editorRef?.current?.focus();
    }
  };

  return (
    <header className="relative h-14 flex items-center px-3 shrink-0 bg-background/50 backdrop-blur-sm z-10 titlebar-drag-region">
      {/* Left Actions */}
      <div className={cn("flex items-center gap-1 z-20 titlebar-no-drag transition-all duration-300", !isSidebarOpen && "pl-22")}>
        <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
        >
            <PanelLeft size={18} className={!isSidebarOpen ? "text-muted-foreground" : "text-foreground"} />
        </button>
      </div>

      {/* Centered Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-full max-w-[300px] titlebar-no-drag">
        {activeNote && (
          <div className="flex items-center gap-1.5 w-full justify-center">
            <div className="relative group">
              {activeNote.isDirty ? (
                <SaveOff size={18} className="text-muted-foreground shrink-0" />
              ) : (
                <Save size={18} className="text-muted-foreground shrink-0" />
              )}
              {/* Floating tooltip */}
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {activeNote.isDirty ? "Unsaved changes" : "Saved"}
              </div>
            </div>
            <input
                type="text"
                value={activeNote.title}
                onChange={(e) => updateTitle(activeNote.id, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Untitled"
                className="bg-transparent text-xl font-medium text-center text-foreground/80 focus:outline-none focus:text-foreground placeholder:text-muted-foreground/50 w-full truncate"
            />
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-0.5 ml-auto titlebar-no-drag">
        <button
          onClick={handleCopy}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Copy"
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

        {showAIButton && (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
