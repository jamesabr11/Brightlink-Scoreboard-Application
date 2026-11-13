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

/** Modes whose display has a media area. */
export const SHOWS_MEDIA: PresentationMode[] = ['pregame', 'stadium', 'halftime', 'livesponsor', 'fullscreen'];

export const modeRotation = (mode: PresentationMode) => {
  const { items, sponsors } = useMediaStore.getState();
  return queueForMode(mode, items, sponsors);
};

/** A display-mode button. Entering Live Sponsor with nothing queued starts the sponsor rotation. */
export const selectMode = (mode: PresentationMode) => {
  usePresentationStore.getState().setMode(mode);
  const playback = usePlaybackStore.getState();
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
