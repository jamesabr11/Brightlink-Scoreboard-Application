import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import { halfPeriods, pointsThrough } from '../../lib/periodScores';
import { useCallback, useEffect, useState } from 'react';
import { useMediaUrl } from './useMedia';
import { themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import type { CountdownId, PresentationMode } from '../../types/presentation';
import { ClockDisplay } from './ClockDisplay';
import { ImageMedia, MediaPlayer, VideoMedia } from './MediaPlayer';
import { isFree, layoutRects, sectionDirection, sectionId, sectionShares, type LayoutRect } from '../../lib/layoutEditor';
import { Bonus, Crest, Fouls, GameClock, Ident, Period, Score, ShotClock, TeamBlock, Timeouts } from './Scoreboard';
import './presentation.css';

// Pregame, Stadium and Halftime are built from the same blocks as the live
// scoreboard (exported by Scoreboard.tsx), so branding, themes and sizing stay
// in one place. Live mode is the unchanged Scoreboard. Live Sponsor adds a resizable
// sponsor media area to the Stadium scoreboard.

type Side = 'home' | 'away';

export const Stage: React.FC<{ theme: ScoreboardTheme; mode: PresentationMode; place?: string; look?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ theme, mode, place, look, style, children }) => {
  const home = useBasketballStore((state) => state.homeTeam.primaryColor);
  const away = useBasketballStore((state) => state.awayTeam.primaryColor);
  return (
    <div className="sb-stage" data-testid={`${mode}-view`} style={themeStyle(theme)}>
      <div className="sb-board pm-board" data-mode={mode} data-place={place} data-layout={look} style={{ '--home': home, '--away': away, ...style } as React.CSSProperties}>
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

// A section's assigned media, cycling through each item for its own display time.
// Videos play with audio and advance when they end (they loop if they're alone).
const SectionRotator: React.FC<{ ids: string[] }> = ({ ids }) => {
  const items = useMediaStore((state) => state.items);
  const list = ids.flatMap((id) => items.find((i) => i.id === id) ?? []);
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => i + 1), []);
  const item = list.length > 0 ? list[index % list.length] : null;
  const timed = item !== null && item.kind === 'image' && list.length > 1;
  useEffect(() => {
    if (!timed) return;
    const timer = setTimeout(next, Math.max(1, item.duration) * 1000);
    return () => clearTimeout(timer);
  }, [timed, item, index, next]);
  if (!item) return null;
  return item.kind === 'image'
    ? <ImageMedia key={index} item={item} isPlaying onMissing={next} />
    : <VideoMedia key={index} item={item} isPlaying onMissing={next} onError={next} onEnded={next} loop={list.length === 1} />;
};

// `preview` draws the empty section panels only; the Layout Editor overlays its own thumbnails, so nothing plays.
// Free layout: an element sits at its rect (% of the canvas) with the usual gap kept around it.
// A team or clock block gets its own --u, scaled from the board's (min(1cqw, 1.7778cqh)) by how its width and
// height compare with the same block in the automatic layout. An untouched block therefore renders exactly as in
// the default layout, and a resized one re-fits. cq units resolve against the stage here, which is why the block
// itself is not a container.
const freeStyle = (r?: LayoutRect, auto?: LayoutRect): React.CSSProperties | undefined => r && ({
  ...(auto ? { '--u': `min(${r.width / auto.width}cqw, ${(r.height / auto.height) * 1.7778}cqh)` } : {}),
  position: 'absolute', gridArea: 'auto', margin: 0, boxSizing: 'border-box',
  left: `calc(${r.left}% + var(--u) * 0.4)`, top: `calc(${r.top}% + var(--u) * 0.4)`,
  width: `calc(${r.width}% - var(--u) * 0.8)`, height: `calc(${r.height}% - var(--u) * 0.8)`,
});

