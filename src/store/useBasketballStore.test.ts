import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRAND_TEAM } from '../lib/branding';
import { clockRemaining } from '../lib/clock';
import { THEMES, defaultTheme, themePreset } from '../lib/theme';
import type { ThemeId } from '../types/basketball';

// In-memory stand-in so each test gets its own set of tabs.
class FakeChannel {
  static open = new Set<FakeChannel>();
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() { FakeChannel.open.add(this); }
  postMessage(data: unknown) {
    for (const tab of FakeChannel.open) if (tab !== this) tab.onmessage?.({ data: structuredClone(data) });
  }
  close() { FakeChannel.open.delete(this); }
}

// Every import is a separate store, like a browser tab sharing localStorage.
const openTab = async () => {
  vi.resetModules();
  const { useBasketballStore, inBonus, isGameActive, referencedLogos } = await import('./useBasketballStore');
  const { useGameLog } = await import('./useGameLog');
  return Object.assign(useBasketballStore, { inBonus, isGameActive, referencedLogos, gameLog: useGameLog });
};

const seconds = (n: number) => vi.advanceTimersByTime(n * 1000);
const STORAGE_KEY = 'basketball-storage';

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  vi.clearAllTimers();
  localStorage.clear();
  FakeChannel.open.clear();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

describe('scoring', () => {
  it('adds and corrects scores per team', async () => {
    const tab = await openTab();
    tab.getState().addScore('home', 3);
    tab.getState().addScore('away', 2);
    tab.getState().subtractScore('home', 1);
    expect(tab.getState().homeTeam.score).toBe(2);
    expect(tab.getState().awayTeam.score).toBe(2);
  });

  it('never goes negative, and a no-op leaves no history', async () => {
    const tab = await openTab();
    tab.getState().subtractScore('home', 1);
    expect(tab.getState().homeTeam.score).toBe(0);
    expect(tab.getState().history).toHaveLength(0);
  });
});

describe('game clock', () => {
  it('counts down in real time and does not run twice on a double start', async () => {
    const tab = await openTab();
    tab.getState().startGameClock();
    seconds(10);
    tab.getState().startGameClock();
    seconds(5);
    expect(clockRemaining(tab.getState().gameClock, Date.now())).toBe(705);
    tab.getState().pauseGameClock();
    seconds(30);
    expect(tab.getState().gameClock).toMatchObject({ remainingTime: 705, isRunning: false, startTimestamp: null });
  });

  it('stops at zero, and takes the shot clock with it', async () => {
    const tab = await openTab();
    tab.getState().setGameClockTime(3);
    tab.getState().startGameClock();
    tab.getState().startShotClock();
    seconds(4);
    expect(tab.getState().gameClock).toMatchObject({ remainingTime: 0, isRunning: false });
    expect(tab.getState().shotClock.isRunning).toBe(false);
    expect(tab.getState().shotClock.remainingTime).toBeCloseTo(21, 0);
    tab.getState().startGameClock();
    expect(tab.getState().gameClock.isRunning).toBe(false);
  });

  it('adjusts a running clock from its live value', async () => {
    const tab = await openTab();
    tab.getState().startGameClock();
    seconds(10);
    tab.getState().adjustGameClock(-60);
    expect(clockRemaining(tab.getState().gameClock, Date.now())).toBe(650);
    seconds(10);
    expect(clockRemaining(tab.getState().gameClock, Date.now())).toBe(640);
  });

  it('stays within the period and rejects bad input', async () => {
    const tab = await openTab();
    tab.getState().adjustGameClock(60);
    tab.getState().setGameClockTime(Number.NaN);
    expect(tab.getState().gameClock.remainingTime).toBe(720);
    tab.getState().setGameClockTime(-5);
    expect(tab.getState().gameClock.remainingTime).toBe(0);
  });
});

