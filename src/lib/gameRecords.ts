import type { BasketballState, GameRecord } from '../types/basketball';

export const buildGameRecord = (state: BasketballState, id: string, finishedAt: number): GameRecord => ({
  id,
  finishedAt,
  homeName: state.homeTeam.name,
  awayName: state.awayTeam.name,
  homeScore: state.homeTeam.score,
  awayScore: state.awayTeam.score,
  periodsPlayed: state.period,
  overtimePeriods: Math.max(0, state.period - state.gameConfig.numberOfPeriods),
  configName: state.gameConfig.name,
  numberOfPeriods: state.gameConfig.numberOfPeriods,
  periodDuration: state.gameConfig.periodDuration,
  overtimeDuration: state.gameConfig.overtimeDuration,
  shotClockDuration: state.gameConfig.shotClockDuration,
  foulsForBonus: state.gameConfig.foulsForBonus,
  maxTimeouts: state.gameConfig.maxTimeouts,
});

export const gameWinner = (game: GameRecord) =>
  game.homeScore > game.awayScore ? 'home' : game.awayScore > game.homeScore ? 'away' : 'tie';

export const gameStats = (games: GameRecord[]) => {
  const combined = (game: GameRecord) => game.homeScore + game.awayScore;
  return {
    total: games.length,
    homeWins: games.filter((game) => gameWinner(game) === 'home').length,
    awayWins: games.filter((game) => gameWinner(game) === 'away').length,
    ties: games.filter((game) => gameWinner(game) === 'tie').length,
    averageCombined: games.length ? games.reduce((sum, game) => sum + combined(game), 0) / games.length : 0,
    highestScoring: games.reduce<GameRecord | null>((best, game) => (!best || combined(game) > combined(best) ? game : best), null),
  };
};

export type GameFilter = 'all' | 'home' | 'away' | 'tie' | 'overtime';

export const filterGames = (games: GameRecord[], search: string, filter: GameFilter) => {
  const term = search.trim().toLowerCase();
  return games
    .filter((game) => !term || [game.homeName, game.awayName, game.configName].some((text) => text.toLowerCase().includes(term)))
    .filter((game) => filter === 'all' || (filter === 'overtime' ? game.overtimePeriods > 0 : gameWinner(game) === filter))
    .sort((a, b) => b.finishedAt - a.finishedAt);
};

const pad = (value: number) => String(value).padStart(2, '0');
export const formatDate = (time: number) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
export const formatTime = (time: number) => {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Quotes per RFC 4180. A leading apostrophe stops spreadsheets running a team
// name such as "=HYPERLINK(...)" as a formula.
const csvCell = (value: string | number) => {
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const CSV_COLUMNS: [string, (game: GameRecord) => string | number][] = [
  ['Date', (game) => formatDate(game.finishedAt)],
  ['Time', (game) => formatTime(game.finishedAt)],
  ['Home Team', (game) => game.homeName],
  ['Away Team', (game) => game.awayName],
  ['Home Score', (game) => game.homeScore],
  ['Away Score', (game) => game.awayScore],
  ['Winner', (game) => ({ home: game.homeName, away: game.awayName, tie: 'Tie' })[gameWinner(game)]],
  ['Periods Played', (game) => game.periodsPlayed],
  ['Overtime Periods', (game) => game.overtimePeriods],
  ['Configuration', (game) => game.configName],
  ['Period Minutes', (game) => game.periodDuration],
  ['Overtime Minutes', (game) => game.overtimeDuration],
  ['Shot Clock Seconds', (game) => game.shotClockDuration],
  ['Fouls For Bonus', (game) => game.foulsForBonus],
  ['Timeouts', (game) => game.maxTimeouts],
];

export const gamesToCsv = (games: GameRecord[]) =>
  [CSV_COLUMNS.map(([heading]) => heading), ...games.map((game) => CSV_COLUMNS.map(([, value]) => value(game)))]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

export const csvFilename = (now: number) => `basketball-game-history-${formatDate(now)}.csv`;

export const downloadCsv = (games: GameRecord[]) => {
  // The BOM makes Excel read team names as UTF-8.
  const url = URL.createObjectURL(new Blob([`\uFEFF${gamesToCsv(games)}\r\n`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFilename(Date.now());
  link.click();
  URL.revokeObjectURL(url);
};
