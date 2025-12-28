import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface SettingsModalProps {
  children: React.ReactNode;
}

export function SettingsModal({ children }: SettingsModalProps) {
  const { theme, toggleTheme, fontSize, setFontSize, uiFontSize, setUiFontSize, pageWidth, setPageWidth, showAIButton, toggleShowAIButton } = useSettingsStore();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Theme Setting */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Theme</span>
              <span className="text-xs text-muted-foreground">
                Select your preferred theme
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === "light" ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </div>

          {/* Editor Font Size Setting */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Editor Font Size</span>
              <span className="text-xs text-muted-foreground">
                Adjust the editor font size
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                disabled={fontSize <= 12}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <span className="w-12 text-center text-sm">{fontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                disabled={fontSize >= 32}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>

          {/* UI Font Size Setting */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">UI Font Size</span>
              <span className="text-xs text-muted-foreground">
                Adjust the interface font size
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUiFontSize(Math.max(12, uiFontSize - 1))}
                disabled={uiFontSize <= 12}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <span className="w-12 text-center text-sm">{uiFontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUiFontSize(Math.min(20, uiFontSize + 1))}
                disabled={uiFontSize >= 20}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>

          {/* Page Width Setting */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Page Width</span>
              <span className="text-xs text-muted-foreground">
                Choose editor width layout
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button
                variant={pageWidth === 'narrow' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPageWidth('narrow')}
                className="h-7 text-xs"
              >
                Narrow
              </Button>
              <Button
                variant={pageWidth === 'wide' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPageWidth('wide')}
                className="h-7 text-xs"
              >
                Wide
              </Button>
            </div>
          </div>

          {/* Show AI Button Setting */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Show <span className="font-brand text-base">MAi</span> Button</span>
              <span className="text-xs text-muted-foreground">
                Toggle visibility of the <span className="font-brand text-base">MAi</span> button in toolbar
              </span>
            </div>
            <Switch
              checked={showAIButton}
              onCheckedChange={toggleShowAIButton}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
