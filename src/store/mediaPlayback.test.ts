import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaItem } from '../types/media';

class FakeChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage() {}
  close() {}
}

const media = (id: string, categoryId: string): MediaItem => ({
  id, name: id, kind: 'image', type: 'image/png', size: 1, width: 1, height: 1, naturalDuration: null,
  duration: 10, categoryId, sponsorId: null, createdAt: 1,
});

const setup = async () => {
  vi.resetModules();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  const [flow, playback, presentation, intro, mediaStore] = await Promise.all([
    import('../lib/mediaPlayback'), import('./usePlaybackStore'), import('./usePresentationStore'), import('./useIntroStore'), import('./useMediaStore'),
  ]);
  mediaStore.useMediaStore.setState({ items: [media('ad', 'advertisements'), media('clip', 'hype'), media('pre', 'pregame')] });
  return { flow, playback: playback.usePlaybackStore, presentation: presentation.usePresentationStore, intro: intro.useIntroStore };
};

beforeEach(() => { localStorage.clear(); });

describe('operator media playback', () => {
  it('reads media values from the dropdown', async () => {
    const { flow } = await setup();
    expect(flow.mediaIdOf(flow.mediaValue('abc'))).toBe('abc');
    expect(flow.mediaIdOf(flow.ROTATION)).toBeNull();
    expect(flow.mediaIdOf('')).toBeNull();
  });

  it('a mode button only changes the display mode', async () => {
    const { flow, playback, presentation } = await setup();
    for (const mode of ['pregame', 'halftime', 'intro', 'fullscreen', 'live'] as const) {
      flow.selectMode(mode);
      expect(presentation.getState().mode).toBe(mode);
    }
    expect(playback.getState().queue).toEqual([]);
  });

  it('Live and Introductions need no media; choosing them stops anything playing', async () => {
    const { flow, playback } = await setup();
    expect(['live', 'intro'].map((m) => flow.needsMedia(m as never))).toEqual([false, false]);
    expect(['pregame', 'halftime', 'livesponsor', 'fullscreen'].every((m) => flow.needsMedia(m as never))).toBe(true);
    playback.getState().playNow('clip');
    playback.getState().addToQueue('ad');
    flow.selectMode('intro');
    expect(playback.getState()).toMatchObject({ isPlaying: false, queue: ['clip', 'ad'] });
  });

  it('entering Live Sponsor with an empty queue starts the sponsor rotation, but never replaces a queue', async () => {
    const { flow, playback } = await setup();
    flow.selectMode('livesponsor');
    expect(playback.getState()).toMatchObject({ queue: ['ad'], isPlaying: true, loop: true });
    flow.selectMode('live');
    playback.getState().setQueue(['clip'], false, false);
    flow.selectMode('livesponsor');
    expect(playback.getState().queue).toEqual(['clip']);
  });

  it('Play Now plays the chosen media in the selected mode', async () => {
    const { flow, playback, presentation } = await setup();
    flow.selectMode('pregame');
    flow.play(flow.mediaValue('clip'));
    expect(presentation.getState().mode).toBe('pregame');
    expect(playback.getState()).toMatchObject({ queue: ['clip'], isPlaying: true });
  });

  it("Play with the mode's rotation chosen loads that mode's media", async () => {
    const { flow, playback } = await setup();
    flow.selectMode('pregame');
    flow.play(flow.ROTATION);
    expect(playback.getState()).toMatchObject({ queue: ['ad', 'pre'], isPlaying: true, loop: true });
  });

  it('Play with nothing chosen resumes the queue', async () => {
    const { flow, playback } = await setup();
    playback.getState().addToQueue('clip');
    flow.play('');
    expect(playback.getState().isPlaying).toBe(true);
  });

  it('Stop halts media and introductions, keeps the mode and the queue', async () => {
    const { flow, playback, presentation, intro } = await setup();
    flow.selectMode('intro');
    intro.getState().startIntro('home');
    playback.getState().playNow('clip');
    playback.getState().addToQueue('ad');
    flow.stopAll();
    expect(presentation.getState().mode).toBe('intro');
    expect(playback.getState()).toMatchObject({ isPlaying: false, queue: ['clip', 'ad'] });
    expect(intro.getState().isPlaying).toBe(false);
  });

  it('Custom Layout: Play starts the sponsor rotation; with none it resumes the queue; Stop stops it', async () => {
    const { flow, playback, presentation } = await setup();
    flow.selectMode('livesponsor');
    expect(presentation.getState().mode).toBe('livesponsor');
    flow.stopAll();
    expect(playback.getState().isPlaying).toBe(false);
    flow.playCustomLayout();
    expect(playback.getState()).toMatchObject({ queue: ['ad'], isPlaying: true, loop: true });
  });
});

