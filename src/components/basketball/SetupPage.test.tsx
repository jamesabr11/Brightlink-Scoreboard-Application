import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SetupPage } from './SetupPage';

describe('Game Setup', () => {
  const html = renderToStaticMarkup(<SetupPage />);
  it('keeps the game configuration', () => {
    for (const text of ['This Game', 'Home Team', 'Away Team', 'Restore timeouts now', 'Scoreboard Appearance']) expect(html).toContain(text);
  });
  it('also holds every former Settings option, after the game-specific sections', () => {
    const texts = ['Defaults &amp; Preferences', 'New Game With Defaults', 'Restore Defaults', 'Default Game Rules', 'Default Scoreboard Theme', 'Enable sound effects', 'Volume', 'Period-ending alert', 'Game-ending alert', 'Shot clock warning', 'Test Sound', 'Show shot clock', 'Show LEADING badge'];
    for (const text of texts) expect(html).toContain(text);
    expect(html.indexOf('Scoreboard Appearance')).toBeLessThan(html.indexOf('Defaults &amp; Preferences'));
  });
});