const SponsorSections: React.FC<{ preview?: boolean }> = ({ preview }) => {
  const layout = usePresentationStore((state) => state.sponsorLayout);
  const rows = sectionDirection(layout) === 'rows';
  const free = isFree(layout);
  const rects = free ? layoutRects(layout) : [];
  return (
    <aside className="pm-slot" data-region="sponsor" data-fit={layout.fit} data-sections={layout.sections} style={free ? { position: 'absolute', inset: 0, gridArea: 'auto', pointerEvents: 'none' } : { flexDirection: rows ? 'column' : 'row' }} aria-label="Sponsor area">
      {sectionShares(layout).map((share, i) => (
        <div key={i} className="pm-section" style={free ? freeStyle(rects.find((r) => r.id === sectionId(i))) : { flex: `${share} 1 0` }}>
          {preview ? null : layout.media[i].length > 0
            ? <SectionRotator ids={layout.media[i]} />
            // An unassigned first section keeps the original sponsor rotation.
            : i === 0 && <><MediaPlayer /><SponsorBadge /></>}
        </div>
      ))}
    </aside>
  );
};

export const LiveSponsorView: React.FC<{ theme: ScoreboardTheme; preview?: boolean }> = ({ theme, preview }) => {
  const layout = usePresentationStore((state) => state.sponsorLayout);
  const { placement, size } = layout;
  const free = isFree(layout);
  const rects = free ? layoutRects(layout) : [];
  const autoRects = free ? layoutRects({ ...layout, rects: {} }) : [];
  const at = (id: string) => freeStyle(rects.find((r) => r.id === id), autoRects.find((r) => r.id === id));
  const side = placement === 'left' || placement === 'right';
  const rest = 100 - size;
  // Grid tracks come from the operator's size; areas from the placement (presentation.css).
  // minmax(0, ...) on every track: without it a track's minimum is its content (a large image or a long clock),
  // which would grow the media row or column and shrink the scoreboard instead of keeping the saved proportions.
  const fr = (n: number) => `minmax(0, ${n}fr)`;
  const tracks = (side ? { gridTemplateColumns: (placement === 'right' ? [rest / 2, rest / 2, size] : [size, rest / 2, rest / 2]).map(fr).join(' '), gridTemplateRows: `${fr(1)} ${fr(0.55)}` }
    : { gridTemplateRows: (placement === 'bottom' ? [rest, size] : [size, rest]).map(fr).join(' ') }) as React.CSSProperties;
  // The selected scoreboard appearance (Game Setup) decides the team block's look and contents. Classic and
  // Live Sponsor keep the base Stadium block; the others take their scoreboard.css block styling via data-layout.
  const look = (['modern', 'minimal', 'tournament', 'broadcast'] as const).find((l) => l === theme.layout);
  const meta = (s: Side, cls: string) => <div className={cls}><Fouls side={s} /><Timeouts side={s} /><Bonus side={s} /></div>;
  const body = (s: Side) => {
    switch (look) {
      case 'modern': return <><div className="sb-team-head"><Crest side={s} /><Ident side={s} ball /></div><Score side={s} />{meta(s, 'sb-team-meta')}</>;
      case 'minimal': return <><Ident side={s} ball /><Score side={s} /></>;
      case 'tournament': return <><Crest side={s} /><Ident side={s} /><Score side={s} /></>;
      case 'broadcast': return <><Crest side={s} /><Ident side={s} ball />{meta(s, 'sb-team-meta')}<Score side={s} /></>;
      default: return <><div className="sb-team-head"><Crest side={s} /><Ident side={s} ball /></div><Score side={s} />{meta(s, 'pm-meta')}</>;
    }
  };
  const team = (s: Side) => <TeamBlock side={s} style={at(s)}>{body(s)}</TeamBlock>;
  return (
    <Stage theme={theme} mode="livesponsor" place={free ? 'free' : placement} look={look} style={free ? undefined : tracks}>
      {team('home')}
      <section className="pm-center" style={at('center')} aria-label="Game clock">
        <Period />
        <GameClock />
        <ShotClock />
      </section>
      {team('away')}
      <SponsorSections preview={preview} />
    </Stage>
  );
};
