import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import { halfPeriods, pointsThrough } from '../../lib/periodScores';
import { useMediaUrl } from './useMedia';
import { themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import type { CountdownId, PresentationMode } from '../../types/presentation';
import type { MediaItem, Sponsor } from '../../types/media';
import { ClockDisplay } from './ClockDisplay';
import { MediaPlayer } from './MediaPlayer';
import { Bonus, Crest, Fouls, GameClock, Ident, Period, Score, ShotClock, TeamBlock, Timeouts } from './Scoreboard';
import './presentation.css';

// Pregame, Stadium and Halftime are built from the same blocks as the live
// scoreboard (exported by Scoreboard.tsx), so branding, themes and sizing stay
// in one place. Live mode is the unchanged Scoreboard. Live Sponsor mode shows
// sponsor images in a dedicated panel beside the scoreboard.

type Side = 'home' | 'away';

export const Stage: React.FC<{ theme: ScoreboardTheme; mode: PresentationMode; children: React.ReactNode }> = ({ theme, mode, children }) => {
  const home = useBasketballStore((state) => state.homeTeam.primaryColor);
  const away = useBasketballStore((state) => state.awayTeam.primaryColor);
  return (
    <div className="sb-stage" data-testid={`${mode}-view`} style={themeStyle(theme)}>
      <div className="sb-board pm-board" data-mode={mode} style={{ '--home': home, '--away': away } as React.CSSProperties}>
        <span className="sb-stripe" aria-hidden />
        {children}
      </div>
    </div>
  );
};

const MediaSlot: React.FC<{ region: 'sponsor' | 'media' }> = ({ region }) => (
  <aside className="pm-slot" data-region={region} aria-label={region === 'media' ? 'Media area' : 'Sponsor area'}>
    <MediaPlayer />
  </aside>
);

const Header: React.FC<{ title: string }> = ({ title }) => {
  const name = useBasketballStore((state) => state.gameConfig.name);
  return (
    <header className="pm-header">
      <span className="sb-eyebrow sb-truncate">{name}</span>
      <h1 className="pm-title">{title}</h1>
    </header>
  );
};

const Countdown: React.FC<{ id: CountdownId; label: string }> = ({ id, label }) => {
  const countdown = usePresentationStore((state) => state.countdowns[id]);
  if (countdown.duration <= 0) return null;
  return (
    <div className="pm-countdown" data-testid={`${id}-countdown`}>
      <span className="sb-eyebrow">{label}</span>
      <div className="sb-clock"><ClockDisplay clock={countdown} kind="countdown" themed /></div>
    </div>
  );
};

const HalfScore: React.FC<{ side: Side }> = ({ side }) => {
  const points = useBasketballStore((state) => pointsThrough(state.periodScores, halfPeriods(state.gameConfig.numberOfPeriods))[side]);
  return (
    <div className="sb-score" data-digits={Math.min(String(points).length, 3)}>
      <span data-testid={`${side}-half-score`} className="sb-score-num sb-digits">{points}</span>
    </div>
  );
};

export const PregameView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => (
  <Stage theme={theme} mode="pregame">
    <Header title="Game Day" />
    <TeamBlock side="home"><Crest side="home" /><Ident side="home" /></TeamBlock>
    <section className="pm-center" aria-label="Tip-off">
      <span className="pm-vs" aria-hidden>VS</span>
      <Countdown id="pregame" label="Tip-off in" />
    </section>
    <TeamBlock side="away"><Crest side="away" /><Ident side="away" /></TeamBlock>
    <MediaSlot region="sponsor" />
  </Stage>
);

export const StadiumView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => {
  const team = (side: Side) => (
    <TeamBlock side={side}>
      <div className="sb-team-head"><Crest side={side} /><Ident side={side} ball /></div>
      <Score side={side} />
      <div className="pm-meta"><Fouls side={side} /><Timeouts side={side} /><Bonus side={side} /></div>
    </TeamBlock>
  );
  return (
    <Stage theme={theme} mode="stadium">
      {team('home')}
      <section className="pm-center" aria-label="Game clock">
        <Period />
        <GameClock />
        <ShotClock />
      </section>
      {team('away')}
      <MediaSlot region="media" />
    </Stage>
  );
};

export const HalftimeView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => (
  <Stage theme={theme} mode="halftime">
    <Header title="Halftime" />
    <TeamBlock side="home"><Crest side="home" /><Ident side="home" /><HalfScore side="home" /></TeamBlock>
    <section className="pm-center" aria-label="Halftime">
      <span className="sb-eyebrow">First half</span>
      <Countdown id="halftime" label="Second half in" />
    </section>
    <TeamBlock side="away"><Crest side="away" /><Ident side="away" /><HalfScore side="away" /></TeamBlock>
    <MediaSlot region="sponsor" />
  </Stage>
);

// Live Sponsor mode: scoreboard with a dedicated sponsor rotation panel
export const LiveSponsorView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => {
  const home = useBasketballStore((state) => state.homeTeam.primaryColor);
  const away = useBasketballStore((state) => state.awayTeam.primaryColor);
  const items = useMediaStore((state) => state.items);
  const sponsors = useMediaStore((state) => state.sponsors);
  const queue = usePlaybackStore((state) => state.queue);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);

  // Get current sponsor data from queue
  const currentSponsorId = queue[currentIndex];
  const currentItem = currentSponsorId ? items.find((i) => i.id === currentSponsorId) : undefined;
  const sponsor = currentItem?.sponsorId ? sponsors.find((s) => s.id === currentItem.sponsorId) : undefined;

  return (
    <div className="sb-stage" data-testid="livesponsor-view" style={themeStyle(theme)}>
      <div className="sb-board" data-layout="livesponsor" style={{ '--home': home, '--away': away } as React.CSSProperties}>
        <span className="sb-stripe" aria-hidden />
        {/* Left team panel */}
        <TeamBlock side="home">
          <div className="sb-team-head"><Crest side="home" /><Ident side="home" /></div>
          <Score side="home" />
          <div className="sb-team-meta"><Fouls side="home" /><Timeouts side="home" /><Bonus side="home" /></div>
        </TeamBlock>
        {/* Sponsor rotation panel */}
        <SponsorPanel sponsor={sponsor} item={currentItem} />
        {/* Right center area (period/clock/shot) */}
        <section className="sb-center" aria-label="Game clock">
          <Period />
          <GameClock />
          <ShotClock />
        </section>
        {/* Right team panel */}
        <TeamBlock side="away">
          <div className="sb-team-head"><Crest side="away" /><Ident side="away" /></div>
          <Score side="away" />
          <div className="sb-team-meta"><Fouls side="away" /><Timeouts side="away" /><Bonus side="away" /></div>
        </TeamBlock>
      </div>
    </div>
  );
};

