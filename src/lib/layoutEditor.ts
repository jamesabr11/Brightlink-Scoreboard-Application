import type { SponsorLayout } from '../types/presentation';

export type ElementId = 'home' | 'center' | 'away' | 'sponsor' | 'section0' | 'section1' | 'section2';
export interface LayoutRect { id: ElementId; name: string; color: string; top: number; left: number; width: number; height: number }

const META: Record<'home' | 'center' | 'away' | 'sponsor', { name: string; color: string }> = {
  home: { name: 'Home Team', color: '#ef4444' },
  center: { name: 'Clocks', color: '#eab308' },
  away: { name: 'Away Team', color: '#3b82f6' },
  sponsor: { name: 'Sponsor / Media', color: '#22c55e' },
};

const SECTION_COLORS = ['#22c55e', '#14b8a6', '#a3e635'];
export const sectionId = (i: number) => `section${i}` as ElementId;

/** Direction the sections divide the media area: 'rows' stack top to bottom. */
export const sectionDirection = ({ placement, arrange }: SponsorLayout): 'rows' | 'columns' =>
  arrange === 'auto' ? (placement === 'left' || placement === 'right' ? 'rows' : 'columns') : arrange;

/** Each active section's share of the media area, as percentages that add up to 100. */
export function sectionShares({ sections, split }: SponsorLayout): number[] {
  const weights = split.slice(0, sections);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => (w / total) * 100);
}

// Mirrors the Live Sponsor grid in presentation.css / LiveSponsorView; all values are % of the canvas.
function baseRects({ placement, size }: SponsorLayout): LayoutRect[] {
  const rest = 100 - size;
  const r = (id: 'home' | 'center' | 'away' | 'sponsor', left: number, top: number, width: number, height: number): LayoutRect => ({ id, ...META[id], left, top, width, height });
  if (placement === 'left' || placement === 'right') {
    const row = 100 / 1.55, half = rest / 2, x = placement === 'right' ? 0 : size;
    return [
      r('home', x, 0, half, row), r('away', x + half, 0, half, row), r('center', x, row, rest, 100 - row),
      r('sponsor', placement === 'right' ? rest : 0, 0, size, 100),
    ];
  }
  const col = 100 / 2.8, mid = 100 - 2 * col, y = placement === 'top' ? size : 0;
  return [
    r('home', 0, y, col, rest), r('center', col, y, mid, rest), r('away', col + mid, y, col, rest),
    r('sponsor', 0, placement === 'top' ? 0 : rest, 100, size),
  ];
}

/** Scoreboard blocks plus the media area itself (for the properties panel). */
export const areaRects = baseRects;

/** What the canvas draws: scoreboard blocks plus one box per media section. */
export function layoutRects(layout: SponsorLayout): LayoutRect[] {
  const base = baseRects(layout);
  const area = base.find((e) => e.id === 'sponsor')!;
  const rows = sectionDirection(layout) === 'rows';
  let offset = 0;
  const sections = sectionShares(layout).map((share, i): LayoutRect => {
    const rect = {
      id: sectionId(i), color: SECTION_COLORS[i], name: layout.sections === 1 ? META.sponsor.name : `Media ${i + 1}`,
      left: rows ? area.left : area.left + (area.width * offset) / 100,
      top: rows ? area.top + (area.height * offset) / 100 : area.top,
      width: rows ? area.width : (area.width * share) / 100,
      height: rows ? (area.height * share) / 100 : area.height,
    };
    offset += share;
    return rect;
  });
  return [...base.filter((e) => e.id !== 'sponsor'), ...sections];
}
