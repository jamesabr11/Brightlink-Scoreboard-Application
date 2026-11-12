import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaItem } from '../types/media';

const STORAGE_KEY = 'basketball-media';

// Every import is a fresh store, like a refreshed tab reading localStorage.
const openTab = async () => {
  vi.resetModules();
  return (await import('./useMediaStore')).useMediaStore;
};

const image = (id: string, extra: Partial<MediaItem> = {}): MediaItem => ({
  id, name: `Image ${id}`, kind: 'image', type: 'image/png', size: 2048, width: 1920, height: 1080,
  naturalDuration: null, duration: 10, categoryId: 'promotions', sponsorId: null, createdAt: 1, ...extra,
});
const video = (id: string, extra: Partial<MediaItem> = {}): MediaItem =>
  image(id, { kind: 'video', type: 'video/mp4', naturalDuration: 14.2, duration: 15, ...extra });

beforeEach(() => localStorage.clear());

describe('media library', () => {
  it('starts with the eight built-in categories', async () => {
    const { categories, items, sponsors } = (await openTab()).getState();
    expect(categories.map((c) => c.name)).toEqual(['Sponsors', 'Advertisements', 'Pregame', 'Team Hype', 'Player Introductions', 'Halftime', 'Timeout', 'General Promotions']);
    expect(items).toEqual([]);
    expect(sponsors).toEqual([]);
  });

  it('keeps media metadata across a refresh, and no file content', async () => {
    const store = await openTab();
    store.getState().addItem(image('a', { categoryId: 'hype' }));
    store.getState().addItem(video('b'));
    const after = (await openTab()).getState();
    expect(after.items.map((i) => [i.id, i.categoryId])).toEqual([['a', 'hype'], ['b', 'promotions']]);
    expect(localStorage.getItem(STORAGE_KEY)!.length).toBeLessThan(2000);
  });

  it('ignores adding the same item twice', async () => {
    const store = await openTab();
    store.getState().addItem(image('a'));
    store.getState().addItem(image('a'));
    expect(store.getState().items).toHaveLength(1);
  });

  it('renames, recategorizes and retimes items within limits', async () => {
    const store = await openTab();
    store.getState().addItem(image('a'));
    store.getState().addItem(video('v'));
    const update = store.getState().updateItem;
    update('a', { name: '  Senior Night  ', categoryId: 'halftime', duration: 0 });
    update('a', { name: '   ', categoryId: 'no-such-category' });
    update('v', { duration: 90 });
    const [a, v] = store.getState().items;
    expect(a).toMatchObject({ name: 'Senior Night', categoryId: 'halftime', duration: 1 });
    expect(v.duration).toBe(15);
  });

  it('deleting an image clears it as a sponsor logo', async () => {
    const store = await openTab();
    store.getState().addItem(image('logo'));
    const id = store.getState().addSponsor('Main Street Pizza')!;
    store.getState().updateSponsor(id, { logoId: 'logo' });
    store.getState().removeItem('logo');
    expect(store.getState().sponsors[0].logoId).toBeNull();
  });
});

describe('categories', () => {
  it('adds custom categories with unique names', async () => {
    const store = await openTab();
    expect(store.getState().addCategory('Senior Night')).toBeTruthy();
    expect(store.getState().addCategory('senior night')).toBeNull();
    expect(store.getState().addCategory('SPONSORS')).toBeNull();
    expect(store.getState().addCategory('   ')).toBeNull();
    expect(store.getState().categories).toHaveLength(9);
  });

  it('protects the built-in categories', async () => {
    const store = await openTab();
    expect(store.getState().renameCategory('sponsors', 'Partners')).toBe(false);
    store.getState().removeCategory('sponsors');
    expect(store.getState().categories[0].name).toBe('Sponsors');
  });

  it('moves media to General Promotions when its category is deleted', async () => {
    const store = await openTab();
    const id = store.getState().addCategory('Senior Night')!;
    store.getState().addItem(image('a', { categoryId: id }));
    expect(store.getState().renameCategory(id, 'Senior Day')).toBe(true);
    store.getState().removeCategory(id);
    expect(store.getState().items[0].categoryId).toBe('promotions');
    expect(store.getState().categories.some((c) => c.id === id)).toBe(false);
  });
});

