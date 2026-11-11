import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { themePreset } from '../../lib/theme';
import { LiveSponsorView } from './PresentationViews';

const html = (id: Parameters<typeof themePreset>[0]) => renderToStaticMarkup(<LiveSponsorView theme={themePreset(id)} preview />);

describe('Live Sponsor appearance', () => {
  it.each(['modern', 'minimal', 'tournament', 'broadcast'] as const)('%s preset styles the team blocks', (id) => {
    expect(html(id)).toContain(`data-layout="${id}"`);
  });
  it('classic keeps the base block', () => {
    expect(html('classic')).not.toContain('data-layout');
  });
});
