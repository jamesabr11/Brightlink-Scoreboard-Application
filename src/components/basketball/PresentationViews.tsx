import { useBasketballStore } from '../../store/useBasketballStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import { halfPeriods, pointsThrough } from '../../lib/periodScores';
import { themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import type { CountdownId, PresentationMode } from '../../types/presentation';
import { ClockDisplay } from './ClockDisplay';
import { MediaPlayer } from './MediaPlayer';
import { Bonus, Crest, Fouls, GameClock, Ident, Period, Score, ShotClock, TeamBlock, Timeouts } from './Scoreboard';
import './presentation.css';

// Pregame, Stadium and Halftime are built from the same blocks as the live
// scoreboard (exported by Scoreboard.tsx), so branding, themes and sizing stay
// in one place. Live mode is the unchanged Scoreboard.

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