describe('sponsors', () => {
  it('adds, renames and links advertisements', async () => {
    const store = await openTab();
    const id = store.getState().addSponsor('Main Street Pizza')!;
    expect(store.getState().addSponsor('main street pizza')).toBeNull();
    store.getState().addItem(image('ad', { sponsorId: id }));
    store.getState().addItem(image('other', { sponsorId: 'gone' }));
    expect(store.getState().items.map((i) => i.sponsorId)).toEqual([id, null]);
    expect(store.getState().updateSponsor(id, { name: 'Main St. Pizza' })).toBe(true);
    expect(store.getState().updateSponsor(id, { name: '' })).toBe(false);
    expect(store.getState().sponsors[0].name).toBe('Main St. Pizza');
  });

  it('only accepts an image as a logo', async () => {
    const store = await openTab();
    const id = store.getState().addSponsor('Lincoln Bank')!;
    store.getState().addItem(video('v'));
    store.getState().addItem(image('logo'));
    expect(store.getState().updateSponsor(id, { logoId: 'v' })).toBe(false);
    expect(store.getState().updateSponsor(id, { logoId: 'logo' })).toBe(true);
    expect(store.getState().sponsors[0].logoId).toBe('logo');
  });

  it('keeps its media in the library when a sponsor is removed', async () => {
    const store = await openTab();
    const id = store.getState().addSponsor('Lincoln Bank')!;
    store.getState().addItem(image('ad', { sponsorId: id }));
    store.getState().removeSponsor(id);
    expect(store.getState().sponsors).toEqual([]);
    expect(store.getState().items[0]).toMatchObject({ id: 'ad', sponsorId: null });
  });
});

describe('saved data', () => {
  it('repairs corrupted metadata instead of failing', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 0,
      state: {
        categories: [{ id: 'sponsors', name: 'Hijacked', builtIn: false }, { id: 'c1', name: 'Senior Night' }, { id: 'c2', name: 'senior night' }, { id: 'c3', name: '' }],
        sponsors: [{ id: 's1', name: 'Pizza', logoId: 'v' }, { id: 's2', name: '' }, null],
        items: [
          null,
          { id: 'x', kind: 'gif' },
          { ...image('a'), categoryId: 'deleted', sponsorId: 's2', duration: -5 },
          { ...video('v'), naturalDuration: 'long', duration: 9999 },
        ],
      },
    }));
    const { categories, sponsors, items } = (await openTab()).getState();
    expect(categories.map((c) => c.name)).toContain('Sponsors');
    expect(categories.filter((c) => !c.builtIn).map((c) => c.id)).toEqual(['c1']);
    expect(sponsors).toEqual([{ id: 's1', name: 'Pizza', logoId: null, imageIds: [], imageDurations: {}, createdAt: 0 }]);
    expect(items.map((i) => i.id)).toEqual(['a', 'v']);
    expect(items[0]).toMatchObject({ categoryId: 'promotions', sponsorId: null, duration: 1 });
    expect(items[1]).toMatchObject({ naturalDuration: null, duration: 600 });
  });
});

describe('assigning media to a sponsor', () => {
  it('creates the sponsor, joins its rotation, and moves between sponsors', async () => {
    const store = await openTab();
    store.getState().addItem(image('a'));
    expect(store.getState().assignSponsor('a', 'Main Street Pizza')).toBe(true);
    let { sponsors } = store.getState();
    expect(store.getState().items[0].sponsorId).toBe(sponsors[0].id);
    expect(sponsors).toHaveLength(1);
    expect(sponsors[0].imageIds).toEqual(['a']);

    store.getState().assignSponsor('a', 'main street pizza'); // same sponsor, any case
    expect(store.getState().sponsors).toHaveLength(1);
    expect(store.getState().sponsors[0].imageIds).toEqual(['a']);

    store.getState().assignSponsor('a', 'Acme');
    ({ sponsors } = store.getState());
    expect(sponsors.find((s) => s.name === 'Main Street Pizza')!.imageIds).toEqual([]);
    expect(sponsors.find((s) => s.name === 'Acme')!.imageIds).toEqual(['a']);

    store.getState().assignSponsor('a', '');
    expect(store.getState().items[0].sponsorId).toBeNull();
    expect(store.getState().sponsors.every((s) => s.imageIds.length === 0)).toBe(true);
  });
});
