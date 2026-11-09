import { describe, expect, it } from 'vitest';
import { durationFor, queueForMode } from './usePlaybackStore';
import type { MediaItem, Sponsor } from '../types/media';

const item = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  id, name: id, kind: 'image', type: 'image/png', size: 1, width: 1, height: 1, naturalDuration: null,
  duration: 10, categoryId: 'sponsors', sponsorId: null, createdAt: 1, ...extra,
});
const sponsor: Sponsor = { id: 's', name: 'S', logoId: null, imageIds: ['v', 'a'], imageDurations: { a: 4 }, createdAt: 1 };

describe('Live Sponsor playback', () => {
  const items = [item('a'), item('v', { kind: 'video', duration: 15 }), item('z', { createdAt: 2 })];
  it('queues sponsor assets in their chosen order, then unlisted media', () => {
    expect(queueForMode('livesponsor', items, [sponsor])).toEqual(['v', 'a', 'z']);
  });
  it('uses the sponsor duration override, else the item duration', () => {
    expect(durationFor(items[0], [sponsor])).toBe(4);
    expect(durationFor(items[1], [sponsor])).toBe(15);
  });
});
