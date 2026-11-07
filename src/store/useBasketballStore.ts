import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clockRemaining, formatGameClock, formatShotClock, stopClock } from '../lib/clock';
import { BRAND_TEAM, VISITOR_TEAM } from '../lib/branding';
import { buildGameRecord } from '../lib/gameRecords';
import { addPoints, cleanPeriodScores } from '../lib/periodScores';
import { newId, safeStorage } from '../lib/storage';
import { cleanTheme, defaultTheme, isHexColor } from '../lib/theme';
import type { BasketballState, GameClock, GameRules, ScoreboardTheme, ShotClock, Team, TeamStats, GameConfig, HistoryEntry } from '../types/basketball';
import { useGameLog } from './useGameLog';

type Side = 'home' | 'away';

interface BasketballStore extends BasketballState {
  addScore: (team: Side, points: 1 | 2 | 3) => void;
  subtractScore: (team: Side, points: number) => void;
  startGameClock: () => void;
  pauseGameClock: () => void;
  resetGameClock: () => void;
  setGameClockTime: (seconds: number) => void;
  adjustGameClock: (delta: number) => void;
  startShotClock: () => void;
  pauseShotClock: () => void;
  resetShotClock: (duration: number) => void;
  setShotClockTime: (seconds: number) => void;
  adjustShotClock: (delta: number) => void;
  tick: () => void;
  nextPeriod: () => void;
  previousPeriod: () => void;
  setPeriod: (period: number) => void;
  addFoul: (team: Side) => void;
  subtractFoul: (team: Side) => void;
  addTimeout: (team: Side) => void;
  subtractTimeout: (team: Side) => void;
  restoreTimeouts: () => void;
  setPossession: (team: Side | null) => void;
  togglePossession: () => void;
  updateGameConfig: (config: Partial<GameConfig>) => void;
  saveConfig: (config: GameConfig) => void;
  loadConfig: (id: string) => void;
  deleteConfig: (id: string) => void;
  saveCurrentConfig: (name: string) => void;
  updateConfigFromCurrent: (id: string) => void;
  renameConfig: (id: string, name: string) => void;
  duplicateConfig: (id: string) => void;
  applyDefaults: (rules: GameRules, theme: ScoreboardTheme) => void;
  finishGame: () => void;
  reopenGame: () => void;
  undo: () => void;
  resetGame: () => void;
  updateTeams: (home: Partial<Team>, away: Partial<Team>) => void;
}

const HISTORY_LIMIT = 50;

export const defaultConfig: GameConfig = {
  id: 'default',
  name: `${BRAND_TEAM.name} Basketball`,
  homeTeam: BRAND_TEAM,
  awayTeam: VISITOR_TEAM,
  periodDuration: 12,
  overtimeDuration: 5,
  numberOfPeriods: 4,
  shotClockDuration: 24,
  shotClockShort: 14,
  foulsForBonus: 5,
  maxTimeouts: 3,
  resetFoulsEachPeriod: true,
  restoreTimeoutsEachPeriod: false,
  theme: defaultTheme,
  createdAt: Date.now(),
};

export const inBonus = (team: Team, config: GameConfig) => team.fouls >= config.foulsForBonus;

// Worth protecting: anything has happened that a reset or new config would lose.
export const isGameActive = (state: BasketballState) => {
  const { homeTeam, awayTeam, gameClock, shotClock, gameConfig } = state;
  const touched = (team: Team) => team.score > 0 || team.fouls > 0 || team.timeouts !== gameConfig.maxTimeouts;
  return !state.finished && (
    touched(homeTeam) || touched(awayTeam) || state.period > 1 ||
    gameClock.isRunning || shotClock.isRunning || gameClock.remainingTime !== gameClock.periodDuration
  );
};

// Undo can bring back an old team, so history counts as using a logo too.
export const referencedLogos = (state: BasketballState) => {
  const previous = state.history.map((entry) => entry.previousState);
  const teams = [
    state.homeTeam,
    state.awayTeam,
    ...state.savedConfigs.flatMap((config) => [config.homeTeam, config.awayTeam]),
    ...previous.flatMap((snapshot) => [snapshot.homeTeam, snapshot.awayTeam]),
  ];
  return new Set(teams.flatMap((team) => team?.logo ?? []));
};

