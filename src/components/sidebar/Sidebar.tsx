import { useNoteStore } from '@/store/useNoteStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, FileText, Book } from 'lucide-react';

export function Sidebar() {
  const { notes, activeNoteId, createNote, setActiveNote, deleteNote } = useNoteStore();

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen shrink-0 transition-all duration-300">
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
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
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
              "group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-sm min-h-[30px]",
              activeNoteId === note.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={15} className={cn("shrink-0", activeNoteId === note.id ? "text-foreground" : "opacity-70")} />
                <span className="truncate leading-none pt-0.5">{note.title || 'Untitled'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNote(note.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-destructive transition-all p-0.5 rounded-sm hover:bg-background/50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
