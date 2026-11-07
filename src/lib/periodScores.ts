import type { PeriodScore } from '../types/basketball';

type Side = 'home' | 'away';

const asPoints = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0);

// Returns a new list with `points` added to the period's slot (padded with zeros).
export const addPoints = (scores: PeriodScore[], period: number, side: Side, points: number): PeriodScore[] => {
  const next = Array.from({ length: Math.max(scores.length, period) }, (_, i) => ({ ...(scores[i] ?? { home: 0, away: 0 }) }));
  next[period - 1][side] += points;
  return next;
};

export const pointsThrough = (scores: PeriodScore[], lastPeriod: number): PeriodScore =>
  scores.slice(0, lastPeriod).reduce((sum, p) => ({ home: sum.home + p.home, away: sum.away + p.away }), { home: 0, away: 0 });

export const halfPeriods = (numberOfPeriods: number) => Math.ceil(numberOfPeriods / 2);

// localStorage is untrusted. Saved scores that don't add up to the team totals
// (older saves had none) are replaced by the totals, credited to the current
// period, so the sum invariant always holds.
export const cleanPeriodScores = (saved: unknown, period: number, home: number, away: number): PeriodScore[] => {
  const scores = Array.isArray(saved) ? saved.map((p) => ({ home: asPoints(p?.home), away: asPoints(p?.away) })) : [];
  const total = pointsThrough(scores, scores.length);
  if (total.home === home && total.away === away) return scores;
  return Array.from({ length: period }, (_, i) => (i === period - 1 ? { home, away } : { home: 0, away: 0 }));
};
