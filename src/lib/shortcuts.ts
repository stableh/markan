export const isMac = () => {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

const KEY_ALIASES: Record<string, string> = {
  ' ': 'Space',
  Escape: 'Esc',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
};

const DISPLAY_ORDER = ['Cmd', 'Ctrl', 'Alt', 'Shift'] as const;

export const normalizeShortcut = (shortcut: string) => {
  const rawParts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  const lower = rawParts.map((part) => part.toLowerCase());
  const modifiers = new Set<string>();

  if (lower.includes('cmd') || lower.includes('meta')) modifiers.add('Cmd');
  if (lower.includes('ctrl') || lower.includes('control')) modifiers.add('Ctrl');
  if (lower.includes('alt') || lower.includes('option')) modifiers.add('Alt');
  if (lower.includes('shift')) modifiers.add('Shift');

  const keyCandidate = rawParts.find((part) => {
    const token = part.toLowerCase();
    return !['cmd', 'meta', 'ctrl', 'control', 'alt', 'option', 'shift'].includes(token);
  });

  const key = keyCandidate ? formatKeyLabel(keyCandidate) : '';
  const orderedModifiers = DISPLAY_ORDER.filter((mod) => modifiers.has(mod));

  return key ? [...orderedModifiers, key].join('+') : orderedModifiers.join('+');
};

export const formatKeyLabel = (key: string) => {
  if (KEY_ALIASES[key]) return KEY_ALIASES[key];
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
};

export const eventToShortcut = (event: KeyboardEvent) => {
  const mods: string[] = [];
  if (event.metaKey) mods.push('Cmd');
  if (event.ctrlKey) mods.push('Ctrl');
  if (event.altKey) mods.push('Alt');
  if (event.shiftKey) mods.push('Shift');

  // Ignore plain key presses to avoid hijacking text input.
  if (mods.length === 0) return null;

  const key = formatKeyLabel(event.key);
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) return null;

  return normalizeShortcut([...mods, key].join('+'));
};

export const findShortcutConflict = (
  commandId: string,
  nextShortcut: string,
  effectiveShortcuts: Record<string, string>
) => {
  const normalizedNext = normalizeShortcut(nextShortcut);

  return Object.entries(effectiveShortcuts).find(
    ([id, shortcut]) => id !== commandId && normalizeShortcut(shortcut) === normalizedNext
  )?.[0] ?? null;
};

export const resolvePlatformShortcut = (shortcut: string) => {
  const target = isMac() ? 'Cmd' : 'Ctrl';
  return normalizeShortcut(shortcut.replace(/CmdOrCtrl/gi, target));
};
