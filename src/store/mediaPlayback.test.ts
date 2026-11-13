import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaItem } from '../types/media';

class FakeChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage() {}
  close() {}
}

const media = (id: string, categoryId: string): MediaItem => ({
  id, name: id, kind: 'image', type: 'image/png', size: 1, width: 1, height: 1, naturalDuration: null,
  duration: 10, categoryId, sponsorId: null, createdAt: 1,
});

const setup = async () => {
  vi.resetModules();
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  const [flow, playback, presentation, intro, mediaStore] = await Promise.all([
    import('../lib/mediaPlayback'), import('./usePlaybackStore'), import('./usePresentationStore'), import('./useIntroStore'), import('./useMediaStore'),
  ]);
  mediaStore.useMediaStore.setState({ items: [media('ad', 'advertisements'), media('clip', 'hype')] });
  return { flow, playback: playback.usePlaybackStore, presentation: presentation.usePresentationStore, intro: intro.useIntroStore };
};

beforeEach(() => { localStorage.clear(); });

describe('operator media playback', () => {
  it('reads media values from the dropdown', async () => {
    const { flow } = await setup();
    expect(flow.mediaIdOf(flow.mediaValue('abc'))).toBe('abc');
    expect(flow.mediaIdOf(flow.ROTATION)).toBeNull();
    expect(flow.mediaIdOf('')).toBeNull();
  });

  it('a mode button only changes the display mode', async () => {
    const { flow, playback, presentation } = await setup();
    for (const mode of ['pregame', 'stadium', 'halftime', 'intro', 'fullscreen', 'live'] as const) {
      flow.selectMode(mode);
      expect(presentation.getState().mode).toBe(mode);
    }
    expect(playback.getState().queue).toEqual([]);
  });

  it('entering Live Sponsor with an empty queue starts the sponsor rotation, but never replaces a queue', async () => {
    const { flow, playback } = await setup();
    flow.selectMode('livesponsor');
    expect(playback.getState()).toMatchObject({ queue: ['ad'], isPlaying: true, loop: true });
    flow.selectMode('live');
    playback.getState().setQueue(['clip'], false, false);
    flow.selectMode('livesponsor');
    expect(playback.getState().queue).toEqual(['clip']);
  });

  it('Play Now plays the chosen media in the selected mode', async () => {
    const { flow, playback, presentation } = await setup();
    flow.selectMode('stadium');
    flow.play(flow.mediaValue('clip'));
    expect(presentation.getState().mode).toBe('stadium');
    expect(playback.getState()).toMatchObject({ queue: ['clip'], isPlaying: true });
  });

  it("Play with the mode's rotation chosen loads that mode's media", async () => {
    const { flow, playback } = await setup();
    flow.selectMode('stadium');
    flow.play(flow.ROTATION);
    expect(playback.getState()).toMatchObject({ queue: ['ad', 'clip'], isPlaying: true, loop: true });
  });

  it('Play with nothing chosen resumes the queue', async () => {
    const { flow, playback } = await setup();
    playback.getState().addToQueue('clip');
    flow.play('');
    expect(playback.getState().isPlaying).toBe(true);
  });

  it('Stop halts media and introductions, keeps the mode and the queue', async () => {
    const { flow, playback, presentation, intro } = await setup();
    flow.selectMode('intro');
    intro.getState().startIntro('home');
    playback.getState().playNow('clip');
    playback.getState().addToQueue('ad');
    flow.stopAll();
    expect(presentation.getState().mode).toBe('intro');
    expect(playback.getState()).toMatchObject({ isPlaying: false, queue: ['clip', 'ad'] });
    expect(intro.getState().isPlaying).toBe(false);
  });
});
