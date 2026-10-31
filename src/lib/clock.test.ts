import { describe, expect, it } from 'vitest';
import { clockRemaining, formatGameClock, formatShotClock, stopClock } from './clock';

const running = { duration: 24, remainingTime: 24, isRunning: true, startTimestamp: 1000 };

describe('clockRemaining', () => {
  it('derives the time from the wall clock while running', () => {
    expect(clockRemaining(running, 11_000)).toBe(14);
  });

  it('returns the stored time while stopped', () => {
    expect(clockRemaining({ ...running, isRunning: false, startTimestamp: null }, 99_000)).toBe(24);
  });

  it('never goes below zero, or above the stored time on a future timestamp', () => {
    expect(clockRemaining(running, 999_000)).toBe(0);
    expect(clockRemaining(running, 0)).toBe(24);
  });

  it('stopClock freezes the live value', () => {
    expect(stopClock(running, 2500)).toEqual({ duration: 24, remainingTime: 22.5, isRunning: false, startTimestamp: null });
  });
});

describe('formatGameClock', () => {
  it.each([
    [720, '12:00'],
    [719.1, '12:00'],
    [719, '11:59'],
    [60.01, '1:01'],
    [60, '1:00'],
    [59.95, '59.9'],
    [5, '5.0'],
    [0.3, '0.3'],
    [0, '0.0'],
  ])('%d -> %s', (seconds, text) => expect(formatGameClock(seconds)).toBe(text));
});

describe('formatShotClock', () => {
  it.each([
    [24, '24'],
    [23.1, '24'],
    [5.01, '6'],
    [5, '5.0'],
    [4.99, '4.9'],
    [0.7, '0.7'],
    [0, '0.0'],
  ])('%d -> %s', (seconds, text) => expect(formatShotClock(seconds)).toBe(text));
});
