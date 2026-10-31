import { useEffect } from 'react';
import { useBasketballStore } from '../../store/useBasketballStore';

type Store = ReturnType<typeof useBasketballStore.getState>;

export interface Shortcut {
  id: string;
  key: string; // KeyboardEvent.key, lowercase
  label: string;
  run: (store: Store) => void;
}

// Add a row to add a shortcut; the help panel and button hints follow this table.
// Deliberately no game reset or period change here: nothing destructive on a key.
export const SHORTCUTS: Shortcut[] = [
  { id: 'home+1', key: '1', label: 'Home +1', run: (s) => s.addScore('home', 1) },
  { id: 'home+2', key: '2', label: 'Home +2', run: (s) => s.addScore('home', 2) },
  { id: 'home+3', key: '3', label: 'Home +3', run: (s) => s.addScore('home', 3) },
  { id: 'away+1', key: '4', label: 'Away +1', run: (s) => s.addScore('away', 1) },
  { id: 'away+2', key: '5', label: 'Away +2', run: (s) => s.addScore('away', 2) },
  { id: 'away+3', key: '6', label: 'Away +3', run: (s) => s.addScore('away', 3) },
  { id: 'game', key: ' ', label: 'Start/pause game clock', run: (s) => (s.gameClock.isRunning ? s.pauseGameClock() : s.startGameClock()) },
  { id: 'shot', key: 's', label: 'Start/pause shot clock', run: (s) => (s.shotClock.isRunning ? s.pauseShotClock() : s.startShotClock()) },
  { id: 'shot24', key: 'r', label: 'Shot clock full reset', run: (s) => s.resetShotClock(s.gameConfig.shotClockDuration) },
  { id: 'shot14', key: 'e', label: 'Shot clock short reset', run: (s) => s.resetShotClock(s.gameConfig.shotClockShort) },
  { id: 'possession', key: 't', label: 'Switch possession', run: (s) => s.togglePossession() },
  { id: 'undo', key: 'u', label: 'Undo', run: (s) => s.undo() },
];

export const keyName = (key: string) => (key === ' ' ? 'Space' : key.toUpperCase());

export const shortcutKey = (id: string) => {
  const shortcut = SHORTCUTS.find((s) => s.id === id);
  return shortcut && keyName(shortcut.key);
};

const typing = (target: EventTarget | null) =>
  target instanceof Element && target.closest('input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"])') !== null;

const findShortcut = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || typing(event.target)) return undefined;
  if (document.querySelector('dialog[open]')) return undefined; // a confirmation has the keyboard
  return SHORTCUTS.find((s) => s.key === event.key.toLowerCase());
};

export const handleKeyDown = (event: KeyboardEvent) => {
  const shortcut = findShortcut(event);
  if (!shortcut) return;
  event.preventDefault(); // Space would scroll or click the focused button
  if (!event.repeat) shortcut.run(useBasketballStore.getState()); // a held key is one press
};

// Some browsers click a focused button on Space keyup instead of keydown.
const handleKeyUp = (event: KeyboardEvent) => {
  if (findShortcut(event)) event.preventDefault();
};

export const useShortcuts = () => {
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
};
