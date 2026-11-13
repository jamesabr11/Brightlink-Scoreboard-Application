import { useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, Undo2, X } from 'lucide-react';
import { defaultGeometry, usePresentationStore } from '../../store/usePresentationStore';
import { askConfirm, notify } from '../../lib/feedback';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { areaRects, boxOf, isFree, layoutRects, MIN_BOX, overlaps, sectionShares, type ElementId } from '../../lib/layoutEditor';
import type { LayoutBox, SponsorElement, SponsorLayout } from '../../types/presentation';
import { SPONSOR_ARRANGES, SPONSOR_MAX_SECTIONS, SPONSOR_PLACEMENTS, SPONSOR_SHARE_MAX, SPONSOR_SHARE_MIN, SPONSOR_SIZE_MAX, SPONSOR_SIZE_MIN } from '../../types/presentation';
import { buttonBase, neutral } from './styles';
import { LayoutPreview } from './LayoutPreview';
import { MediaThumb } from './MediaParts';
import { NumberField, Panel } from './ui';
import { SavedLayoutsPanel } from './SavedLayoutsPanel';

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const pick = (on: boolean) => `${on ? `${buttonBase} bg-[var(--brand)] ring-2 ring-white` : neutral} px-3 py-2 text-sm capitalize`;
const label = 'block text-xs text-neutral-400 mb-1';

const useLayout = () => [usePresentationStore((s) => s.sponsorLayout), usePresentationStore((s) => s.setSponsorLayout)] as const;

// Sizes and shares move the media sections, so their manual positions go; the scoreboard blocks keep theirs.
const withoutSections = (rects: SponsorLayout['rects']) => Object.fromEntries(Object.entries(rects).filter(([id]) => !id.startsWith('section')));

const ShareSlider: React.FC<{ index: number }> = ({ index }) => {
  const [layout, set] = useLayout();
  const share = sectionShares(layout)[index];
  return (
    <label className="block text-xs text-neutral-400">
      {layout.sections === 1 ? 'Section' : `Media ${index + 1}`} share: {Math.round(share)}%
      <input type="range" min={SPONSOR_SHARE_MIN} max={SPONSOR_SHARE_MAX} step={5} value={layout.split[index]} onChange={(e) => set({ split: layout.split.map((v, i) => (i === index ? Number(e.target.value) : v)), rects: withoutSections(layout.rects) })} className="mt-2 w-full" />
    </label>
  );
};

// Area-level settings: where the media area sits, how big it is, how it is divided.
const AreaControls: React.FC = () => {
  const [layout, set] = useLayout();
  const { placement, fit, sections, arrange } = layout;
  // Placement, arrangement and section count re-lay out the whole display, so manual positions are reset (after asking).
  const rearrange = async (patch: Partial<SponsorLayout>) => {
    if (isFree(layout) && !(await askConfirm({ title: 'Rearrange the layout?', message: 'This re-lays out the whole display, so your manual element positions are reset. Media assignments are kept.', confirmLabel: 'Rearrange', danger: true }))) return;
    set({ ...patch, rects: {} });
  };
  return (
    <div className="space-y-3" role="group" aria-label="Sponsor media area">
      <div><span className={label}>Placement</span><div className="flex flex-wrap gap-2">{SPONSOR_PLACEMENTS.map((p) => <button key={p} onClick={() => void rearrange({ placement: p })} aria-pressed={placement === p} className={pick(placement === p)}>{p}</button>)}</div></div>
      {isFree(layout) && <button onClick={() => set({ rects: {} })} className={`${neutral} px-3 py-2 text-sm`} title="Go back to the automatic placement, size and sections layout">Reset element positions</button>}
      <button onClick={() => set({ fit: fit === 'contain' ? 'cover' : 'contain' })} className={`${neutral} px-3 py-2 text-sm`} title="Fit shows the whole image; Fill crops the edges to fill the area">Scaling: {fit === 'contain' ? 'Fit' : 'Fill'}</button>
      <div><span className={label}>Sections</span><div className="flex gap-2">{Array.from({ length: SPONSOR_MAX_SECTIONS }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => void rearrange({ sections: n })} aria-pressed={sections === n} className={pick(sections === n)}>{n}</button>)}</div></div>
      {sections > 1 && (
        <>
          <div><span className={label}>Arrangement</span><div className="flex gap-2">{SPONSOR_ARRANGES.map((a) => <button key={a} onClick={() => void rearrange({ arrange: a })} aria-pressed={arrange === a} className={pick(arrange === a)}>{a}</button>)}</div></div>
          {Array.from({ length: sections }, (_, i) => <ShareSlider key={i} index={i} />)}
        </>
      )}
    </div>
  );
};

