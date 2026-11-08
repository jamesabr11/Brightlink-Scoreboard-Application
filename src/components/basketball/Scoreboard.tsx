import { useState } from 'react';
import { motion } from 'framer-motion';
import { inBonus, useBasketballStore } from '../../store/useBasketballStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { readableOn, themeStyle } from '../../lib/theme';
import type { ScoreboardTheme, Team } from '../../types/basketball';
import { ClockDisplay } from './ClockDisplay';
import { TeamLogo } from './ui';
import '@fontsource/bebas-neue/400.css';
import '@fontsource-variable/inter/wght.css';
import './scoreboard.css';

// Every layout is built from the same blocks below; CSS grid areas place them
// and rearrange them for wide, 4:3 and portrait screens (see index.css).

type Side = 'home' | 'away';

const useTeam = (side: Side) => useBasketballStore((state) => (side === 'home' ? state.homeTeam : state.awayTeam));

const usePeriod = () => {
  const { finished, isOvertime, period, gameConfig: { numberOfPeriods } } = useBasketballStore();
  const unit = { 2: 'Half', 4: 'Quarter' }[numberOfPeriods] ?? 'Period';
  if (finished) return { short: 'FINAL', long: 'Final', unit: 'Game', state: 'final' };
  if (isOvertime) return { short: `OT${period - numberOfPeriods}`, long: `Overtime ${period - numberOfPeriods}`, unit: 'Overtime', state: 'ot' };
  return { short: `${unit[0]}${period}`, long: `${unit} ${period} of ${numberOfPeriods}`, unit, state: 'regular' };
};

// Counts changes after mount, so change animations never play on first render.
const useChangeCount = (value: unknown) => {
  const [seen, setSeen] = useState({ value, count: 0 });
  if (seen.value !== value) setSeen({ value, count: seen.count + 1 });
  return seen.count;
};

const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
  return (words[0] ?? '?').slice(0, 3).toUpperCase();
};

const teamVars = (team: Team) =>
  ({ '--team': team.primaryColor, '--team-2': team.secondaryColor, '--on-team': readableOn(team.primaryColor) }) as React.CSSProperties;

const nameSize = (name: string) => (name.length > 18 ? 'small' : name.length > 11 ? 'medium' : 'large');

export const TeamBlock: React.FC<{ side: Side; children: React.ReactNode }> = ({ side, children }) => {
  const team = useTeam(side);
  return (
    <section className="sb-team" data-side={side} style={teamVars(team)} aria-label={`${side} team`}>
      {children}
    </section>
  );
};

export const Crest: React.FC<{ side: Side }> = ({ side }) => {
  const team = useTeam(side);
  return (
    <div className="sb-crest">
      <TeamLogo id={team.logo} alt="" className="sb-crest-img" fallback={<span className="sb-monogram">{initials(team.name)}</span>} />
    </div>
  );
};

const Ball: React.FC<{ side: Side }> = ({ side }) => {
  const on = useBasketballStore((state) => state.possession === side);
  return <span className="sb-ball" data-on={on} data-testid={on ? `${side}-possession` : undefined} />;
};

export const Ident: React.FC<{ side: Side; ball?: boolean }> = ({ side, ball }) => {
  const team = useTeam(side);
  return (
    <div className="sb-ident">
      <span className="sb-eyebrow">
        {side === 'home' ? 'Home' : 'Away'}
        {ball && <Ball side={side} />}
      </span>
      <span className="sb-name" data-size={nameSize(team.name)}>{team.name}</span>
    </div>
  );
};

