export const PRESENTATION_MODES = ['pregame', 'live', 'stadium', 'halftime', 'intro', 'fullscreen', 'livesponsor'] as const;
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

// Live Sponsor media area: where it sits, how much of the screen it takes (%), and how media fits.
export const SPONSOR_PLACEMENTS = ['right', 'left', 'bottom', 'top'] as const;
export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number];
export interface SponsorLayout {
  placement: SponsorPlacement;
  size: number; // percent of the board, SPONSOR_SIZE_MIN..MAX
  fit: 'contain' | 'cover';
}
export const SPONSOR_SIZE_MIN = 20;
export const SPONSOR_SIZE_MAX = 60;

// What the public display shows. Deliberately separate from game state: nothing
// here can change a score, clock, foul, timeout, period or the undo history.
export interface PresentationState {
  mode: PresentationMode;
  countdowns: Record<CountdownId, Countdown>;
  sponsorLayout: SponsorLayout;
}
