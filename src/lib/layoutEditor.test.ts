import { describe, expect, it } from 'vitest';
import { layoutRects } from './layoutEditor';

describe('layoutRects', () => {
  it.each(['right', 'left', 'top', 'bottom'] as const)('%s: elements tile the canvas', (placement) => {
    const area = layoutRects({ placement, size: 35, fit: 'contain' }).reduce((s, e) => s + e.width * e.height, 0);
    expect(area).toBeCloseTo(100 * 100, 3);
  });
  it('sponsor width follows size', () => {
    expect(layoutRects({ placement: 'right', size: 40, fit: 'contain' }).find((e) => e.id === 'sponsor')?.width).toBe(40);
  });
});
