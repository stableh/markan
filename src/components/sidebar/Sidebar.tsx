import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, FileText, Moon, Sun, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function Sidebar() {
  const { notes, activeNoteId, createNote, setActiveNote, deleteNote, getActiveNote } = useNoteStore();
  const { theme, toggleTheme } = useSettingsStore();

  const handleCopy = () => {
    const note = getActiveNote();
    if (note) {
        navigator.clipboard.writeText(note.content);
        toast.success('Markdown copied to clipboard');
    } else {
        toast.error('No note selected');
    }
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-sidebar-border">
        <button
          onClick={createNote}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          <Plus size={18} />
          <span>New Note</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
                No notes yet.
            </div>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => setActiveNote(note.id)}
            className={cn(
              "group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
              activeNoteId === note.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={16} className="shrink-0" />
                <span className="truncate">{note.title || 'Untitled'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNote(note.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button 
            onClick={handleCopy}
            className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors text-sm cursor-pointer"
        >
            <Copy size={16} />
            <span>Copy Markdown</span>
        </button>
        <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors text-sm cursor-pointer"
        >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </aside>
  );
}
