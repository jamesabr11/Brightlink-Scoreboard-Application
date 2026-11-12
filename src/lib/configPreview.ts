import { useBasketballStore } from '../store/useBasketballStore';
import type { BasketballState, GameConfig, Team } from '../types/basketball';

const team = (saved: Partial<Team>, fallback: string, stats: Pick<Team, 'score' | 'fouls' | 'timeouts'>): Team => ({
  name: fallback, abbreviation: '', primaryColor: '#C8102E', secondaryColor: '#FFFFFF', ...saved, ...stats,
});

// A mid-game moment built from the configuration alone (the live game is never read), so every card shows its own
// teams, colours, rules and appearance. Scores, clock and fouls are sample values.
export const sampleGame = (config: GameConfig): BasketballState => {
  const period = Math.min(config.numberOfPeriods, config.numberOfPeriods > 2 ? 3 : 2);
  const periodSeconds = config.periodDuration * 60;
  return {
    ...useBasketballStore.getState(),
    homeTeam: team(config.homeTeam, 'Home', { score: 54, fouls: Math.min(3, config.foulsForBonus), timeouts: Math.max(0, config.maxTimeouts - 1) }),
    awayTeam: team(config.awayTeam, 'Away', { score: 48, fouls: config.foulsForBonus, timeouts: config.maxTimeouts }),
    period,
    isOvertime: false,
    finished: false,
    possession: 'home',
    gameClock: { periodDuration: periodSeconds, remainingTime: Math.min(272, periodSeconds), isRunning: false, startTimestamp: null },
    shotClock: { duration: config.shotClockDuration, remainingTime: Math.min(14, config.shotClockDuration), isRunning: false, startTimestamp: null },
    periodScores: [],
    gameConfig: config,
  };
};
