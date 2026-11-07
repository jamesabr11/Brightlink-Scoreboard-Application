export const PRESENTATION_MODES = ['pregame', 'live', 'stadium', 'halftime'] as const;
export type PresentationMode = (typeof PRESENTATION_MODES)[number];

export type CountdownId = 'pregame' | 'halftime';

// Same shape as the game clock (remainingTime is the value at startTimestamp
// while running), so lib/clock.ts handles both.
export interface Countdown {
  duration: number; // seconds; 0 hides the countdown on the display
  remainingTime: number;
  isRunning: boolean;
  startTimestamp: number | null;
}

// What the public display shows. Deliberately separate from game state: nothing
// here can change a score, clock, foul, timeout, period or the undo history.
export interface PresentationState {
  mode: PresentationMode;
  countdowns: Record<CountdownId, Countdown>;
}
