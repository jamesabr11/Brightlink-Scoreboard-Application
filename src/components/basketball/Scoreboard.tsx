import { motion } from 'framer-motion';
import { inBonus, useBasketballStore } from '../../store/useBasketballStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { THEMES, readableOn, themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import { ClockDisplay } from './ClockDisplay';
import { TeamLogo } from './ui';

type Side = 'home' | 'away';

const useTeam = (side: Side) => useBasketballStore((state) => (side === 'home' ? state.homeTeam : state.awayTeam));

const usePeriodLabel = () => {
  const { finished, isOvertime, period, gameConfig: { numberOfPeriods } } = useBasketballStore();
  if (finished) return 'FINAL';
  if (isOvertime) return `OT${period - numberOfPeriods}`;
  return `${{ 2: 'H', 4: 'Q' }[numberOfPeriods] ?? 'P'}${period}`;
};

const TeamArea: React.FC<{ side: Side; className: string; children: React.ReactNode }> = ({ side, className, children }) => {
  const team = useTeam(side);
  const style = { '--team': team.primaryColor, '--on-team': readableOn(team.primaryColor) } as React.CSSProperties;
  return <div className={`sb-panel sb-team ${className}`} style={style}>{children}</div>;
};

const Identity: React.FC<{ side: Side }> = ({ side }) => {
  const team = useTeam(side);
  return (
    <div className="sb-identity">
      <TeamLogo id={team.logo} alt="" className="sb-logo" />
      <div className="sb-name" data-size={team.name.length > 20 ? 'small' : team.name.length > 12 ? 'medium' : 'large'}><span>{team.name}</span></div>
    </div>
  );
};

const Score: React.FC<{ side: Side }> = ({ side }) => {
  const { score } = useTeam(side);
  return (
    <motion.div key={score} data-testid={`${side}-score`} data-digits={String(score).length} className="sb-score sb-digits" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {score}
    </motion.div>
  );
};

const Stats: React.FC<{ side: Side }> = ({ side }) => {
  const team = useTeam(side);
  const maxTimeouts = useBasketballStore((state) => state.gameConfig.maxTimeouts);
  return (
    <div className="sb-stats">
      <div>
        <div className="sb-label">Fouls</div>
        <div data-testid={`${side}-fouls`} className="sb-stat sb-digits">{team.fouls}</div>
      </div>
      <div>
        <div className="sb-label">Timeouts</div>
        <div data-testid={`${side}-timeouts`} className="sb-stat sb-digits">{team.timeouts}</div>
        <div className="sb-dots" aria-hidden>
          {Array.from({ length: maxTimeouts }, (_, i) => <span key={i} data-on={i < team.timeouts} />)}
        </div>
      </div>
    </div>
  );
};

const Badges: React.FC<{ side: Side }> = ({ side }) => {
  const { homeTeam, awayTeam, possession, gameConfig } = useBasketballStore();
  const showLeading = useSettingsStore((state) => state.display.showLeadingBadge);
  const [team, other] = side === 'home' ? [homeTeam, awayTeam] : [awayTeam, homeTeam];
  return (
    <div className="sb-badges">
      {showLeading && team.score > other.score && <span className="sb-badge sb-badge-quiet">LEADING</span>}
      {inBonus(team, gameConfig) && <span className="sb-badge sb-badge-strong">BONUS</span>}
      {possession === side && <span data-testid={`${side}-possession`} className="sb-badge">{side === 'home' ? '◀ BALL' : 'BALL ▶'}</span>}
    </div>
  );
};

const GameClockPanel: React.FC = () => {
  const gameClock = useBasketballStore((state) => state.gameClock);
  const label = usePeriodLabel();
  return (
    <div className="sb-panel sb-game">
      <div className="sb-game-clock"><ClockDisplay clock={gameClock} themed /></div>
      <div className="sb-period">{label}</div>
    </div>
  );
};

const ShotClockPanel: React.FC = () => {
  const shotClock = useBasketballStore((state) => state.shotClock);
  const show = useSettingsStore((state) => state.display.showShotClock);
  if (!show) return null;
  return (
    <div className="sb-panel sb-shot">
      <div className="sb-label">Shot Clock</div>
      <div className="sb-shot-clock"><ClockDisplay clock={shotClock} kind="shot" themed /></div>
    </div>
  );
};

const Classic: React.FC = () => {
  const card = (side: Side) => (
    <TeamArea side={side} className="sb-card">
      <Identity side={side} />
      <Score side={side} />
      <Stats side={side} />
      <Badges side={side} />
    </TeamArea>
  );
  return (
    <div className="sb-classic">
      {card('home')}
      <div className="sb-center">
        <GameClockPanel />
        <ShotClockPanel />
      </div>
      {card('away')}
    </div>
  );
};

const Modern: React.FC = () => {
  const block = (side: Side) => (
    <TeamArea side={side} className="sb-card">
      <Identity side={side} />
      <Score side={side} />
      <Badges side={side} />
    </TeamArea>
  );
  return (
    <div className="sb-modern">
      {block('home')}
      {block('away')}
      <div className="sb-strip">
        <GameClockPanel />
        <ShotClockPanel />
      </div>
    </div>
  );
};

const Tournament: React.FC = () => {
  const { homeTeam, awayTeam, period, isOvertime, finished, gameConfig } = useBasketballStore();
  const margin = Math.abs(homeTeam.score - awayTeam.score);
  const leader = homeTeam.score > awayTeam.score ? homeTeam.name : awayTeam.name;
  const periodText = finished ? 'Final' : isOvertime ? `Overtime ${period - gameConfig.numberOfPeriods}` : `Period ${period} of ${gameConfig.numberOfPeriods}`;
  const card = (side: Side) => (
    <TeamArea side={side} className="sb-card">
      <Identity side={side} />
      <Score side={side} />
      <Badges side={side} />
    </TeamArea>
  );
  return (
    <div className="sb-tournament">
      <div className="sb-header">
        <span className="sb-truncate">{gameConfig.name}</span>
        <span className="sb-nowrap">{periodText}</span>
      </div>
      <div className="sb-main">
        {card('home')}
        <div className="sb-center">
          <GameClockPanel />
          <ShotClockPanel />
        </div>
        {card('away')}
      </div>
      <div className="sb-footer">
        <div className="sb-panel"><Stats side="home" /></div>
        <div className="sb-panel sb-margin">
          <div className="sb-label">{margin ? 'Lead' : 'Score'}</div>
          <div className="sb-truncate">{margin ? `${leader} +${margin}` : 'Tied'}</div>
        </div>
        <div className="sb-panel"><Stats side="away" /></div>
      </div>
    </div>
  );
};

export const Scoreboard: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => (
  <div className="sb-stage" data-testid="scoreboard" style={themeStyle(theme)}>
    <div className="sb-board" data-layout={theme.layout} data-fill={THEMES[theme.themeId].teamFill}>
      {theme.layout === 'classic' && <Classic />}
      {theme.layout === 'modern' && <Modern />}
      {theme.layout === 'tournament' && <Tournament />}
    </div>
  </div>
);
