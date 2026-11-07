import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clampDuration } from '../lib/media';
import { followOtherTabs, newId, safeStorage } from '../lib/storage';
import type { MediaCategory, MediaItem, Sponsor } from '../types/media';

// Media metadata only (a few hundred bytes per item). The files themselves are
// in IndexedDB via lib/media.ts; callers delete those after removing an item.

export const FALLBACK_CATEGORY = 'promotions';

export const BUILT_IN_CATEGORIES: MediaCategory[] = [
  { id: 'sponsors', name: 'Sponsors', builtIn: true },
  { id: 'advertisements', name: 'Advertisements', builtIn: true },
  { id: 'pregame', name: 'Pregame', builtIn: true },
  { id: 'hype', name: 'Team Hype', builtIn: true },
  { id: 'intros', name: 'Player Introductions', builtIn: true },
  { id: 'halftime', name: 'Halftime', builtIn: true },
  { id: 'timeout', name: 'Timeout', builtIn: true },
  { id: FALLBACK_CATEGORY, name: 'General Promotions', builtIn: true },
];

export type ItemPatch = Partial<Pick<MediaItem, 'name' | 'categoryId' | 'duration' | 'sponsorId'>>;
export type SponsorPatch = Partial<Pick<Sponsor, 'name' | 'logoId'>>;

interface MediaState {
  items: MediaItem[];
  categories: MediaCategory[];
  sponsors: Sponsor[];
}

interface MediaStore extends MediaState {
  addItem: (item: MediaItem) => void;
  updateItem: (id: string, patch: ItemPatch) => void;
  removeItem: (id: string) => void;
  addCategory: (name: string) => string | null;
  renameCategory: (id: string, name: string) => boolean;
  removeCategory: (id: string) => void;
  addSponsor: (name: string) => string | null;
  updateSponsor: (id: string, patch: SponsorPatch) => boolean;
  removeSponsor: (id: string) => void;
}

const MAX_NAME = 80;
const cleanName = (name: unknown) => (typeof name === 'string' ? name.trim().slice(0, MAX_NAME) : '');
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

const cleanItem = (item: Partial<MediaItem> | null, categoryIds: Set<string>, sponsorIds: Set<string>): MediaItem | null => {
  if (typeof item?.id !== 'string' || (item.kind !== 'image' && item.kind !== 'video')) return null;
  const kind = item.kind;
  const naturalDuration = kind === 'video' && count(item.naturalDuration) > 0 ? count(item.naturalDuration) : null;
  return {
    id: item.id,
    name: cleanName(item.name) || 'Untitled',
    kind,
    type: typeof item.type === 'string' ? item.type : '',
    size: count(item.size),
    width: count(item.width),
    height: count(item.height),
    naturalDuration,
    duration: clampDuration({ kind, naturalDuration }, item.duration),
    categoryId: typeof item.categoryId === 'string' && categoryIds.has(item.categoryId) ? item.categoryId : FALLBACK_CATEGORY,
    sponsorId: typeof item.sponsorId === 'string' && sponsorIds.has(item.sponsorId) ? item.sponsorId : null,
    createdAt: count(item.createdAt),
  };
};

// localStorage is outside our control, so nothing from it is trusted as-is.
export const cleanMediaState = (saved: Partial<MediaState> | undefined): MediaState => {
  const custom = (Array.isArray(saved?.categories) ? saved.categories : [])
    .filter((c) => typeof c?.id === 'string' && !BUILT_IN_CATEGORIES.some((b) => b.id === c.id) && cleanName(c.name))
    .map((c) => ({ id: c.id, name: cleanName(c.name), builtIn: false }))
    .filter((c, i, all) => ![...BUILT_IN_CATEGORIES, ...all.slice(0, i)].some((other) => sameName(other.name, c.name)));
  const categories = [...BUILT_IN_CATEGORIES, ...custom];
  const rawSponsors = (Array.isArray(saved?.sponsors) ? saved.sponsors : []).filter((s) => typeof s?.id === 'string' && cleanName(s.name));
  const sponsorIds = new Set(rawSponsors.map((s) => s.id));
  const categoryIds = new Set(categories.map((c) => c.id));
  const items = (Array.isArray(saved?.items) ? saved.items : [])
    .map((item) => cleanItem(item, categoryIds, sponsorIds))
    .filter((item): item is MediaItem => item !== null);
  const images = new Set(items.filter((item) => item.kind === 'image').map((item) => item.id));
  const sponsors = rawSponsors.map((s) => ({
    id: s.id,
    name: cleanName(s.name),
    logoId: typeof s.logoId === 'string' && images.has(s.logoId) ? s.logoId : null,
    createdAt: count(s.createdAt),
  }));
  return { items, categories, sponsors };
};

