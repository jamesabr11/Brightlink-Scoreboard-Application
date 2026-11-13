import { describe, expect, it } from 'vitest';
import { mediaUsedBy } from './mediaUsage';
import { DEFAULT_SPONSOR_LAYOUT } from '../store/usePresentationStore';
import { useMediaStore } from '../store/useMediaStore';
import { usePresentationStore } from '../store/usePresentationStore';
import type { Sponsor } from '../types/media';

const sponsor = (over: Partial<Sponsor>): Sponsor => ({ id: 's', name: 'Acme', logoId: null, imageIds: [], imageDurations: {}, createdAt: 0, ...over });
const layout = (media: string[][]) => ({ ...DEFAULT_SPONSOR_LAYOUT, media });

describe('mediaUsedBy', () => {
  it('reports sponsor and layout users, and nothing for unused media', () => {
    const layouts = { sponsorLayout: layout([['a'], [], []]), savedLayouts: [{ id: 'l', name: 'Game', layout: layout([[], ['a'], []]), theme: {} as never }] };
    expect(mediaUsedBy('a', [sponsor({ logoId: 'a', imageIds: ['a'] })], layouts)).toEqual(['Acme logo', 'Acme rotation', 'the current layout', 'saved layout "Game"']);
    expect(mediaUsedBy('b', [sponsor({})], layouts)).toEqual([]);
  });
});

describe('deleting media cleans every reference', () => {
  it('drops ids from sponsors and layouts', () => {
    useMediaStore.setState({ sponsors: [sponsor({ logoId: 'a', imageIds: ['a', 'b'], imageDurations: { a: 5, b: 6 } })] });
    usePresentationStore.setState({ sponsorLayout: layout([['a', 'b'], [], []]) });
    useMediaStore.getState().removeItems(['a']);
    usePresentationStore.getState().removeMedia(['a']);
    expect(useMediaStore.getState().sponsors[0]).toMatchObject({ logoId: null, imageIds: ['b'], imageDurations: { b: 6 } });
    expect(usePresentationStore.getState().sponsorLayout.media[0]).toEqual(['b']);
  });
});
