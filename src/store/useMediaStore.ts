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
export type SponsorPatch = Partial<Pick<Sponsor, 'name' | 'logoId' | 'imageIds' | 'imageDurations'>>;

// Get media IDs for a sponsor in display order: logo first, then ads
export const getSponsorMediaIds = (sponsor: Sponsor): string[] => {
  const result: string[] = [];
  if (sponsor.logoId) result.push(sponsor.logoId);
  result.push(...sponsor.imageIds);
  return result;
};

// The sponsor an item belongs to: its own tag, else the sponsor whose rotation includes it.
export const sponsorOf = (item: MediaItem, sponsors: Sponsor[]): Sponsor | undefined =>
  sponsors.find((s) => s.id === item.sponsorId) ?? sponsors.find((s) => s.imageIds.includes(item.id));

interface MediaState {
  items: MediaItem[];
  categories: MediaCategory[];
  sponsors: Sponsor[];
}

interface MediaStore extends MediaState {
  addItem: (item: MediaItem) => void;
  updateItem: (id: string, patch: ItemPatch) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
  addCategory: (name: string) => string | null;
  renameCategory: (id: string, name: string) => boolean;
  removeCategory: (id: string) => void;
  addSponsor: (name: string) => string | null;
  updateSponsor: (id: string, patch: SponsorPatch) => boolean;
  removeSponsor: (id: string) => void;
  assignSponsor: (itemId: string, name: string) => boolean;
  addSponsorImage: (sponsorId: string, mediaId: string) => void;
  removeSponsorImage: (sponsorId: string, mediaId: string) => void;
  moveSponsorImage: (sponsorId: string, fromIndex: number, toIndex: number) => void;
  setSponsorImageDuration: (sponsorId: string, mediaId: string, duration: number) => void;
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
  const savedCategories = Array.isArray(saved?.categories) ? saved.categories : [];
  // Built-in categories keep their ids (playback queues use them) but may carry a name the operator chose.
  const builtIns: MediaCategory[] = [];
  for (const b of BUILT_IN_CATEGORIES) {
    const name = cleanName(savedCategories.find((c) => c?.id === b.id && c.builtIn === true)?.name);
    builtIns.push(name && !builtIns.some((o) => sameName(o.name, name)) ? { ...b, name } : b);
  }
  const custom = savedCategories
    .filter((c) => typeof c?.id === 'string' && !BUILT_IN_CATEGORIES.some((b) => b.id === c.id) && cleanName(c.name))
    .map((c) => ({ id: c.id, name: cleanName(c.name), builtIn: false }))
    .filter((c, i, all) => ![...builtIns, ...all.slice(0, i)].some((other) => sameName(other.name, c.name)));
  const categories = [...builtIns, ...custom];
  const rawSponsors = (Array.isArray(saved?.sponsors) ? saved.sponsors : []).filter((s) => typeof s?.id === 'string' && cleanName(s.name));
  const sponsorIds = new Set(rawSponsors.map((s) => s.id));
  const categoryIds = new Set(categories.map((c) => c.id));
  const items = (Array.isArray(saved?.items) ? saved.items : [])
    .map((item) => cleanItem(item, categoryIds, sponsorIds))
    .filter((item): item is MediaItem => item !== null);
  const images = new Set(items.filter((item) => item.kind === 'image').map((item) => item.id));
  const assets = new Set(items.map((item) => item.id)); // sponsor rotation may include videos
  const sponsors = rawSponsors.map((s) => ({
    id: s.id,
    name: cleanName(s.name),
    logoId: typeof s.logoId === 'string' && images.has(s.logoId) ? s.logoId : null,
    imageIds: Array.isArray(s.imageIds) ? s.imageIds.filter((id: unknown) => typeof id === 'string' && assets.has(id)) : [],
    imageDurations: typeof s.imageDurations === 'object' && s.imageDurations !== null
      ? Object.fromEntries(Object.entries(s.imageDurations).filter(([id, dur]) => assets.has(id) && typeof dur === 'number' && dur > 0))
      : {},
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

      // A sponsor that used a removed image as its logo is left without one, and its rotation drops the item.
      removeItem: (id) => get().removeItems([id]),

      removeItems: (ids) => {
        const gone = new Set(ids);
        set({
          items: get().items.filter((item) => !gone.has(item.id)),
          sponsors: get().sponsors.map((s) => ({
            ...s,
            logoId: s.logoId && gone.has(s.logoId) ? null : s.logoId,
            imageIds: s.imageIds.filter((id) => !gone.has(id)),
            imageDurations: Object.fromEntries(Object.entries(s.imageDurations).filter(([id]) => !gone.has(id))),
          })),
        });
      },

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
        if (!target || !clean || categories.some((c) => c.id !== id && sameName(c.name, clean))) return false;
        set({ categories: categories.map((c) => (c.id === id ? { ...c, name: clean } : c)) });
        return true;
      },

      // Only custom categories can be deleted: the built-in ones feed the playback queues. Its media isn't deleted: it moves to General Promotions.
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
        set({ sponsors: [...sponsors, { id, name: clean, logoId: null, imageIds: [], imageDurations: {}, createdAt: Date.now() }] });
        return id;
      },

      updateSponsor: (id, patch) => {
        const { sponsors, items } = get();
        const name = patch.name === undefined ? undefined : cleanName(patch.name);
        if (name !== undefined && (!name || sponsors.some((s) => s.id !== id && sameName(s.name, name)))) return false;
        if (patch.logoId && !items.some((item) => item.id === patch.logoId && item.kind === 'image')) return false;
        set({
          sponsors: sponsors.map((s) => {
            if (s.id !== id) return s;
            const updates: Partial<Sponsor> = {};
            if (name !== undefined) updates.name = name;
            if (patch.logoId !== undefined) updates.logoId = patch.logoId;
            if (patch.imageIds !== undefined) {
              updates.imageIds = patch.imageIds.filter((id: string) => items.some((item) => item.id === id));
            }
            if (patch.imageDurations !== undefined) {
              updates.imageDurations = Object.fromEntries(
                Object.entries(patch.imageDurations).filter(([id, dur]) => items.some((item) => item.id === id) && typeof dur === 'number' && dur > 0)
              );
            }
            return { ...s, ...updates };
          }),
        });
        return true;
      },

      // The sponsor's ads and logo stay in the library, no longer linked to anyone.
      removeSponsor: (id) => set({
        sponsors: get().sponsors.filter((s) => s.id !== id),
        items: get().items.map((item) => (item.sponsorId === id ? { ...item, sponsorId: null } : item)),
      }),

      // Designate an item as a sponsor's media by sponsor name (empty clears it). A new
      // name creates the sponsor; the item joins that sponsor's rotation and leaves any previous one.
      assignSponsor: (itemId, name) => {
        const { items, sponsors } = get();
        if (!items.some((item) => item.id === itemId)) return false;
        const clean = cleanName(name);
        let target = sponsors.find((s) => sameName(s.name, clean));
        let list = sponsors;
        if (clean && !target) {
          target = { id: newId(), name: clean, logoId: null, imageIds: [], imageDurations: {}, createdAt: Date.now() };
          list = [...sponsors, target];
        }
        const leave = (s: Sponsor): Sponsor => {
          if (!s.imageIds.includes(itemId)) return s;
          const imageDurations = { ...s.imageDurations };
          delete imageDurations[itemId];
          return { ...s, imageIds: s.imageIds.filter((id) => id !== itemId), imageDurations };
        };
        set({
          sponsors: list.map((s) => (s.id === target?.id ? { ...s, imageIds: s.imageIds.includes(itemId) ? s.imageIds : [...s.imageIds, itemId] } : leave(s))),
          items: items.map((item) => (item.id === itemId ? { ...item, sponsorId: target?.id ?? null } : item)),
        });
        return true;
      },

      addSponsorImage: (sponsorId, mediaId) => {
        const { sponsors, items } = get();
        if (!items.some((item) => item.id === mediaId)) return;
        set({
          sponsors: sponsors.map((s) => {
            if (s.id !== sponsorId || s.imageIds.includes(mediaId)) return s;
            return { ...s, imageIds: [...s.imageIds, mediaId] };
          }),
        });
      },

      removeSponsorImage: (sponsorId, mediaId) => {
        const { sponsors } = get();
        set({
          sponsors: sponsors.map((s) => {
            if (s.id !== sponsorId) return s;
            const newIds = s.imageIds.filter((id) => id !== mediaId);
            const newDurations = { ...s.imageDurations };
            delete newDurations[mediaId];
            return { ...s, imageIds: newIds, imageDurations: newDurations };
          }),
        });
      },

      moveSponsorImage: (sponsorId, fromIndex, toIndex) => {
        const { sponsors } = get();
        set({
          sponsors: sponsors.map((s) => {
            if (s.id !== sponsorId) return s;
            const ids = [...s.imageIds];
            if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return s;
            const [moved] = ids.splice(fromIndex, 1);
            ids.splice(toIndex, 0, moved);
            return { ...s, imageIds: ids };
          }),
        });
      },

      setSponsorImageDuration: (sponsorId, mediaId, duration) => {
        const { sponsors } = get();
        set({
          sponsors: sponsors.map((s) => {
            if (s.id !== sponsorId) return s;
            const cleaned = typeof duration === 'number' && duration > 0 ? duration : 10; // default 10s
            return {
              ...s,
              imageDurations: { ...s.imageDurations, [mediaId]: cleaned },
            };
          }),
        });
      },
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
