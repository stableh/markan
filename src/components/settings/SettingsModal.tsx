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
import { useShortcutStore, SHORTCUT_DEFINITIONS, type CommandId } from "@/store/useShortcutStore";
import { eventToShortcut, findShortcutConflict, normalizeShortcut } from "@/lib/shortcuts";
import { useEffect, useState } from "react";

interface SettingsModalProps {
  children: React.ReactNode;
}

function ShortcutSettingsDialog() {
  const { userShortcuts, setShortcut, resetShortcut, resetAllShortcuts, getEffectiveShortcuts } = useShortcutStore();
  const [capturingCommandId, setCapturingCommandId] = useState<CommandId | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const effectiveShortcuts = getEffectiveShortcuts();

  const handleShortcutCapture = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    commandId: CommandId
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setCapturingCommandId(null);
      setShortcutError(null);
      return;
    }

    const shortcut = eventToShortcut(event.nativeEvent);
    if (!shortcut) {
      setShortcutError("Use at least one modifier key (Cmd/Ctrl/Alt/Shift).");
      return;
    }

    const conflictId = findShortcutConflict(commandId, shortcut, effectiveShortcuts);
    if (conflictId) {
      const conflictDef = SHORTCUT_DEFINITIONS.find((def) => def.id === conflictId);
      setShortcutError(`Already used by "${conflictDef?.label ?? conflictId}".`);
      return;
    }

    setShortcut(commandId, shortcut);
    setCapturingCommandId(null);
    setShortcutError(null);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Open</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={resetAllShortcuts}>
              Reset all
            </Button>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border/60 overflow-hidden">
            {SHORTCUT_DEFINITIONS.map((definition) => {
              const shortcut = effectiveShortcuts[definition.id];
              const isOverridden = !!userShortcuts[definition.id];
              const isCapturing = capturingCommandId === definition.id;

              return (
                <div key={definition.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{definition.label}</div>
                    <div className="text-[11px] text-muted-foreground">{definition.category}</div>
                  </div>
                  <div className="flex items-center gap-2" data-shortcut-capture="true">
                    <button
                      className="min-w-[124px] h-8 px-2 rounded-md border border-border bg-muted/40 text-xs font-mono text-left"
                      onClick={() => {
                        setCapturingCommandId(definition.id);
                        setShortcutError(null);
                      }}
                      onKeyDown={(event) => handleShortcutCapture(event, definition.id)}
                      autoFocus={isCapturing}
                      title="Click and press shortcut"
                    >
                      {isCapturing ? "Press keys..." : normalizeShortcut(shortcut)}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!isOverridden}
                      onClick={() => resetShortcut(definition.id)}
                      className="h-8 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {shortcutError && (
            <div className="text-xs text-destructive">{shortcutError}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsModal({ children }: SettingsModalProps) {
  const { theme, toggleTheme, fontSize, setFontSize, uiFontSize, setUiFontSize, pageWidth, setPageWidth, showAIButton, toggleShowAIButton } = useSettingsStore();
  const [appVersion, setAppVersion] = useState("...");

  useEffect(() => {
    let mounted = true;
    void window.api.getAppVersion().then((version) => {
      if (mounted) setAppVersion(version);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
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

          {/* Shortcut Settings Entry */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Keyboard Shortcuts</span>
              <span className="text-xs text-muted-foreground">
                Open shortcut editor
              </span>
            </div>
            <ShortcutSettingsDialog />
          </div>

          {/* App Info */}
          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
            <div className="text-xs truncate">
              <span className="font-brand font-semibold text-foreground">MarkAn</span>
              <span className="text-muted-foreground"> v{appVersion}</span>
            </div>
            <button
              type="button"
              onClick={() => {}}
              title="Check for updates (coming soon)"
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
            >
              Check updates
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
