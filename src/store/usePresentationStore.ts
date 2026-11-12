import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clockRemaining, stopClock } from '../lib/clock';
import { newId, safeStorage } from '../lib/storage';
import { cleanTheme } from '../lib/theme';
import { MIN_BOX } from '../lib/layoutEditor';
import { MAX_LAYOUT_NAME, MAX_SAVED_LAYOUTS, PRESENTATION_MODES, SPONSOR_ARRANGES, SPONSOR_ELEMENTS, SPONSOR_MAX_SECTIONS, SPONSOR_PLACEMENTS, SPONSOR_SHARE_MAX, SPONSOR_SHARE_MIN, SPONSOR_SIZE_MAX, SPONSOR_SIZE_MIN } from '../types/presentation';
import { useBasketballStore } from './useBasketballStore';
import type { LayoutId, ScoreboardTheme } from '../types/basketball';
import type { Countdown, CountdownId, PresentationMode, PresentationState, SavedLayout, SponsorLayout } from '../types/presentation';

interface PresentationStore extends PresentationState {
  setMode: (mode: PresentationMode) => void;
  setSponsorLayout: (patch: Partial<SponsorLayout>) => void;
  saveLayout: (name: string, theme: ScoreboardTheme) => void;
  updateSavedLayout: (id: string, theme: ScoreboardTheme) => void;
  renameSavedLayout: (id: string, name: string) => void;
  duplicateSavedLayout: (id: string) => void;
  deleteSavedLayout: (id: string) => void;
  loadSavedLayout: (id: string) => void;
  startCountdown: (id: CountdownId) => void;
  pauseCountdown: (id: CountdownId) => void;
  resetCountdown: (id: CountdownId) => void;
  setCountdownDuration: (id: CountdownId, seconds: number) => void;
  adjustCountdown: (id: CountdownId, delta: number) => void;
  tick: () => void;
}

export const MAX_COUNTDOWN_SECONDS = 120 * 60;
const DEFAULT_SECONDS: Record<CountdownId, number> = { pregame: 10 * 60, halftime: 15 * 60 };

const freshCountdown = (seconds: number): Countdown => ({ duration: seconds, remainingTime: seconds, isRunning: false, startTimestamp: null });

export const DEFAULT_SPONSOR_LAYOUT: SponsorLayout = { placement: 'bottom', size: 35, fit: 'contain', sponsorSections: true, sections: 1, split: [50, 30, 20], arrange: 'auto', media: [[], [], []], preset: '', rects: {} };

/**
 * The Live Sponsor geometry a scoreboard preset starts from (placement, media size, no manual positions).
 * Colours, fonts and background always come from the preset itself (lib/theme.ts); only the arrangement lives here.
 * Broadcast is stacked team rows beside a clock column, so it starts with the media area beside the board.
 */
export const presetGeometry = (layout: LayoutId): Pick<SponsorLayout, 'placement' | 'size' | 'arrange' | 'rects'> => ({
  placement: layout === 'broadcast' ? 'right' : DEFAULT_SPONSOR_LAYOUT.placement,
  size: DEFAULT_SPONSOR_LAYOUT.size,
  arrange: 'auto',
  rects: {},
});

/** Back to the preset's own layout; media assignments are kept. */
export const defaultGeometry = (layout: LayoutId): Partial<SponsorLayout> => ({ ...presetGeometry(layout), fit: 'contain', sections: 1, split: DEFAULT_SPONSOR_LAYOUT.split });

const initialState = (): PresentationState => ({
  mode: 'live',
  sponsorLayout: DEFAULT_SPONSOR_LAYOUT,
  savedLayouts: [],
  activeLayoutId: null,
  countdowns: { pregame: freshCountdown(DEFAULT_SECONDS.pregame), halftime: freshCountdown(DEFAULT_SECONDS.halftime) },
});

const seconds = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX_COUNTDOWN_SECONDS, Math.max(0, Math.round(value))) : fallback;

