import type { SponsorLayout } from '../types/presentation';

export type ElementId = 'home' | 'center' | 'away' | 'sponsor';
export interface LayoutRect { id: ElementId; name: string; color: string; top: number; left: number; width: number; height: number }

const META: Record<ElementId, { name: string; color: string }> = {
  home: { name: 'Home Team', color: '#ef4444' },
  center: { name: 'Clocks', color: '#eab308' },
  away: { name: 'Away Team', color: '#3b82f6' },
  sponsor: { name: 'Sponsor / Media', color: '#22c55e' },
};

// Mirrors the Live Sponsor grid in presentation.css / LiveSponsorView; all values are % of the canvas.
export function layoutRects({ placement, size }: SponsorLayout): LayoutRect[] {
  const rest = 100 - size;
  const r = (id: ElementId, left: number, top: number, width: number, height: number): LayoutRect => ({ id, ...META[id], left, top, width, height });
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