describe('shot clock', () => {
  it('runs, pauses and resumes accurately', async () => {
    const tab = await openTab();
    tab.getState().startShotClock();
    seconds(4);
    tab.getState().pauseShotClock();
    seconds(100);
    tab.getState().startShotClock();
    seconds(5);
    expect(clockRemaining(tab.getState().shotClock, Date.now())).toBe(15);
  });

  it('resets to 24 or 14 and stops', async () => {
    const tab = await openTab();
    tab.getState().startShotClock();
    seconds(3);
    tab.getState().resetShotClock(14);
    expect(tab.getState().shotClock).toMatchObject({ duration: 14, remainingTime: 14, isRunning: false });
    tab.getState().resetShotClock(24);
    expect(tab.getState().shotClock).toMatchObject({ duration: 24, remainingTime: 24 });
  });

  it('adjusts manually in tenths without passing the limits', async () => {
    const tab = await openTab();
    tab.getState().adjustShotClock(1);
    expect(tab.getState().shotClock.remainingTime).toBe(24);
    tab.getState().adjustShotClock(-0.1);
    tab.getState().adjustShotClock(-0.1);
    expect(tab.getState().shotClock.remainingTime).toBe(23.8);
    tab.getState().setShotClockTime(-1);
    expect(tab.getState().shotClock.remainingTime).toBe(0);
  });

  it('stops by itself at zero without stopping the game clock', async () => {
    const tab = await openTab();
    tab.getState().startGameClock();
    tab.getState().startShotClock();
    seconds(25);
    expect(tab.getState().shotClock).toMatchObject({ remainingTime: 0, isRunning: false });
    expect(tab.getState().gameClock.isRunning).toBe(true);
  });

  it('is correct after a long gap in ticks, as in a throttled background tab', async () => {
    const tab = await openTab();
    tab.getState().startShotClock();
    vi.setSystemTime(Date.now() + 10_000); // time passes, no timers fire
    expect(clockRemaining(tab.getState().shotClock, Date.now())).toBe(14);
  });

  it('runs one shared ticker no matter how many clocks run, and ticks write nothing', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const tab = await openTab();
    tab.getState().startGameClock();
    tab.getState().pauseGameClock();
    tab.getState().startGameClock();
    tab.getState().startShotClock();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const listener = vi.fn();
    tab.subscribe(listener);
    seconds(2);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('fouls and bonus', () => {
  it('tracks teams independently and floors at zero', async () => {
    const tab = await openTab();
    tab.getState().addFoul('home');
    tab.getState().addFoul('home');
    tab.getState().subtractFoul('home');
    tab.getState().subtractFoul('away');
    expect(tab.getState().homeTeam.fouls).toBe(1);
    expect(tab.getState().awayTeam.fouls).toBe(0);
  });

  it('reaches the bonus at the threshold, and follows corrections and config', async () => {
    const tab = await openTab();
    const bonus = () => tab.inBonus(tab.getState().homeTeam, tab.getState().gameConfig);
    for (let i = 0; i < 4; i++) tab.getState().addFoul('home');
    expect(bonus()).toBe(false);
    tab.getState().addFoul('home');
    expect(bonus()).toBe(true);
    tab.getState().subtractFoul('home');
    expect(bonus()).toBe(false);
    tab.getState().updateGameConfig({ foulsForBonus: 4 });
    expect(bonus()).toBe(true);
  });

  it('rejects an invalid threshold', async () => {
    const tab = await openTab();
    tab.getState().updateGameConfig({ foulsForBonus: 0 });
    expect(tab.getState().gameConfig.foulsForBonus).toBe(1);
  });
});

describe('timeouts', () => {
  it('stays between zero and the maximum', async () => {
    const tab = await openTab();
    tab.getState().addTimeout('home');
    expect(tab.getState().homeTeam.timeouts).toBe(3);
    for (let i = 0; i < 5; i++) tab.getState().subtractTimeout('home');
    expect(tab.getState().homeTeam.timeouts).toBe(0);
    expect(tab.getState().history).toHaveLength(3);
  });

  it('keeps the number used when the allowance changes', async () => {
    const tab = await openTab();
    tab.getState().subtractTimeout('home');
    tab.getState().updateGameConfig({ maxTimeouts: 6 });
    expect(tab.getState().homeTeam.timeouts).toBe(5);
    expect(tab.getState().awayTeam.timeouts).toBe(6);
    tab.getState().updateGameConfig({ maxTimeouts: 1 });
    expect(tab.getState().homeTeam.timeouts).toBe(0);
    expect(tab.getState().awayTeam.timeouts).toBe(1);
  });

  it('restores on demand, undoably', async () => {
    const tab = await openTab();
    tab.getState().subtractTimeout('away');
    tab.getState().restoreTimeouts();
    expect(tab.getState().awayTeam.timeouts).toBe(3);
    tab.getState().undo();
    expect(tab.getState().awayTeam.timeouts).toBe(2);
  });
});

describe('possession', () => {
  it('switches between teams and allows none', async () => {
    const tab = await openTab();
    tab.getState().togglePossession();
    expect(tab.getState().possession).toBe('home');
    tab.getState().togglePossession();
    expect(tab.getState().possession).toBe('away');
    tab.getState().togglePossession();
    expect(tab.getState().possession).toBe('home');
    tab.getState().setPossession(null);
    expect(tab.getState().possession).toBeNull();
    tab.getState().undo();
    expect(tab.getState().possession).toBe('home');
  });
});

describe('periods', () => {
  it('stops and refills the clocks and resets fouls but not timeouts', async () => {
    const tab = await openTab();
    tab.getState().addFoul('home');
    tab.getState().subtractTimeout('home');
    tab.getState().startGameClock();
    tab.getState().startShotClock();
    seconds(30);
    tab.getState().nextPeriod();
    const state = tab.getState();
    expect(state.period).toBe(2);
    expect(state.gameClock).toMatchObject({ remainingTime: 720, isRunning: false });
    expect(state.shotClock).toMatchObject({ remainingTime: 24, isRunning: false });
    expect(state.homeTeam).toMatchObject({ fouls: 0, timeouts: 2 });
  });

  it('honours the fouls and timeouts options', async () => {
    const tab = await openTab();
    tab.getState().updateGameConfig({ resetFoulsEachPeriod: false, restoreTimeoutsEachPeriod: true });
    tab.getState().addFoul('home');
    tab.getState().subtractTimeout('home');
    tab.getState().nextPeriod();
    expect(tab.getState().homeTeam).toMatchObject({ fouls: 1, timeouts: 3 });
  });

  it('moves into overtime with the overtime length', async () => {
    const tab = await openTab();
    tab.getState().setPeriod(5);
    expect(tab.getState()).toMatchObject({ period: 5, isOvertime: true });
    expect(tab.getState().gameClock.remainingTime).toBe(300);
  });

  it('stepping back keeps counts, and stops at period 1', async () => {
    const tab = await openTab();
    tab.getState().nextPeriod();
    tab.getState().addFoul('home');
    tab.getState().previousPeriod();
    expect(tab.getState()).toMatchObject({ period: 1 });
    expect(tab.getState().homeTeam.fouls).toBe(1);
    tab.getState().previousPeriod();
    tab.getState().setPeriod(0);
    tab.getState().setPeriod(1.5);
    expect(tab.getState().period).toBe(1);
  });
});

describe('undo and history', () => {
  it('restores each kind of action in reverse order', async () => {
    const tab = await openTab();
    const s = tab.getState;
    s().addScore('home', 3);
    s().addFoul('away');
    s().subtractTimeout('home');
    s().setPossession('away');
    s().setShotClockTime(10);
    s().setGameClockTime(100);
    s().nextPeriod();

    s().undo();
    expect(s().period).toBe(1);
    expect(s().gameClock.remainingTime).toBe(100);
    expect(s().shotClock.remainingTime).toBe(10);
    s().undo();
    expect(s().gameClock.remainingTime).toBe(720);
    s().undo();
    expect(s().shotClock.remainingTime).toBe(24);
    s().undo();
    expect(s().possession).toBeNull();
    s().undo();
    expect(s().homeTeam.timeouts).toBe(3);
    s().undo();
    expect(s().awayTeam.fouls).toBe(0);
    s().undo();
    expect(s().homeTeam.score).toBe(0);
    expect(s().history).toHaveLength(0);
    s().undo();
    expect(s().homeTeam.score).toBe(0);
  });

  it('brings back fouls cleared by a new period', async () => {
    const tab = await openTab();
    tab.getState().addFoul('home');
    tab.getState().nextPeriod();
    tab.getState().undo();
    expect(tab.getState()).toMatchObject({ period: 1 });
    expect(tab.getState().homeTeam.fouls).toBe(1);
  });

  it('leaves running clocks alone when undoing a score', async () => {
    const tab = await openTab();
    tab.getState().startGameClock();
    tab.getState().addScore('home', 2);
    seconds(5);
    tab.getState().undo();
    expect(tab.getState().gameClock.isRunning).toBe(true);
    expect(clockRemaining(tab.getState().gameClock, Date.now())).toBe(715);
  });

  it('restores a clock adjustment as a stopped clock with the value at that moment', async () => {
    const tab = await openTab();
    tab.getState().startGameClock();
    seconds(10);
    tab.getState().adjustGameClock(-60);
    seconds(10);
    tab.getState().undo();
    expect(tab.getState().gameClock).toMatchObject({ remainingTime: 710, isRunning: false, startTimestamp: null });
  });

  it('does not touch team names or colors', async () => {
    const tab = await openTab();
    tab.getState().addScore('home', 2);
    tab.getState().updateTeams({ name: 'Bulls', primaryColor: '#000000' }, {});
    tab.getState().undo();
    expect(tab.getState().homeTeam).toMatchObject({ name: 'Bulls', primaryColor: '#000000', score: 0 });
  });

  it('caps at 50 entries and ignores clock start, pause and ticks', async () => {
    const tab = await openTab();
    tab.getState().startGameClock();
    seconds(2);
    tab.getState().pauseGameClock();
    expect(tab.getState().history).toHaveLength(0);
    for (let i = 0; i < 60; i++) tab.getState().addScore('home', 1);
    expect(tab.getState().history).toHaveLength(50);
    for (let i = 0; i < 50; i++) tab.getState().undo();
    expect(tab.getState().homeTeam.score).toBe(10);
  });
});

describe('game reset', () => {
  it('keeps teams and uses the configured rules, and can be undone', async () => {
    const tab = await openTab();
    tab.getState().updateTeams({ name: 'Bulls' }, {});
    tab.getState().updateGameConfig({ maxTimeouts: 7, periodDuration: 10 });
    tab.getState().addScore('home', 3);
    tab.getState().setPossession('home');
    tab.getState().nextPeriod();
    tab.getState().resetGame();
    expect(tab.getState()).toMatchObject({ period: 1, possession: null });
    expect(tab.getState().homeTeam).toMatchObject({ name: 'Bulls', score: 0, timeouts: 7 });
    expect(tab.getState().gameClock.remainingTime).toBe(600);
    tab.getState().undo();
    expect(tab.getState()).toMatchObject({ period: 2, possession: 'home' });
    expect(tab.getState().homeTeam.score).toBe(3);
  });
});

describe('config', () => {
  it('applies a new period length only before the period has begun', async () => {
    const tab = await openTab();
    tab.getState().updateGameConfig({ periodDuration: 10 });
    expect(tab.getState().gameClock.remainingTime).toBe(600);
    tab.getState().adjustGameClock(-1);
    tab.getState().updateGameConfig({ periodDuration: 8 });
    expect(tab.getState().gameClock.remainingTime).toBe(599);
  });
});

describe('persistence', () => {
  it('survives a refresh, including history', async () => {
    const before = await openTab();
    before.getState().updateTeams({ name: 'Bulls' }, {});
    before.getState().addScore('home', 3);
    before.getState().addFoul('away');
    before.getState().setPossession('away');
    before.getState().nextPeriod();

    const after = await openTab();
    expect(after.getState()).toMatchObject({ period: 2, possession: 'away' });
    expect(after.getState().homeTeam).toMatchObject({ name: 'Bulls', score: 3 });
    expect(after.getState().history).toHaveLength(4);
    after.getState().undo();
    expect(after.getState().period).toBe(1);
    expect(after.getState().awayTeam.fouls).toBe(1);
  });

  it('keeps a running clock counting through a refresh', async () => {
    const before = await openTab();
    before.getState().startGameClock();
    FakeChannel.open.clear();
    vi.clearAllTimers();
    vi.setSystemTime(Date.now() + 15_000);

    const after = await openTab();
    expect(after.getState().gameClock.isRunning).toBe(true);
    expect(clockRemaining(after.getState().gameClock, Date.now())).toBe(705);
  });

  it('stops a clock that expired while the page was closed', async () => {
    const before = await openTab();
    before.getState().startShotClock();
    FakeChannel.open.clear();
    vi.clearAllTimers();
    vi.setSystemTime(Date.now() + 60_000);

    const after = await openTab();
    seconds(0.2);
    expect(after.getState().shotClock).toMatchObject({ remainingTime: 0, isRunning: false });
  });

  it('repairs invalid saved values', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 0,
      state: {
        homeTeam: { name: 'Bulls', score: -4, fouls: 'many', timeouts: 99 },
        period: -1,
        possession: 'referee',
        gameClock: { remainingTime: 'soon', isRunning: true, startTimestamp: 5 },
        shotClock: { remainingTime: -3, isRunning: true, startTimestamp: null },
        gameConfig: { foulsForBonus: -1, periodDuration: null },
        history: 'nope',
      },
    }));
    const state = (await openTab()).getState();
    expect(state.homeTeam).toMatchObject({ name: 'Bulls', score: 0, fouls: 0, timeouts: 3 });
    expect(state).toMatchObject({ period: 1, possession: null, history: [] });
    expect(state.gameClock).toMatchObject({ remainingTime: 720, isRunning: false });
    expect(state.shotClock).toMatchObject({ remainingTime: 0, isRunning: false, startTimestamp: null });
    expect(state.gameConfig).toMatchObject({ foulsForBonus: 1, periodDuration: 12 });
  });

  it('loads Phase 1 data, which has no new config fields', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 0,
      state: { homeTeam: { name: 'Bulls', score: 40, fouls: 6, timeouts: 1 }, bonusHome: true, gameConfig: { maxTimeouts: 3, foulsForBonus: 5 } },
    }));
    const tab = await openTab();
    expect(tab.getState().homeTeam.score).toBe(40);
    expect(tab.getState().gameConfig.resetFoulsEachPeriod).toBe(true);
    expect(tab.inBonus(tab.getState().homeTeam, tab.getState().gameConfig)).toBe(true);
  });

  it('starts fresh from corrupt storage instead of crashing', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const tab = await openTab();
    tab.getState().addScore('home', 2);
    expect(tab.getState().homeTeam.score).toBe(2);
  });

  it('keeps working when localStorage is full', async () => {
    const tab = await openTab();
    const other = await openTab();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    tab.getState().addScore('home', 2);
    setItem.mockRestore();
    error.mockRestore();
    expect(tab.getState().homeTeam.score).toBe(2);
    expect(other.getState().homeTeam.score).toBe(2);
  });
});

