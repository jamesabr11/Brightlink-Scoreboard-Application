import { useState } from 'react';
import { usePresentationStore } from '../../store/usePresentationStore';
import { layoutRects, type ElementId } from '../../lib/layoutEditor';
import { SponsorLayoutControls } from './PresentationPanel';
import { LayoutPreview } from './LayoutPreview';
import { Panel } from './ui';

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

export const LayoutEditorPage: React.FC = () => {
  const layout = usePresentationStore((s) => s.sponsorLayout);
  const [selected, setSelected] = useState<ElementId>('sponsor');
  const rects = layoutRects(layout);
  const sel = rects.find((r) => r.id === selected) ?? rects[0];
  const field = 'rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300';
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Layout Editor</h2>
        <p className="text-sm text-neutral-400">Customize how the public display is laid out. Select an element to see its properties.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Panel title="Canvas">
          <LayoutPreview layout={layout} selected={selected} onSelect={setSelected} />
        </Panel>
        <div className="space-y-3">
          <Panel title="Properties">
            <div className="space-y-3">
              <div><span className="block text-xs text-neutral-400 mb-1">Name</span><div className={field}>{sel.name}</div></div>
              <div><span className="block text-xs text-neutral-400 mb-1">Preview colour</span><span className="inline-block h-6 w-12 rounded" style={{ background: sel.color }} aria-hidden /></div>
              <div className="grid grid-cols-2 gap-2">
                {([['Top', sel.top], ['Left', sel.left], ['Width', sel.width], ['Height', sel.height]] as const).map(([l, v]) => (
                  <div key={l}><span className="block text-xs text-neutral-400 mb-1">{l}</span><div className={field}>{pct(v)}</div></div>
                ))}
              </div>
              {sel.id === 'sponsor' && <SponsorLayoutControls />}
            </div>
          </Panel>
          <Panel title="Elements">
            <ul className="space-y-1">
              {rects.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setSelected(r.id)} aria-pressed={selected === r.id} className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left ${selected === r.id ? 'bg-neutral-100 text-black' : 'text-neutral-200 hover:bg-neutral-800'}`}>
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