export const Score: React.FC<{ side: Side }> = ({ side }) => {
  const team = useTeam(side);
  const other = useTeam(side === 'home' ? 'away' : 'home');
  const showLeading = useSettingsStore((state) => state.display.showLeadingBadge);
  const changes = useChangeCount(team.score);
  return (
    <div className="sb-score" data-digits={Math.min(String(team.score).length, 3)}>
      <motion.span
        key={team.score}
        data-testid={`${side}-score`}
        className="sb-score-num sb-digits"
        initial={changes > 0 ? { opacity: 0.25, y: '-0.08em' } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {team.score}
      </motion.span>
      <span className="sb-lead" data-on={showLeading && team.score > other.score} aria-hidden />
    </div>
  );
};

export const Fouls: React.FC<{ side: Side }> = ({ side }) => (
  <div className="sb-stat">
    <span data-testid={`${side}-fouls`} className="sb-stat-value sb-digits">{useTeam(side).fouls}</span>
    <span className="sb-eyebrow">Fouls</span>
  </div>
);

export const Timeouts: React.FC<{ side: Side; showValue?: boolean }> = ({ side, showValue }) => {
  const { timeouts } = useTeam(side);
  const max = useBasketballStore((state) => state.gameConfig.maxTimeouts);
  const pips = max > 0 && max <= 7;
  return (
    <div className="sb-stat">
      <span data-testid={`${side}-timeouts`} className={showValue || !pips ? 'sb-stat-value sb-digits' : 'sb-sr'}>{timeouts}</span>
      {pips && (
        <span className="sb-pips" aria-hidden>
          {Array.from({ length: max }, (_, i) => <span key={i} className="sb-pip" data-on={i < timeouts} />)}
        </span>
      )}
      <span className="sb-eyebrow">Timeouts</span>
    </div>
  );
};

// Always rendered, lit or unlit, so turning it on never moves anything.
export const Bonus: React.FC<{ side: Side }> = ({ side }) => {
  const team = useTeam(side);
  const config = useBasketballStore((state) => state.gameConfig);
  return <span className="sb-bonus" data-on={inBonus(team, config)}>Bonus</span>;
};

const Arrow: React.FC<{ side: Side }> = ({ side }) => {
  const on = useBasketballStore((state) => state.possession === side);
  return <span className="sb-arrow" data-dir={side} data-on={on} data-testid={on ? `${side}-possession` : undefined} aria-hidden />;
};

export const GameClock: React.FC = () => {
  const gameClock = useBasketballStore((state) => state.gameClock);
  return (
    <div className="sb-clock">
      <span className="sb-run" data-on={gameClock.isRunning} aria-hidden />
      <ClockDisplay clock={gameClock} themed />
    </div>
  );
};

export const Period: React.FC = () => {
  const period = usePeriod();
  return (
    <div className="sb-period" data-state={period.state}>
      <span className="sb-eyebrow">{period.unit}</span>
      <motion.span key={period.short} data-testid="display-period" className="sb-period-value" initial={{ opacity: 0, y: '0.25em' }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {period.short}
      </motion.span>
    </div>
  );
};

export const ShotClock: React.FC = () => {
  const shotClock = useBasketballStore((state) => state.shotClock);
  const show = useSettingsStore((state) => state.display.showShotClock);
  if (!show) return null;
  return (
    <div className="sb-shot">
      <span className="sb-eyebrow">Shot clock</span>
      <ClockDisplay clock={shotClock} kind="shot" themed />
    </div>
  );
};

const LeadCell: React.FC = () => {
  const { homeTeam, awayTeam } = useBasketballStore();
  const margin = Math.abs(homeTeam.score - awayTeam.score);
  const leader = homeTeam.score > awayTeam.score ? homeTeam : awayTeam;
  return (
    <div className="sb-stat sb-lead-cell">
      <span className="sb-lead-text">
        {margin ? <><span className="sb-truncate">{leader.name}</span><span className="sb-digits">+{margin}</span></> : 'Tied'}
      </span>
      <span className="sb-eyebrow">{margin ? 'Lead' : 'Score'}</span>
    </div>
  );
};

/* Layout A: Arena Classic */
const ArenaClassic: React.FC = () => {
  const team = (side: Side) => (
    <TeamBlock side={side}>
      <div className="sb-team-head"><Crest side={side} /><Ident side={side} /></div>
      <Score side={side} />
      <div className="sb-team-stats"><Fouls side={side} /><Timeouts side={side} /><div className="sb-stat"><Bonus side={side} /></div></div>
    </TeamBlock>
  );
  return (
    <>
      {team('home')}
      <section className="sb-center" aria-label="Game clock">
        <GameClock />
        <div className="sb-period-row"><Arrow side="home" /><Period /><Arrow side="away" /></div>
        <ShotClock />
      </section>
      {team('away')}
    </>
  );
};

/* Layout B: Modern Sports */
const ModernSports: React.FC = () => {
  const team = (side: Side) => (
    <TeamBlock side={side}>
      <div className="sb-team-head"><Crest side={side} /><Ident side={side} ball /></div>
      <Score side={side} />
      <div className="sb-team-meta"><Fouls side={side} /><Timeouts side={side} /><Bonus side={side} /></div>
    </TeamBlock>
  );
  return (
    <>
      {team('home')}
      {team('away')}
      <section className="sb-center" aria-label="Game clock">
        <Period />
        <GameClock />
        <ShotClock />
      </section>
    </>
  );
};

/* Layout C: Tournament */
const Tournament: React.FC = () => {
  const { homeTeam, awayTeam, gameConfig } = useBasketballStore();
  const period = usePeriod();
  const stats = (side: Side) => {
    const cells = [
      <Fouls key="fouls" side={side} />,
      <Timeouts key="timeouts" side={side} showValue />,
      <div key="bonus" className="sb-stat"><Bonus side={side} /><span className="sb-eyebrow">Free throws</span></div>,
    ];
    return <div className="sb-statgroup" data-side={side} style={teamVars(side === 'home' ? homeTeam : awayTeam)}>{side === 'home' ? cells : cells.reverse()}</div>;
  };
  return (
    <>
      <header className="sb-header">
        <span className="sb-header-mark" aria-hidden />
        <span className="sb-header-event sb-truncate">{gameConfig.name}</span>
        <span className="sb-header-period" data-state={period.state}>{period.long}</span>
      </header>
      <TeamBlock side="home"><Crest side="home" /><Ident side="home" /><Score side="home" /></TeamBlock>
      <section className="sb-center" aria-label="Game clock">
        <GameClock />
        <div className="sb-period-row"><Arrow side="home" /><Period /><Arrow side="away" /></div>
        <ShotClock />
      </section>
      <TeamBlock side="away"><Crest side="away" /><Ident side="away" /><Score side="away" /></TeamBlock>
      <section className="sb-stats" aria-label="Team stats">
        {stats('home')}
        <LeadCell />
        {stats('away')}
      </section>
    </>
  );
};

/* Layout D: Minimal */
const Minimal: React.FC = () => {
  const team = (side: Side) => (
    <TeamBlock side={side}>
      <Ident side={side} ball />
      <Score side={side} />
    </TeamBlock>
  );
  return (
    <>
      {team('home')}
      {team('away')}
      <section className="sb-center" aria-label="Game clock">
        <Period />
        <GameClock />
        <ShotClock />
      </section>
    </>
  );
};

/* Layout E: Broadcast */
const Broadcast: React.FC = () => {
  const team = (side: Side) => (
    <TeamBlock side={side}>
      <Crest side={side} />
      <Ident side={side} ball />
      <div className="sb-team-meta"><Fouls side={side} /><Timeouts side={side} /><Bonus side={side} /></div>
      <Score side={side} />
    </TeamBlock>
  );
  return (
    <>
      {team('home')}
      {team('away')}
      <section className="sb-center" aria-label="Game clock">
        <Period />
        <GameClock />
        <ShotClock />
      </section>
    </>
  );
};

export const Scoreboard: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => {
  const home = useBasketballStore((state) => state.homeTeam.primaryColor);
  const away = useBasketballStore((state) => state.awayTeam.primaryColor);
  return (
    <div className="sb-stage" data-testid="scoreboard" style={themeStyle(theme)}>
      <div className="sb-board" data-layout={theme.layout} style={{ '--home': home, '--away': away } as React.CSSProperties}>
        <span className="sb-stripe" aria-hidden />
        {theme.layout === 'classic' && <ArenaClassic />}
        {theme.layout === 'modern' && <ModernSports />}
        {theme.layout === 'tournament' && <Tournament />}
        {theme.layout === 'minimal' && <Minimal />}
        {theme.layout === 'broadcast' && <Broadcast />}
      </div>
    </div>
  );
};
