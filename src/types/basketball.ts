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

export interface GameClock {
  periodDuration: number; // in seconds
  remainingTime: number; // in seconds
  isRunning: boolean;
  startTimestamp: number | null;
}

export interface ShotClock {
  duration: number; // 24 or 14
  remainingTime: number;
  isRunning: boolean;
  startTimestamp: number | null;
}

export interface GameConfig {
  id: string;
  name: string;
  homeTeam: Partial<Team>;
  awayTeam: Partial<Team>;
  periodDuration: number; // in minutes
  overtimeDuration: number; // in minutes
  numberOfPeriods: number;
  shotClockDuration: number;
  foulsForBonus: number;
  maxTimeouts: number;
  createdAt: number;
}

export interface BasketballState {
  homeTeam: Team;
  awayTeam: Team;
  period: number;
  isOvertime: boolean;
  gameClock: GameClock;
  shotClock: ShotClock;
  possession: 'home' | 'away' | null;
  bonusHome: boolean;
  bonusAway: boolean;
  gameConfig: GameConfig;
  savedConfigs: GameConfig[];
  history: HistoryEntry[];
  showDisplay: boolean;
}

export interface HistoryEntry {
  timestamp: number;
  action: string;
  previousState: Partial<BasketballState>;
}
