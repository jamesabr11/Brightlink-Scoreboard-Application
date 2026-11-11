import { describe, expect, it } from 'vitest';
import { DEFAULT_SPONSOR_LAYOUT, presetGeometry } from '../store/usePresentationStore';
import { dragBox, isFree, layoutRects, MIN_BOX, overlaps, sectionShares } from './layoutEditor';

describe('layoutRects', () => {
  it.each(['right', 'left', 'top', 'bottom'] as const)('%s: elements tile the canvas', (placement) => {
    const area = layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, placement, sections: 3 }).reduce((s, e) => s + e.width * e.height, 0);
    expect(area).toBeCloseTo(100 * 100, 3);
  });
  it('section width follows size', () => {
    expect(layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, placement: 'right', size: 40 }).find((e) => e.id === 'section0')?.width).toBe(40);
  });
  it('by default the full-width scoreboard sits above side-by-side media sections', () => {
    const rects = layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, sections: 3 });
    const board = rects.filter((e) => !e.id.startsWith('section'));
    const media = rects.filter((e) => e.id.startsWith('section'));
    expect(board.reduce((s, e) => s + e.width, 0)).toBeCloseTo(100);
    expect(media.every((m) => m.top >= Math.max(...board.map((b) => b.top + b.height)) - 1e-9 && m.height === media[0].height)).toBe(true);
    expect(media.map((m) => m.left)).toEqual([...media.map((m) => m.left)].sort((a, b) => a - b));
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

  it('manual rects replace the computed position and switch to free layout', () => {
    const layout = { ...DEFAULT_SPONSOR_LAYOUT, rects: { home: { x: 5, y: 5, w: 30, h: 30 } } };
    expect(isFree(DEFAULT_SPONSOR_LAYOUT)).toBe(false);
    expect(isFree(layout)).toBe(true);
    const home = layoutRects(layout).find((e) => e.id === 'home')!;
    expect([home.left, home.top, home.width, home.height]).toEqual([5, 5, 30, 30]);
  });
});

describe('every placement', () => {
  const combos = (['right', 'left', 'top', 'bottom'] as const).flatMap((placement) => ([1, 2, 3] as const).flatMap((sections) => (['auto', 'rows', 'columns'] as const).map((arrange) => ({ placement, sections, arrange }))));
  it.each(combos)('%j: elements tile the canvas without overlapping', (c) => {
    const rects = layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, ...c, size: 40 });
    expect(rects).toHaveLength(3 + c.sections);
    expect(rects.reduce((s, e) => s + e.width * e.height, 0)).toBeCloseTo(10000, 3);
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => expect(overlaps({ x: a.left, y: a.top, w: a.width, h: a.height }, { x: b.left, y: b.top, w: b.width, h: b.height })).toBe(false)));
  });
  it('the scoreboard keeps its size as the media sections are divided', () => {
    for (const placement of ['right', 'left', 'top', 'bottom'] as const) {
      const board = (sections: 1 | 2 | 3) => layoutRects({ ...DEFAULT_SPONSOR_LAYOUT, placement, sections }).filter((e) => !e.id.startsWith('section'));
      expect(board(3)).toEqual(board(1));
    }
  });
  it('preset geometry gives a valid placement', () => {
    for (const id of ['classic', 'modern', 'minimal', 'tournament', 'broadcast', 'livesponsor'] as const) expect(['right', 'left', 'top', 'bottom']).toContain(presetGeometry(id).placement);
  });
});

describe('dragBox', () => {
  const box = { x: 10, y: 10, w: 30, h: 20 };
  it('moves, snapped and kept on the canvas', () => {
    expect(dragBox('move', box, 3.2, -50)).toEqual({ x: 13, y: 0, w: 30, h: 20 });
    expect(dragBox('move', box, 500, 500)).toEqual({ x: 70, y: 80, w: 30, h: 20 });
  });
  it('resizes from any edge and never below the minimum', () => {
    expect(dragBox('se', box, 10, 5)).toEqual({ x: 10, y: 10, w: 40, h: 25 });
    expect(dragBox('nw', box, -5, -5)).toEqual({ x: 5, y: 5, w: 35, h: 25 });
    expect(dragBox('e', box, -100, 0).w).toBe(MIN_BOX);
    expect(dragBox('w', box, 100, 0)).toMatchObject({ x: 40 - MIN_BOX, w: MIN_BOX });
  });
  it('overlap ignores touching edges', () => {
    expect(overlaps(box, { x: 40, y: 10, w: 10, h: 10 })).toBe(false);
    expect(overlaps(box, { x: 39, y: 10, w: 10, h: 10 })).toBe(true);
  });
});