describe('shot clock settings', () => {
  it('uses the configured lengths and applies them to an unstarted clock', async () => {
    const tab = await openTab();
    tab.getState().updateGameConfig({ shotClockDuration: 30, shotClockShort: 20 });
    expect(tab.getState().shotClock.remainingTime).toBe(30);
    tab.getState().adjustShotClock(-1);
    tab.getState().updateGameConfig({ shotClockDuration: 35 });
    expect(tab.getState().shotClock.remainingTime).toBe(29);
    tab.getState().nextPeriod();
    expect(tab.getState().shotClock.remainingTime).toBe(35);
  });
});

describe('saved configurations', () => {
  const prepare = async () => {
    const tab = await openTab();
    tab.getState().updateTeams({ name: 'Bulls', primaryColor: '#111111', logo: 'logo-1' }, { name: 'Hawks' });
    tab.getState().updateGameConfig({ periodDuration: 10, overtimeDuration: 3, shotClockDuration: 30, foulsForBonus: 7, maxTimeouts: 5, theme: { ...tab.getState().gameConfig.theme, themeId: 'tournament', layout: 'tournament' } });
    tab.getState().saveCurrentConfig('League Night');
    return { tab, id: tab.getState().savedConfigs.at(-1)!.id };
  };

  it('saves teams, branding, rules and theme but not scores', async () => {
    const { tab } = await prepare();
    tab.getState().addScore('home', 3);
    expect(tab.getState().savedConfigs.at(-1)).toMatchObject({
      name: 'League Night',
      homeTeam: { name: 'Bulls', primaryColor: '#111111', logo: 'logo-1' },
      awayTeam: { name: 'Hawks' },
      periodDuration: 10,
      overtimeDuration: 3,
      shotClockDuration: 30,
      foulsForBonus: 7,
      maxTimeouts: 5,
      theme: { themeId: 'tournament', layout: 'tournament' },
    });
    expect(JSON.stringify(tab.getState().savedConfigs.at(-1))).not.toContain('"score"');
  });

  it('loads everything back as a fresh game', async () => {
    const { tab, id } = await prepare();
    tab.getState().loadConfig('default');
    expect(tab.getState().homeTeam.name).toBe(BRAND_TEAM.name);
    tab.getState().loadConfig(id);
    const state = tab.getState();
    expect(state.homeTeam).toMatchObject({ name: 'Bulls', logo: 'logo-1', score: 0, timeouts: 5 });
    expect(state.gameClock.remainingTime).toBe(600);
    expect(state.shotClock.remainingTime).toBe(30);
    expect(state.gameConfig.theme.themeId).toBe('tournament');
  });

  it('can undo loading over a game', async () => {
    const { tab } = await prepare();
    tab.getState().addScore('home', 3);
    tab.getState().loadConfig('default');
    expect(tab.getState().homeTeam).toMatchObject({ name: BRAND_TEAM.name, score: 0 });
    tab.getState().undo();
    expect(tab.getState().homeTeam).toMatchObject({ name: 'Bulls', score: 3, logo: 'logo-1' });
    expect(tab.getState().gameConfig.periodDuration).toBe(10);
  });

  it('renames, duplicates, updates and deletes', async () => {
    const { tab, id } = await prepare();
    tab.getState().renameConfig(id, 'Cup Final');
    expect(tab.getState().gameConfig.name).toBe('Cup Final');
    tab.getState().duplicateConfig(id);
    const copy = tab.getState().savedConfigs.at(-1)!;
    expect(copy).toMatchObject({ name: 'Cup Final (copy)', homeTeam: { name: 'Bulls' } });
    expect(copy.id).not.toBe(id);

    tab.getState().updateTeams({ name: 'Lions' }, {});
    tab.getState().updateConfigFromCurrent(id);
    expect(tab.getState().savedConfigs.find((c) => c.id === id)).toMatchObject({ name: 'Cup Final', homeTeam: { name: 'Lions' } });
    expect(tab.getState().savedConfigs.find((c) => c.id === copy.id)?.homeTeam.name).toBe('Bulls');

    tab.getState().deleteConfig(id);
    tab.getState().deleteConfig('default');
    expect(tab.getState().savedConfigs.map((c) => c.id)).toEqual(['default', copy.id]);
    expect(tab.getState().homeTeam.name).toBe('Lions');
  });

  it('keeps a logo while a configuration or undo step still uses it', async () => {
    const { tab } = await prepare();
    tab.getState().updateTeams({ logo: 'logo-2' }, {});
    expect([...tab.referencedLogos(tab.getState())].sort()).toEqual(['logo-1', 'logo-2']);
    tab.getState().deleteConfig(tab.getState().savedConfigs.at(-1)!.id);
    expect([...tab.referencedLogos(tab.getState())]).toEqual(['logo-2']);
  });

  it('drops or repairs invalid saved configurations', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 0,
      state: { savedConfigs: [null, { name: 'no id' }, { id: 'x', name: 'Bad numbers', periodDuration: -4, theme: { themeId: 'neon' } }] },
    }));
    const { savedConfigs } = (await openTab()).getState();
    expect(savedConfigs).toHaveLength(1);
    expect(savedConfigs[0]).toMatchObject({ id: 'x', periodDuration: 1, shotClockShort: 14, theme: { themeId: defaultTheme.themeId } });
  });
});

