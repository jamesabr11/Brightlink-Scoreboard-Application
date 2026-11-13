import { useIntroStore } from '../store/useIntroStore';
import { useMediaStore } from '../store/useMediaStore';
import { queueForMode, usePlaybackStore } from '../store/usePlaybackStore';
import { usePresentationStore } from '../store/usePresentationStore';
import type { RosterSide } from '../types/roster';
import type { PresentationMode } from '../types/presentation';

// The operator's single "what should the display show" choice. It drives the existing stores (presentation mode,
// playback queue, intro sequence); nothing here plays anything by itself.
export type Choice =
  | { type: 'mode'; mode: Exclude<PresentationMode, 'intro' | 'fullscreen'> }
  | { type: 'intro'; side: RosterSide }
  | { type: 'media'; id: string };

export const choiceValue = (choice: Choice) => (choice.type === 'mode' ? `mode:${choice.mode}` : choice.type === 'intro' ? `intro:${choice.side}` : `media:${choice.id}`);

export const parseChoice = (value: string): Choice | null => {
  const [type, rest] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)];
  if (type === 'media' && rest) return { type, id: rest };
  if (type === 'intro' && (rest === 'home' || rest === 'away')) return { type, side: rest };
  if (type === 'mode' && ['live', 'pregame', 'stadium', 'halftime', 'livesponsor'].includes(rest)) return { type, mode: rest as never };
  return null;
};

// Display modes that have a media area; any other mode shows media by switching to Fullscreen.
const SHOWS_MEDIA: PresentationMode[] = ['pregame', 'stadium', 'halftime', 'livesponsor', 'fullscreen'];

export const showMedia = () => {
  const { mode, setMode } = usePresentationStore.getState();
  if (!SHOWS_MEDIA.includes(mode)) setMode('fullscreen');
};

export const playChoice = (choice: Choice) => {
  const { setMode } = usePresentationStore.getState();
  const playback = usePlaybackStore.getState();
  const intro = useIntroStore.getState();
  if (choice.type === 'media') {
    intro.stop();
    showMedia();
    playback.playNow(choice.id);
  } else if (choice.type === 'intro') {
    playback.stop();
    setMode('intro');
    intro.startIntro(choice.side);
  } else {
    intro.stop();
    setMode(choice.mode);
    if (choice.mode === 'live') return playback.stop();
    // A mode brings its own media: the pregame, halftime, stadium or sponsor rotation.
    const { items, sponsors } = useMediaStore.getState();
    const ids = queueForMode(choice.mode, items, sponsors);
    if (ids.length > 0) playback.setQueue(ids, true);
    else playback.stop();
  }
};

/** Starts the queue from where it is (the Play button with no new choice made). */
export const resumeQueue = () => {
  if (usePlaybackStore.getState().queue.length === 0) return;
  useIntroStore.getState().stop();
  showMedia();
  usePlaybackStore.getState().play();
};

/** Stops the media and any introduction, and takes the display back to the live scoreboard. */
export const stopAll = () => {
  usePlaybackStore.getState().stop();
  useIntroStore.getState().stop();
  usePresentationStore.getState().setMode('live');
};
