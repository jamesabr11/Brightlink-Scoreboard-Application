import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SetupPage } from './SetupPage';
import { useBasketballStore } from '../../store/useBasketballStore';
import { pickRules, useSettingsStore } from '../../store/useSettingsStore';

describe('Game Setup', () => {
  const html = renderToStaticMarkup(<SetupPage />);
  it('keeps the game configuration', () => {
    for (const text of ['Game Settings', 'Save Settings', 'Home Team', 'Away Team', 'Restore timeouts now', 'Scoreboard Appearance']) expect(html).toContain(text);
  });
  it('holds every former Settings option; sound and display sit in Game Settings', () => {
    const texts = ['Enable sound effects', 'Volume', 'Period-ending alert', 'Game-ending alert', 'Shot clock warning', 'Test Sound', 'Show shot clock', 'Show LEADING badge'];
    for (const text of texts) expect(html).toContain(text);
    expect(html).not.toContain('Defaults &amp; Preferences');
    expect(html.indexOf('Scoreboard Appearance')).toBeLessThan(html.indexOf('Enable sound effects'));
    expect(html).not.toContain('New Game Defaults');
  });
  it('keeps Save Settings apart from saved configurations', () => {
    const game = useBasketballStore.getState();
    game.updateGameConfig({ foulsForBonus: 7 });
    const settings = useSettingsStore.getState();
    expect(settings.rules.foulsForBonus).not.toBe(7); // editing the game does not save it
    settings.updateRules(pickRules(useBasketballStore.getState().gameConfig));
    expect(useSettingsStore.getState().rules.foulsForBonus).toBe(7);
    expect(useBasketballStore.getState().savedConfigs.some((c) => c.foulsForBonus === 7)).toBe(false);
  });
});
