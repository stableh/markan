import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { stripMarkdown } from '@/lib/markdown';

export function StatusBar() {
  const { getActiveNote } = useNoteStore();
  const { editorMode } = useSettingsStore();
  const activeNote = getActiveNote();
  const content = activeNote?.content || '';

  const renderedText = editorMode === 'plain' ? content : stripMarkdown(content);
  const chars = renderedText.length;

  // Line count logic improved for Markdown
  // Filter out empty lines to count only lines with content
  const nonEmptyLines = renderedText.split('\n').filter(line => line.trim().length > 0).length;
  const lines = Math.max(1, nonEmptyLines);

  return (
    <footer className="h-7 border-t border-border bg-background/80 backdrop-blur-sm flex items-center justify-center px-4 gap-4 text-sm text-muted-foreground shrink-0 select-none z-10">
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
