import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { followOtherTabs, safeStorage } from '../lib/storage';
import type { GameRecord } from '../types/basketball';

interface GameLog {
  games: GameRecord[];
  saveGame: (game: GameRecord) => void;
  deleteGame: (id: string) => void;
}

const isGameRecord = (game: Partial<GameRecord> | null): game is GameRecord =>
  typeof game?.id === 'string' &&
  typeof game.homeName === 'string' &&
  typeof game.awayName === 'string' &&
  Number.isFinite(game.homeScore) &&
  Number.isFinite(game.awayScore) &&
  Number.isFinite(game.finishedAt);

const STORAGE_KEY = 'basketball-games';

export const useGameLog = create<GameLog>()(
  persist(
    (set, get) => ({
      games: [],
      // Saving the same game again, after a reopen, replaces its record.
      saveGame: (game) => set({ games: [...get().games.filter((other) => other.id !== game.id), game] }),
      deleteGame: (id) => set({ games: get().games.filter((game) => game.id !== id) }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: (state) => ({ games: state.games }),
      merge: (saved, current) => {
        const games = (saved as Partial<GameLog> | undefined)?.games;
        return { ...current, games: Array.isArray(games) ? games.filter(isGameRecord) : [] };
      },
    }
  )
);

followOtherTabs(STORAGE_KEY, useGameLog.persist.rehydrate);
