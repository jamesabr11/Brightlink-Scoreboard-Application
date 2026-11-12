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

  it('cleans manual element positions from storage and syncs them', async () => {
    const operator = await openTab();
    const display = await openTab();
    operator.show.getState().setSponsorLayout({ rects: { home: { x: 95, y: -4, w: 30, h: 20 }, bogus: { x: 1, y: 1, w: 9, h: 9 }, away: { x: 'a' } } as never });
    expect(display.show.getState().sponsorLayout.rects).toEqual({ home: { x: 70, y: 0, w: 30, h: 20 } });
  });

  it('drops manual positions saved before layout versioning but keeps media assignments', async () => {
    localStorage.setItem('basketball-presentation', JSON.stringify({ state: { sponsorLayout: { sections: 2, media: [['a'], ['b']], rects: { home: { x: 0, y: 0, w: 40, h: 40 } } } }, version: 0 }));
    const { show } = await openTab();
    expect(show.getState().sponsorLayout.rects).toEqual({});
    expect(show.getState().sponsorLayout.media).toEqual([['a'], ['b'], []]);
  });

  it('loads the preset layout when the scoreboard preset changes, keeping media and ignoring other edits', async () => {
    const { game, show } = await openTab();
    const theme = game.getState().gameConfig.theme;
    show.getState().setSponsorLayout({ media: [['a'], [], []], rects: { home: { x: 0, y: 0, w: 40, h: 40 } } });
    game.getState().updateGameConfig({ name: 'Renamed' });
    expect(show.getState().sponsorLayout.rects).toEqual({ home: { x: 0, y: 0, w: 40, h: 40 } });
    game.getState().updateGameConfig({ theme: { ...theme, themeId: 'broadcast', layout: 'broadcast' } });
    expect(show.getState().sponsorLayout).toMatchObject({ placement: 'right', rects: {}, media: [['a'], [], []] });
    show.getState().setSponsorLayout({ rects: { away: { x: 50, y: 0, w: 30, h: 30 } } });
    game.getState().updateGameConfig({ theme: { ...game.getState().gameConfig.theme, accent: '#123456' } });
    expect(show.getState().sponsorLayout.rects).toHaveProperty('away');
  });

  describe('layout undo', () => {
    it('steps back through changes, coalesces a drag, and leaves game state and saved layouts alone', async () => {
      vi.useFakeTimers();
      const { game, show } = await openTab();
      const theme = game.getState().gameConfig.theme;
      const s = () => show.getState();
      expect(s().layoutHistory).toEqual([]);
      s().undoLayout(); // nothing to undo is a no-op
      const start = s().sponsorLayout;

      s().setSponsorLayout({ rects: { home: { x: 0, y: 0, w: 30, h: 30 } } });
      s().setSponsorLayout({ rects: { home: { x: 5, y: 5, w: 30, h: 30 } } }); // same drag
      vi.advanceTimersByTime(1000);
      s().setSponsorLayout({ sections: 2, size: 40 });
      expect(s().layoutHistory).toHaveLength(2);

      s().saveLayout('Mine', theme);
      const before = JSON.stringify(game.getState().gameConfig);
      s().undoLayout();
      expect(s().sponsorLayout.sections).toBe(1);
      expect(s().sponsorLayout.rects.home).toEqual({ x: 5, y: 5, w: 30, h: 30 });
      s().undoLayout();
      expect(s().sponsorLayout).toEqual(start);
      expect(s().layoutHistory).toEqual([]);
      expect(JSON.stringify(game.getState().gameConfig)).toBe(before);
      expect(s().savedLayouts[0].layout.sections).toBe(2);
      vi.useRealTimers();
    });

    it('is not saved or shared, and loading a saved layout starts a fresh history', async () => {
      const { game, show } = await openTab();
      const theme = game.getState().gameConfig.theme;
      show.getState().setSponsorLayout({ sections: 3 });
      show.getState().saveLayout('Mine', theme);
      expect(Object.values(localStorage).some((v) => String(v).includes('layoutHistory'))).toBe(false);
      expect((await openTab()).show.getState().layoutHistory).toEqual([]);
      show.getState().setSponsorLayout({ sections: 2 });
      show.getState().loadSavedLayout(show.getState().savedLayouts[0].id);
      expect(show.getState().layoutHistory).toEqual([]);
    });
  });

  describe('saved layouts', () => {
    it('keep independent copies, unique names, and survive a restart', async () => {
      const { game, show } = await openTab();
      const theme = game.getState().gameConfig.theme;
      const s = () => show.getState();
      s().setSponsorLayout({ sections: 2, media: [['a'], ['b'], []], rects: { home: { x: 0, y: 0, w: 40, h: 40 } } });
      s().saveLayout('Game night', theme);
      s().saveLayout(' game NIGHT ', theme);
      expect(s().savedLayouts.map((l) => l.name)).toEqual(['Game night', 'game NIGHT (2)']);
      const [first, second] = s().savedLayouts;
      s().setSponsorLayout({ sections: 3, rects: {}, media: [['z'], [], []] });
      expect(s().savedLayouts[0].layout).toMatchObject({ sections: 2, media: [['a'], ['b'], []], rects: { home: { x: 0, y: 0, w: 40, h: 40 } } });
      s().duplicateSavedLayout(first.id);
      expect(s().savedLayouts[2]).toMatchObject({ name: 'Game night copy', layout: first.layout });
      s().renameSavedLayout(second.id, 'Game night');
      expect(s().savedLayouts[1].name).toBe('Game night (2)');
      s().renameSavedLayout(second.id, 'Practice');

      const next = await openTab();
      expect(next.show.getState().savedLayouts.map((l) => l.name)).toEqual(['Game night', 'Practice', 'Game night copy']);
      next.show.getState().deleteSavedLayout(first.id);
      expect(next.show.getState().savedLayouts).toHaveLength(2);
    });

    it('without sponsor sections saves a clean scoreboard that keeps its positions, and older layouts keep their sections', async () => {
      const { game, show } = await openTab();
      const theme = game.getState().gameConfig.theme;
      const s = () => show.getState();
      s().setSponsorLayout({ media: [['a'], [], []], rects: { home: { x: 0, y: 0, w: 40, h: 40 }, section0: { x: 50, y: 50, w: 30, h: 30 } } });
      s().saveLayout('With', theme);
      s().setSponsorLayout({ sponsorSections: false });
      s().saveLayout('Without', theme);
      const [withSections, without] = s().savedLayouts;
      expect(withSections.layout).toMatchObject({ sponsorSections: true, media: [['a'], [], []] });
      expect(without.layout).toMatchObject({ sponsorSections: false, media: [[], [], []], rects: { home: { x: 0, y: 0, w: 40, h: 40 } } });
      expect(without.layout.rects).not.toHaveProperty('section0');
      expect(s().sponsorLayout.sponsorSections).toBe(false);
    });

    it('loading one restores its layout and appearance everywhere, and edits stay in the working copy', async () => {
      const operator = await openTab();
      const display = await openTab();
      const theme = operator.game.getState().gameConfig.theme;
      const s = operator.show.getState();
      s.setSponsorLayout({ media: [['a'], [], []], rects: { away: { x: 50, y: 0, w: 30, h: 30 } } });
      s.saveLayout('Mine', theme);
      const id = operator.show.getState().savedLayouts[0].id;
      operator.game.getState().updateGameConfig({ theme: { ...theme, themeId: 'broadcast', layout: 'broadcast' } });
      expect(operator.show.getState().sponsorLayout.rects).toEqual({});
      operator.show.getState().loadSavedLayout(id);
      expect(operator.show.getState().sponsorLayout).toMatchObject({ media: [['a'], [], []], rects: { away: { x: 50, y: 0, w: 30, h: 30 } } });
      expect(operator.game.getState().gameConfig.theme.themeId).toBe(theme.themeId);
      expect(display.show.getState().sponsorLayout.rects).toHaveProperty('away');
      expect(display.show.getState().activeLayoutId).toBe(id);
      operator.show.getState().setSponsorLayout({ rects: {} });
      expect(operator.show.getState().savedLayouts[0].layout.rects).toHaveProperty('away');
    });

    it('cleans stored layouts', async () => {
      localStorage.setItem('basketball-presentation', JSON.stringify({ state: { savedLayouts: [{ id: 'x', name: 5 }, { id: 'ok', name: 'Fine', layout: { sections: 9 }, theme: { themeId: 'nope' } }, { id: 'ok', name: 'Dup' }], activeLayoutId: 'gone' }, version: 1 }));
      const { show } = await openTab();
      expect(show.getState().savedLayouts).toHaveLength(1);
      expect(show.getState().savedLayouts[0].layout.sections).toBe(3);
      expect(show.getState().activeLayoutId).toBeNull();
    });
  });
});
