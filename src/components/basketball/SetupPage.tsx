import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { referencedLogos, useBasketballStore } from '../../store/useBasketballStore';
import { notify } from '../../lib/feedback';
import { LOGO_TYPES, pruneLogos, saveLogo } from '../../lib/logos';
import type { Team } from '../../types/basketball';
import { input, neutral, primary } from './styles';
import { Panel, RulesFields, TeamLogo } from './ui';
import { useSettingsStore, pickRules } from '../../store/useSettingsStore';
import { cleanTheme } from '../../lib/theme';
import { ThemePicker } from './ThemePicker';
import { SoundDisplayPreferences } from './AppPreferences';

const removeUnusedLogos = () => {
  pruneLogos(referencedLogos(useBasketballStore.getState())).catch((error) => console.error('Could not clean up logos', error));
};

const TeamFields: React.FC<{ side: 'home' | 'away' }> = ({ side }) => {
  const store = useBasketballStore();
  const team = side === 'home' ? store.homeTeam : store.awayTeam;
  const label = side === 'home' ? 'Home' : 'Away';
  const update = (change: Partial<Team>) => store.updateTeams(side === 'home' ? change : {}, side === 'away' ? change : {});
  const file = useRef<HTMLInputElement>(null);

  const upload = async (chosen: File | undefined) => {
    if (!chosen) return;
    try {
      update({ logo: await saveLogo(chosen) });
      removeUnusedLogos();
      notify(`${label} logo saved.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The logo could not be saved.', 'error');
    }
  };

  return (
    <Panel title={`${label} Team`}>
      <div className="grid grid-cols-[1fr_auto] gap-3 mb-3">
        <label className="block text-sm text-white">
          Team name
          <input type="text" maxLength={30} value={team.name} onChange={(e) => update({ name: e.target.value })} className={input} />
        </label>
        <label className="block text-sm text-white">
          Team color
          <input type="color" value={team.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} className={`${input} h-10 w-16 p-1`} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 flex-none rounded border border-neutral-600 bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
          {team.logo ? <TeamLogo id={team.logo} alt={`${team.name} logo`} className="w-full h-full object-contain" /> : 'No logo'}
        </div>
        <input ref={file} type="file" hidden aria-label={`${label} logo file`} accept={LOGO_TYPES.join(',')} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => file.current?.click()} className={`${neutral} px-3 py-2 text-sm`}><ImagePlus size={16} />{team.logo ? 'Replace Logo' : 'Upload Logo'}</button>
        {team.logo && (
          <button onClick={() => { update({ logo: undefined }); removeUnusedLogos(); notify(`${label} logo removed.`); }} aria-label={`Remove ${label} logo`} className={`${neutral} px-3 py-2 text-sm`}><Trash2 size={16} />Remove</button>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-400">PNG, JPG or WebP up to 5 MB. Large images are resized automatically.</p>
    </Panel>
  );
};

// Save Settings keeps the current rules and scoreboard theme in useSettingsStore (its own persisted key, separate
// from Saved Configurations). Sound and display preferences are written there as they are changed.
const SaveSettings: React.FC = () => {
  const { gameConfig, updateGameConfig } = useBasketballStore();
  const saved = useSettingsStore();
  const current = { rules: pickRules(gameConfig), theme: cleanTheme(gameConfig.theme) };
  const unsaved = JSON.stringify(current) !== JSON.stringify({ rules: saved.rules, theme: saved.theme });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-3">
      <p role="status" className={`flex-1 text-sm ${unsaved ? 'font-semibold text-amber-400' : 'text-neutral-300'}`}>
        {unsaved ? 'Unsaved changes: the rules or scoreboard theme differ from your saved settings.' : 'Rules and scoreboard theme match your saved settings. Sound and display preferences save as you change them.'}
      </p>
      {unsaved && <button onClick={() => { updateGameConfig({ ...saved.rules, theme: saved.theme }); notify('Reverted to your saved settings.'); }} className={`${neutral} px-4 py-2 text-sm`}>Revert</button>}
      <button onClick={() => { saved.updateRules(current.rules); saved.updateTheme(current.theme); notify('Settings saved.'); }} className={`${primary} px-4 py-2 text-sm`}>Save Settings</button>
    </div>
  );
};

export const SetupPage: React.FC = () => {
  const store = useBasketballStore();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Game Setup</h2>
      <section aria-labelledby="game-settings-heading" className="space-y-3">
      <h3 id="game-settings-heading" className="text-xl font-bold">Game Settings</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <TeamFields side="home" />
        <TeamFields side="away" />
      </div>
      <Panel title="Rules" aside={<button onClick={() => { store.restoreTimeouts(); notify('Timeouts restored.'); }} className={`${neutral} px-3 py-1 text-xs`}>Restore timeouts now</button>}>
        <RulesFields rules={store.gameConfig} onChange={store.updateGameConfig} />
      </Panel>
      <Panel title="Scoreboard Appearance">
        <ThemePicker />
      </Panel>
      <SoundDisplayPreferences />
      <SaveSettings />
      </section>
    </div>
  );
};
