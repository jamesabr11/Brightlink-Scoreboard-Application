import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clockRemaining } from '../lib/clock';
import { halfPeriods, pointsThrough } from '../lib/periodScores';

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
  const { useBasketballStore } = await import('./useBasketballStore');
  const { usePresentationStore } = await import('./usePresentationStore');
  return { game: useBasketballStore, show: usePresentationStore };
};

const seconds = (n: number) => vi.advanceTimersByTime(n * 1000);

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  vi.clearAllTimers();
  localStorage.clear();
  FakeChannel.open.clear();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

describe('period scores', () => {
  it('credit points to the period they were scored in, overtime included', async () => {
    const { game } = await openTab();
    game.getState().addScore('home', 3);
    game.getState().setPeriod(2);
    game.getState().addScore('home', 2);
    game.getState().addScore('away', 3);
    game.getState().setPeriod(5);
    game.getState().addScore('away', 1);
    expect(game.getState().periodScores).toEqual([{ home: 3, away: 0 }, { home: 2, away: 3 }, { home: 0, away: 0 }, { home: 0, away: 0 }, { home: 0, away: 1 }]);
  });

  it('first-half score ignores second-half scoring', async () => {
    const { game } = await openTab();
    game.getState().addScore('home', 2);
    game.getState().setPeriod(2);
    game.getState().addScore('away', 3);
    game.getState().setPeriod(3);
    game.getState().addScore('home', 3);
    const { periodScores, gameConfig } = game.getState();
    expect(pointsThrough(periodScores, halfPeriods(gameConfig.numberOfPeriods))).toEqual({ home: 2, away: 3 });
  });

  it('follow undo, including undoing a period change', async () => {
    const { game } = await openTab();
    game.getState().addScore('home', 3);
    game.getState().undo();
    expect(game.getState().periodScores).toEqual([]);
    expect(game.getState().homeTeam.score).toBe(0);
    game.getState().addScore('home', 2);
    game.getState().setPeriod(2);
    game.getState().addScore('home', 3);
    game.getState().undo();
    expect(game.getState().periodScores).toEqual([{ home: 2, away: 0 }]);
    expect(game.getState().homeTeam.score).toBe(2);
  });

  it('restart with a reset, and undoing the reset brings them back', async () => {
    const { game } = await openTab();
    game.getState().addScore('home', 3);
    game.getState().resetGame();
    expect(game.getState().periodScores).toEqual([]);
    game.getState().undo();
    expect(game.getState().periodScores).toEqual([{ home: 3, away: 0 }]);
  });

  it('are rebuilt from the totals when a saved game has none', async () => {
    localStorage.setItem('basketball-storage', JSON.stringify({ state: { period: 2, homeTeam: { score: 10 }, awayTeam: { score: 7 } }, version: 0 }));
    const { game } = await openTab();
    const total = pointsThrough(game.getState().periodScores, 99);
    expect(total).toEqual({ home: 10, away: 7 });
  });
});

describe('presentation mode', () => {
  it('defaults to live and survives a refresh', async () => {
    const { show } = await openTab();
    expect(show.getState().mode).toBe('live');
    show.getState().setMode('stadium');
    const next = await openTab();
    expect(next.show.getState().mode).toBe('stadium');
  });

  it('follows the operator tab on the display tab', async () => {
    const operator = await openTab();
    const display = await openTab();
    operator.show.getState().setMode('halftime');
    expect(display.show.getState().mode).toBe('halftime');
  });

  it('ignores an unknown saved mode', async () => {
    localStorage.setItem('basketball-presentation', JSON.stringify({ state: { mode: 'bogus' }, version: 0 }));
    const { show } = await openTab();
    expect(show.getState().mode).toBe('live');
  });

  it('never touches game state, clocks included', async () => {
    const { game, show } = await openTab();
    game.getState().addScore('home', 3);
    game.getState().startGameClock();
    const { homeTeam, gameClock, history, periodScores } = game.getState();
    const before = { homeTeam, gameClock, history, periodScores };
    for (const mode of ['pregame', 'stadium', 'halftime', 'live'] as const) show.getState().setMode(mode);
    const after = game.getState();
    expect(after.homeTeam).toEqual(before.homeTeam);
    expect(after.gameClock).toEqual(before.gameClock);
    expect(after.history).toEqual(before.history);
    expect(after.periodScores).toEqual(before.periodScores);
    seconds(5);
    expect(game.getState().gameClock.isRunning).toBe(true);
    expect(clockRemaining(game.getState().gameClock, Date.now())).toBeCloseTo(before.gameClock.remainingTime - 5, 0);
  });
});

describe('countdowns', () => {
  it('count down in real time and stop at zero', async () => {
    const { show } = await openTab();
    show.getState().setCountdownDuration('pregame', 30);
    show.getState().startCountdown('pregame');
    seconds(10);
    expect(clockRemaining(show.getState().countdowns.pregame, Date.now())).toBeCloseTo(20, 0);
    seconds(25);
    expect(show.getState().countdowns.pregame.isRunning).toBe(false);
    expect(show.getState().countdowns.pregame.remainingTime).toBe(0);
  });

  it('pause, reset and add time', async () => {
    const { show } = await openTab();
    show.getState().setCountdownDuration('halftime', 60);
    show.getState().startCountdown('halftime');
    seconds(10);
    show.getState().pauseCountdown('halftime');
    expect(show.getState().countdowns.halftime.remainingTime).toBeCloseTo(50, 0);
    show.getState().adjustCountdown('halftime', 120);
    expect(show.getState().countdowns.halftime.duration).toBeGreaterThan(60);
    show.getState().resetCountdown('halftime');
    expect(show.getState().countdowns.halftime.remainingTime).toBe(show.getState().countdowns.halftime.duration);
  });

  it('keep running across mode changes and refreshes', async () => {
    const { show } = await openTab();
    show.getState().startCountdown('pregame');
    show.getState().setMode('live');
    seconds(5);
    const next = await openTab();
    expect(next.show.getState().countdowns.pregame.isRunning).toBe(true);
  });

  it('clamp duration to a sane range', async () => {
    const { show } = await openTab();
    show.getState().setCountdownDuration('pregame', 10 ** 9);
    expect(show.getState().countdowns.pregame.duration).toBe(7200);
    show.getState().setCountdownDuration('pregame', -5);
    expect(show.getState().countdowns.pregame.duration).toBe(0);
  });
});

describe('sponsor layout sections', () => {
  it('limits sections and shares, and syncs media assignments to the display tab', async () => {
    const operator = await openTab();
    const display = await openTab();
    operator.show.getState().setSponsorLayout({ sections: 9, split: [500, 1, 40], media: [['a'], [], [], ['extra']] });
    const layout = display.show.getState().sponsorLayout;
    expect(layout.sections).toBe(3);
    expect(layout.split).toEqual([80, 10, 40]);
    expect(layout.media).toEqual([['a'], [], []]);
  });
});
