import { layoutRects, type ElementId } from '../../lib/layoutEditor';
import type { SponsorLayout } from '../../types/presentation';

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

interface Props {
  layout: SponsorLayout;
  /** Override preview colours per element (e.g. a configuration's team colours). */
  colors?: Partial<Record<ElementId, string>>;
  names?: Partial<Record<ElementId, string>>;
  selected?: ElementId;
  onSelect?: (id: ElementId) => void;
  compact?: boolean;
}

/** Draws layoutRects() as boxes; interactive in the editor, static as a thumbnail. */
export const LayoutPreview: React.FC<Props> = ({ layout, colors, names, selected, onSelect, compact }) => (
  <div className="relative w-full aspect-video rounded-md border border-neutral-600 bg-neutral-900 overflow-hidden" onClick={() => onSelect?.('sponsor')} role={onSelect ? 'group' : 'img'} aria-label="Display layout preview">
    {layoutRectsWith(layout, colors, names).map((r) => {
      const on = selected === r.id;
      const style: React.CSSProperties = { left: pct(r.left), top: pct(r.top), width: pct(r.width), height: pct(r.height), borderColor: r.color, background: `${r.color}${on ? '55' : '33'}`, outline: on ? '2px solid #fff' : undefined, outlineOffset: -4 };
      const cls = `absolute flex items-center justify-center text-center overflow-hidden font-semibold text-white/90 border-2 ${compact ? 'text-[10px] leading-tight border' : 'text-sm md:text-lg'}`;
      return onSelect
        ? <button key={r.id} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} aria-pressed={on} className={cls} style={style}>{r.name}</button>
        : <div key={r.id} className={cls} style={style}>{r.name}</div>;
    })}
  </div>
);

function layoutRectsWith(layout: SponsorLayout, colors: Props['colors'], names: Props['names']) {
  return layoutRects(layout).map((r) => ({ ...r, color: colors?.[r.id] ?? r.color, name: names?.[r.id] ?? r.name }));
}
