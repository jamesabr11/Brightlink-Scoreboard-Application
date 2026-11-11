import { layoutRects, type ElementId } from '../../lib/layoutEditor';
import { useMediaStore } from '../../store/useMediaStore';
import { useMediaUrl } from './useMedia';
import type { SponsorLayout } from '../../types/presentation';

// The first media assigned to a section, drawn where it will appear.
const SectionThumb: React.FC<{ id: string; fit: SponsorLayout['fit'] }> = ({ id, fit }) => {
  const { url } = useMediaUrl(id, 'thumbs');
  return url ? <img src={url} alt="" className={`absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} /> : null;
};

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

interface Props {
  layout: SponsorLayout;
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
export const LayoutPreview: React.FC<Props> = ({ layout, colors, names, selected, onSelect, compact, media }) => {
  const items = useMediaStore((state) => state.items);
  return (
  <div className="relative w-full aspect-video rounded-md border border-neutral-600 bg-neutral-900 overflow-hidden" onClick={() => onSelect?.('sponsor')} role={onSelect ? 'group' : 'img'} aria-label="Display layout preview">
    {layoutRectsWith(layout, colors, names).map((r) => {
      const on = selected === r.id;
      const style: React.CSSProperties = { left: pct(r.left), top: pct(r.top), width: pct(r.width), height: pct(r.height), borderColor: r.color, background: `${r.color}${on ? '55' : '33'}`, outline: on ? '2px solid #fff' : undefined, outlineOffset: -4 };
      const section = r.id.startsWith('section') ? Number(r.id.slice(7)) : -1;
      const first = section >= 0 && media ? items.find((i) => i.id === layout.media[section]?.[0]) : undefined;
      const thumb = first ? <SectionThumb id={first.id} fit={layout.fit} /> : null;
      const cls = `absolute flex items-center justify-center text-center overflow-hidden font-semibold text-white/90 border-2 ${compact ? 'text-[10px] leading-tight border' : 'text-sm md:text-lg'}`;
      return onSelect
        ? <button key={r.id} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} aria-pressed={on} className={`${cls} ${thumb ? 'relative' : ''}`} style={style}>{thumb}<span className="relative rounded bg-black/50 px-1">{r.name}</span></button>
        : <div key={r.id} className={cls} style={style}>{thumb}<span className="relative rounded bg-black/50 px-1">{r.name}</span></div>;
    })}
  </div>
  );
};

function layoutRectsWith(layout: SponsorLayout, colors: Props['colors'], names: Props['names']) {
  return layoutRects(layout).map((r) => ({ ...r, color: colors?.[r.id] ?? r.color, name: names?.[r.id] ?? r.name }));
}