const STORAGE_KEY = 'basketball-media';

export const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      ...cleanMediaState(undefined),

      addItem: (item) => {
        const { categories, sponsors, items } = get();
        const clean = cleanItem(item, new Set(categories.map((c) => c.id)), new Set(sponsors.map((s) => s.id)));
        if (clean && !items.some((other) => other.id === clean.id)) set({ items: [...items, clean] });
      },

      updateItem: (id, patch) => {
        const { items, categories, sponsors } = get();
        set({
          items: items.map((item) => {
            if (item.id !== id) return item;
            const name = patch.name === undefined ? item.name : cleanName(patch.name) || item.name;
            const categoryId = patch.categoryId && categories.some((c) => c.id === patch.categoryId) ? patch.categoryId : item.categoryId;
            const sponsorId = patch.sponsorId === undefined ? item.sponsorId : sponsors.some((s) => s.id === patch.sponsorId) ? patch.sponsorId : null;
            const duration = patch.duration === undefined ? item.duration : clampDuration(item, patch.duration);
            return { ...item, name, categoryId, sponsorId, duration };
          }),
        });
      },

      // A sponsor that used this image as its logo is left without one.
      removeItem: (id) => set({
        items: get().items.filter((item) => item.id !== id),
        sponsors: get().sponsors.map((s) => (s.logoId === id ? { ...s, logoId: null } : s)),
      }),

      addCategory: (name) => {
        const clean = cleanName(name);
        const { categories } = get();
        if (!clean || categories.some((c) => sameName(c.name, clean))) return null;
        const id = newId();
        set({ categories: [...categories, { id, name: clean, builtIn: false }] });
        return id;
      },

      renameCategory: (id, name) => {
        const clean = cleanName(name);
        const { categories } = get();
        const target = categories.find((c) => c.id === id);
        if (!target || target.builtIn || !clean || categories.some((c) => c.id !== id && sameName(c.name, clean))) return false;
        set({ categories: categories.map((c) => (c.id === id ? { ...c, name: clean } : c)) });
        return true;
      },

      // Its media isn't deleted: it moves to General Promotions.
      removeCategory: (id) => {
        const { categories, items } = get();
        if (!categories.some((c) => c.id === id && !c.builtIn)) return;
        set({
          categories: categories.filter((c) => c.id !== id),
          items: items.map((item) => (item.categoryId === id ? { ...item, categoryId: FALLBACK_CATEGORY } : item)),
        });
      },

      addSponsor: (name) => {
        const clean = cleanName(name);
        const { sponsors } = get();
        if (!clean || sponsors.some((s) => sameName(s.name, clean))) return null;
        const id = newId();
        set({ sponsors: [...sponsors, { id, name: clean, logoId: null, createdAt: Date.now() }] });
        return id;
      },

      updateSponsor: (id, patch) => {
        const { sponsors, items } = get();
        const name = patch.name === undefined ? undefined : cleanName(patch.name);
        if (name !== undefined && (!name || sponsors.some((s) => s.id !== id && sameName(s.name, name)))) return false;
        if (patch.logoId && !items.some((item) => item.id === patch.logoId && item.kind === 'image')) return false;
        set({
          sponsors: sponsors.map((s) => (s.id === id ? { ...s, ...(name !== undefined && { name }), ...(patch.logoId !== undefined && { logoId: patch.logoId }) } : s)),
        });
        return true;
      },

      // The sponsor's ads and logo stay in the library, no longer linked to anyone.
      removeSponsor: (id) => set({
        sponsors: get().sponsors.filter((s) => s.id !== id),
        items: get().items.map((item) => (item.sponsorId === id ? { ...item, sponsorId: null } : item)),
      }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: ({ items, categories, sponsors }) => ({ items, categories, sponsors }),
      merge: (saved, current) => ({ ...current, ...cleanMediaState(saved as Partial<MediaState> | undefined) }),
    }
  )
);

followOtherTabs(STORAGE_KEY, useMediaStore.persist.rehydrate);
