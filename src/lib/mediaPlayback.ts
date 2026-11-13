import { useIntroStore } from '../store/useIntroStore';
import { useMediaStore } from '../store/useMediaStore';
import { durationFor, queueForMode, usePlaybackStore } from '../store/usePlaybackStore';
import { usePresentationStore } from '../store/usePresentationStore';
import type { PresentationMode } from '../types/presentation';

// Operator media playback. It only drives the existing stores (presentation mode, playback queue, intro
// sequence); nothing here plays anything by itself.

/** Dropdown value for the selected mode's own media rotation (pregame ads, sponsors...). */
export const ROTATION = 'rotation';
/** Dropdown value for Rotate Through Queue: play the operator's queue from the top, round and round. */
export const QUEUE = 'queue';
export const mediaValue = (id: string) => `media:${id}`;
export const mediaIdOf = (value: string) => (value.startsWith('media:') ? value.slice(6) : null);

export const modeRotation = (mode: PresentationMode) => {
  const { items, sponsors } = useMediaStore.getState();
  return queueForMode(mode, items, sponsors);
};

/** Live and Introductions need no media choice, so the Media Playback section is hidden for them. */
export const needsMedia = (mode: PresentationMode) => mode !== 'live' && mode !== 'intro';

/**
 * A display-mode button. Live and Introductions have no media area, so any media still playing is stopped (its
 * timer lives in the Media Playback section, which is hidden there). Entering Custom Layout with nothing queued
 * starts the sponsor rotation.
 */
export const selectMode = (mode: PresentationMode) => {
  usePresentationStore.getState().setMode(mode);
  const playback = usePlaybackStore.getState();
  if (!needsMedia(mode)) playback.stop();
  if (mode === 'livesponsor' && playback.queue.length === 0) {
    const ids = modeRotation(mode);
    if (ids.length > 0) playback.setQueue(ids, true);
  }
};

/** Play: the chosen media now, the mode's rotation, or (nothing chosen) whatever is queued. */
export const play = (value: string) => {
  const playback = usePlaybackStore.getState();
  const id = mediaIdOf(value);
  if (id) return playback.playNow(id);
  if (value === QUEUE) return playback.playQueue();
  if (value === ROTATION) {
    const ids = modeRotation(usePresentationStore.getState().mode);
    if (ids.length > 0) playback.setQueue(ids, true);
    return;
  }
  playback.play();
};

/** Stops the media and any introduction; the display mode is left as the operator set it. */
export const stopAll = () => {
  usePlaybackStore.getState().stop();
  useIntroStore.getState().stop();
};

/** Custom Layout's Play: (re)start its sponsor rotation, or resume whatever is queued if it has none. */
export const playCustomLayout = () => {
  const playback = usePlaybackStore.getState();
  const ids = modeRotation('livesponsor');
  if (ids.length > 0) playback.setQueue(ids, true);
  else playback.play();
};

/**
 * The one timer that moves playback on: when the item on screen has had its time (a sponsor's own override, else the
 * item's duration) it calls advance, which wraps a rotation and stops at the end of a one-off queue. It re-arms
 * whenever the item or position changes (Next, Previous, a new Play) and clears on Stop. Runs in the operator tab
 * only, so the display never has a second timer; the display just follows the synced state.
 */
export const runPlaybackTimer = () => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let armed = '';
  const arm = () => {
    const { queue, currentIndex, isPlaying } = usePlaybackStore.getState();
    const { items, sponsors } = useMediaStore.getState();
    const id = isPlaying ? queue[currentIndex] : undefined;
    const item = id ? items.find((i) => i.id === id) : undefined;
    const key = item ? `${currentIndex}:${item.id}` : '';
    if (key === armed) return; // the same item is still showing: keep its timer running
    armed = key;
    clearTimeout(timer);
    if (!item) return;
    timer = setTimeout(() => { armed = ''; usePlaybackStore.getState().advance(); }, durationFor(item, sponsors) * 1000);
  };
  arm();
  const unsubscribe = usePlaybackStore.subscribe(arm);
  return () => { unsubscribe(); clearTimeout(timer); };
};
