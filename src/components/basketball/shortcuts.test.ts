import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBasketballStore } from '../../store/useBasketballStore';
import { SHORTCUTS, handleKeyDown, keyName, shortcutKey } from './shortcuts';

const press = (target: Element, key: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
};

const store = useBasketballStore;
const initial = store.getState();

beforeEach(() => {
  store.setState(initial, true);
  document.body.innerHTML = '';
  document.addEventListener('keydown', handleKeyDown);
});

afterEach(() => document.removeEventListener('keydown', handleKeyDown));

describe('shortcuts', () => {
  it.each([
    ['1', 'homeTeam', 1], ['2', 'homeTeam', 2], ['3', 'homeTeam', 3],
    ['4', 'awayTeam', 1], ['5', 'awayTeam', 2], ['6', 'awayTeam', 3],
  ] as const)('%s scores for %s', (key, team, points) => {
    press(document.body, key);
    expect(store.getState()[team].score).toBe(points);
  });

  it('Space toggles the game clock and is not left to the browser', () => {
    expect(press(document.body, ' ').defaultPrevented).toBe(true);
    expect(store.getState().gameClock.isRunning).toBe(true);
    press(document.body, ' ');
    expect(store.getState().gameClock.isRunning).toBe(false);
  });

  it('runs the shot clock, possession and undo keys, in either case', () => {
    press(document.body, 's');
    expect(store.getState().shotClock.isRunning).toBe(true);
    press(document.body, 'e');
    expect(store.getState().shotClock).toMatchObject({ remainingTime: 14, isRunning: false });
    press(document.body, 'R');
    expect(store.getState().shotClock.remainingTime).toBe(24);
    press(document.body, 't');
    expect(store.getState().possession).toBe('home');
    press(document.body, 'u');
    expect(store.getState().possession).toBeNull();
  });

  it.each([['input'], ['textarea'], ['select']])('ignores keys while typing in a %s', (tag) => {
    const field = document.body.appendChild(document.createElement(tag));
    const event = press(field, '2');
    expect(store.getState().homeTeam.score).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys inside contenteditable, even in a nested element', () => {
    const editable = document.body.appendChild(document.createElement('div'));
    editable.setAttribute('contenteditable', 'true');
    press(editable.appendChild(document.createElement('span')), '2');
    expect(store.getState().homeTeam.score).toBe(0);
  });

  it('leaves browser combinations such as Cmd+R alone', () => {
    for (const modifier of ['metaKey', 'ctrlKey', 'altKey', 'shiftKey']) {
      expect(press(document.body, 'r', { [modifier]: true }).defaultPrevented).toBe(false);
    }
    expect(store.getState().history).toHaveLength(0);
  });

  it('counts a held key once', () => {
    press(document.body, '3');
    expect(press(document.body, '3', { repeat: true }).defaultPrevented).toBe(true);
    expect(store.getState().homeTeam.score).toBe(3);
  });

  it('leaves unbound keys alone', () => {
    expect(press(document.body, 'x').defaultPrevented).toBe(false);
  });

  it('has no duplicate keys, and nothing that resets the game', () => {
    expect(new Set(SHORTCUTS.map((s) => s.key)).size).toBe(SHORTCUTS.length);
    const resetGame = vi.fn();
    const game = { ...initial, resetGame };
    SHORTCUTS.forEach((s) => s.run(game));
    expect(resetGame).not.toHaveBeenCalled();
  });

  it('names keys for the help panel', () => {
    expect(keyName(' ')).toBe('Space');
    expect(shortcutKey('shot24')).toBe('R');
  });
});
