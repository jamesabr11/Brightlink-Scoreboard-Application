import { useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { usePresentationStore } from '../../store/usePresentationStore';
import { useMediaStore } from '../../store/useMediaStore';
import { areaRects, layoutRects, sectionShares, type ElementId } from '../../lib/layoutEditor';
import { SPONSOR_ARRANGES, SPONSOR_MAX_SECTIONS, SPONSOR_PLACEMENTS, SPONSOR_SHARE_MAX, SPONSOR_SHARE_MIN, SPONSOR_SIZE_MAX, SPONSOR_SIZE_MIN } from '../../types/presentation';
import { buttonBase, neutral } from './styles';
import { LayoutPreview } from './LayoutPreview';
import { MediaThumb } from './MediaParts';
import { Panel } from './ui';

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const pick = (on: boolean) => `${on ? `${buttonBase} bg-[var(--brand)] ring-2 ring-white` : neutral} px-3 py-2 text-sm capitalize`;
const label = 'block text-xs text-neutral-400 mb-1';

const useLayout = () => [usePresentationStore((s) => s.sponsorLayout), usePresentationStore((s) => s.setSponsorLayout)] as const;

const ShareSlider: React.FC<{ index: number }> = ({ index }) => {
  const [layout, set] = useLayout();
  const share = sectionShares(layout)[index];
  return (
    <label className="block text-xs text-neutral-400">
      {layout.sections === 1 ? 'Section' : `Media ${index + 1}`} share: {Math.round(share)}%
      <input type="range" min={SPONSOR_SHARE_MIN} max={SPONSOR_SHARE_MAX} step={5} value={layout.split[index]} onChange={(e) => set({ split: layout.split.map((v, i) => (i === index ? Number(e.target.value) : v)) })} className="mt-2 w-full" />
    </label>
  );
};

// Area-level settings: where the media area sits, how big it is, how it is divided.
const AreaControls: React.FC = () => {
  const [layout, set] = useLayout();
  const { placement, size, fit, sections, arrange } = layout;
  return (
    <div className="space-y-3" role="group" aria-label="Sponsor media area">
      <div><span className={label}>Placement</span><div className="flex flex-wrap gap-2">{SPONSOR_PLACEMENTS.map((p) => <button key={p} onClick={() => set({ placement: p })} aria-pressed={placement === p} className={pick(placement === p)}>{p}</button>)}</div></div>
      <label className="block text-xs text-neutral-400">Media area size: {size}%
        <input type="range" min={SPONSOR_SIZE_MIN} max={SPONSOR_SIZE_MAX} step={5} value={size} onChange={(e) => set({ size: Number(e.target.value) })} className="mt-2 w-full" />
      </label>
      <button onClick={() => set({ fit: fit === 'contain' ? 'cover' : 'contain' })} className={`${neutral} px-3 py-2 text-sm`} title="Fit shows the whole image; Fill crops the edges to fill the area">Scaling: {fit === 'contain' ? 'Fit' : 'Fill'}</button>
      <div><span className={label}>Sections</span><div className="flex gap-2">{Array.from({ length: SPONSOR_MAX_SECTIONS }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => set({ sections: n })} aria-pressed={sections === n} className={pick(sections === n)}>{n}</button>)}</div></div>
      {sections > 1 && (
        <>
          <div><span className={label}>Arrangement</span><div className="flex gap-2">{SPONSOR_ARRANGES.map((a) => <button key={a} onClick={() => set({ arrange: a })} aria-pressed={arrange === a} className={pick(arrange === a)}>{a}</button>)}</div></div>
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
  const [layout] = useLayout();
  const [selected, setSelected] = useState<ElementId>('sponsor');
  const rects = layoutRects(layout);
  const area = areaRects(layout).find((r) => r.id === 'sponsor')!;
  // A section that no longer exists (sections reduced) falls back to the media area.
  const sel = selected === 'sponsor' ? { ...area, name: 'Media Area' } : rects.find((r) => r.id === selected) ?? { ...area, name: 'Media Area' };
  const sectionIndex = sel.id.startsWith('section') ? Number(sel.id.slice(7)) : -1;
  const field = 'rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300';
  const elements = [...rects.filter((r) => !r.id.startsWith('section')).slice(0, 3), { ...area, name: 'Media Area' }, ...rects.filter((r) => r.id.startsWith('section'))];
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Layout Editor</h2>
        <p className="text-sm text-neutral-400">Edits the Live Sponsor display preset, shown on the public display in Live Sponsor mode. Select an element to see its properties.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <Panel title="Live Sponsor Layout">
          <LayoutPreview layout={layout} selected={selected === 'sponsor' ? undefined : selected} onSelect={setSelected} media />
        </Panel>
        <div className="space-y-3">
          <Panel title="Properties">
            <div className="space-y-3">
              <div><span className={label}>Name</span><div className={field}>{sel.name}</div></div>
              <div className="grid grid-cols-2 gap-2">
                {([['Top', sel.top], ['Left', sel.left], ['Width', sel.width], ['Height', sel.height]] as const).map(([l, v]) => (
                  <div key={l}><span className={label}>{l}</span><div className={field}>{pct(v)}</div></div>
                ))}
              </div>
              {sel.id === 'sponsor' && <AreaControls />}
              {sectionIndex >= 0 && <SectionControls index={sectionIndex} />}
            </div>
          </Panel>
          <Panel title="Elements">
            <ul className="space-y-1">
              {elements.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setSelected(r.id)} aria-pressed={sel.id === r.id} className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left ${sel.id === r.id ? 'bg-neutral-100 text-black' : 'text-neutral-200 hover:bg-neutral-800'} ${r.id.startsWith('section') ? 'pl-7' : ''}`}>
                    <span className="h-3 w-3 rounded-sm flex-none" style={{ background: r.color }} aria-hidden />{r.name}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
};
