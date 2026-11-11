import { layoutRects, type ElementId } from '../../lib/layoutEditor';
import { useMediaStore } from '../../store/useMediaStore';
import { useMediaUrl } from './useMedia';
import { themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import type { SponsorLayout } from '../../types/presentation';
import { LiveSponsorView } from './PresentationViews';

// The first media assigned to a section, drawn where it will appear.
const SectionThumb: React.FC<{ id: string; fit: SponsorLayout['fit'] }> = ({ id, fit }) => {
  const { url } = useMediaUrl(id, 'thumbs');
  return url ? <img src={url} alt="" className={`absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} /> : null;
};

const isTeam = (id: ElementId) => id === 'home' || id === 'away';
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

interface Props {
  layout: SponsorLayout;
  /** The game's selected scoreboard appearance (Game Setup). */
  theme: ScoreboardTheme;
  /** Draw the real Live Sponsor scoreboard underneath, with transparent hit areas on top. */
  live?: boolean;
  /** Override preview colours per element (e.g. a configuration's team colours). */
  colors?: Partial<Record<ElementId, string>>;
  names?: Partial<Record<ElementId, string>>;
  selected?: ElementId;
  onSelect?: (id: ElementId) => void;
  compact?: boolean;
  /** Show each section's first assigned media inside its box. */
  media?: boolean;
}

/** Draws layoutRects() as boxes; interactive in the editor, static as a thumbnail. */
export const LayoutPreview: React.FC<Props> = ({ layout, theme, live, colors, names, selected, onSelect, compact, media }) => {
  const items = useMediaStore((state) => state.items);
  return (
  <div className="relative w-full aspect-video rounded-md border border-neutral-600 overflow-hidden" style={{ ...themeStyle(theme), background: 'var(--sb-bg)', fontFamily: 'var(--sb-font)' }} onClick={() => onSelect?.('sponsor')} role={onSelect ? 'group' : 'img'} aria-label="Display layout preview">
    {live && <div className="absolute inset-0 pointer-events-none"><LiveSponsorView theme={theme} preview /></div>}
    {layoutRectsWith(layout, colors, names).map((r) => {
      const on = selected === r.id;
      const style: React.CSSProperties = { left: pct(r.left), top: pct(r.top), width: pct(r.width), height: pct(r.height), borderColor: live ? (on ? '#fff' : 'transparent') : isTeam(r.id) ? r.color : 'var(--sb-border)', background: live ? (on ? 'rgba(255,255,255,0.12)' : 'transparent') : on ? 'color-mix(in srgb, var(--sb-accent) 35%, var(--sb-panel))' : 'var(--sb-panel)', color: 'var(--sb-text)', outline: on ? '2px solid #fff' : undefined, outlineOffset: -4 };
      const section = r.id.startsWith('section') ? Number(r.id.slice(7)) : -1;
      const first = section >= 0 && media ? items.find((i) => i.id === layout.media[section]?.[0]) : undefined;
      const thumb = first ? <SectionThumb id={first.id} fit={layout.fit} /> : null;
      const note = section >= 0 && media && !first ? (section === 0 ? 'Sponsor rotation' : 'Empty') : null;
      const showName = !live || section >= 0;
      const label = !showName ? null : <span className="relative rounded bg-black/50 px-1">{r.name}{note && <span className="block text-[0.7em] font-normal opacity-70">{note}</span>}</span>;
      const cls = `absolute flex items-center justify-center text-center overflow-hidden font-semibold ${note ? 'border-2 border-dashed' : 'border-2'} ${compact ? 'text-[10px] leading-tight border' : 'text-sm md:text-lg'}`;
      return onSelect
        ? <button key={r.id} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} aria-pressed={on} aria-label={r.name} className={cls} style={style}>{thumb}{label}</button>
        : <div key={r.id} className={cls} style={style}>{thumb}{label}</div>;
    })}
  </div>
  );
};

function layoutRectsWith(layout: SponsorLayout, colors: Props['colors'], names: Props['names']) {
  return layoutRects(layout).map((r) => ({ ...r, color: colors?.[r.id] ?? r.color, name: names?.[r.id] ?? r.name }));
}
