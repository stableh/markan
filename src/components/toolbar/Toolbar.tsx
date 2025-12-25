import { Copy, Sun, Moon } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';
import { toast } from 'sonner';

export function Toolbar() {
  const { theme, toggleTheme } = useSettingsStore();
  const { getActiveNote } = useNoteStore();
  const activeNote = getActiveNote();

  const handleCopy = () => {
    if (activeNote?.content) {
      navigator.clipboard.writeText(activeNote.content);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <header className="relative h-12 flex items-center px-3 shrink-0 bg-background/50 backdrop-blur-sm z-10">
      {/* Centered Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
        <span className="text-sm font-medium text-foreground/80 truncate max-w-[300px]">
          {activeNote?.title || 'Untitled'}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-0.5 ml-auto">
        <button
          onClick={handleCopy}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Copy Markdown"
        >
          <Copy size={16} />
        </button>

        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
