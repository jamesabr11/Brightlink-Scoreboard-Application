import type { GameClock, ShotClock } from '../types/basketball';

type Clock = GameClock | ShotClock;

// A running clock never changes in state: every tab derives the time from
// remainingTime (the value at startTimestamp) and the wall clock, so inactive
// tabs, refreshes and throttled timers can't make it drift.
export const clockRemaining = (clock: Clock, now: number): number => {
  if (!clock.isRunning || clock.startTimestamp === null) return clock.remainingTime;
  return Math.max(0, clock.remainingTime - Math.max(0, now - clock.startTimestamp) / 1000);
};

export const stopClock = <T extends Clock>(clock: T, now: number): T => ({
  ...clock,
  remainingTime: clockRemaining(clock, now),
  isRunning: false,
  startTimestamp: null,
});

// The epsilon stops float noise (0.3 * 10 etc.) from showing the wrong digit.
const tenths = (seconds: number) => (Math.floor(seconds * 10 + 1e-6) / 10).toFixed(1);
const wholeSeconds = (seconds: number) => Math.ceil(seconds - 1e-6);

export const formatGameClock = (seconds: number): string => {
  if (seconds < 60) return tenths(seconds);
  const total = wholeSeconds(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const formatShotClock = (seconds: number): string =>
  seconds <= 5 ? tenths(seconds) : String(wholeSeconds(seconds));
