import { useNoteStore } from '@/store/useNoteStore';

export function StatusBar() {
  const { getActiveNote } = useNoteStore();
  const activeNote = getActiveNote();
  const content = activeNote?.content || '';

  // Simple word count (space delimited)
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  // Line count
  const lines = content ? content.split('\n').length : 0;
  // Character count (including spaces)
  const chars = content.length;

  return (
    <footer className="h-7 border-t border-border bg-background/80 backdrop-blur-sm flex items-center justify-end px-4 gap-4 text-xs text-muted-foreground shrink-0 select-none z-10">
      <div className="flex items-center gap-1 hover:text-foreground transition-colors cursor-default">
        <span className="font-medium">{words}</span>
        <span>words</span>
      </div>
      <div className="flex items-center gap-1 hover:text-foreground transition-colors cursor-default">
        <span className="font-medium">{chars}</span>
        <span>chars</span>
      </div>
       <div className="flex items-center gap-1 hover:text-foreground transition-colors cursor-default">
        <span className="font-medium">{lines}</span>
        <span>lines</span>
      </div>
    </footer>
  );
}
