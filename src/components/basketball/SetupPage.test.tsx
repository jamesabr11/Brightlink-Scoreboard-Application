import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SetupPage } from './SetupPage';

describe('Game Setup', () => {
  const html = renderToStaticMarkup(<SetupPage />);
  it('keeps the game configuration', () => {
    for (const text of ['Game Settings', 'Home Team', 'Away Team', 'Restore timeouts now', 'Scoreboard Appearance']) expect(html).toContain(text);
  });
  it('holds every former Settings option; sound and display sit in Game Settings, before the defaults', () => {
    const texts = ['New Game Defaults', 'New Game With Defaults', 'Restore Defaults', 'Default Game Rules', 'Default Scoreboard Theme', 'Enable sound effects', 'Volume', 'Period-ending alert', 'Game-ending alert', 'Shot clock warning', 'Test Sound', 'Show shot clock', 'Show LEADING badge'];
    for (const text of texts) expect(html).toContain(text);
    expect(html).not.toContain('Defaults &amp; Preferences');
    expect(html.indexOf('Scoreboard Appearance')).toBeLessThan(html.indexOf('Enable sound effects'));
    expect(html.indexOf('Show LEADING badge')).toBeLessThan(html.indexOf('New Game Defaults'));
  });
});
