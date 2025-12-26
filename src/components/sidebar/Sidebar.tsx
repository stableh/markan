import { useNoteStore } from '@/store/useNoteStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, FileText, Book } from 'lucide-react';

export function Sidebar() {
  const { notes, activeNoteId, createNote, setActiveNote, deleteNote, updateTitle } = useNoteStore();

  return (
    <aside className="w-64 bg-sidebar flex flex-col h-screen shrink-0 transition-all duration-300">
      {/* App Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 text-sidebar-foreground font-semibold select-none">
            <div className="p-1 bg-primary/10 rounded-md">
                <Book size={18} className="text-primary" />
            </div>
            <span className="text-base">Markan</span>
        </div>
        <button
          onClick={createNote}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors"
          title="Create New Page"
        >
          <Plus size={18} />
        </button>
      </div>
      
      {/* Note List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8 select-none">
                No pages inside
            </div>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => setActiveNote(note.id)}
            className={cn(
              "group flex flex-col gap-0.5 px-3 py-2.5 rounded-md cursor-pointer transition-all border border-transparent",
              activeNoteId === note.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border-border/10"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <div className="flex items-center justify-between gap-2">
                <input
                    value={note.title}
                    onChange={(e) => updateTitle(note.id, e.target.value)}
                    onFocus={() => setActiveNote(note.id)}
                    className="bg-transparent font-medium text-sm w-full focus:outline-none truncate placeholder:text-muted-foreground/50"
                    placeholder="Untitled"
                />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-destructive transition-all p-0.5 rounded-sm shrink-0"
                >
                    <Trash2 size={13} />
                </button>
            </div>
            <div className="text-[11px] text-muted-foreground/60 truncate h-4 select-none">
                {note.content
                    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/[#*`_~>\-]/g, '') // Remove markdown symbols
                    .replace(/\n/g, ' ') // Replace newlines
                    .replace(/\s+/g, ' ') // Collapse spaces
                    .trim()
                    .slice(0, 50) || 'No content'}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
