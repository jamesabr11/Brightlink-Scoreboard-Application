import { useEffect, useRef } from 'react';
import { boxOf, dragBox, layoutRects, overlaps, type ElementId, type Handle } from '../../lib/layoutEditor';
import { useMediaStore } from '../../store/useMediaStore';
import { useMediaUrl } from './useMedia';
import { themeStyle } from '../../lib/theme';
import type { ScoreboardTheme } from '../../types/basketball';
import type { LayoutBox, SponsorElement, SponsorLayout } from '../../types/presentation';
import { LiveSponsorView } from './PresentationViews';

// The first media assigned to a section, drawn where it will appear.
const SectionThumb: React.FC<{ id: string; fit: SponsorLayout['fit'] }> = ({ id, fit }) => {
  const { url } = useMediaUrl(id, 'thumbs');
  return url ? <img src={url} alt="" className={`absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} /> : null;
};

const HANDLES: [Handle, string][] = [
  ['nw', 'left-0 top-0'], ['n', 'left-1/2 top-0 -translate-x-1/2'], ['ne', 'right-0 top-0'],
  ['w', 'left-0 top-1/2 -translate-y-1/2'], ['e', 'right-0 top-1/2 -translate-y-1/2'],
  ['sw', 'bottom-0 left-0'], ['s', 'bottom-0 left-1/2 -translate-x-1/2'], ['se', 'bottom-0 right-0'],
];
const isElement = (id: ElementId): id is SponsorElement => id !== 'sponsor';
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
  /** Enables drag-to-move and resize handles; called with each new position. */
  onRect?: (id: SponsorElement, box: LayoutBox) => void;
  compact?: boolean;
  /** Show each section's first assigned media inside its box. */
  media?: boolean;
}

/** Draws layoutRects() as boxes; interactive in the editor, static as a thumbnail. */
export const LayoutPreview: React.FC<Props> = ({ layout, theme, live, colors, names, selected, onSelect, onRect, compact, media }) => {
  const items = useMediaStore((state) => state.items);
  const canvas = useRef<HTMLDivElement>(null);
  const stop = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => stop.current?.(), []);

  // Pointer drag on an element (move) or one of its handles (resize). A step that would
  // overlap another element is dropped (a move then tries to slide along each axis).
  const begin = (e: React.PointerEvent, id: ElementId, handle: Handle) => {
    if (!isElement(id) || !onRect || !canvas.current || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);
    stop.current?.();
    const bounds = canvas.current.getBoundingClientRect();
    const rects = layoutRects(layout);
    const from = boxOf(rects.find((r) => r.id === id)!);
    const others = rects.filter((r) => r.id !== id).map(boxOf);
    const clear = (b: LayoutBox) => !others.some((o) => overlaps(b, o));
    const [x0, y0] = [e.clientX, e.clientY];
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - x0) / bounds.width) * 100, dy = ((ev.clientY - y0) / bounds.height) * 100;
      const tries = handle === 'move' ? [[dx, dy], [dx, 0], [0, dy]] : [[dx, dy]];
      for (const [x, y] of tries) {
        const next = dragBox(handle, from, x, y);
        if (clear(next)) { onRect(id, next); return; }
      }
    };
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); stop.current = undefined; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    stop.current = end;
  };

  return (
  <div ref={canvas} className="relative w-full aspect-video rounded-md border border-neutral-600 overflow-hidden" style={{ ...themeStyle(theme), background: 'var(--sb-bg)', fontFamily: 'var(--sb-font)' }} onClick={() => onSelect?.('sponsor')} role={onSelect ? 'group' : 'img'} aria-label="Display layout preview">
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
        ? (
          <button key={r.id} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} onPointerDown={isElement(r.id) ? (e) => begin(e, r.id, 'move') : undefined} aria-pressed={on} aria-label={r.name} className={`${cls} ${onRect && isElement(r.id) ? 'cursor-move touch-none' : ''}`} style={style}>
            {thumb}{label}
            {on && onRect && isElement(r.id) && HANDLES.map(([h, pos]) => (
              <span key={h} onPointerDown={(e) => begin(e, r.id, h)} className={`absolute h-3 w-3 rounded-sm border border-neutral-900 bg-white ${pos}`} style={{ cursor: `${h}-resize` }} aria-hidden />
            ))}
          </button>
        )
        : <div key={r.id} className={cls} style={style}>{thumb}{label}</div>;
    })}
  </div>
  );
};

function layoutRectsWith(layout: SponsorLayout, colors: Props['colors'], names: Props['names']) {
  return layoutRects(layout).map((r) => ({ ...r, color: colors?.[r.id] ?? r.color, name: names?.[r.id] ?? r.name }));
}