describe('active game protection', () => {
  it('sees a game as active once anything has happened', async () => {
    const check = async (act: (tab: Awaited<ReturnType<typeof openTab>>) => void) => {
      localStorage.clear();
      const tab = await openTab();
      expect(tab.isGameActive(tab.getState())).toBe(false);
      act(tab);
      return tab.isGameActive(tab.getState());
    };
    expect(await check((t) => t.getState().addScore('home', 1))).toBe(true);
    expect(await check((t) => t.getState().addFoul('away'))).toBe(true);
    expect(await check((t) => t.getState().subtractTimeout('home'))).toBe(true);
    expect(await check((t) => t.getState().nextPeriod())).toBe(true);
    expect(await check((t) => t.getState().startGameClock())).toBe(true);
    expect(await check((t) => t.getState().adjustGameClock(-1))).toBe(true);
    expect(await check((t) => t.getState().updateTeams({ name: 'Bulls' }, {}))).toBe(false);
  });

  it('does not count a finished game, which is already saved', async () => {
    const tab = await openTab();
    tab.getState().addScore('home', 1);
    tab.getState().finishGame();
    expect(tab.isGameActive(tab.getState())).toBe(false);
    tab.getState().reopenGame();
    expect(tab.isGameActive(tab.getState())).toBe(true);
  });
});

