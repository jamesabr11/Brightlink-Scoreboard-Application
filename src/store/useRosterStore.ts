import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newId, safeStorage } from '../lib/storage';
import { deletePhoto, prunePhotos } from '../lib/rosterPhotos';
import type { Player, RosterSide } from '../types/roster';

interface RosterState {
  home: Player[];
  away: Player[];
}

interface RosterStore extends RosterState {
  addPlayer: (side: RosterSide, data: Omit<Player, 'id' | 'createdAt'>) => void;
  updatePlayer: (side: RosterSide, id: string, patch: Partial<Omit<Player, 'id' | 'createdAt'>>) => void;
  removePlayer: (side: RosterSide, id: string) => void;
  movePlayer: (side: RosterSide, id: string, direction: 'up' | 'down') => void;
}

const channel = new BroadcastChannel('roster_sync');

export const useRosterStore = create<RosterStore>()(
  persist(
    (set, get) => {
      channel.onmessage = (event) => set(event.data as Partial<RosterState>);
      const sync = (update: Partial<RosterState>) => { set(update); channel.postMessage(update); };

      return {
        home: [],
        away: [],

        addPlayer: (side, data) => {
          sync({ [side]: [...get()[side], { ...data, id: newId(), createdAt: Date.now() }] });
        },

        updatePlayer: (side, id, patch) => {
          sync({ [side]: get()[side].map((p) => p.id === id ? { ...p, ...patch } : p) });
        },

        removePlayer: (side, id) => {
          const player = get()[side].find((p) => p.id === id);
          if (player?.photoId) void deletePhoto(player.photoId);
          sync({ [side]: get()[side].filter((p) => p.id !== id) });
        },

        movePlayer: (side, id, direction) => {
          const players = [...get()[side]];
          const idx = players.findIndex((p) => p.id === id);
          if (idx === -1) return;
          const target = direction === 'up' ? idx - 1 : idx + 1;
          if (target < 0 || target >= players.length) return;
          [players[idx], players[target]] = [players[target], players[idx]];
          sync({ [side]: players });
        },
      };
    },
    {
      name: 'basketball-roster',
      storage: safeStorage,
      partialize: ({ home, away }) => ({ home, away }),
    },
  ),
);

// Prune orphaned player photos on startup.
if (typeof window !== 'undefined') {
  const { home, away } = useRosterStore.getState();
  const inUse = new Set([...home, ...away].flatMap((p) => p.photoId ? [p.photoId] : []));
  void prunePhotos(inUse);
  import.meta.hot?.dispose(() => channel.close());
}
