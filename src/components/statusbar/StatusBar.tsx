import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { stripMarkdown } from '@/lib/markdown';

export function StatusBar() {
  const { getActiveNote } = useNoteStore();
  const { editorMode } = useSettingsStore();
  const { workspacePath } = useWorkspaceStore();
  const activeNote = getActiveNote();
  const content = activeNote?.content || '';

  const renderedText = editorMode === 'plain' ? content : stripMarkdown(content);
  const chars = renderedText.length;

  // Line count logic improved for Markdown
  // Filter out empty lines to count only lines with content
  const nonEmptyLines = renderedText.split('\n').filter(line => line.trim().length > 0).length;
  const lines = Math.max(1, nonEmptyLines);
  const fullPath = workspacePath || 'No folder selected';

  return (
    <footer className="bg-background/80 backdrop-blur-sm px-4 py-2 text-[13px] text-muted-foreground shrink-0 select-none z-10">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-muted/60 border border-border/60 shadow-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">{chars}</span>
            <span>chars</span>
          </div>
          <div className="h-3 w-px bg-border/70" />
          <div className="flex items-center gap-1">
            <span className="font-medium">{lines}</span>
            <span>lines</span>
          </div>
          <div className="h-3 w-px bg-border/70" />
          <div className="max-w-[320px] truncate text-foreground/80" title={fullPath}>
            {fullPath}
          </div>
        </div>
      </div>
    </footer>
  );
}
