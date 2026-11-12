import { useState } from 'react';
import { Copy, FolderOpen, Pencil, Save, Trash2 } from 'lucide-react';
import { askConfirm, notify } from '../../lib/feedback';
import { layoutNameTaken, usePresentationStore } from '../../store/usePresentationStore';
import { useBasketballStore } from '../../store/useBasketballStore';
import { MAX_LAYOUT_NAME, MAX_SAVED_LAYOUTS } from '../../types/presentation';
import { THEMES } from '../../lib/theme';
import { input, neutral, primary } from './styles';
import { Panel } from './ui';

// Named custom layouts. The layout on the canvas is a working copy: it only changes a saved layout when
// "Save changes" is pressed, so editing one layout can never overwrite another.
export const SavedLayoutsPanel: React.FC = () => {
  const store = usePresentationStore();
  const theme = useBasketballStore((s) => s.gameConfig.theme);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const { savedLayouts, activeLayoutId, sponsorLayout } = store;
  const active = savedLayouts.find((l) => l.id === activeLayoutId);
  const dirty = active !== undefined && JSON.stringify([active.layout, active.theme]) !== JSON.stringify([sponsorLayout, theme]);
  const full = savedLayouts.length >= MAX_SAVED_LAYOUTS;

  const checkName = (value: string, exceptId?: string) => {
    if (!value.trim()) { notify('A layout needs a name.', 'error'); return false; }
    if (layoutNameTaken(savedLayouts, value, exceptId)) { notify('A layout with that name already exists.', 'error'); return false; }
    return true;
  };
  const save = () => {
    if (!checkName(name)) return;
    store.saveLayout(name, theme);
    setName('');
    notify('Layout saved.');
  };
  const load = async (id: string, title: string) => {
    if (dirty && !(await askConfirm({ title: 'Unsaved changes', message: `"${active?.name}" has changes that are not saved. Loading "${title}" discards them.`, confirmLabel: 'Load Layout', danger: true }))) return;
    store.loadSavedLayout(id);
    notify(`Loaded "${title}".`);
  };
  const remove = async (id: string, title: string) => {
    if (!(await askConfirm({ title: 'Delete this layout?', message: `"${title}" will be deleted. This cannot be undone. The layout currently on the display is not changed.`, confirmLabel: 'Delete Layout', danger: true }))) return;
    store.deleteSavedLayout(id);
    notify('Layout deleted.');
  };

  return (
    <Panel title="Saved Layouts">
      <div role="radiogroup" aria-label="Layout type" className="mb-2">
        <span className="mb-1 block text-xs text-neutral-400">Layout type</span>
        <div className="flex gap-2">
          {([[true, 'With Sponsor Sections'], [false, 'Without Sponsor Sections']] as const).map(([on, text]) => (
            <button key={text} type="button" role="radio" aria-checked={sponsorLayout.sponsorSections === on} onClick={() => store.setSponsorLayout({ sponsorSections: on })} className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${sponsorLayout.sponsorSections === on ? 'border-white bg-neutral-100 text-black' : 'border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'}`}>{text}</button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">{sponsorLayout.sponsorSections ? 'Set the number of sections and their arrangement under Media Area.' : 'A clean scoreboard. Media sections are removed from the saved layout and the display.'}</p>
      </div>
      <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="flex-1 text-xs text-neutral-400">
          Save the current layout as
          <input value={name} maxLength={MAX_LAYOUT_NAME} onChange={(e) => setName(e.target.value)} placeholder="Layout name" className={`${input} text-sm`} />
        </label>
        <button type="submit" disabled={full} className={`${primary} px-3 py-2 text-sm`}><Save size={16} className="mr-1 inline" />Save New</button>
      </form>
      {active && (
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex-1 truncate">Editing <strong className="text-neutral-200">{active.name}</strong>{dirty ? ' · unsaved changes' : ''}</span>
          <button disabled={!dirty} onClick={() => { store.updateSavedLayout(active.id, theme); notify('Layout updated.'); }} className={`${neutral} px-3 py-1.5 text-sm`}>Save changes</button>
        </div>
      )}
      {savedLayouts.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-500">No saved layouts yet. Arrange the display, then save it under a name.</p>
      ) : (
        <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto">
          {savedLayouts.map((l) => (
            <li key={l.id} className={`rounded-md border p-2 ${l.id === activeLayoutId ? 'border-neutral-300 bg-neutral-800' : 'border-neutral-700 bg-neutral-900'}`}>
              {renaming?.id === l.id ? (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (checkName(renaming.name, l.id)) { store.renameSavedLayout(l.id, renaming.name); setRenaming(null); notify('Layout renamed.'); } }}>
                  <input autoFocus aria-label="New layout name" maxLength={MAX_LAYOUT_NAME} value={renaming.name} onChange={(e) => setRenaming({ id: l.id, name: e.target.value })} className={`${input} mt-0 text-sm`} />
                  <button type="submit" className={`${primary} px-3 py-1 text-sm`}>Save</button>
                  <button type="button" onClick={() => setRenaming(null)} className={`${neutral} px-3 py-1 text-sm`}>Cancel</button>
                </form>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.name}</div>
                    <div className="truncate text-[11px] text-neutral-400">{THEMES[l.theme.themeId].label} · {l.layout.sponsorSections ? `${l.layout.sections} media section${l.layout.sections > 1 ? 's' : ''}` : 'No sponsor sections'}{Object.keys(l.layout.rects).length > 0 ? ' · custom positions' : ''}</div>
                  </div>
                  <button onClick={() => void load(l.id, l.name)} aria-label={`Load ${l.name}`} title="Load into the editor and the display" className={`${neutral} p-1.5`}><FolderOpen size={15} /></button>
                  <button onClick={() => setRenaming({ id: l.id, name: l.name })} aria-label={`Rename ${l.name}`} title="Rename" className={`${neutral} p-1.5`}><Pencil size={15} /></button>
                  <button onClick={() => { store.duplicateSavedLayout(l.id); notify('Layout duplicated.'); }} disabled={full} aria-label={`Duplicate ${l.name}`} title="Duplicate" className={`${neutral} p-1.5`}><Copy size={15} /></button>
                  <button onClick={() => void remove(l.id, l.name)} aria-label={`Delete ${l.name}`} title="Delete" className={`${neutral} p-1.5`}><Trash2 size={15} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
