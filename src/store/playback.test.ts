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

  describe('operator queue', () => {
    it('addToQueue on an empty queue lines the item up without playing it', async () => {
      const store = await openTab();
      store.getState().addToQueue('a');
      expect(store.getState()).toMatchObject({ queue: ['a'], currentIndex: 0, isPlaying: false, loop: false });
    });

    it('addToQueue never interrupts what is playing', async () => {
      const store = await openTab();
      store.getState().playNow('a');
      store.getState().addToQueue('b');
      store.getState().addToQueue('c');
      expect(store.getState()).toMatchObject({ queue: ['a', 'b', 'c'], currentIndex: 0, isPlaying: true });
    });

    it('playNow slots the item in after the current one, or jumps to one already queued', async () => {
      const store = await openTab();
      store.getState().setQueue(['a', 'b', 'c'], true, false);
      store.getState().playNow('x');
      expect(store.getState()).toMatchObject({ queue: ['a', 'x', 'b', 'c'], currentIndex: 1, isPlaying: true });
      store.getState().playNow('c');
      expect(store.getState()).toMatchObject({ queue: ['a', 'x', 'b', 'c'], currentIndex: 3 });
    });

    it('a queue plays through and stops at the end instead of repeating', async () => {
      const store = await openTab();
      store.getState().playNow('a');
      store.getState().addToQueue('b');
      store.getState().advance();
      expect(store.getState().currentIndex).toBe(1);
      store.getState().advance();
      expect(store.getState()).toMatchObject({ currentIndex: 1, isPlaying: false });
      store.getState().next();
      store.getState().prev();
      store.getState().prev();
      expect(store.getState().currentIndex).toBe(0); // no wrapping past either end
    });

    it('removing items keeps the current position pointing at the same item', async () => {
      const store = await openTab();
      store.getState().setQueue(['a', 'b', 'c', 'd'], true, false);
      store.getState().next(); // b
      store.getState().removeFromQueue(0);
      expect(store.getState()).toMatchObject({ queue: ['b', 'c', 'd'], currentIndex: 0 });
      store.getState().removeFromQueue(2);
      expect(store.getState()).toMatchObject({ queue: ['b', 'c'], currentIndex: 0, isPlaying: true });
      store.getState().removeFromQueue(0); // the one on screen: the next slides in
      expect(store.getState()).toMatchObject({ queue: ['c'], currentIndex: 0, isPlaying: true });
      store.getState().removeFromQueue(0);
      expect(store.getState()).toMatchObject({ queue: [], currentIndex: -1, isPlaying: false });
    });

    it('removing the last item while it plays stops a queue but wraps a rotation', async () => {
      const store = await openTab();
      store.getState().setQueue(['a', 'b'], true, false);
      store.getState().next();
      store.getState().removeFromQueue(1);
      expect(store.getState()).toMatchObject({ queue: ['a'], currentIndex: 0, isPlaying: false });
      store.getState().setQueue(['a', 'b'], true);
      store.getState().next();
      store.getState().removeFromQueue(1);
      expect(store.getState()).toMatchObject({ queue: ['a'], currentIndex: 0, isPlaying: true });
    });

    it('ignores an out-of-range removal', async () => {
      const store = await openTab();
      store.getState().setQueue(['a']);
      store.getState().removeFromQueue(5);
      expect(store.getState().queue).toEqual(['a']);
    });
  });
});
