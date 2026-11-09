import { create } from 'zustand';
import type { PresentationMode } from '../types/presentation';
import type { MediaItem } from '../types/media';

// Playback queue state. No localStorage persist — playback resets on page reload,
// which is the right behaviour between game days. BroadcastChannel keeps the
// operator tab and display tab in sync.

export interface PlaybackState {
  queue: string[];        // ordered MediaItem ids
  currentIndex: number;  // -1 = nothing selected
  isPlaying: boolean;
}

export interface PlaybackStore extends PlaybackState {
  setQueue: (ids: string[], autoPlay?: boolean) => void;
  playNow: (id: string) => void;
  play: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  advance: () => void; // called by timed playback when an item's duration elapses
}

const initialState = (): PlaybackState => ({ queue: [], currentIndex: -1, isPlaying: false });

// Which categories' media belongs in each mode's slot.
const MODE_CATEGORIES: Partial<Record<PresentationMode, string[]>> = {
  pregame:  ['pregame', 'sponsors', 'advertisements'],
  halftime: ['halftime', 'sponsors', 'advertisements'],
  stadium:  ['advertisements', 'promotions', 'hype'],
  livesponsor: ['sponsors', 'advertisements'],
};

// Returns item ids sorted by creation time, filtered to the categories for mode.
export const queueForMode = (mode: PresentationMode, items: MediaItem[]): string[] => {
  const cats = MODE_CATEGORIES[mode];
  if (!cats) return [];
  return items
    .filter((item) => cats.includes(item.categoryId))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((item) => item.id);
};

const channel = new BroadcastChannel('playback_sync');

export const usePlaybackStore = create<PlaybackStore>()((set, get) => {
  channel.onmessage = (event) => set(event.data as Partial<PlaybackState>);

  const sync = (update: Partial<PlaybackState>) => {
    set(update);
    channel.postMessage(update);
  };

  return {
    ...initialState(),

    setQueue: (ids, autoPlay = false) => {
      const queue = [...ids];
      const currentIndex = queue.length > 0 ? 0 : -1;
      sync({ queue, currentIndex, isPlaying: autoPlay && queue.length > 0 });
    },

    playNow: (id) => sync({ queue: [id], currentIndex: 0, isPlaying: true }),

    play: () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      sync({ currentIndex: currentIndex < 0 ? 0 : currentIndex, isPlaying: true });
    },

    stop: () => sync({ isPlaying: false }),

    next: () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      sync({ currentIndex: (currentIndex + 1) % queue.length });
    },

    prev: () => {
      const { queue, currentIndex } = get();
      if (queue.length === 0) return;
      const prev = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
      sync({ currentIndex: prev });
    },

    // Advances to the next item and loops; wrapping stops if the queue is empty.
    advance: () => {
      const { queue, currentIndex, isPlaying } = get();
      if (!isPlaying || queue.length === 0) return;
      sync({ currentIndex: (currentIndex + 1) % queue.length });
    },
  };
});

if (typeof window !== 'undefined') {
  import.meta.hot?.dispose(() => channel.close());
}
