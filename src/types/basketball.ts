export interface Team {
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  score: number;
  fouls: number;
  timeouts: number;
  logo?: string;
}

export type TeamStats = Pick<Team, 'score' | 'fouls' | 'timeouts'>;

export interface GameClock {
  periodDuration: number; // in seconds
  remainingTime: number; // in seconds, as of startTimestamp when running
  isRunning: boolean;
  startTimestamp: number | null;
}

export interface ShotClock {
  duration: number; // 24 or 14
  remainingTime: number; // in seconds, as of startTimestamp when running
  isRunning: boolean;
  startTimestamp: number | null;
}

export type ThemeId = 'classic' | 'modern' | 'minimal' | 'tournament' | 'broadcast' | 'livesponsor' | 'custom';
export type LayoutId = 'classic' | 'modern' | 'tournament' | 'minimal' | 'broadcast' | 'livesponsor';
export type FontId = 'athletic' | 'sans' | 'mono' | 'rounded';
export type BackgroundId = 'solid' | 'gradient' | 'court';

export interface ScoreboardTheme {
  themeId: ThemeId;
  layout: LayoutId;
  mode: 'dark' | 'light';
  accent: string;
  font: FontId;
  background: BackgroundId;
  surface: string; // base color of the custom theme
}

export interface GameRules {
  periodDuration: number; // in minutes
  overtimeDuration: number; // in minutes
  numberOfPeriods: number;
  shotClockDuration: number;
  shotClockShort: number; // reset after an offensive rebound
  foulsForBonus: number;
  maxTimeouts: number;
  resetFoulsEachPeriod: boolean;
  restoreTimeoutsEachPeriod: boolean;
}

export interface GameConfig extends GameRules {
  id: string;
  name: string;
  homeTeam: Partial<Team>;
  awayTeam: Partial<Team>;
  theme: ScoreboardTheme;
  createdAt: number;
  layoutId?: string; // a custom layout saved in the Layout Editor (presentation store) that loads with this configuration
}

export interface GameRecord {
  id: string;
  finishedAt: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  periodsPlayed: number;
  overtimePeriods: number;
  configName: string;
  numberOfPeriods: number;
  periodDuration: number;
  overtimeDuration: number;
  shotClockDuration: number;
  foulsForBonus: number;
  maxTimeouts: number;
}

export interface AppSettings {
  rules: GameRules;
  theme: ScoreboardTheme;
  sound: { enabled: boolean; volume: number; periodEnd: boolean; gameEnd: boolean; shotWarning: boolean };
  display: { showShotClock: boolean; showLeadingBadge: boolean };
}

// Points scored in one period; index 0 is period 1. Their sum is always the team score.
export interface PeriodScore {
  home: number;
  away: number;
}

export interface BasketballState {
  homeTeam: Team;
  awayTeam: Team;
  period: number;
  isOvertime: boolean;
  gameClock: GameClock;
  shotClock: ShotClock;
  possession: 'home' | 'away' | null;
  periodScores: PeriodScore[];
  gameConfig: GameConfig;
  savedConfigs: GameConfig[];
  history: HistoryEntry[];
  lastAction: string | null;
  finished: boolean;
  gameRecordId: string | null; // set once this game has been saved to history
}

export interface HistoryEntry {
  timestamp: number;
  action: string;
  previousState: Partial<Pick<BasketballState, 'period' | 'isOvertime' | 'gameClock' | 'shotClock' | 'possession' | 'periodScores' | 'gameConfig' | 'finished' | 'gameRecordId'>> & {
    homeTeam?: Partial<Team>;
    awayTeam?: Partial<Team>;
  };
}