const cleanRects = (saved: unknown): SponsorLayout['rects'] => {
  const out: SponsorLayout['rects'] = {};
  if (typeof saved !== 'object' || saved === null) return out;
  const n = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10 : null);
  for (const id of SPONSOR_ELEMENTS) {
    const r = (saved as Record<string, Record<string, unknown> | undefined>)[id];
    const w = n(r?.w, MIN_BOX, 100), h = n(r?.h, MIN_BOX, 100);
    if (w === null || h === null) continue;
    const x = n(r?.x, 0, 100 - w), y = n(r?.y, 0, 100 - h);
    if (x !== null && y !== null) out[id] = { x, y, w, h };
  }
  return out;
};

const cleanLayout = (saved: Partial<SponsorLayout> | undefined): SponsorLayout => ({
  placement: SPONSOR_PLACEMENTS.includes(saved?.placement as never) ? saved!.placement! : DEFAULT_SPONSOR_LAYOUT.placement,
  size: typeof saved?.size === 'number' && Number.isFinite(saved.size) ? Math.min(SPONSOR_SIZE_MAX, Math.max(SPONSOR_SIZE_MIN, Math.round(saved.size))) : DEFAULT_SPONSOR_LAYOUT.size,
  fit: saved?.fit === 'cover' ? 'cover' : 'contain',
  sponsorSections: saved?.sponsorSections !== false, // layouts saved before this option keep their sections
  sections: typeof saved?.sections === 'number' ? Math.min(SPONSOR_MAX_SECTIONS, Math.max(1, Math.round(saved.sections))) : 1,
  split: DEFAULT_SPONSOR_LAYOUT.split.map((d, i) => {
    const v = saved?.split?.[i];
    return typeof v === 'number' && Number.isFinite(v) ? Math.min(SPONSOR_SHARE_MAX, Math.max(SPONSOR_SHARE_MIN, Math.round(v))) : d;
  }),
  arrange: SPONSOR_ARRANGES.includes(saved?.arrange as never) ? saved!.arrange! : 'auto',
  media: DEFAULT_SPONSOR_LAYOUT.media.map((_, i) => {
    const ids = saved?.media?.[i];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').slice(0, 20) : [];
  }),
  preset: typeof saved?.preset === 'string' ? saved.preset.slice(0, 40) : '',
  rects: cleanRects(saved?.rects),
});

/** A layout saved without sponsor sections carries no section media or section positions. */
const forSave = (layout: SponsorLayout): SponsorLayout => layout.sponsorSections ? layout : {
  ...layout,
  media: DEFAULT_SPONSOR_LAYOUT.media,
  rects: Object.fromEntries(Object.entries(layout.rects).filter(([id]) => !id.startsWith('section'))),
};

export const presetKey = (theme: ScoreboardTheme) => `${theme.themeId}:${theme.layout}`;