const teamKey = (team: Side) => (team === 'home' ? 'homeTeam' : 'awayTeam');
const teamStats = ({ score, fouls, timeouts }: Team): TeamStats => ({ score, fouls, timeouts });
const teamBranding = ({ name, abbreviation, primaryColor, secondaryColor, logo }: Team): Partial<Team> =>
  ({ name, abbreviation, primaryColor, secondaryColor, logo });

const periodSeconds = (period: number, config: GameConfig) =>
  (period <= config.numberOfPeriods ? config.periodDuration : config.overtimeDuration) * 60;

const fullGameClock = (period: number, config: GameConfig): GameClock => {
  const duration = periodSeconds(period, config);
  return { periodDuration: duration, remainingTime: duration, isRunning: false, startTimestamp: null };
};

const fullShotClock = (duration: number): ShotClock => ({ duration, remainingTime: duration, isRunning: false, startTimestamp: null });

const createInitialState = (config: GameConfig = defaultConfig): BasketballState => ({
  homeTeam: { ...(defaultConfig.homeTeam as Team), ...config.homeTeam, score: 0, fouls: 0, timeouts: config.maxTimeouts },
  awayTeam: { ...(defaultConfig.awayTeam as Team), ...config.awayTeam, score: 0, fouls: 0, timeouts: config.maxTimeouts },
  period: 1,
  isOvertime: false,
  gameClock: fullGameClock(1, config),
  shotClock: fullShotClock(config.shotClockDuration),
  possession: null,
  periodScores: [],
  gameConfig: config,
  savedConfigs: [defaultConfig],
  history: [],
  lastAction: null,
  finished: false,
  gameRecordId: null,
});

