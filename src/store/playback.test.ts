import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queueForMode } from './usePlaybackStore';
import type { MediaItem } from '../types/media';

class FakeChannel {
  static open = new Set<FakeChannel>();
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() { FakeChannel.open.add(this); }
  postMessage(data: unknown) {
    for (const tab of FakeChannel.open) if (tab !== this) tab.onmessage?.({ data: structuredClone(data) });
  }
  close() { FakeChannel.open.delete(this); }
}

const openTab = async () => {
  vi.resetModules();
  return (await import('./usePlaybackStore')).usePlaybackStore;
};

const item = (id: string, categoryId: string, createdAt = 1): MediaItem => ({
  id, name: `Item ${id}`, kind: 'image', type: 'image/png',
  size: 1024, width: 1920, height: 1080, naturalDuration: null,
  duration: 10, categoryId, sponsorId: null, createdAt,
});

beforeEach(() => {
  FakeChannel.open.clear();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

describe('queueForMode', () => {
  const items: MediaItem[] = [
    item('a', 'pregame',       1),
    item('b', 'sponsors',      2),
    item('c', 'advertisements',3),
    item('d', 'halftime',      4),
    item('e', 'hype',          5),
    item('f', 'promotions',    6),
    item('g', 'timeout',       7),
  ];

  it('pregame: pregame + sponsors + advertisements, sorted by createdAt', () => {
    expect(queueForMode('pregame', items)).toEqual(['a', 'b', 'c']);
  });

  it('halftime: halftime + sponsors + advertisements', () => {
    expect(queueForMode('halftime', items)).toEqual(['b', 'c', 'd']);
  });

  it('stadium: advertisements + promotions + hype', () => {
    expect(queueForMode('stadium', items)).toEqual(['c', 'e', 'f']);
  });

  it('live: empty (operator picks manually)', () => {
    expect(queueForMode('live', items)).toEqual([]);
  });

  it('returns empty when no items match the mode', () => {
    expect(queueForMode('pregame', [item('z', 'timeout')])).toEqual([]);
  });
});

describe('usePlaybackStore', () => {
  it('starts idle', async () => {
    const store = await openTab();
    const { queue, currentIndex, isPlaying } = store.getState();
    expect(queue).toEqual([]);
    expect(currentIndex).toBe(-1);
    expect(isPlaying).toBe(false);
  });

  it('setQueue loads ids and positions at 0, no autoplay by default', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b', 'c']);
    const { queue, currentIndex, isPlaying } = store.getState();
    expect(queue).toEqual(['a', 'b', 'c']);
    expect(currentIndex).toBe(0);
    expect(isPlaying).toBe(false);
  });

  it('setQueue with autoPlay=true starts playing', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b'], true);
    expect(store.getState().isPlaying).toBe(true);
  });

  it('setQueue with empty array clears state', async () => {
    const store = await openTab();
    store.getState().setQueue(['a']);
    store.getState().setQueue([]);
    expect(store.getState().currentIndex).toBe(-1);
    expect(store.getState().isPlaying).toBe(false);
  });

  it('playNow sets a single-item queue and plays immediately', async () => {
    const store = await openTab();
    store.getState().playNow('x');
    expect(store.getState()).toMatchObject({ queue: ['x'], currentIndex: 0, isPlaying: true });
  });

  it('play starts from index 0 when nothing is selected', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b']);
    store.getState().play();
    expect(store.getState().isPlaying).toBe(true);
    expect(store.getState().currentIndex).toBe(0);
  });

  it('stop pauses without changing position', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b'], true);
    store.getState().next();
    store.getState().stop();
    expect(store.getState().isPlaying).toBe(false);
    expect(store.getState().currentIndex).toBe(1);
  });

  it('next wraps around to 0 at the end of the queue', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b', 'c']);
    store.getState().next();
    store.getState().next();
    expect(store.getState().currentIndex).toBe(2);
    store.getState().next(); // wraps
    expect(store.getState().currentIndex).toBe(0);
  });

  it('prev wraps from 0 to the last item', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b', 'c']);
    store.getState().prev();
    expect(store.getState().currentIndex).toBe(2);
  });

  it('advance moves forward while playing, wrapping at end', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b'], true);
    store.getState().advance();
    expect(store.getState().currentIndex).toBe(1);
    store.getState().advance(); // wraps
    expect(store.getState().currentIndex).toBe(0);
  });

  it('advance does nothing when not playing', async () => {
    const store = await openTab();
    store.getState().setQueue(['a', 'b']);
    store.getState().advance();
    expect(store.getState().currentIndex).toBe(0); // unchanged
  });

  it('syncs state between two tabs via BroadcastChannel', async () => {
    const tab1 = await openTab();
    const tab2 = await openTab();
    tab1.getState().playNow('synced');
    // BroadcastChannel delivers synchronously in FakeChannel
    expect(tab2.getState()).toMatchObject({ queue: ['synced'], currentIndex: 0, isPlaying: true });
  });
});