// Sponsor panel component showing current sponsor logo and image
const SponsorPanel: React.FC<{ sponsor: Sponsor | undefined; item: MediaItem | undefined }> = ({ sponsor, item }) => {
  const { url, missing } = useMediaUrl(item?.id ?? null, 'files');

  if (missing || !url) {
    // Fallback if media is missing
    return (
      <div className="sb-sponsor-panel">
        <div className="sb-sponsor-image" />
        <div className="sb-sponsor-badge">
          {sponsor?.logoId ? (
            <SponsorLogo logoId={sponsor.logoId} />
          ) : null}
          <span className="sb-sponsor-name">{sponsor?.name ?? 'Sponsor'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-sponsor-panel">
      <div className="sb-sponsor-image">
        {item?.kind === 'video' ? (
          <video src={url} className="sb-sponsor-image" autoPlay playsInline loop controls muted={false} />
        ) : (
          <img src={url} alt={item?.name ?? 'Sponsor'} className="sb-sponsor-image" />
        )}
      </div>
      {sponsor?.logoId || sponsor?.name ? (
        <div className="sb-sponsor-badge">
          {sponsor.logoId ? <SponsorLogo logoId={sponsor.logoId} /> : null}
          <span className="sb-sponsor-name">{sponsor.name}</span>
        </div>
      ) : null}
    </div>
  );
};

// Individual sponsor logo
const SponsorLogo: React.FC<{ logoId: string }> = ({ logoId }) => {
  const { url } = useMediaUrl(logoId, 'files');
  return url ? <img src={url} alt="Logo" className="sb-sponsor-logo" /> : null;
};
