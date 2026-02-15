import { useNoteStore } from '@/store/useNoteStore';
import type { Note, NoteExtension, NoteSourceType } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, FolderOpen, FileUp, Save, SaveOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const { notes, activeNoteId, createNote, setActiveNote, deleteNote, updateTitle, setNoteExtension } = useNoteStore();
  const { theme } = useSettingsStore();
  const { openFolder, workspacePath } = useWorkspaceStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const assetBase = import.meta.env.BASE_URL;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { year, month, day, time };
  };

  const { year, month, day, time } = formatDate(currentTime);

  const getSourceType = (note: Note): NoteSourceType =>
    note.sourceType ?? (note.filePath ? 'workspace' : 'unfiled');

  const getExtension = (note: Note): NoteExtension =>
    note.extension ?? (note.filePath?.toLowerCase().endsWith('.txt') ? 'txt' : 'md');

  const getPreview = (content: string) =>
    content
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/[#*`_~>-]/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50) || 'No content';

  const getDateGroupLabel = (updatedAt: number) => {
    const date = new Date(updatedAt);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    if (date.getTime() >= startOfToday) return 'Today';
    if (date.getTime() >= startOfYesterday) return 'Yesterday';
    if (date.getTime() >= startOfThisWeek) return 'This Week';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const groupNotesByDate = (targetNotes: Note[]) => {
    const sorted = [...targetNotes].sort((a, b) => b.updatedAt - a.updatedAt);
    const groups = new Map<string, Note[]>();

    for (const note of sorted) {
      const label = getDateGroupLabel(note.updatedAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(note);
    }

    return Array.from(groups.entries()).map(([label, groupedNotes]) => ({
      label,
      notes: groupedNotes,
    }));
  };

  const unfiledNotes = notes.filter((note) => getSourceType(note) === 'unfiled');
  const workspaceNotes = notes.filter((note) => getSourceType(note) === 'workspace');

  const unfiledGroups = groupNotesByDate(unfiledNotes);
  const workspaceGroups = groupNotesByDate(workspaceNotes);

  const workspaceName = workspacePath
    ? workspacePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? workspacePath
    : 'No folder selected';

  const renderNoteRow = (note: Note) => {
    const extension = getExtension(note);
    const isWorkspaceNote = getSourceType(note) === 'workspace';
    const relativePath = isWorkspaceNote && workspacePath && note.filePath
      ? note.filePath.replace(/\\/g, '/').replace(`${workspacePath.replace(/\\/g, '/')}/`, '')
      : undefined;

    return (
      <div
        key={note.id}
        onClick={() => setActiveNote(note.id)}
        className={cn(
          "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-all border border-transparent",
          activeNoteId === note.id
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border-border/10"
            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <div className="flex flex-col gap-0.5 overflow-hidden w-full">
          <div className="flex items-center gap-1.5">
            {note.isDirty ? (
              <SaveOff size={10} className="text-muted-foreground/70 shrink-0" />
            ) : (
              <Save size={10} className="text-muted-foreground/70 shrink-0" />
            )}
            <input
              value={note.title}
              onChange={(e) => updateTitle(note.id, e.target.value)}
              onFocus={() => setActiveNote(note.id)}
              className="bg-transparent font-medium text-sm w-full focus:outline-none truncate placeholder:text-muted-foreground/50"
              placeholder="Untitled"
            />
          </div>
          <div className="text-[11px] text-muted-foreground/60 truncate h-4 select-none">
            {getPreview(note.content)}
          </div>
          {isWorkspaceNote ? (
            <div className="text-[10px] text-muted-foreground/50 truncate select-none">
              {`${extension.toUpperCase()} • ${relativePath ?? note.filePath ?? ''}`}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground/50 truncate select-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteExtension(note.id, 'md');
                  }}
                  className={cn(
                    "text-[10px] font-semibold transition-colors",
                    extension === 'md'
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Save as .md"
                >
                  MD
                </button>
                <span> • </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteExtension(note.id, 'txt');
                  }}
                  className={cn(
                    "text-[10px] font-semibold transition-colors",
                    extension === 'txt'
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Save as .txt"
                >
                  TXT
                </button>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-destructive transition-all p-0.5 rounded-sm shrink-0"
        >
          <Trash2 size={17} />
        </button>
      </div>
    );
  };

  return (
    <aside className="w-64 bg-sidebar flex flex-col h-screen shrink-0 transition-all duration-300 border-r border-sidebar-border">
      {/* Traffic Light Spacer & Drag Region */}
      <div className="h-14 w-full titlebar-drag-region shrink-0" />

      {/* App Header */}
      <div className="h-14 flex items-center justify-between px-3 mb-2 relative shrink-0">
        {/* Left: Logo */}
        <div className="flex items-center select-none z-10 pl-0.5">
          <img
            src={theme === 'dark'
              ? `${assetBase}logo/logo_dark_background.png`
              : `${assetBase}logo/logo_white_background.png`}
            alt="MarkAn Logo"
            className="w-10 h-10 object-contain"
          />
        </div>

        {/* Center: Date & Time */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center select-none w-full pointer-events-none">
          <div className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider leading-none mb-1">
            {month} {day}, {year}
          </div>
          <div className="text-lg font-bold text-foreground tracking-tight font-mono leading-none">
            {time}
          </div>
        </div>
      </div>

      {/* Folder/File Open Buttons */}
      <div className="flex items-center justify-center gap-2 mb-3 px-4">
        <button
          onClick={openFolder}
          className="flex-1 flex items-center justify-center h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          title="Open Folder"
        >
          <FolderOpen size={18} />
        </button>
        <button
          className="flex-1 flex items-center justify-center h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          title="Open File"
        >
          <FileUp size={18} />
        </button>
        <button
          onClick={createNote}
          className="flex-1 flex items-center justify-center h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          title="Create New Page"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8 select-none">
            No pages inside
          </div>
        )}
        <div className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
          Unfiled ({unfiledNotes.length})
        </div>
        {unfiledGroups.length === 0 && (
          <div className="px-3 pb-2 text-[11px] text-muted-foreground/60 select-none">
            No unfiled documents
          </div>
        )}
        {unfiledGroups.map((group) => (
          <div key={`unfiled-${group.label}`} className="space-y-1">
            <div className="px-3 pt-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
              {group.label}
            </div>
            {group.notes.map(renderNoteRow)}
          </div>
        ))}

        <div className="mt-3 px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
          Workspace ({workspaceName})
        </div>
        {workspaceGroups.length === 0 && (
          <div className="px-3 pb-2 text-[11px] text-muted-foreground/60 select-none">
            No .md or .txt documents loaded
          </div>
        )}
        {workspaceGroups.map((group) => (
          <div key={`workspace-${group.label}`} className="space-y-1">
            <div className="px-3 pt-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
              {group.label}
            </div>
            {group.notes.map(renderNoteRow)}
          </div>
        ))}
      </div>
    </aside>
  );
}
