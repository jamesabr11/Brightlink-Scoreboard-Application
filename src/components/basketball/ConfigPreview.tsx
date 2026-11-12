import { useMemo } from 'react';
import { sampleGame } from '../../lib/configPreview';
import type { GameConfig } from '../../types/basketball';
import type { SponsorLayout } from '../../types/presentation';
import { PreviewContext } from './previewContext';
import { LiveSponsorView } from './PresentationViews';
import { Scoreboard } from './Scoreboard';

/** The configuration's complete scoreboard, drawn by the same components as /display. */
export const ConfigPreview: React.FC<{ config: GameConfig; layout?: SponsorLayout }> = ({ config, layout }) => {
  const value = useMemo(() => ({ game: sampleGame(config), layout: layout ?? null }), [config, layout]);
  return (
    <PreviewContext.Provider value={value}>
      <div className="pointer-events-none overflow-hidden rounded-md border border-neutral-600" role="img" aria-label={`Preview of ${config.name}`}>
        {/* A saved custom layout is the Live Sponsor display; otherwise the configuration's own scoreboard. */}
        {layout ? <LiveSponsorView theme={config.theme} snapshot /> : <Scoreboard theme={config.theme} />}
      </div>
    </PreviewContext.Provider>
  );
};
