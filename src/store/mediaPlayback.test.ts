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
  it('parses what the dropdown offers and rejects anything else', async () => {
    const { flow } = await setup();
    expect(flow.parseChoice('media:abc')).toEqual({ type: 'media', id: 'abc' });
    expect(flow.parseChoice('intro:away')).toEqual({ type: 'intro', side: 'away' });
    expect(flow.parseChoice('mode:stadium')).toEqual({ type: 'mode', mode: 'stadium' });
    for (const bad of ['', 'mode:intro', 'intro:both', 'media:', 'junk']) expect(flow.parseChoice(bad)).toBeNull();
  });

  it('playing media from the live scoreboard switches the display to fullscreen', async () => {
    const { flow, playback, presentation } = await setup();
    presentation.getState().setMode('live');
    flow.playChoice({ type: 'media', id: 'clip' });
    expect(presentation.getState().mode).toBe('fullscreen');
    expect(playback.getState()).toMatchObject({ queue: ['clip'], isPlaying: true });
  });

  it('playing media in a mode with a media area keeps that mode', async () => {
    const { flow, presentation } = await setup();
    presentation.getState().setMode('stadium');
    flow.playChoice({ type: 'media', id: 'clip' });
    expect(presentation.getState().mode).toBe('stadium');
  });

  it('choosing a mode loads its media; Live stops playback', async () => {
    const { flow, playback, presentation } = await setup();
    flow.playChoice({ type: 'mode', mode: 'stadium' });
    expect(presentation.getState().mode).toBe('stadium');
    expect(playback.getState()).toMatchObject({ queue: ['ad', 'clip'], isPlaying: true, loop: true });
    flow.playChoice({ type: 'mode', mode: 'live' });
    expect(presentation.getState().mode).toBe('live');
    expect(playback.getState().isPlaying).toBe(false);
  });

  it('starts an introduction for the chosen team', async () => {
    const { flow, intro, presentation, playback } = await setup();
    playback.getState().playNow('clip');
    flow.playChoice({ type: 'intro', side: 'away' });
    expect(presentation.getState().mode).toBe('intro');
    expect(intro.getState()).toMatchObject({ team: 'away', isPlaying: true });
    expect(playback.getState().isPlaying).toBe(false);
  });

  it('Stop ends media and introductions and returns to the live scoreboard, keeping the queue to resume', async () => {
    const { flow, playback, presentation, intro } = await setup();
    flow.playChoice({ type: 'media', id: 'clip' });
    playback.getState().addToQueue('ad');
    flow.stopAll();
    expect(presentation.getState().mode).toBe('live');
    expect(playback.getState()).toMatchObject({ isPlaying: false, queue: ['clip', 'ad'] });
    expect(intro.getState().isPlaying).toBe(false);
    flow.resumeQueue();
    expect(presentation.getState().mode).toBe('fullscreen');
    expect(playback.getState().isPlaying).toBe(true);
  });
});
