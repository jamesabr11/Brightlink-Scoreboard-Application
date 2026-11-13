import { useState } from 'react';
import { Copy, Eye, EyeOff, Pencil, Save, Trash2, Upload } from 'lucide-react';
import { isGameActive, referencedLogos, useBasketballStore } from '../../store/useBasketballStore';
import { askConfirm, notify } from '../../lib/feedback';
import { pruneLogos } from '../../lib/logos';
import { LAYOUTS, THEMES } from '../../lib/theme';
import type { GameConfig } from '../../types/basketball';
import { input, negative, neutral, primary } from './styles';
import { usePresentationStore } from '../../store/usePresentationStore';
import { ConfigPreview } from './ConfigPreview';
import { LayoutPreview } from './LayoutPreview';
import { Panel, TeamLogo } from './ui';

const ConfigCard: React.FC<{ config: GameConfig }> = ({ config }) => {
  const store = useBasketballStore();
  const [newName, setNewName] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const working = usePresentationStore((state) => state.sponsorLayout);
  const saved = usePresentationStore((state) => state.savedLayouts.find((l) => l.id === config.layoutId));
  const activeLayoutId = usePresentationStore((state) => state.activeLayoutId);
  const layout = saved?.layout ?? working;
  const active = store.gameConfig.id === config.id;
  const colors = { home: config.homeTeam.primaryColor, away: config.awayTeam.primaryColor };
  const names = { home: config.homeTeam.name, away: config.awayTeam.name };

  const rename = () => {
    const name = newName?.trim();
    if (!name) { notify('A configuration needs a name.', 'error'); return; }
    store.renameConfig(config.id, name);
    setNewName(null);
    notify('Configuration renamed.');
  };

  const load = async () => {
    const confirmed = !isGameActive(useBasketballStore.getState()) || await askConfirm({
      title: 'A game is in progress',
      message: `Loading "${config.name}" replaces the current game. Finish & Save it first to keep the result, or continue and use Undo to bring it back.`,
      confirmLabel: 'Load and Replace Game',
      danger: true,
    });
    if (!confirmed) return;
    store.loadConfig(config.id);
    if (saved) usePresentationStore.getState().loadSavedLayout(saved.id); // the custom layout goes live with the game settings
    notify(`Loaded ${config.name}.`);
  };

  const overwrite = async () => {
    const confirmed = await askConfirm({ title: 'Update this configuration?', message: `"${config.name}" will be replaced with the current teams, rules and theme${saved && activeLayoutId === saved.id ? ', and its custom layout with the one in the Layout Editor' : ''}.`, confirmLabel: 'Update' });
    if (!confirmed) return;
    store.updateConfigFromCurrent(config.id);
    // A custom layout is only rewritten from the editor when that same layout is the one being edited.
    if (saved && activeLayoutId === saved.id) usePresentationStore.getState().updateSavedLayout(saved.id, useBasketballStore.getState().gameConfig.theme);
    notify('Configuration updated.');
  };

  const remove = async () => {
    const confirmed = await askConfirm({ title: 'Delete this configuration?', message: `"${config.name}" will be permanently deleted. The current game isn't affected.`, confirmLabel: 'Delete', danger: true });
    if (!confirmed) return;
    store.deleteConfig(config.id);
    pruneLogos(referencedLogos(useBasketballStore.getState())).catch((error) => console.error('Could not clean up logos', error));
    notify('Configuration deleted.');
  };

  return (
    <li className="bg-neutral-900 border border-neutral-700 rounded-lg p-3">
      {newName === null ? (
        <h3 className="font-bold text-lg truncate">{config.name}{active && <span className="ml-2 text-xs align-middle bg-yellow-400 text-black rounded px-2 py-0.5">In use</span>}</h3>
      ) : (
        <form className="flex gap-2 mb-2 items-end" onSubmit={(e) => { e.preventDefault(); rename(); }}>
          <label className="flex-1 text-sm">
            New name
            <input autoFocus maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} className={input} />
          </label>
          <button type="submit" className={`${primary} px-3 py-2`}>Save</button>
          <button type="button" onClick={() => setNewName(null)} className={`${neutral} px-3 py-2`}>Cancel</button>
        </form>
      )}
      <div className={preview ? 'my-2' : 'my-2 max-w-48'}>
        {preview
          ? <ConfigPreview config={config} layout={saved?.layout} />
          : <LayoutPreview layout={layout} theme={config.theme} colors={colors} names={names} compact media />}
      </div>
      {preview && <p className="-mt-1 mb-2 text-[11px] text-neutral-500">Scores, clocks and fouls are sample values; everything else is this configuration's saved setup.</p>}
      <div className="flex items-center gap-2 my-2 text-sm">
        <TeamLogo id={config.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
        <span className="w-3 h-3 rounded-full flex-none" style={{ background: config.homeTeam.primaryColor }} />
        <span className="truncate">{config.homeTeam.name}</span>
        <span className="text-neutral-400">vs</span>
        <TeamLogo id={config.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
        <span className="w-3 h-3 rounded-full flex-none" style={{ background: config.awayTeam.primaryColor }} />
        <span className="truncate">{config.awayTeam.name}</span>
      </div>
      <p className="text-xs text-neutral-300 mb-3">
        {config.numberOfPeriods} × {config.periodDuration} min, {config.overtimeDuration} min OT · Shot clock {config.shotClockDuration}/{config.shotClockShort} · Bonus {config.foulsForBonus} · {config.maxTimeouts} timeouts · {THEMES[config.theme.themeId].label}, {LAYOUTS[config.theme.layout].label} layout{saved ? ` · Custom layout “${saved.name}”` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setPreview((v) => !v)} aria-pressed={preview} aria-label={`${preview ? 'Hide' : 'Preview'} layout for ${config.name}`} className={`${neutral} px-3 py-2 text-sm`}>{preview ? <EyeOff size={16} /> : <Eye size={16} />}Preview</button>
        <button onClick={load} aria-label={`Load ${config.name}`} className={`${primary} px-3 py-2 text-sm`}><Upload size={16} />Load</button>
        <button onClick={overwrite} aria-label={`Update ${config.name} from current setup`} className={`${neutral} px-3 py-2 text-sm`}><Save size={16} />Update</button>
        <button onClick={() => setNewName(config.name)} aria-label={`Rename ${config.name}`} className={`${neutral} px-3 py-2 text-sm`}><Pencil size={16} />Rename</button>
        <button onClick={() => { store.duplicateConfig(config.id); notify('Configuration duplicated.'); }} aria-label={`Duplicate ${config.name}`} className={`${neutral} px-3 py-2 text-sm`}><Copy size={16} />Duplicate</button>
        {config.id !== 'default' && <button onClick={remove} aria-label={`Delete ${config.name}`} className={`${negative} px-3 py-2 text-sm`}><Trash2 size={16} />Delete</button>}
      </div>
    </li>
  );
};

export const ConfigsPage: React.FC = () => {
  const savedConfigs = useBasketballStore((state) => state.savedConfigs);
  const saveCurrentConfig = useBasketballStore((state) => state.saveCurrentConfig);
  const [name, setName] = useState('');

  const save = () => {
    if (!name.trim()) { notify('Give the configuration a name first.', 'error'); return; }
    saveCurrentConfig(name.trim());
    setName('');
    notify('Configuration saved.');
  };

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">Saved Configurations</h2>
      <Panel title="Save Current Setup">
        <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="flex-1 min-w-48 text-sm">
            Configuration name
            <input maxLength={60} placeholder="e.g. Lincoln High vs Central" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <button type="submit" className={`${primary} px-4 py-2`}><Save size={16} />Save Configuration</button>
        </form>
        <p className="mt-2 text-xs text-neutral-400">Saves team names, colors and logos, the rules and the scoreboard theme. Scores aren't saved here. Layouts saved in the Layout Editor also appear below, and loading one restores its custom layout.</p>
      </Panel>
      <ul className="grid md:grid-cols-2 gap-3">
        {savedConfigs.map((config) => <ConfigCard key={config.id} config={config} />)}
      </ul>
    </div>
  );
};