describe('finishing a game', () => {
  it('never finishes by itself when the clock reaches zero', async () => {
    const tab = await openTab();
    tab.getState().setPeriod(4);
    tab.getState().setGameClockTime(1);
    tab.getState().startGameClock();
    seconds(3);
    expect(tab.getState().finished).toBe(false);
    expect(tab.gameLog.getState().games).toHaveLength(0);
  });

  it('records the result and stops the clocks', async () => {
    const tab = await openTab();
    tab.getState().updateTeams({ name: 'Bulls' }, { name: 'Hawks' });
    tab.getState().addScore('home', 3);
    tab.getState().addScore('away', 2);
    tab.getState().setPeriod(6);
    tab.getState().addScore('home', 1);
    tab.getState().startGameClock();
    tab.getState().finishGame();
    expect(tab.getState()).toMatchObject({ finished: true, gameClock: { isRunning: false } });
    expect(tab.gameLog.getState().games).toEqual([expect.objectContaining({
      homeName: 'Bulls', awayName: 'Hawks', homeScore: 4, awayScore: 2, periodsPlayed: 6, overtimePeriods: 2, finishedAt: Date.now(), periodDuration: 12,
    })]);
  });

  it('updates the same record when finished again after a reopen', async () => {
    const tab = await openTab();
    tab.getState().finishGame();
    tab.getState().reopenGame();
    tab.getState().addScore('home', 2);
    tab.getState().finishGame();
    expect(tab.gameLog.getState().games).toHaveLength(1);
    expect(tab.gameLog.getState().games[0].homeScore).toBe(2);
  });

  it('starts a separate record for the next game', async () => {
    const tab = await openTab();
    tab.getState().finishGame();
    tab.getState().resetGame();
    expect(tab.getState()).toMatchObject({ finished: false, gameRecordId: null });
    tab.getState().finishGame();
    expect(tab.gameLog.getState().games).toHaveLength(2);
  });

  it('keeps history separate from the game and survives a refresh', async () => {
    const before = await openTab();
    before.getState().addScore('home', 2);
    before.getState().finishGame();
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('homeName');

    const after = await openTab();
    expect(after.getState().finished).toBe(true);
    expect(after.gameLog.getState().games).toHaveLength(1);
    after.gameLog.getState().deleteGame(after.gameLog.getState().games[0].id);
    expect((await openTab()).gameLog.getState().games).toHaveLength(0);
  });

  it('ignores invalid saved game records', async () => {
    localStorage.setItem('basketball-games', JSON.stringify({ version: 0, state: { games: [null, { id: 'x' }, { id: 'y', homeName: 'A', awayName: 'B', homeScore: 1, awayScore: 2, finishedAt: 5 }] } }));
    expect((await openTab()).gameLog.getState().games.map((g) => g.id)).toEqual(['y']);
  });
});