describe('Rotate Through Queue', () => {
  afterEach(() => vi.useRealTimers());

  const start = async (durations: Record<string, number> = { a: 5, b: 15, c: 10 }) => {
    vi.useFakeTimers();
    const ctx = await setup();
    const { useMediaStore } = await import('./useMediaStore');
    useMediaStore.setState({ items: Object.entries(durations).map(([id, duration]) => ({ ...media(id, 'advertisements'), duration })) });
    for (const id of Object.keys(durations)) ctx.playback.getState().addToQueue(id);
    return { ...ctx, useMediaStore, stopTimer: ctx.flow.runPlaybackTimer() };
  };
  const at = (playback: { getState: () => { currentIndex: number } }) => playback.getState().currentIndex;

  it('starts at the first item and rotates through the whole queue on each item\'s own duration, then starts over', async () => {
    const { flow, playback, stopTimer } = await start();
    playback.getState().next(); playback.getState().next(); // leave it part-way through
    flow.play(flow.QUEUE);
    expect(playback.getState()).toMatchObject({ currentIndex: 0, isPlaying: true, loop: true });
    vi.advanceTimersByTime(4999); expect(at(playback)).toBe(0);
    vi.advanceTimersByTime(1);    expect(at(playback)).toBe(1); // a: 5s
    vi.advanceTimersByTime(15000); expect(at(playback)).toBe(2); // b: 15s
    vi.advanceTimersByTime(10000); expect(at(playback)).toBe(0); // c: 10s, then back to the first
    vi.advanceTimersByTime(5000);  expect(at(playback)).toBe(1); // and round again
    stopTimer();
  });

  it("uses a sponsor's own time for an item in preference to the item's duration", async () => {
    const { flow, playback, useMediaStore, stopTimer } = await start({ a: 5, b: 15 });
    useMediaStore.setState({ sponsors: [{ id: 's', name: 'S', logoId: null, imageIds: ['a'], imageDurations: { a: 7 }, createdAt: 1 }] });
    flow.play(flow.QUEUE);
    vi.advanceTimersByTime(6999); expect(at(playback)).toBe(0);
    vi.advanceTimersByTime(1);    expect(at(playback)).toBe(1);
    stopTimer();
  });

  it('Next and Previous move at once, wrap round, and restart the new item\'s timer', async () => {
    const { flow, playback, stopTimer } = await start();
    flow.play(flow.QUEUE);
    vi.advanceTimersByTime(3000);
    playback.getState().prev();
    expect(at(playback)).toBe(2); // wraps back to the last item
    vi.advanceTimersByTime(9999); expect(at(playback)).toBe(2); // c's full 10s starts from the press
    vi.advanceTimersByTime(1);    expect(at(playback)).toBe(0);
    playback.getState().next();
    expect(at(playback)).toBe(1);
    playback.getState().next(); playback.getState().next();
    expect(at(playback)).toBe(0); // wraps forward
    stopTimer();
  });

  it('Stop cancels advancement and leaves one timer at most', async () => {
    const { flow, playback, stopTimer } = await start();
    const others = vi.getTimerCount(); // timers that belong to other parts of the app
    flow.play(flow.QUEUE);
    playback.getState().next(); playback.getState().next(); playback.getState().prev();
    expect(vi.getTimerCount() - others).toBe(1); // moving about never stacks timers
    flow.stopAll();
    expect(vi.getTimerCount() - others).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(playback.getState()).toMatchObject({ currentIndex: 1, isPlaying: false });
    stopTimer();
  });

  it('reports the seconds left on the item showing, restarting on Next and clearing on Stop', async () => {
    const { flow, playback, stopTimer } = await start();
    flow.play(flow.QUEUE);
    expect(flow.secondsUntilAdvance()).toBe(5);
    vi.advanceTimersByTime(2000);
    expect(flow.secondsUntilAdvance()).toBe(3);
    playback.getState().next();
    expect(flow.secondsUntilAdvance()).toBe(15);
    flow.stopAll();
    expect(flow.secondsUntilAdvance()).toBeNull();
    stopTimer();
  });

  it('does nothing with an empty queue', async () => {
    vi.useFakeTimers();
    const { flow, playback } = await setup();
    const stopTimer = flow.runPlaybackTimer();
    const others = vi.getTimerCount();
    flow.play(flow.QUEUE);
    expect(playback.getState()).toMatchObject({ queue: [], isPlaying: false });
    expect(vi.getTimerCount() - others).toBe(0);
    stopTimer();
  });
});
