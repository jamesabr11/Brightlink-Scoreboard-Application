// Starts a video with sound. A display tab nobody has clicked yet is not allowed to play unmuted video (the
// browser's autoplay policy rejects play() with NotAllowedError), so it falls back to playing muted and turns the
// sound on at the first click or key press. Only a video that genuinely cannot play is reported to onFail; an
// interrupted play() (AbortError, e.g. the item changed) is not a failure.
type PlayableVideo = Pick<HTMLVideoElement, 'play' | 'muted'>;
type Gestures = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export const playWithSound = (video: PlayableVideo, onFail: () => void, win: Gestures = window) => {
  let cancelled = false;
  const unmute = () => { video.muted = false; };
  const events = ['pointerdown', 'keydown'] as const;
  const forget = () => events.forEach((e) => win.removeEventListener(e, unmute));

  video.muted = false;
  video.play().catch((error: unknown) => {
    if (cancelled || (error as DOMException)?.name === 'AbortError') return;
    if ((error as DOMException)?.name !== 'NotAllowedError') return onFail();
    video.muted = true;
    video.play().then(() => { if (!cancelled) events.forEach((e) => win.addEventListener(e, unmute, { once: true })); }, () => { if (!cancelled) onFail(); });
  });

  return () => { cancelled = true; forget(); };
};
