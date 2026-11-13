import { create } from 'zustand';
import type { PresentationMode } from '../types/presentation';
import type { MediaItem, Sponsor } from '../types/media';

// Playback queue state. No localStorage persist — playback resets on page reload,
// which is the right behaviour between game days. BroadcastChannel keeps the
// operator tab and display tab in sync.

export interface PlaybackState {
  queue: string[];        // ordered MediaItem ids
  currentIndex: number;  // -1 = nothing selected
  isPlaying: boolean;
  // A mode rotation (sponsors, ads) wraps round forever; a queue the operator builds plays through and stops.
  loop: boolean;
}

export interface PlaybackStore extends PlaybackState {
  setQueue: (ids: string[], autoPlay?: boolean, loop?: boolean) => void;
  playNow: (id: string) => void;
  addToQueue: (id: string) => void;
  removeFromQueue: (index: number) => void;
  play: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  advance: () => void; // called by timed playback when an item's duration elapses
}

const initialState = (): PlaybackState => ({ queue: [], currentIndex: -1, isPlaying: false, loop: true });

// Which categories' media belongs in each mode's slot.
const MODE_CATEGORIES: Partial<Record<PresentationMode, string[]>> = {
  pregame:  ['pregame', 'sponsors', 'advertisements'],
  halftime: ['halftime', 'sponsors', 'advertisements'],
  stadium:  ['advertisements', 'promotions', 'hype'],
  livesponsor: ['sponsors', 'advertisements'],
};

// Returns item ids sorted by creation time, filtered to the categories for mode.
// Live Sponsor follows each sponsor's own ordered asset list; media in the
// sponsor categories that no sponsor lists is appended after.
export const queueForMode = (mode: PresentationMode, items: MediaItem[], sponsors: Sponsor[] = []): string[] => {
  const cats = MODE_CATEGORIES[mode];
  if (!cats) return [];
  if (mode === 'livesponsor') {
    const ids = new Set(items.map((item) => item.id));
    const ordered = [...sponsors].sort((a, b) => a.createdAt - b.createdAt).flatMap((s) => s.imageIds.filter((id) => ids.has(id)));
    const listed = new Set(ordered);
    const rest = items.filter((i) => cats.includes(i.categoryId) && !listed.has(i.id)).sort((a, b) => a.createdAt - b.createdAt).map((i) => i.id);
    return [...new Set([...ordered, ...rest])];
  }
  return items
    .filter((item) => cats.includes(item.categoryId))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((item) => item.id);
};

// Seconds on screen: a sponsor's per-asset override wins over the item's own duration.
export const durationFor = (item: MediaItem, sponsors: Sponsor[]): number =>
  sponsors.find((s) => s.imageIds.includes(item.id) && s.imageDurations[item.id])?.imageDurations[item.id] ?? item.duration;

const channel = new BroadcastChannel('playback_sync');

export const usePlaybackStore = create<PlaybackStore>()((set, get) => {
  channel.onmessage = (event) => set(event.data as Partial<PlaybackState>);

  const sync = (update: Partial<PlaybackState>) => {
    set(update);
    channel.postMessage(update);
  };

  return {
    ...initialState(),

    setQueue: (ids, autoPlay = false, loop = true) => {
      const queue = [...ids];
      const currentIndex = queue.length > 0 ? 0 : -1;
      sync({ queue, currentIndex, isPlaying: autoPlay && queue.length > 0, loop });
    },

    // Plays the item straight away. Already queued: jump to it. Otherwise it goes in right after the item on
    // screen, so the rest of the queue carries on from there. With nothing queued it is a queue of one.
    playNow: (id) => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return sync({ queue: [id], currentIndex: 0, isPlaying: true, loop: false });
      const at = queue.indexOf(id);
      if (at >= 0) return sync({ currentIndex: at, isPlaying: true });
      const insertAt = currentIndex < 0 ? queue.length : currentIndex + 1;
      sync({ queue: [...queue.slice(0, insertAt), id, ...queue.slice(insertAt)], currentIndex: insertAt, isPlaying: true });
    },

    // Never starts, stops or moves playback: an empty queue just gets its first item lined up.
    addToQueue: (id) => {
      const { queue } = get();
      if (queue.length === 0) sync({ queue: [id], currentIndex: 0, isPlaying: false, loop: false });
      else sync({ queue: [...queue, id] });
    },

    removeFromQueue: (index) => {
      const { queue, currentIndex, loop } = get();
      if (index < 0 || index >= queue.length) return;
      const rest = queue.filter((_, i) => i !== index);
      if (rest.length === 0) return sync({ queue: [], currentIndex: -1, isPlaying: false });
      if (index < currentIndex) return sync({ queue: rest, currentIndex: currentIndex - 1 });
      if (index > currentIndex) return sync({ queue: rest });
      // The item on screen was removed: the next one slides into its place.
      if (index < rest.length) return sync({ queue: rest });
      sync(loop ? { queue: rest, currentIndex: 0 } : { queue: rest, currentIndex: rest.length - 1, isPlaying: false });
    },

    play: () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      sync({ currentIndex: currentIndex < 0 ? 0 : currentIndex, isPlaying: true });
    },

    stop: () => sync({ isPlaying: false }),

    next: () => {
      const { queue, currentIndex, loop } = get();
      if (queue.length === 0 || (!loop && currentIndex >= queue.length - 1)) return;
      sync({ currentIndex: (currentIndex + 1) % queue.length });
    },

    prev: () => {
      const { queue, currentIndex, loop } = get();
      if (queue.length === 0 || (!loop && currentIndex <= 0)) return;
      sync({ currentIndex: currentIndex <= 0 ? queue.length - 1 : currentIndex - 1 });
    },

    // Called when the item's time is up: on to the next, wrapping a rotation or stopping at the end of a queue.
    advance: () => {
      const { queue, currentIndex, isPlaying, loop } = get();
      if (!isPlaying || queue.length === 0) return;
      if (!loop && currentIndex >= queue.length - 1) return sync({ isPlaying: false });
      sync({ currentIndex: (currentIndex + 1) % queue.length });
    },
  };
});

if (typeof window !== 'undefined') {
  import.meta.hot?.dispose(() => channel.close());
}