describe('defaults and themes', () => {
  it('starts a new game with default rules and theme, keeping the teams', async () => {
    const tab = await openTab();
    tab.getState().updateTeams({ name: 'Bulls' }, {});
    tab.getState().addScore('home', 2);
    const { theme, ...rules } = tab.getState().gameConfig;
    tab.getState().applyDefaults({ ...rules, periodDuration: 8, maxTimeouts: 4 }, { ...theme, themeId: 'broadcast' });
    expect(tab.getState().homeTeam).toMatchObject({ name: 'Bulls', score: 0, timeouts: 4 });
    expect(tab.getState().gameClock.remainingTime).toBe(480);
    expect(tab.getState().gameConfig.theme.themeId).toBe('broadcast');
    tab.getState().undo();
    expect(tab.getState().homeTeam.score).toBe(2);
    expect(tab.getState().gameConfig.theme.themeId).toBe(defaultTheme.themeId);
  });

  it('starts with the school branding: home team, visitors and the Classic preset', async () => {
    const { homeTeam, awayTeam, gameConfig } = (await openTab()).getState();
    expect(homeTeam).toMatchObject(BRAND_TEAM);
    expect(awayTeam.name).toBe('Visitors');
    expect(gameConfig.theme).toEqual(defaultTheme);
  });

  it('switches through every preset mid-game without touching the game', async () => {
    const operator = await openTab();
    const display = await openTab();
    const op = operator.getState;
    op().addScore('home', 3);
    op().addScore('away', 2);
    op().addFoul('away');
    op().subtractTimeout('home');
    op().togglePossession();
    op().nextPeriod();
    op().startGameClock();
    op().startShotClock();
    seconds(5);
    const game = () => {
      const { homeTeam, awayTeam, period, possession, gameClock, shotClock, history } = op();
      return { homeTeam, awayTeam, period, possession, gameClock, shotClock, history: history.length };
    };
    const before = game();
    for (const id of Object.keys(THEMES) as ThemeId[]) {
      op().updateGameConfig({ theme: themePreset(id) });
      expect(display.getState().gameConfig.theme.themeId).toBe(id);
      expect(game()).toEqual(before);
    }
    seconds(2);
    expect(clockRemaining(display.getState().gameClock, Date.now())).toBe(713);
  });

  it('keeps Phase 2 data, adding a default theme', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 0,
      state: {
        homeTeam: { name: 'Bulls', primaryColor: '#123456', score: 40, fouls: 2, timeouts: 2 },
        period: 3,
        gameClock: { periodDuration: 720, remainingTime: 300, isRunning: false, startTimestamp: null },
        gameConfig: { id: 'default', name: 'Standard Game', maxTimeouts: 3, foulsForBonus: 5, resetFoulsEachPeriod: false },
        savedConfigs: [{ id: 'default', name: 'Standard Game' }],
        history: [{ timestamp: 1, action: 'Bulls +2', previousState: { homeTeam: { score: 38, fouls: 2, timeouts: 2 } } }],
      },
    }));
    const tab = await openTab();
    expect(tab.getState()).toMatchObject({ period: 3, homeTeam: { name: 'Bulls', primaryColor: '#123456', score: 40 } });
    expect(tab.getState().gameConfig).toMatchObject({ resetFoulsEachPeriod: false, shotClockShort: 14, theme: { themeId: defaultTheme.themeId } });
    expect(tab.getState().gameClock.remainingTime).toBe(300);
    tab.getState().undo();
    expect(tab.getState().homeTeam).toMatchObject({ name: 'Bulls', score: 38 });
  });

  it('repairs an invalid saved team color', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 0, state: { homeTeam: { primaryColor: 'url(evil)' } } }));
    expect((await openTab()).getState().homeTeam.primaryColor).toBe(BRAND_TEAM.primaryColor);
  });
});

