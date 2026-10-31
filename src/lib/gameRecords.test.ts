import { describe, expect, it } from 'vitest';
import type { GameRecord } from '../types/basketball';
import { csvFilename, filterGames, gameStats, gamesToCsv } from './gameRecords';

const game = (overrides: Partial<GameRecord>): GameRecord => ({
  id: 'a',
  finishedAt: new Date(2026, 9, 30, 19, 5).getTime(),
  homeName: 'Bulls',
  awayName: 'Hawks',
  homeScore: 80,
  awayScore: 70,
  periodsPlayed: 4,
  overtimePeriods: 0,
  configName: 'League',
  numberOfPeriods: 4,
  periodDuration: 12,
  overtimeDuration: 5,
  shotClockDuration: 24,
  foulsForBonus: 5,
  maxTimeouts: 3,
  ...overrides,
});

const games = [
  game({ id: 'a' }),
  game({ id: 'b', homeName: 'Lions', homeScore: 60, awayScore: 90, finishedAt: new Date(2026, 9, 31).getTime() }),
  game({ id: 'c', homeScore: 75, awayScore: 75, periodsPlayed: 5, overtimePeriods: 1, configName: 'Cup' }),
];

describe('gameStats', () => {
  it('calculates from the records', () => {
    expect(gameStats(games)).toMatchObject({ total: 3, homeWins: 1, awayWins: 1, ties: 1, averageCombined: 150 });
    expect(gameStats(games).highestScoring?.id).toBe('a');
    expect(gameStats([game({ id: 'x', homeScore: 100, awayScore: 99 }), ...games]).highestScoring?.id).toBe('x');
  });

  it('handles no games', () => {
    expect(gameStats([])).toMatchObject({ total: 0, averageCombined: 0, highestScoring: null });
  });
});

describe('filterGames', () => {
  it('searches teams and configurations, ignoring case', () => {
    expect(filterGames(games, 'lion', 'all').map((g) => g.id)).toEqual(['b']);
    expect(filterGames(games, ' CUP ', 'all').map((g) => g.id)).toEqual(['c']);
  });

  it('filters by result and overtime', () => {
    expect(filterGames(games, '', 'away').map((g) => g.id)).toEqual(['b']);
    expect(filterGames(games, '', 'tie').map((g) => g.id)).toEqual(['c']);
    expect(filterGames(games, '', 'overtime').map((g) => g.id)).toEqual(['c']);
  });

  it('puts the newest game first', () => {
    expect(filterGames(games, '', 'all')[0].id).toBe('b');
  });
});

describe('gamesToCsv', () => {
  it('writes headings and values', () => {
    const [heading, row] = gamesToCsv([game({})]).split('\r\n');
    expect(heading).toBe('Date,Time,Home Team,Away Team,Home Score,Away Score,Winner,Periods Played,Overtime Periods,Configuration,Period Minutes,Overtime Minutes,Shot Clock Seconds,Fouls For Bonus,Timeouts');
    expect(row).toBe('2026-10-30,19:05,Bulls,Hawks,80,70,Bulls,4,0,League,12,5,24,5,3');
  });

  it('quotes commas, quotes and newlines', () => {
    const row = gamesToCsv([game({ homeName: 'St. Mary, "Saints"', awayName: 'Line\nBreak' })]).split('\r\n').slice(1).join('\r\n');
    expect(row).toContain('"St. Mary, ""Saints"""');
    expect(row).toContain('"Line\nBreak"');
  });

  it('stops team names running as spreadsheet formulas', () => {
    const row = gamesToCsv([game({ homeName: '=HYPERLINK("x")', awayName: '@risk' })]).split('\r\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain(`'@risk`);
  });

  it('is just headings when there are no games', () => {
    expect(gamesToCsv([]).split('\r\n')).toHaveLength(1);
  });

  it('names the file by date', () => {
    expect(csvFilename(new Date(2026, 0, 5).getTime())).toBe('basketball-game-history-2026-01-05.csv');
  });
});
