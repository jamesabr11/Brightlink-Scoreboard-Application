import { create } from 'zustand';
import type { RosterSide } from '../types/roster';

// Intro sequence state. Session-only — no localStorage persist.
// BroadcastChannel keeps the operator and display tabs in sync.
//
// playerIndex:
//   -1  = team intro card (shown first)
//    0+ = intro[N] from the filtered player list

export interface IntroState {
  team: RosterSide | null;
  playerIndex: number;
  isPlaying: boolean;
  autoAdvanceMs: number; // 0 = manual only
}

interface IntroStore extends IntroState {
  startIntro: (team: RosterSide) => void;
  // total = number of players to introduce (not counting the team card)
  next: (total: number) => void;
  prev: () => void;
  stop: () => void;
  setAutoAdvance: (ms: number) => void;
}

const initialState = (): IntroState => ({
  team: null,
  playerIndex: -1,
  isPlaying: false,
  autoAdvanceMs: 3000,
});

const channel = new BroadcastChannel('intro_sync');

export const useIntroStore = create<IntroStore>()((set, get) => {
  channel.onmessage = (event) => set(event.data as Partial<IntroState>);
  const sync = (update: Partial<IntroState>) => { set(update); channel.postMessage(update); };

  return {
    ...initialState(),

    startIntro: (team) => sync({ team, playerIndex: -1, isPlaying: true }),

    next: (total) => {
      const { playerIndex } = get();
      const next = playerIndex + 1;
      // playerIndex -1 → 0 → ... → total-1 → stop
      if (next >= total) {
        sync({ isPlaying: false });
      } else {
        sync({ playerIndex: next });
      }
    },

    prev: () => {
      const { playerIndex } = get();
      if (playerIndex > -1) sync({ playerIndex: playerIndex - 1 });
    },

    stop: () => sync({ ...initialState() }),

    setAutoAdvance: (ms) => sync({ autoAdvanceMs: ms }),
  };
});

if (typeof window !== 'undefined') {
  import.meta.hot?.dispose(() => channel.close());
}
