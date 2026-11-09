import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import { halfPeriods, pointsThrough } from '../../lib/periodScores';
import { useMediaUrl } from './useMedia';
import { themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import type { CountdownId, PresentationMode } from '../../types/presentation';
import { ClockDisplay } from './ClockDisplay';
import { MediaPlayer } from './MediaPlayer';
import { Bonus, Crest, Fouls, GameClock, Ident, Period, Score, ShotClock, TeamBlock, Timeouts } from './Scoreboard';
import './presentation.css';

// Pregame, Stadium and Halftime are built from the same blocks as the live
// scoreboard (exported by Scoreboard.tsx), so branding, themes and sizing stay
// in one place. Live mode is the unchanged Scoreboard. Live Sponsor adds a resizable
// sponsor media area to the Stadium scoreboard.

type Side = 'home' | 'away';

export const Stage: React.FC<{ theme: ScoreboardTheme; mode: PresentationMode; place?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ theme, mode, place, style, children }) => {
  const home = useBasketballStore((state) => state.homeTeam.primaryColor);
  const away = useBasketballStore((state) => state.awayTeam.primaryColor);
  return (
    <div className="sb-stage" data-testid={`${mode}-view`} style={themeStyle(theme)}>
      <div className="sb-board pm-board" data-mode={mode} data-place={place} style={{ '--home': home, '--away': away, ...style } as React.CSSProperties}>
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

// Live Sponsor mode: the Stadium scoreboard plus a media area the operator can
// resize and move (presentation store → sponsorLayout, synced to the display).
const SponsorBadge: React.FC = () => {
  const { queue, currentIndex } = usePlaybackStore();
  const items = useMediaStore((state) => state.items);
  const sponsors = useMediaStore((state) => state.sponsors);
  const id = currentIndex >= 0 ? queue[currentIndex] : undefined;
  const sponsor = sponsors.find((s) => id && (s.imageIds.includes(id) || items.find((i) => i.id === id)?.sponsorId === s.id));
  const { url } = useMediaUrl(sponsor?.logoId ?? null, 'files');
  if (!sponsor) return null;
  return (
    <div className="pm-sponsor-badge">
      {url && <img src={url} alt="" />}
      <span className="sb-truncate">{sponsor.name}</span>
    </div>
  );
};

export const LiveSponsorView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => {
  const { placement, size, fit } = usePresentationStore((state) => state.sponsorLayout);
  const side = placement === 'left' || placement === 'right';
  const rest = 100 - size;
  // Grid tracks come from the operator's size; areas from the placement (presentation.css).
  const tracks = (side ? { gridTemplateColumns: placement === 'right' ? `${rest / 2}fr ${rest / 2}fr ${size}fr` : `${size}fr ${rest / 2}fr ${rest / 2}fr`, gridTemplateRows: '1fr 0.55fr' }
    : { gridTemplateRows: placement === 'bottom' ? `${rest}fr ${size}fr` : `${size}fr ${rest}fr` }) as React.CSSProperties;
  const team = (s: Side) => (
    <TeamBlock side={s}>
      <div className="sb-team-head"><Crest side={s} /><Ident side={s} ball /></div>
      <Score side={s} />
      <div className="pm-meta"><Fouls side={s} /><Timeouts side={s} /><Bonus side={s} /></div>
    </TeamBlock>
  );
  return (
    <Stage theme={theme} mode="livesponsor" place={placement} style={tracks}>
      {team('home')}
      <section className="pm-center" aria-label="Game clock">
        <Period />
        <GameClock />
        <ShotClock />
      </section>
      {team('away')}
      <aside className="pm-slot" data-region="sponsor" data-fit={fit} aria-label="Sponsor area">
        <MediaPlayer />
        <SponsorBadge />
      </aside>
    </Stage>
  );
};
