import { describe, expect, it } from 'vitest';
import { useBasketballStore } from '../store/useBasketballStore';
import { sampleGame } from './configPreview';

describe('sampleGame', () => {
  it('is built from the configuration, not the live game', () => {
    const live = useBasketballStore.getState();
    const config = {
      ...live.gameConfig, name: 'Cup', numberOfPeriods: 2, periodDuration: 18, maxTimeouts: 4, foulsForBonus: 7,
      homeTeam: { name: 'Lions', primaryColor: '#112233' }, awayTeam: { name: 'Tigers', secondaryColor: '#abcdef' },
    };
    const game = sampleGame(config);
    expect(game.homeTeam).toMatchObject({ name: 'Lions', primaryColor: '#112233', score: 54 });
    expect(game.awayTeam).toMatchObject({ name: 'Tigers', secondaryColor: '#abcdef', fouls: 7, timeouts: 4 });
    expect(game.period).toBe(2);
    expect(game.gameClock).toMatchObject({ periodDuration: 18 * 60, remainingTime: 272, isRunning: false });
    expect(game.gameConfig).toBe(config);
    expect(live.homeTeam.name).not.toBe('Lions');
  });
});
