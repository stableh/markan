import { FolderOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TitleBar = () => {
  const currentPath = ""; // TODO: Connect to store

  return (
    <div className="relative h-12 w-full flex items-center justify-center px-3 py-1 titlebar-drag-region bg-sidebar border-b border-border shrink-0 transition-colors duration-300">
      {/* Center: Path Badge */}
      <div className="flex items-center titlebar-no-drag">
        <div className="flex items-center px-2.5 rounded-md bg-muted/50 border border-border/50 text-base font-medium text-muted-foreground select-text">
        {/* Right: Action Buttons */}
          <div className="mr-2 flex items-center gap-1 titlebar-no-drag">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Open Folder"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Open File"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
          <span>{currentPath || "No folder opened"}</span>
        </div>
      </div>
    </div>
  );
};
