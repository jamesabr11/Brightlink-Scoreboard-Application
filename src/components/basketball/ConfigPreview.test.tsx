import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { themePreset } from '../../lib/theme';
import { DEFAULT_SPONSOR_LAYOUT } from '../../store/usePresentationStore';
import { useBasketballStore } from '../../store/useBasketballStore';
import { ConfigPreview } from './ConfigPreview';

const config = {
  ...useBasketballStore.getState().gameConfig,
  name: 'Cup', homeTeam: { name: 'Lions', primaryColor: '#112233' }, awayTeam: { name: 'Tigers' }, theme: themePreset('modern'),
};

describe('ConfigPreview', () => {
  it("shows the configuration's own scoreboard: teams, scores, clock, period, fouls and possession", () => {
    const html = renderToStaticMarkup(<ConfigPreview config={config} />);
    for (const text of ['Lions', 'Tigers', '>54<', '>48<', 'Fouls', 'Timeouts']) expect(html).toContain(text);
    expect(html).toContain('data-testid="game-clock"');
    expect(html).toContain('data-testid="home-possession"');
    expect(html).toContain('--home:#112233');
  });
  it('uses the saved custom layout, with or without sponsor sections', () => {
    const withSections = renderToStaticMarkup(<ConfigPreview config={config} layout={{ ...DEFAULT_SPONSOR_LAYOUT, sections: 2 }} />);
    expect(withSections).toContain('data-region="sponsor"');
    expect(withSections.match(/class="pm-section"/g)).toHaveLength(2);
    const without = renderToStaticMarkup(<ConfigPreview config={config} layout={{ ...DEFAULT_SPONSOR_LAYOUT, sponsorSections: false }} />);
    expect(without).not.toContain('data-region="sponsor"');
    expect(without).toContain('data-place="none"');
  });
});