// Section settings: its share of the area and the Media Library items it plays.
const SectionControls: React.FC<{ index: number }> = ({ index }) => {
  const [layout, set] = useLayout();
  const library = useMediaStore((s) => s.items);
  const ids = layout.media[index];
  const assigned = ids.flatMap((id) => library.find((i) => i.id === id) ?? []);
  const update = (next: string[]) => set({ media: layout.media.map((m, i) => (i === index ? next : m)) });
  const move = (from: number, to: number) => { const next = [...ids]; [next[from], next[to]] = [next[to], next[from]]; update(next); };
  const available = library.filter((i) => !ids.includes(i.id));
  return (
    <div className="space-y-3">
      {layout.sections > 1 && <ShareSlider index={index} />}
      <div>
        <span className={label}>Assigned media</span>
        {assigned.length === 0 ? (
          <p className="text-xs text-neutral-500">{index === 0 ? 'Nothing assigned: this section plays the sponsor rotation from the Playback panel.' : 'Nothing assigned: this section stays empty.'}</p>
        ) : (
          <ul className="space-y-1">
            {assigned.map((item, n) => (
              <li key={item.id} className="flex items-center gap-2 rounded-md bg-neutral-800 p-1.5">
                <MediaThumb item={item} className="h-9 w-14 flex-none rounded" />
                <span className="flex-1 truncate text-sm">{item.name}</span>
                <button onClick={() => move(n, n - 1)} disabled={n === 0} aria-label={`Move ${item.name} up`} className={`${neutral} p-1.5`}><ArrowUp size={14} /></button>
                <button onClick={() => move(n, n + 1)} disabled={n === assigned.length - 1} aria-label={`Move ${item.name} down`} className={`${neutral} p-1.5`}><ArrowDown size={14} /></button>
                <button onClick={() => update(ids.filter((id) => id !== item.id))} aria-label={`Remove ${item.name}`} className={`${neutral} p-1.5`}><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <span className={label}>Add from Media Library</span>
        {available.length === 0 ? <p className="text-xs text-neutral-500">{library.length === 0 ? 'The Media Library is empty. Upload images or videos on the Media page.' : 'Everything in the library is already assigned here.'}</p> : (
          <ul className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
            {available.map((item) => (
              <li key={item.id}>
                <button onClick={() => update([...ids, item.id])} disabled={ids.length >= 20} title={`Add ${item.name}`} className="w-full rounded-md border border-neutral-700 hover:border-neutral-400 overflow-hidden text-left">
                  <MediaThumb item={item} className="aspect-video w-full" />
                  <span className="block truncate px-1 py-0.5 text-[11px] text-neutral-300">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const LayoutEditorPage: React.FC = () => {
  const [layout, setLayout] = useLayout();
  const theme = useBasketballStore((s) => s.gameConfig.theme);
  const canUndo = usePresentationStore((s) => s.layoutHistory.length > 0);
  const undo = usePresentationStore((s) => s.undoLayout);
  const reset = async () => {
    const ok = await askConfirm({ title: 'Reset the layout?', message: 'Positions, sizes, placement, sections and scaling go back to the defaults for the selected scoreboard preset. Your media assignments and game settings are kept. A saved layout changes only when you press Save changes.', confirmLabel: 'Reset to Defaults', danger: true });
    if (!ok) return;
    setLayout(defaultGeometry(theme.layout));
    setSelected('sponsor');
    notify('Layout reset to defaults.');
  };
  const [selected, setSelected] = useState<ElementId>('sponsor');
  const rects = layoutRects(layout);
  const setBox = (id: SponsorElement, box: LayoutBox) => setLayout({ rects: { ...layout.rects, [id]: box } });
  const withSections = layout.sponsorSections;
  const area = areaRects(layout).find((r) => r.id === 'sponsor')!;
  // A section that no longer exists (sections reduced) falls back to the media area.
  const sel = !withSections ? rects.find((r) => r.id === selected) ?? rects[0]
    : selected === 'sponsor' ? { ...area, name: 'Media Area' } : rects.find((r) => r.id === selected) ?? { ...area, name: 'Media Area' };
  const sectionIndex = sel.id.startsWith('section') ? Number(sel.id.slice(7)) : -1;
  const field = 'rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300';
  const element = sel.id !== 'sponsor' ? (sel.id as SponsorElement) : null;
  // Typed position/size fields: kept on the canvas, at least MIN_BOX big, and clear of other elements.
  const edit = (key: keyof LayoutBox, value: number) => {
    if (!element || !Number.isFinite(value)) return;
    const b: LayoutBox = { ...boxOf(sel as never), [key]: value };
    b.w = Math.min(100, Math.max(MIN_BOX, b.w)); b.h = Math.min(100, Math.max(MIN_BOX, b.h));
    b.x = Math.min(100 - b.w, Math.max(0, b.x)); b.y = Math.min(100 - b.h, Math.max(0, b.y));
    if (!rects.some((r) => r.id !== element && overlaps(b, boxOf(r)))) setBox(element, b);
  };
  const scoreboard = rects.filter((r) => !r.id.startsWith('section')).slice(0, 3);
  const elements = withSections ? [...scoreboard, { ...area, name: 'Media Area' }, ...rects.filter((r) => r.id.startsWith('section'))] : scoreboard;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Layout Editor</h2>
          <p className="text-sm text-neutral-400">Edits the Custom Layout display, shown on the public display in Custom Layout mode. Select an element to see its properties. Choosing a different scoreboard preset in Game Setup loads that preset's layout here.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo the last layout change" className={`${neutral} px-4 py-2 text-sm font-semibold ring-1 ring-neutral-500`}><Undo2 size={16} className="mr-2 inline" />Undo</button>
          <button onClick={reset} className={`${neutral} px-4 py-2 text-sm font-semibold ring-1 ring-neutral-500`}><RotateCcw size={16} className="mr-2 inline" />Reset to Defaults</button>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <Panel title="Custom Layout">
          <LayoutPreview layout={layout} theme={theme} live selected={selected === 'sponsor' || !withSections ? (withSections ? undefined : sel.id as ElementId) : selected} onSelect={setSelected} onRect={setBox} media />
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Elements">
            {elements.map((r) => (
              <li key={r.id} className="flex-1 min-w-fit">
                <button onClick={() => setSelected(r.id)} aria-pressed={sel.id === r.id} className={`w-full flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-neutral-700 px-3 py-1.5 text-sm ${sel.id === r.id ? 'bg-neutral-100 text-black' : 'text-neutral-200 hover:bg-neutral-800'}`}>
                  <span className="h-3 w-3 rounded-sm flex-none" style={{ background: r.color }} aria-hidden />{r.name}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="space-y-3">
          <SavedLayoutsPanel />
          <Panel title="Properties">
            <div className="space-y-3">
              {withSections && sel.id === 'sponsor' && <AreaControls />}
              {withSections && sectionIndex >= 0 && <SectionControls index={sectionIndex} />}
              {!withSections && <p className="text-xs text-neutral-500">This layout has no sponsor sections. Choose "With Sponsor Sections" under Saved Layouts to add them.</p>}
              <div><span className={label}>Name</span><div className={field}>{sel.name}</div></div>
              {withSections && sel.id === 'sponsor' && (
                <label className="block text-xs text-neutral-400">Media area size: {layout.size}%
                  <input type="range" min={SPONSOR_SIZE_MIN} max={SPONSOR_SIZE_MAX} step={5} value={layout.size} onChange={(e) => setLayout({ size: Number(e.target.value), rects: withoutSections(layout.rects) })} className="mt-2 w-full" />
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                {([['Top', sel.top, 'y'], ['Left', sel.left, 'x'], ['Width', sel.width, 'w'], ['Height', sel.height, 'h']] as const).map(([l, v, k]) => (
                  element
                    ? <NumberField key={`${sel.id}${k}`} label={`${l} %`} min={0} value={Math.round(v * 10) / 10} onChange={(n) => edit(k, n)} />
                    : <div key={l}><span className={label}>{l}</span><div className={field}>{pct(v)}</div></div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
