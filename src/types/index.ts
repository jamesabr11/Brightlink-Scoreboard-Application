export interface Team {
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  score: number;
  timeouts: number;
  logo?: string;
}

export interface FootballState {
  homeTeam: Team;
  awayTeam: Team;
  quarter: number;
  clock: string;
  isClockRunning: boolean;
  down: number;
  toGo: string;
  ballOn: string;
  possession: 'home' | 'away' | null;
  showScorebug: boolean;
}