const wholeNumber = (value: unknown, min: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;

export const cleanConfig = (config: GameConfig): GameConfig => {
  const shotClockDuration = wholeNumber(config.shotClockDuration, 1, defaultConfig.shotClockDuration);
  return {
    ...config,
    periodDuration: wholeNumber(config.periodDuration, 1, defaultConfig.periodDuration),
    overtimeDuration: wholeNumber(config.overtimeDuration, 1, defaultConfig.overtimeDuration),
    numberOfPeriods: wholeNumber(config.numberOfPeriods, 1, defaultConfig.numberOfPeriods),
    shotClockDuration,
    shotClockShort: Math.min(shotClockDuration, wholeNumber(config.shotClockShort, 1, defaultConfig.shotClockShort)),
    foulsForBonus: wholeNumber(config.foulsForBonus, 1, defaultConfig.foulsForBonus),
    maxTimeouts: wholeNumber(config.maxTimeouts, 0, defaultConfig.maxTimeouts),
    theme: cleanTheme(config.theme),
  };
};

const cleanTeam = (team: Partial<Team> | undefined, fallback: Team, maxTimeouts: number): Team => ({
  ...fallback,
  ...team,
  primaryColor: isHexColor(team?.primaryColor) ? team.primaryColor : fallback.primaryColor,
  score: wholeNumber(team?.score, 0, 0),
  fouls: wholeNumber(team?.fouls, 0, 0),
  timeouts: Math.min(maxTimeouts, wholeNumber(team?.timeouts, 0, maxTimeouts)),
});

const cleanClock = <T extends GameClock | ShotClock>(clock: Partial<T> | undefined, fallback: T): T => {
  if (typeof clock?.remainingTime !== 'number' || !Number.isFinite(clock.remainingTime)) return fallback;
  const running = clock.isRunning === true && Number.isFinite(clock.startTimestamp);
  return {
    ...fallback,
    ...clock,
    remainingTime: Math.max(0, clock.remainingTime),
    isRunning: running,
    startTimestamp: running ? clock.startTimestamp : null,
  };
};

// localStorage is outside our control, so nothing from it is trusted as-is.
const restoreState = (saved: Partial<BasketballState> | undefined, current: BasketballStore): BasketballStore => {
  const gameConfig = cleanConfig({ ...current.gameConfig, ...saved?.gameConfig });
  const period = wholeNumber(saved?.period, 1, 1);
  const homeTeam = cleanTeam(saved?.homeTeam, current.homeTeam, gameConfig.maxTimeouts);
  const awayTeam = cleanTeam(saved?.awayTeam, current.awayTeam, gameConfig.maxTimeouts);
  return {
    ...current,
    gameConfig,
    period,
    periodScores: cleanPeriodScores(saved?.periodScores, period, homeTeam.score, awayTeam.score),
    isOvertime: period > gameConfig.numberOfPeriods,
    homeTeam,
    awayTeam,
    gameClock: cleanClock(saved?.gameClock, current.gameClock),
    shotClock: cleanClock(saved?.shotClock, current.shotClock),
    possession: saved?.possession === 'home' || saved?.possession === 'away' ? saved.possession : null,
    savedConfigs: Array.isArray(saved?.savedConfigs)
      ? saved.savedConfigs.filter((config) => typeof config?.id === 'string' && typeof config.name === 'string').map((config) => cleanConfig({ ...defaultConfig, ...config }))
      : current.savedConfigs,
    history: Array.isArray(saved?.history) ? saved.history.slice(-HISTORY_LIMIT) : [],
    finished: saved?.finished === true,
    gameRecordId: typeof saved?.gameRecordId === 'string' ? saved.gameRecordId : null,
  };
};

const channel = new BroadcastChannel('basketball_sync');

export const useBasketballStore = create<BasketballStore>()(
  persist(
    (set, get) => {
      channel.onmessage = (event) => set(event.data);

      const broadcast = (update: Partial<BasketballState>) => channel.postMessage(update);
      const syncAndSet = (update: Partial<BasketballState>) => { set(update); broadcast(update); };

      // Every undoable operator action goes through here. Only what the action
      // changes is snapshotted, so undoing a score can't touch clocks or team
      // names. Clocks are snapshotted stopped: undoing can't restart a clock
      // from a stale timestamp and jump the time.
      const commit = (action: string, update: Partial<BasketballState>) => {
        const state = get();
        const now = Date.now();
        // Changing configuration replaces the teams, so their branding is saved too.
        const snapshotTeam = update.gameConfig ? (team: Team) => team : teamStats;
        const previousState: HistoryEntry['previousState'] = {
          ...(update.homeTeam && { homeTeam: snapshotTeam(state.homeTeam) }),
          ...(update.awayTeam && { awayTeam: snapshotTeam(state.awayTeam) }),
          ...(update.gameClock && { gameClock: stopClock(state.gameClock, now) }),
          ...(update.shotClock && { shotClock: stopClock(state.shotClock, now) }),
          ...('possession' in update && { possession: state.possession }),
          ...(update.periodScores && { periodScores: state.periodScores }),
          ...(update.period !== undefined && { period: state.period, isOvertime: state.isOvertime }),
          ...(update.gameConfig && { gameConfig: state.gameConfig }),
          ...('finished' in update && { finished: state.finished, gameRecordId: state.gameRecordId }),
        };
        syncAndSet({
          ...update,
          lastAction: action,
          history: [...state.history, { timestamp: now, action, previousState }].slice(-HISTORY_LIMIT),
        });
      };

      const setStat = (side: Side, stat: keyof TeamStats, value: number, action: string) => {
        const key = teamKey(side);
        const team = get()[key];
        const next = Math.max(0, value);
        if (next === team[stat]) return;
        const state = get();
        commit(`${team.name} ${action}`, {
          [key]: { ...team, [stat]: next },
          ...(stat === 'score' && { periodScores: addPoints(state.periodScores, state.period, side, next - team.score) }),
        });
      };

      const setClockTime = (key: 'gameClock' | 'shotClock', seconds: number, max: number, describe: (time: number) => string) => {
        if (!Number.isFinite(seconds)) return;
        const now = Date.now();
        const clock = get()[key];
        const remainingTime = Math.round(Math.min(max, Math.max(0, seconds)) * 10) / 10;
        if (remainingTime === clockRemaining(clock, now)) return;
        commit(describe(remainingTime), { [key]: { ...clock, remainingTime, startTimestamp: clock.isRunning ? now : null } });
      };

      const startGameFrom = (config: GameConfig, action: string) => {
        const gameConfig = cleanConfig(config);
        const fresh = createInitialState(gameConfig);
        commit(action, {
          gameConfig,
          homeTeam: fresh.homeTeam,
          awayTeam: fresh.awayTeam,
          period: fresh.period,
          isOvertime: fresh.isOvertime,
          gameClock: fresh.gameClock,
          shotClock: fresh.shotClock,
          possession: fresh.possession,
          periodScores: [],
          finished: false,
          gameRecordId: null,
        });
      };

      const startClock = (key: 'gameClock' | 'shotClock') => {
        const clock = get()[key];
        if (clock.isRunning || clock.remainingTime <= 0) return;
        syncAndSet({ [key]: { ...clock, isRunning: true, startTimestamp: Date.now() } });
      };

      const pauseClock = (key: 'gameClock' | 'shotClock') => {
        const clock = get()[key];
        if (clock.isRunning) syncAndSet({ [key]: stopClock(clock, Date.now()) });
      };

      return {
        ...createInitialState(),

        addScore: (team, points) => setStat(team, 'score', get()[teamKey(team)].score + points, `+${points}`),

        subtractScore: (team, points) => setStat(team, 'score', get()[teamKey(team)].score - points, `-${points}`),

        startGameClock: () => startClock('gameClock'),

        pauseGameClock: () => pauseClock('gameClock'),

        resetGameClock: () => {
          const { gameClock, period, gameConfig } = get();
          const full = fullGameClock(period, gameConfig);
          if (!gameClock.isRunning && gameClock.remainingTime === full.remainingTime) return;
          commit('Reset game clock', { gameClock: full });
        },

        setGameClockTime: (seconds) => {
          const { periodDuration } = get().gameClock;
          setClockTime('gameClock', seconds, periodDuration, (time) => `Game clock set to ${formatGameClock(time)}`);
        },

        adjustGameClock: (delta) => get().setGameClockTime(clockRemaining(get().gameClock, Date.now()) + delta),

        startShotClock: () => startClock('shotClock'),

        pauseShotClock: () => pauseClock('shotClock'),

        resetShotClock: (duration) => {
          const { shotClock } = get();
          if (!shotClock.isRunning && shotClock.remainingTime === duration) return;
          commit(`Shot clock reset to ${duration}`, { shotClock: fullShotClock(duration) });
        },

        setShotClockTime: (seconds) => {
          const max = get().gameConfig.shotClockDuration;
          setClockTime('shotClock', seconds, max, (time) => `Shot clock set to ${formatShotClock(time)}`);
        },

        adjustShotClock: (delta) => get().setShotClockTime(clockRemaining(get().shotClock, Date.now()) + delta),

        // Only acts on expiry, so it's cheap and never pollutes history. Each tab
        // runs it; whichever gets there first stops the clock for all of them.
        tick: () => {
          const { gameClock, shotClock } = get();
          const now = Date.now();
          const gameExpired = gameClock.isRunning && clockRemaining(gameClock, now) <= 0;
          const shotExpired = shotClock.isRunning && clockRemaining(shotClock, now) <= 0;
          if (!gameExpired && !shotExpired) return;
          syncAndSet({
            ...(gameExpired && { gameClock: stopClock(gameClock, now) }),
            // The shot clock can't outlive the period.
            ...((shotExpired || (gameExpired && shotClock.isRunning)) && { shotClock: stopClock(shotClock, now) }),
          });
        },

        nextPeriod: () => get().setPeriod(get().period + 1),

        previousPeriod: () => get().setPeriod(get().period - 1),

        // Fouls and timeouts roll over only going forward; stepping back is a
        // correction, and undo is what brings earlier counts back.
        setPeriod: (period) => {
          const { period: current, gameConfig: config, homeTeam, awayTeam } = get();
          if (!Number.isInteger(period) || period < 1 || period === current) return;
          const forward = period > current;
          const rollOver = (team: Team): Team => ({
            ...team,
            fouls: forward && config.resetFoulsEachPeriod ? 0 : team.fouls,
            timeouts: forward && config.restoreTimeoutsEachPeriod ? config.maxTimeouts : team.timeouts,
          });
          const isOvertime = period > config.numberOfPeriods;
          commit(`Period ${isOvertime ? `OT${period - config.numberOfPeriods}` : period}`, {
            period,
            isOvertime,
            homeTeam: rollOver(homeTeam),
            awayTeam: rollOver(awayTeam),
            gameClock: fullGameClock(period, config),
            shotClock: fullShotClock(config.shotClockDuration),
          });
        },

        addFoul: (team) => setStat(team, 'fouls', get()[teamKey(team)].fouls + 1, 'foul'),

        subtractFoul: (team) => setStat(team, 'fouls', get()[teamKey(team)].fouls - 1, 'foul removed'),

        addTimeout: (team) => {
          const next = Math.min(get().gameConfig.maxTimeouts, get()[teamKey(team)].timeouts + 1);
          setStat(team, 'timeouts', next, 'timeout returned');
        },

        subtractTimeout: (team) => setStat(team, 'timeouts', get()[teamKey(team)].timeouts - 1, 'timeout used'),

        restoreTimeouts: () => {
          const { homeTeam, awayTeam, gameConfig: { maxTimeouts } } = get();
          if (homeTeam.timeouts === maxTimeouts && awayTeam.timeouts === maxTimeouts) return;
          commit('Timeouts restored', { homeTeam: { ...homeTeam, timeouts: maxTimeouts }, awayTeam: { ...awayTeam, timeouts: maxTimeouts } });
        },

        setPossession: (team) => {
          const state = get();
          if (team === state.possession) return;
          commit(`Possession: ${team ? state[teamKey(team)].name : 'none'}`, { possession: team });
        },

        togglePossession: () => get().setPossession(get().possession === 'home' ? 'away' : 'home'),

        // A changed timeout allowance keeps the number each team has used, and a
        // new period length applies to the clock unless the period has begun.
        updateGameConfig: (config) => {
          const state = get();
          const gameConfig = cleanConfig({ ...state.gameConfig, ...config });
          const change = gameConfig.maxTimeouts - state.gameConfig.maxTimeouts;
          const timeouts = (team: Team) => Math.min(gameConfig.maxTimeouts, Math.max(0, team.timeouts + change));
          const unstarted = !state.gameClock.isRunning && state.gameClock.remainingTime === state.gameClock.periodDuration;
          const shotUnstarted = !state.shotClock.isRunning && state.shotClock.remainingTime === state.gameConfig.shotClockDuration;
          syncAndSet({
            gameConfig,
            isOvertime: state.period > gameConfig.numberOfPeriods,
            homeTeam: { ...state.homeTeam, timeouts: timeouts(state.homeTeam) },
            awayTeam: { ...state.awayTeam, timeouts: timeouts(state.awayTeam) },
            ...(unstarted && { gameClock: fullGameClock(state.period, gameConfig) }),
            ...(shotUnstarted && { shotClock: fullShotClock(gameConfig.shotClockDuration) }),
          });
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
          if (config) startGameFrom(config, `Loaded ${config.name}`);
        },

        deleteConfig: (id) => {
          const state = get();
          if (id === 'default') return;
          syncAndSet({ savedConfigs: state.savedConfigs.filter(c => c.id !== id) });
        },

        saveCurrentConfig: (name) => {
          const state = get();
          const config = { ...state.gameConfig, id: newId(), name, homeTeam: teamBranding(state.homeTeam), awayTeam: teamBranding(state.awayTeam), createdAt: Date.now() };
          syncAndSet({ savedConfigs: [...state.savedConfigs, config], gameConfig: { ...state.gameConfig, id: config.id, name } });
        },

        updateConfigFromCurrent: (id) => {
          const state = get();
          const existing = state.savedConfigs.find(c => c.id === id);
          if (!existing) return;
          get().saveConfig({ ...state.gameConfig, id, name: existing.name, createdAt: existing.createdAt, homeTeam: teamBranding(state.homeTeam), awayTeam: teamBranding(state.awayTeam) });
        },

        renameConfig: (id, name) => {
          const state = get();
          syncAndSet({
            savedConfigs: state.savedConfigs.map(c => (c.id === id ? { ...c, name } : c)),
            ...(state.gameConfig.id === id && { gameConfig: { ...state.gameConfig, name } }),
          });
        },

        duplicateConfig: (id) => {
          const state = get();
          const config = state.savedConfigs.find(c => c.id === id);
          if (config) syncAndSet({ savedConfigs: [...state.savedConfigs, { ...config, id: newId(), name: `${config.name} (copy)`, createdAt: Date.now() }] });
        },

        applyDefaults: (rules, theme) => {
          const { gameConfig, homeTeam, awayTeam } = get();
          startGameFrom({ ...gameConfig, ...rules, theme, homeTeam: teamBranding(homeTeam), awayTeam: teamBranding(awayTeam) }, 'New game from defaults');
        },

        // Only ever called deliberately: a clock reaching zero never ends the game.
        // Finishing again after a reopen updates the same history record.
        finishGame: () => {
          const state = get();
          const now = Date.now();
          const gameRecordId = state.gameRecordId ?? newId();
          useGameLog.getState().saveGame(buildGameRecord(state, gameRecordId, now));
          syncAndSet({
            finished: true,
            gameRecordId,
            gameClock: stopClock(state.gameClock, now),
            shotClock: stopClock(state.shotClock, now),
            lastAction: 'Game finished and saved to history',
          });
        },

        reopenGame: () => syncAndSet({ finished: false, lastAction: 'Game reopened' }),

        undo: () => {
          const { history, homeTeam, awayTeam } = get();
          const last = history.at(-1);
          if (!last) return;
          const { homeTeam: home, awayTeam: away, ...rest } = last.previousState;
          syncAndSet({
            ...rest,
            ...(home && { homeTeam: { ...homeTeam, ...home } }),
            ...(away && { awayTeam: { ...awayTeam, ...away } }),
            history: history.slice(0, -1),
            lastAction: `Undid: ${last.action}`,
          });
        },

        // Team names and colors survive, and an accidental reset can be undone.
        resetGame: () => {
          const state = get();
          const fresh = createInitialState(state.gameConfig);
          commit('Game reset', {
            homeTeam: { ...state.homeTeam, ...teamStats(fresh.homeTeam) },
            awayTeam: { ...state.awayTeam, ...teamStats(fresh.awayTeam) },
            period: fresh.period,
            isOvertime: fresh.isOvertime,
            gameClock: fresh.gameClock,
            shotClock: fresh.shotClock,
            possession: fresh.possession,
            periodScores: [],
            finished: false,
            gameRecordId: null,
          });
        },

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
      storage: safeStorage,
      // Running clocks are saved as running: a refreshed tab picks up the live time.
      partialize: (state) => ({
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
        period: state.period,
        isOvertime: state.isOvertime,
        gameClock: state.gameClock,
        shotClock: state.shotClock,
        possession: state.possession,
        periodScores: state.periodScores,
        gameConfig: state.gameConfig,
        savedConfigs: state.savedConfigs,
        history: state.history,
        finished: state.finished,
        gameRecordId: state.gameRecordId,
      }),
      merge: (saved, current) => restoreState(saved as Partial<BasketballState> | undefined, current),
    }
  )
);

if (typeof window !== 'undefined') {
  const ticker = setInterval(() => useBasketballStore.getState().tick(), 100);
  import.meta.hot?.dispose(() => { clearInterval(ticker); channel.close(); });
}
