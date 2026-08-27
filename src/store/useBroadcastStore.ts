import { create } from "zustand";
import type { FootballState } from "../types";

interface BroadcastStore extends FootballState {
  updateHomeScore: (points: number) => void;
  updateAwayScore: (points: number) => void;
  setDown: (down: number) => void;
  setToGo: (toGo: string) => void;
  setBallOn: (ballOn: string) => void;
  setQuarter: (q: number) => void;
  toggleScorebug: () => void;
  syncState: (state: Partial<FootballState>) => void;
}

const initialState: FootballState = {
  homeTeam: {
    name: "Home",
    abbreviation: "HOM",
    primaryColor: "#EF4444",
    secondaryColor: "#991B1B",
    score: 17,
    timeouts: 3,
  },
  awayTeam: {
    name: "Away",
    abbreviation: "AWY",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E3A8A",
    score: 7,
    timeouts: 3,
  },
  quarter: 3,
  clock: "15:00",
  isClockRunning: false,
  down: 1,
  toGo: "10",
  ballOn: "35",
  possession: "home",
  showScorebug: true,
};

const channel = new BroadcastChannel("broadcast_sync");

export const useBroadcastStore = create<BroadcastStore>((set) => {
  // Listen for cross-tab updates
  channel.onmessage = (event) => {
    set(event.data);
  };

  const syncAndSet = (update: Partial<FootballState>) => {
    set((state) => {
      const newState = { ...state, ...update };
      channel.postMessage(newState); // Broadcast to other tabs
      return newState;
    });
  };

  return {
    ...initialState,
    updateHomeScore: (points) =>
      set((state) => {
        const newScore = Math.max(0, state.homeTeam.score + points);
        const update = { homeTeam: { ...state.homeTeam, score: newScore } };
        channel.postMessage(update);
        return update;
      }),
    updateAwayScore: (points) =>
      set((state) => {
        const newScore = Math.max(0, state.awayTeam.score + points);
        const update = { awayTeam: { ...state.awayTeam, score: newScore } };
        channel.postMessage(update);
        return update;
      }),
    setDown: (down) => syncAndSet({ down }),
    setToGo: (toGo) => syncAndSet({ toGo }),
    setBallOn: (ballOn) => syncAndSet({ ballOn }),
    setQuarter: (quarter) => syncAndSet({ quarter }),
    toggleScorebug: () =>
      set((state) => {
        const update = { showScorebug: !state.showScorebug };
        channel.postMessage(update);
        return update;
      }),
    syncState: (state) => set(state),
  };
});
