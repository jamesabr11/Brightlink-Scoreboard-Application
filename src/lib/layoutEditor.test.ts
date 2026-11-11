import { describe, expect, it } from 'vitest';
import { DEFAULT_SPONSOR_LAYOUT } from '../store/usePresentationStore';
import { layoutRects, sectionShares } from './layoutEditor';

describe('layoutRects', () => {
  it.each(['right', 'left', 'top', 'bottom'] as const)('%s: elements tile the canvas', (placement) => {
    const area = layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, placement, sections: 3 }).reduce((s, e) => s + e.width * e.height, 0);
    expect(area).toBeCloseTo(100 * 100, 3);
  });
  it('section width follows size', () => {
    expect(layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, size: 40 }).find((e) => e.id === 'section0')?.width).toBe(40);
  });
  it('shares normalise to 100 for the active sections', () => {
    const shares = sectionShares({ ...DEFAULT_SPONSOR_LAYOUT, sections: 2, split: [60, 20, 20] });
    expect(shares).toEqual([75, 25]);
  });
  it('columns arrangement splits the width', () => {
    const [a, b] = layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, sections: 2, split: [50, 50, 20], arrange: 'columns' }).filter((e) => e.id.startsWith('section'));
    expect(a.width).toBeCloseTo(b.width);
    expect(a.height).toBe(b.height);
  });
});
