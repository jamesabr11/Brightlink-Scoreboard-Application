import { describe, expect, it, vi } from 'vitest';
import { playWithSound } from './videoPlayback';

const rejection = (name: string) => Object.assign(new Error(name), { name });
const flush = () => new Promise((r) => setTimeout(r, 0));
const gestures = () => {
  const handlers = new Map<string, () => void>();
  return { handlers, win: { addEventListener: (e: string, h: () => void) => handlers.set(e, h), removeEventListener: (e: string) => handlers.delete(e) } as never };
};

describe('playWithSound', () => {
  it('plays with sound when the browser allows it', async () => {
    const video = { muted: true, play: vi.fn().mockResolvedValue(undefined) };
    const onFail = vi.fn();
    playWithSound(video, onFail, gestures().win);
    await flush();
    expect(video.muted).toBe(false);
    expect(onFail).not.toHaveBeenCalled();
  });

  it('blocked autoplay falls back to muted playback instead of failing, then unmutes on a click', async () => {
    const video = { muted: false, play: vi.fn().mockRejectedValueOnce(rejection('NotAllowedError')).mockResolvedValue(undefined) };
    const onFail = vi.fn();
    const { handlers, win } = gestures();
    playWithSound(video, onFail, win);
    await flush();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.muted).toBe(true);
    expect(onFail).not.toHaveBeenCalled(); // this was what stopped the queue and left only the game name on screen
    handlers.get('pointerdown')!();
    expect(video.muted).toBe(false);
  });

  it('reports a video that cannot play, but not an interrupted play()', async () => {
    const onFail = vi.fn();
    playWithSound({ muted: false, play: vi.fn().mockRejectedValue(rejection('AbortError')) }, onFail, gestures().win);
    await flush();
    expect(onFail).not.toHaveBeenCalled();
    playWithSound({ muted: false, play: vi.fn().mockRejectedValue(rejection('NotSupportedError')) }, onFail, gestures().win);
    await flush();
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('does nothing further once cancelled', async () => {
    const video = { muted: false, play: vi.fn().mockRejectedValue(rejection('NotAllowedError')) };
    const onFail = vi.fn();
    playWithSound(video, onFail, gestures().win)();
    await flush();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });
});
