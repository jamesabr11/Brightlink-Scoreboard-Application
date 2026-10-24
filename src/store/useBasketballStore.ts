import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BasketballState, Team, GameConfig, HistoryEntry } from '../types/basketball';

interface BasketballStore extends BasketballState {
  addScore: (team: 'home' | 'away', points: 1 | 2 | 3) => void;
  subtractScore: (team: 'home' | 'away', points: number) => void;
  startGameClock: () => void;
  pauseGameClock: () => void;
  resetGameClock: () => void;
  setGameClockTime: (seconds: number) => void;
  tickGameClock: () => void;
  startShotClock: () => void;
  pauseShotClock: () => void;
  resetShotClock: (duration: 24 | 14) => void;
  tickShotClock: () => void;
  nextPeriod: () => void;
  previousPeriod: () => void;
  setPeriod: (period: number) => void;
  addFoul: (team: 'home' | 'away') => void;
  subtractFoul: (team: 'home' | 'away') => void;
  addTimeout: (team: 'home' | 'away') => void;
  subtractTimeout: (team: 'home' | 'away') => void;
  setPossession: (team: 'home' | 'away' | null) => void;
  updateGameConfig: (config: Partial<GameConfig>) => void;
  saveConfig: (config: GameConfig) => void;
  loadConfig: (id: string) => void;
  deleteConfig: (id: string) => void;
  undo: () => void;
  addHistory: (action: string, previousState: Partial<BasketballState>) => void;
  toggleDisplay: () => void;
  resetGame: () => void;
  syncState: (state: Partial<BasketballState>) => void;
  updateTeams: (home: Partial<Team>, away: Partial<Team>) => void;
}

const defaultConfig: GameConfig = {
  id: 'default',
  name: 'Standard Game',
  homeTeam: { name: 'Home', abbreviation: 'HOM', primaryColor: '#EF4444', secondaryColor: '#991B1B' },
  awayTeam: { name: 'Away', abbreviation: 'AWY', primaryColor: '#3B82F6', secondaryColor: '#1E3A8A' },
  periodDuration: 12,
  overtimeDuration: 5,
  numberOfPeriods: 4,
  shotClockDuration: 24,
  foulsForBonus: 5,
  maxTimeouts: 3,
  createdAt: Date.now(),
};

const createInitialState = (): BasketballState => ({
  homeTeam: { name: 'Home', abbreviation: 'HOM', primaryColor: '#EF4444', secondaryColor: '#991B1B', score: 0, fouls: 0, timeouts: 3 },
  awayTeam: { name: 'Away', abbreviation: 'AWY', primaryColor: '#3B82F6', secondaryColor: '#1E3A8A', score: 0, fouls: 0, timeouts: 3 },
  period: 1,
  isOvertime: false,
  gameClock: { periodDuration: 12 * 60, remainingTime: 12 * 60, isRunning: false, startTimestamp: null },
  shotClock: { duration: 24, remainingTime: 24, isRunning: false, startTimestamp: null },
  possession: null,
  bonusHome: false,
  bonusAway: false,
  gameConfig: defaultConfig,
  savedConfigs: [defaultConfig],
  history: [],
  showDisplay: true,
});

const channel = new BroadcastChannel('basketball_sync');