describe('sync between tabs', () => {
  it('brings theme, branding, configurations and the final result to the display', async () => {
    const operator = await openTab();
    const display = await openTab();
    operator.getState().updateGameConfig({ theme: { ...operator.getState().gameConfig.theme, themeId: 'broadcast', layout: 'broadcast' } });
    expect(display.getState().gameConfig.theme.layout).toBe('broadcast');
    operator.getState().updateTeams({ primaryColor: '#00ff00', logo: 'logo-1' }, {});
    expect(display.getState().homeTeam).toMatchObject({ primaryColor: '#00ff00', logo: 'logo-1' });
    operator.getState().saveCurrentConfig('Saved');
    expect(display.getState().savedConfigs).toHaveLength(2);
    operator.getState().finishGame();
    expect(display.getState().finished).toBe(true);
  });

  it('reaches the display for every kind of action, including undo', async () => {
    const operator = await openTab();
    const display = await openTab();
    const op = operator.getState;
    const shown = display.getState;

    op().addScore('home', 3);
    expect(shown().homeTeam.score).toBe(3);
    op().addFoul('away');
    expect(shown().awayTeam.fouls).toBe(1);
    op().subtractTimeout('away');
    expect(shown().awayTeam.timeouts).toBe(2);
    op().togglePossession();
    expect(shown().possession).toBe('home');
    op().updateGameConfig({ foulsForBonus: 1 });
    expect(display.inBonus(shown().awayTeam, shown().gameConfig)).toBe(true);
    op().nextPeriod();
    expect(shown().period).toBe(2);
    op().undo();
    expect(shown().period).toBe(1);
    expect(shown().awayTeam.fouls).toBe(1);
  });

  it('shows the same running clocks in both tabs', async () => {
    const operator = await openTab();
    const display = await openTab();
    operator.getState().startGameClock();
    operator.getState().startShotClock();
    seconds(7);
    const now = Date.now();
    expect(clockRemaining(display.getState().gameClock, now)).toBe(713);
    expect(clockRemaining(display.getState().shotClock, now)).toBe(17);
  });

  it('stays in step when both tabs see the clock expire', async () => {
    const operator = await openTab();
    const display = await openTab();
    operator.getState().startShotClock();
    seconds(25);
    expect(operator.getState().shotClock).toEqual(display.getState().shotClock);
    expect(display.getState().shotClock).toMatchObject({ remainingTime: 0, isRunning: false });
  });

  it('shares history, so undo works from a tab opened later and from the display', async () => {
    const operator = await openTab();
    operator.getState().addScore('home', 2);
    const late = await openTab();
    operator.getState().addScore('home', 2);
    expect(late.getState().history).toHaveLength(2);
    late.getState().undo();
    expect(operator.getState().homeTeam.score).toBe(2);
    expect(operator.getState().history).toHaveLength(1);
  });
});
