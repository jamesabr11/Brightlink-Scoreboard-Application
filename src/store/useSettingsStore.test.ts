import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTheme, themePreset } from '../lib/theme';

const STORAGE_KEY = 'basketball-settings';

const openTab = async () => {
  vi.resetModules();
  return (await import('./useSettingsStore')).useSettingsStore;
};

beforeEach(() => localStorage.clear());

describe('settings', () => {
  it('survive a refresh', async () => {
    const before = await openTab();
    before.getState().updateRules({ periodDuration: 8 });
    before.getState().updateTheme(themePreset('tournament'));
    before.getState().updateSound({ enabled: true, volume: 0.2 });
    before.getState().updateDisplay({ showShotClock: false });

    const after = (await openTab()).getState();
    expect(after.rules.periodDuration).toBe(8);
    expect(after.theme.themeId).toBe('tournament');
    expect(after.sound).toMatchObject({ enabled: true, volume: 0.2 });
    expect(after.display.showShotClock).toBe(false);
  });

  it('are stored apart from the game', async () => {
    (await openTab()).getState().updateSound({ enabled: true });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"enabled":true');
    expect(localStorage.getItem('basketball-storage') ?? '').not.toContain('"sound"');
  });

  it('restore to factory values', async () => {
    const tab = await openTab();
    tab.getState().updateRules({ foulsForBonus: 9 });
    tab.getState().updateSound({ enabled: true });
    tab.getState().restoreDefaults();
    expect(tab.getState().rules.foulsForBonus).toBe(5);
    expect(tab.getState().sound.enabled).toBe(false);
  });

  it('reject invalid values', async () => {
    const tab = await openTab();
    tab.getState().updateRules({ foulsForBonus: -3, shotClockDuration: 24, shotClockShort: 40 });
    tab.getState().updateSound({ volume: 9 });
    expect(tab.getState().rules).toMatchObject({ foulsForBonus: 1, shotClockShort: 24 });
    expect(tab.getState().sound.volume).toBe(0.5);
  });

  it('repair corrupted saved data', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 0, state: { rules: { periodDuration: 'long' }, theme: { themeId: 'neon' }, sound: { volume: 'loud' }, display: 7 } }));
    const state = (await openTab()).getState();
    expect(state.rules.periodDuration).toBe(12);
    expect(state.theme.themeId).toBe(defaultTheme.themeId);
    expect(state.sound.volume).toBe(0.5);
    expect(state.display.showShotClock).toBe(true);
  });
});
