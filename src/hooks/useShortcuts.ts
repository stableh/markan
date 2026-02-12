import { useEffect } from 'react';
import { executeCommand } from '@/lib/commands';
import { eventToShortcut, normalizeShortcut } from '@/lib/shortcuts';
import { useShortcutStore, type CommandId } from '@/store/useShortcutStore';

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[data-shortcut-capture="true"]')) return true;
  return false;
};

export function useShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = eventToShortcut(event);
      if (!shortcut) return;

      const effective = useShortcutStore.getState().getEffectiveShortcuts();
      const normalizedPressed = normalizeShortcut(shortcut);
      const matched = Object.entries(effective).find(
        ([, value]) => normalizeShortcut(value) === normalizedPressed
      );

      if (!matched) return;

      const [commandId] = matched as [CommandId, string];
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      void executeCommand(commandId);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
