import { describe, expect, it } from 'vitest';
import { clockEndSound, crossedShotWarning } from './sound';

const state = (running: boolean, remainingTime: number, period = 1, home = 0, away = 0) => ({
  gameClock: { periodDuration: 720, remainingTime, isRunning: running, startTimestamp: running ? 1 : null },
  period,
  homeTeam: { score: home },
  awayTeam: { score: away },
  gameConfig: { numberOfPeriods: 4 },
}) as unknown as Parameters<typeof clockEndSound>[0];

describe('clockEndSound', () => {
  it('sounds the period horn when a period runs out', () => {
    expect(clockEndSound(state(true, 5), state(false, 0))).toBe('periodEnd');
  });

  it('sounds the game horn when the last period ends decided', () => {
    expect(clockEndSound(state(true, 5, 4, 80, 70), state(false, 0, 4, 80, 70))).toBe('gameEnd');
    expect(clockEndSound(state(true, 5, 5, 90, 88), state(false, 0, 5, 90, 88))).toBe('gameEnd');
  });

  it('only sounds the period horn on a tie, since overtime follows', () => {
    expect(clockEndSound(state(true, 5, 4, 80, 80), state(false, 0, 4, 80, 80))).toBe('periodEnd');
  });

  it('stays quiet for an ordinary pause and when already stopped', () => {
    expect(clockEndSound(state(true, 5), state(false, 4))).toBeNull();
    expect(clockEndSound(state(false, 0), state(false, 0))).toBeNull();
  });
});

describe('crossedShotWarning', () => {
  it('fires once on the way through five seconds', () => {
    expect(crossedShotWarning(5.05, 4.95)).toBe(true);
    expect(crossedShotWarning(4.95, 4.85)).toBe(false);
    expect(crossedShotWarning(6, 5.5)).toBe(false);
  });

  it('ignores a jump straight to zero', () => {
    expect(crossedShotWarning(24, 0)).toBe(false);
  });
});
