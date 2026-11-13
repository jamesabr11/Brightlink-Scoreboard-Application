import { useIntroStore } from '../store/useIntroStore';
import { useMediaStore } from '../store/useMediaStore';
import { queueForMode, usePlaybackStore } from '../store/usePlaybackStore';
import { usePresentationStore } from '../store/usePresentationStore';
import type { PresentationMode } from '../types/presentation';

// Operator media playback. It only drives the existing stores (presentation mode, playback queue, intro
// sequence); nothing here plays anything by itself.

/** Dropdown value for the selected mode's own media rotation (pregame ads, sponsors...). */
export const ROTATION = 'rotation';
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