/** Names are trimmed, capped and kept unique (case-insensitive); a clash gets " (2)", " (3)"... */
const uniqueName = (raw: string, layouts: SavedLayout[], exceptId?: string) => {
  const base = raw.trim().slice(0, MAX_LAYOUT_NAME) || 'Layout';
  const taken = new Set(layouts.filter((l) => l.id !== exceptId).map((l) => l.name.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base.slice(0, MAX_LAYOUT_NAME - 4)} (${n})`;
  return name;
};
export const layoutNameTaken = (layouts: SavedLayout[], name: string, exceptId?: string) =>
  layouts.some((l) => l.id !== exceptId && l.name.toLowerCase() === name.trim().toLowerCase());

const cleanSaved = (saved: unknown): SavedLayout[] => {
  if (!Array.isArray(saved)) return [];
  const out: SavedLayout[] = [];
  for (const item of saved.slice(0, MAX_SAVED_LAYOUTS) as Partial<SavedLayout>[]) {
    if (typeof item?.id !== 'string' || typeof item.name !== 'string' || out.some((l) => l.id === item.id)) continue;
    out.push({ id: item.id, name: uniqueName(item.name, out), layout: cleanLayout(item.layout), theme: cleanTheme(item.theme) });
  }
  return out;
};

// localStorage is untrusted, so nothing from it is used as-is.
const cleanCountdown = (saved: Partial<Countdown> | undefined, fallback: Countdown): Countdown => {
  const duration = seconds(saved?.duration, fallback.duration);
  const running = saved?.isRunning === true && typeof saved.startTimestamp === 'number' && Number.isFinite(saved.startTimestamp);
  return {
    duration,
    remainingTime: Math.min(duration, seconds(saved?.remainingTime, duration)),
    isRunning: running,
    startTimestamp: running ? (saved?.startTimestamp ?? null) : null,
  };
};

const channel = new BroadcastChannel('presentation_sync');

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => {
      channel.onmessage = (event) => set(event.data);
      const syncAndSet = (update: Partial<PresentationState>) => { set(update); channel.postMessage(update); };
      const setCountdown = (id: CountdownId, countdown: Countdown) =>
        syncAndSet({ countdowns: { ...get().countdowns, [id]: countdown } });

      return {
        ...initialState(),

        setMode: (mode) => { if (mode !== get().mode) syncAndSet({ mode }); },

        setSponsorLayout: (patch) => syncAndSet({ sponsorLayout: cleanLayout({ ...get().sponsorLayout, ...patch }) }),

        // Saved layouts are independent copies: editing the live layout never touches one until it is saved again.
        saveLayout: (name, theme) => {
          const { savedLayouts, sponsorLayout } = get();
          if (savedLayouts.length >= MAX_SAVED_LAYOUTS) return;
          const saved: SavedLayout = { id: newId(), name: uniqueName(name, savedLayouts), layout: forSave(cleanLayout({ ...sponsorLayout, preset: presetKey(theme) })), theme: cleanTheme(theme) };
          syncAndSet({ savedLayouts: [...savedLayouts, saved], activeLayoutId: saved.id, sponsorLayout: saved.layout });
        },
        updateSavedLayout: (id, theme) => {
          const { savedLayouts, sponsorLayout } = get();
          const layout = forSave(cleanLayout({ ...sponsorLayout, preset: presetKey(theme) }));
          syncAndSet({ savedLayouts: savedLayouts.map((l) => (l.id === id ? { ...l, layout, theme: cleanTheme(theme) } : l)), sponsorLayout: layout });
        },
        renameSavedLayout: (id, name) => {
          const { savedLayouts } = get();
          syncAndSet({ savedLayouts: savedLayouts.map((l) => (l.id === id ? { ...l, name: uniqueName(name, savedLayouts, id) } : l)) });
        },
        duplicateSavedLayout: (id) => {
          const { savedLayouts } = get();
          const from = savedLayouts.find((l) => l.id === id);
          if (!from || savedLayouts.length >= MAX_SAVED_LAYOUTS) return;
          const copy: SavedLayout = { id: newId(), name: uniqueName(`${from.name} copy`, savedLayouts), layout: cleanLayout(from.layout), theme: cleanTheme(from.theme) };
          syncAndSet({ savedLayouts: [...savedLayouts, copy] });
        },
        deleteSavedLayout: (id) => {
          const { savedLayouts, activeLayoutId } = get();
          syncAndSet({ savedLayouts: savedLayouts.filter((l) => l.id !== id), activeLayoutId: activeLayoutId === id ? null : activeLayoutId });
        },
        // The layout goes live (and to /display) together with the appearance it was saved with.
        loadSavedLayout: (id) => {
          const saved = get().savedLayouts.find((l) => l.id === id);
          if (!saved) return;
          syncAndSet({ sponsorLayout: cleanLayout({ ...saved.layout, preset: presetKey(saved.theme) }), activeLayoutId: id });
          useBasketballStore.getState().updateGameConfig({ theme: saved.theme });
        },

        startCountdown: (id) => {
          const countdown = get().countdowns[id];
          if (countdown.isRunning || countdown.remainingTime <= 0) return;
          setCountdown(id, { ...countdown, isRunning: true, startTimestamp: Date.now() });
        },

        pauseCountdown: (id) => {
          const countdown = get().countdowns[id];
          if (countdown.isRunning) setCountdown(id, stopClock(countdown, Date.now()));
        },

        resetCountdown: (id) => setCountdown(id, freshCountdown(get().countdowns[id].duration)),

        setCountdownDuration: (id, value) => setCountdown(id, freshCountdown(seconds(value, get().countdowns[id].duration))),

        // Adding time late (a delayed tip-off) also lengthens the countdown.
        adjustCountdown: (id, delta) => {
          const countdown = get().countdowns[id];
          const now = Date.now();
          const remainingTime = Math.min(MAX_COUNTDOWN_SECONDS, Math.max(0, clockRemaining(countdown, now) + delta));
          setCountdown(id, { ...countdown, remainingTime, duration: Math.max(countdown.duration, remainingTime), startTimestamp: countdown.isRunning ? now : null });
        },

        // Only acts on expiry. Every tab runs it; the first one there stops it for all.
        tick: () => {
          const now = Date.now();
          const { countdowns } = get();
          const expired = (Object.keys(countdowns) as CountdownId[]).filter((id) => countdowns[id].isRunning && clockRemaining(countdowns[id], now) <= 0);
          if (!expired.length) return;
          syncAndSet({ countdowns: { ...countdowns, ...Object.fromEntries(expired.map((id) => [id, stopClock(countdowns[id], now)])) } });
        },
      };
    },
    {
      name: 'basketball-presentation',
      storage: safeStorage,
      // v1: manual element positions saved by the first free-layout builds are dropped once, back to the default layout.
      version: 1,
      migrate: (saved) => {
        const state = (saved ?? {}) as Partial<PresentationState>;
        return { ...state, sponsorLayout: { ...state.sponsorLayout, rects: {} } };
      },
      partialize: ({ mode, countdowns, sponsorLayout, savedLayouts, activeLayoutId }) => ({ mode, countdowns, sponsorLayout, savedLayouts, activeLayoutId }),
      merge: (saved, current) => {
        const state = saved as Partial<PresentationState> | undefined;
        return {
          ...current,
          mode: PRESENTATION_MODES.includes(state?.mode as PresentationMode) ? (state?.mode as PresentationMode) : current.mode,
          sponsorLayout: cleanLayout(state?.sponsorLayout),
          ...(() => {
            const savedLayouts = cleanSaved(state?.savedLayouts);
            return { savedLayouts, activeLayoutId: savedLayouts.some((l) => l.id === state?.activeLayoutId) ? (state?.activeLayoutId ?? null) : null };
          })(),
          countdowns: {
            pregame: cleanCountdown(state?.countdowns?.pregame, current.countdowns.pregame),
            halftime: cleanCountdown(state?.countdowns?.halftime, current.countdowns.halftime),
          },
        };
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const ticker = setInterval(() => usePresentationStore.getState().tick(), 250);
  // Choosing a different scoreboard preset in Game Setup loads that preset's layout into the editor,
  // replacing manual positions; later edits are kept until the next preset change or a reset.
  // Each tab applies the same change itself (no broadcast), so a display tab can never overwrite the operator's layout.
  // A layout that already belongs to the new preset (a saved layout being loaded) is left alone.
  let lastPreset = presetKey(useBasketballStore.getState().gameConfig.theme);
  const unsubscribe = useBasketballStore.subscribe(() => {
    const { theme } = useBasketballStore.getState().gameConfig;
    const next = presetKey(theme);
    if (next === lastPreset) return;
    lastPreset = next;
    const { sponsorLayout } = usePresentationStore.getState();
    if (sponsorLayout.preset === next) return;
    usePresentationStore.setState({ sponsorLayout: cleanLayout({ ...sponsorLayout, ...presetGeometry(theme.layout), preset: next }) });
  });
  import.meta.hot?.dispose(() => { clearInterval(ticker); unsubscribe(); channel.close(); });
}
