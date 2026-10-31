import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { followOtherTabs, safeStorage } from '../lib/storage';
import { cleanTheme, defaultTheme } from '../lib/theme';
import type { AppSettings, GameRules, ScoreboardTheme } from '../types/basketball';
import { cleanConfig, defaultConfig } from './useBasketballStore';

interface SettingsStore extends AppSettings {
  updateRules: (rules: Partial<GameRules>) => void;
  updateTheme: (theme: ScoreboardTheme) => void;
  updateSound: (sound: Partial<AppSettings['sound']>) => void;
  updateDisplay: (display: Partial<AppSettings['display']>) => void;
  restoreDefaults: () => void;
}

const pickRules = (config: GameRules): GameRules => ({
  periodDuration: config.periodDuration,
  overtimeDuration: config.overtimeDuration,
  numberOfPeriods: config.numberOfPeriods,
  shotClockDuration: config.shotClockDuration,
  shotClockShort: config.shotClockShort,
  foulsForBonus: config.foulsForBonus,
  maxTimeouts: config.maxTimeouts,
  resetFoulsEachPeriod: config.resetFoulsEachPeriod,
  restoreTimeoutsEachPeriod: config.restoreTimeoutsEachPeriod,
});

const factorySettings: AppSettings = {
  rules: pickRules(defaultConfig),
  theme: defaultTheme,
  sound: { enabled: false, volume: 0.5, periodEnd: true, gameEnd: true, shotWarning: true },
  display: { showShotClock: true, showLeadingBadge: true },
};

const cleanRules = (rules: Partial<GameRules> | undefined) => pickRules(cleanConfig({ ...defaultConfig, ...rules }));

const cleanSettings = (saved: Partial<AppSettings> | undefined): AppSettings => {
  const volume = saved?.sound?.volume;
  return {
    rules: cleanRules(saved?.rules),
    theme: cleanTheme(saved?.theme),
    sound: {
      ...factorySettings.sound,
      ...saved?.sound,
      volume: typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : factorySettings.sound.volume,
    },
    display: { ...factorySettings.display, ...saved?.display },
  };
};

const STORAGE_KEY = 'basketball-settings';

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...factorySettings,
      updateRules: (rules) => set({ rules: cleanRules({ ...get().rules, ...rules }) }),
      updateTheme: (theme) => set({ theme: cleanTheme(theme) }),
      updateSound: (sound) => set({ sound: cleanSettings({ sound: { ...get().sound, ...sound } }).sound }),
      updateDisplay: (display) => set({ display: { ...get().display, ...display } }),
      restoreDefaults: () => set(factorySettings),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: ({ rules, theme, sound, display }) => ({ rules, theme, sound, display }),
      merge: (saved, current) => ({ ...current, ...cleanSettings(saved as Partial<AppSettings> | undefined) }),
    }
  )
);

followOtherTabs(STORAGE_KEY, useSettingsStore.persist.rehydrate);