export const useBasketballStore = create<BasketballStore>()(
  persist(
    (set, get) => {
      channel.onmessage = (event) => set(event.data);

      const broadcast = (update: Partial<BasketballState>) => channel.postMessage(update);
      const syncAndSet = (update: Partial<BasketballState>) => { set(update); broadcast(update); };

      return {
        ...createInitialState(),

        addScore: (team, points) => {
          const state = get();
          const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
          const newScore = state[teamKey].score + points;
          get().addHistory(`Add ${points} to ${team}`, { [teamKey]: state[teamKey] });
          syncAndSet({ [teamKey]: { ...state[teamKey], score: newScore } });
        },

        subtractScore: (team, points) => {
          const state = get();
          const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
          const newScore = Math.max(0, state[teamKey].score - points);
          get().addHistory(`Subtract ${points} from ${team}`, { [teamKey]: state[teamKey] });
          syncAndSet({ [teamKey]: { ...state[teamKey], score: newScore } });
        },

        startGameClock: () => {
          const state = get();
          if (state.gameClock.remainingTime <= 0) return;
          syncAndSet({ gameClock: { ...state.gameClock, isRunning: true, startTimestamp: Date.now() } });
        },

        pauseGameClock: () => {
          const state = get();
          if (!state.gameClock.isRunning) return;
          const elapsed = state.gameClock.startTimestamp ? (Date.now() - state.gameClock.startTimestamp) / 1000 : 0;
          const newRemainingTime = Math.max(0, state.gameClock.remainingTime - elapsed);
          syncAndSet({ gameClock: { ...state.gameClock, isRunning: false, remainingTime: newRemainingTime, startTimestamp: null } });
        },

        resetGameClock: () => {
          const state = get();
          const duration = state.period <= state.gameConfig.numberOfPeriods ? state.gameConfig.periodDuration * 60 : state.gameConfig.overtimeDuration * 60;
          syncAndSet({ gameClock: { ...state.gameClock, remainingTime: duration, periodDuration: duration, isRunning: false, startTimestamp: null } });
        },

        setGameClockTime: (seconds) => {
          const state = get();
          syncAndSet({ gameClock: { ...state.gameClock, remainingTime: Math.max(0, seconds) } });
        },

        tickGameClock: () => {
          const state = get();
          if (!state.gameClock.isRunning || !state.gameClock.startTimestamp) return;
          const elapsed = (Date.now() - state.gameClock.startTimestamp) / 1000;
          const newRemainingTime = Math.max(0, state.gameClock.remainingTime - elapsed);
          if (newRemainingTime === 0) { get().pauseGameClock(); }
          else { set({ gameClock: { ...state.gameClock, startTimestamp: Date.now() } }); }
        },

        startShotClock: () => {
          const state = get();
          if (state.shotClock.remainingTime <= 0) return;
          syncAndSet({ shotClock: { ...state.shotClock, isRunning: true, startTimestamp: Date.now() } });
        },

        pauseShotClock: () => {
          const state = get();
          if (!state.shotClock.isRunning) return;
          const elapsed = state.shotClock.startTimestamp ? (Date.now() - state.shotClock.startTimestamp) / 1000 : 0;
          const newRemainingTime = Math.max(0, state.shotClock.remainingTime - elapsed);
          syncAndSet({ shotClock: { ...state.shotClock, isRunning: false, remainingTime: newRemainingTime, startTimestamp: null } });
        },

        resetShotClock: (duration) => {
          syncAndSet({ shotClock: { duration, remainingTime: duration, isRunning: false, startTimestamp: null } });
        },

        tickShotClock: () => {
          const state = get();
          if (!state.shotClock.isRunning || !state.shotClock.startTimestamp) return;
          const elapsed = (Date.now() - state.shotClock.startTimestamp) / 1000;
          const newRemainingTime = Math.max(0, state.shotClock.remainingTime - elapsed);
          if (newRemainingTime === 0) { get().pauseShotClock(); }
          else { set({ shotClock: { ...state.shotClock, startTimestamp: Date.now() } }); }
        },

        nextPeriod: () => {
          const state = get();
          const newPeriod = state.period + 1;
          const isOvertime = newPeriod > state.gameConfig.numberOfPeriods;
          get().pauseGameClock();
          get().pauseShotClock();
          syncAndSet({ period: newPeriod, isOvertime });
          get().resetGameClock();
        },

        previousPeriod: () => {
          const state = get();
          if (state.period <= 1) return;
          const newPeriod = state.period - 1;
          const isOvertime = newPeriod > state.gameConfig.numberOfPeriods;
          get().pauseGameClock();
          get().pauseShotClock();
          syncAndSet({ period: newPeriod, isOvertime });
          get().resetGameClock();
        },

        setPeriod: (period) => {
          const state = get();
          const isOvertime = period > state.gameConfig.numberOfPeriods;
          get().pauseGameClock();
          get().pauseShotClock();
          syncAndSet({ period: Math.max(1, period), isOvertime });
          get().resetGameClock();
        },

        addFoul: (team) => {
          const state = get();
          const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
          const bonusKey = team === 'home' ? 'bonusHome' : 'bonusAway';
          const newFouls = state[teamKey].fouls + 1;
          const inBonus = newFouls >= state.gameConfig.foulsForBonus;
          get().addHistory(`Add foul to ${team}`, { [teamKey]: state[teamKey], [bonusKey]: state[bonusKey] });
          syncAndSet({ [teamKey]: { ...state[teamKey], fouls: newFouls }, [bonusKey]: inBonus });
        },

        subtractFoul: (team) => {
          const state = get();
          const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
          const bonusKey = team === 'home' ? 'bonusHome' : 'bonusAway';
          const newFouls = Math.max(0, state[teamKey].fouls - 1);
          const inBonus = newFouls >= state.gameConfig.foulsForBonus;
          get().addHistory(`Remove foul from ${team}`, { [teamKey]: state[teamKey], [bonusKey]: state[bonusKey] });
          syncAndSet({ [teamKey]: { ...state[teamKey], fouls: newFouls }, [bonusKey]: inBonus });
        },

        addTimeout: (team) => {
          const state = get();
          const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
          const newTimeouts = Math.min(state.gameConfig.maxTimeouts, state[teamKey].timeouts + 1);
          syncAndSet({ [teamKey]: { ...state[teamKey], timeouts: newTimeouts } });
        },

        subtractTimeout: (team) => {
          const state = get();
          const teamKey = team === 'home' ? 'homeTeam' : 'awayTeam';
          const newTimeouts = Math.max(0, state[teamKey].timeouts - 1);
          get().addHistory(`Use timeout for ${team}`, { [teamKey]: state[teamKey] });
          syncAndSet({ [teamKey]: { ...state[teamKey], timeouts: newTimeouts } });
        },

        setPossession: (team) => syncAndSet({ possession: team }),

        updateGameConfig: (config) => {
          const state = get();
          syncAndSet({ gameConfig: { ...state.gameConfig, ...config } });
        },

        saveConfig: (config) => {
          const state = get();
          const existingIndex = state.savedConfigs.findIndex(c => c.id === config.id);
          if (existingIndex >= 0) {
            const newConfigs = [...state.savedConfigs];
            newConfigs[existingIndex] = config;
            syncAndSet({ savedConfigs: newConfigs });
          } else {
            syncAndSet({ savedConfigs: [...state.savedConfigs, config] });
          }
        },

        loadConfig: (id) => {
          const state = get();
          const config = state.savedConfigs.find(c => c.id === id);
          if (config) {
            const newState = createInitialState();
            syncAndSet({
              ...newState,
              homeTeam: { ...newState.homeTeam, ...config.homeTeam },
              awayTeam: { ...newState.awayTeam, ...config.awayTeam },
              gameConfig: config,
              savedConfigs: state.savedConfigs,
              gameClock: { ...newState.gameClock, periodDuration: config.periodDuration * 60, remainingTime: config.periodDuration * 60 },
              shotClock: { ...newState.shotClock, duration: config.shotClockDuration, remainingTime: config.shotClockDuration },
            });
          }
        },

        deleteConfig: (id) => {
          const state = get();
          if (id === 'default') return;
          syncAndSet({ savedConfigs: state.savedConfigs.filter(c => c.id !== id) });
        },

        undo: () => {
          const state = get();
          if (state.history.length === 0) return;
          const lastEntry = state.history[state.history.length - 1];
          const newHistory = state.history.slice(0, -1);
          syncAndSet({ ...lastEntry.previousState, history: newHistory });
        },

        addHistory: (action, previousState) => {
          const state = get();
          const newEntry: HistoryEntry = { timestamp: Date.now(), action, previousState };
          const newHistory = [...state.history, newEntry].slice(-50);
          set({ history: newHistory });
        },

        toggleDisplay: () => {
          const state = get();
          syncAndSet({ showDisplay: !state.showDisplay });
        },

        resetGame: () => {
          const state = get();
          const newState = createInitialState();
          syncAndSet({ ...newState, gameConfig: state.gameConfig, savedConfigs: state.savedConfigs });
        },

        syncState: (state) => set(state),

        updateTeams: (home, away) => {
          const state = get();
          syncAndSet({
            homeTeam: { ...state.homeTeam, ...home },
            awayTeam: { ...state.awayTeam, ...away },
          });
        },
      };
    },
    {
      name: 'basketball-storage',
      partialize: (state) => ({
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
        period: state.period,
        isOvertime: state.isOvertime,
        gameClock: { ...state.gameClock, isRunning: false, startTimestamp: null },
        shotClock: { ...state.shotClock, isRunning: false, startTimestamp: null },
        possession: state.possession,
        bonusHome: state.bonusHome,
        bonusAway: state.bonusAway,
        gameConfig: state.gameConfig,
        savedConfigs: state.savedConfigs,
        showDisplay: state.showDisplay,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useBasketballStore.getState();
    if (state.gameClock.isRunning) state.tickGameClock();
    if (state.shotClock.isRunning) state.tickShotClock();
  }, 100);
}
