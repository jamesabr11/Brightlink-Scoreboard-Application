import { describe, expect, it } from 'vitest';
import { changesOnWheel } from './wheelGuard';

describe('changesOnWheel', () => {
  it('covers number inputs and selects only', () => {
    expect(changesOnWheel({ tagName: 'INPUT', type: 'number' })).toBe(true);
    expect(changesOnWheel({ tagName: 'SELECT' })).toBe(true);
    expect(changesOnWheel({ tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(changesOnWheel({ tagName: 'INPUT', type: 'text' })).toBe(false);
    expect(changesOnWheel(null)).toBe(false);
  });
});
