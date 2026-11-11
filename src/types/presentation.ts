import type { ScoreboardTheme } from './basketball';

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
  sections: number; // 1..SPONSOR_MAX_SECTIONS independent media sections
  split: number[]; // relative share of each section (SPONSOR_MAX_SECTIONS weights)
  arrange: SponsorArrange; // direction the sections are divided in
  media: string[][]; // Media Library ids assigned to each section (ids only, never blobs)
  preset: string; // the scoreboard preset ('themeId:layout') this geometry belongs to; a different preset replaces it
  rects: Partial<Record<SponsorElement, LayoutBox>>; // manual positions; any entry switches the display to free layout
}
export const SPONSOR_ELEMENTS = ['home', 'center', 'away', 'section0', 'section1', 'section2'] as const;
export type SponsorElement = (typeof SPONSOR_ELEMENTS)[number];
export interface LayoutBox { x: number; y: number; w: number; h: number } // percent of the 16:9 canvas
export const SPONSOR_ARRANGES = ['auto', 'rows', 'columns'] as const; // auto: rows beside the board, columns above/below
export type SponsorArrange = (typeof SPONSOR_ARRANGES)[number];
export const SPONSOR_MAX_SECTIONS = 3;
export const SPONSOR_SHARE_MIN = 10;
export const SPONSOR_SHARE_MAX = 80;
export const SPONSOR_SIZE_MIN = 20;
export const SPONSOR_SIZE_MAX = 60;

// What the public display shows. Deliberately separate from game state: nothing
// here can change a score, clock, foul, timeout, period or the undo history.
// A named custom layout: geometry, sections and media ids (never blobs) plus the scoreboard appearance it was made for.
export interface SavedLayout { id: string; name: string; layout: SponsorLayout; theme: ScoreboardTheme }
export const MAX_SAVED_LAYOUTS = 50;
export const MAX_LAYOUT_NAME = 40;

export interface PresentationState {
  savedLayouts: SavedLayout[];
  activeLayoutId: string | null; // the saved layout being edited; null for the unsaved default
  mode: PresentationMode;
  countdowns: Record<CountdownId, Countdown>;
  sponsorLayout: SponsorLayout;
}
