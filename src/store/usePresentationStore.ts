import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clockRemaining, stopClock } from '../lib/clock';
import { safeStorage } from '../lib/storage';
import { PRESENTATION_MODES } from '../types/presentation';
import type { Countdown, CountdownId, PresentationMode, PresentationState } from '../types/presentation';

interface PresentationStore extends PresentationState {
  setMode: (mode: PresentationMode) => void;
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

const initialState = (): PresentationState => ({
  mode: 'live',
  countdowns: { pregame: freshCountdown(DEFAULT_SECONDS.pregame), halftime: freshCountdown(DEFAULT_SECONDS.halftime) },
});

const seconds = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX_COUNTDOWN_SECONDS, Math.max(0, Math.round(value))) : fallback;

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
      partialize: ({ mode, countdowns }) => ({ mode, countdowns }),
      merge: (saved, current) => {
        const state = saved as Partial<PresentationState> | undefined;
        return {
          ...current,
          mode: PRESENTATION_MODES.includes(state?.mode as PresentationMode) ? (state?.mode as PresentationMode) : current.mode,
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
  import.meta.hot?.dispose(() => { clearInterval(ticker); channel.close(); });
}
