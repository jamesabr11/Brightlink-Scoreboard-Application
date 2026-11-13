import { Volume2 } from 'lucide-react';
import { isGameActive, useBasketballStore } from '../../store/useBasketballStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { askConfirm, notify } from '../../lib/feedback';
import { playSound, unlockAudio } from '../../lib/sound';
import { neutral, primary } from './styles';
import { CheckField, Panel, RulesFields } from './ui';
import { ThemeFields } from './ThemePicker';

// The defaults for new games (useSettingsStore). Shown on the Game Setup page.
export const NewGameDefaults: React.FC = () => {
  const settings = useSettingsStore();

  const startNewGame = async () => {
    const confirmed = !isGameActive(useBasketballStore.getState()) || await askConfirm({
      title: 'A game is in progress',
      message: 'Starting a new game replaces it. Team names are kept, and Undo can bring the game back.',
      confirmLabel: 'Start New Game',
      danger: true,
    });
    if (!confirmed) return;
    useBasketballStore.getState().applyDefaults(settings.rules, settings.theme);
    notify('New game started with your defaults.');
  };

  const restore = async () => {
    const confirmed = await askConfirm({ title: 'Restore default settings?', message: 'Defaults, sound and display preferences return to factory values. The current game, configurations and history are not changed.', confirmLabel: 'Restore Defaults', danger: true });
    if (!confirmed) return;
    settings.restoreDefaults();
    notify('Settings restored.');
  };

  return (
    <section aria-labelledby="defaults-heading" className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 id="defaults-heading" className="text-xl font-bold">New Game Defaults</h3>
        <div className="flex gap-2">
          <button onClick={startNewGame} className={`${primary} px-4 py-2`}>New Game With Defaults</button>
          <button onClick={restore} className={`${neutral} px-4 py-2`}>Restore Defaults</button>
        </div>
      </div>
      <p className="text-sm text-neutral-300">Saved in this browser. Defaults apply when you choose New Game With Defaults; they don't change a game in progress.</p>

      <Panel title="Default Game Rules">
        <RulesFields rules={settings.rules} onChange={settings.updateRules} />
      </Panel>

      <Panel title="Default Scoreboard Theme">
        <ThemeFields value={settings.theme} onChange={settings.updateTheme} />
      </Panel>

    </section>
  );
};

// Sound and display preferences (useSettingsStore), shown inside Game Settings.
export const SoundDisplayPreferences: React.FC = () => {
  const settings = useSettingsStore();

  const testSound = () => {
    unlockAudio();
    // Resuming audio is asynchronous, so give it a moment on the first click.
    setTimeout(() => playSound('periodEnd', settings.sound.volume), 100);
  };

  return (
    <>
      <Panel title="Sound">
        <div className="space-y-3">
          <CheckField label="Enable sound effects" hint="Sounds play from the operator page. Browsers need one click or key press on the page first." checked={settings.sound.enabled} onChange={(enabled) => settings.updateSound({ enabled })} />
          <label className="block text-sm max-w-sm">
            Volume: {Math.round(settings.sound.volume * 100)}%
            <input type="range" min={0} max={1} step={0.05} value={settings.sound.volume} onChange={(e) => settings.updateSound({ volume: Number(e.target.value) })} className="block w-full mt-1" />
          </label>
          <div className="grid md:grid-cols-3 gap-3">
            <CheckField label="Period-ending alert" checked={settings.sound.periodEnd} onChange={(periodEnd) => settings.updateSound({ periodEnd })} />
            <CheckField label="Game-ending alert" hint="When the clock ends the last period with no tie." checked={settings.sound.gameEnd} onChange={(gameEnd) => settings.updateSound({ gameEnd })} />
            <CheckField label="Shot clock warning" hint="One beep at 5 seconds." checked={settings.sound.shotWarning} onChange={(shotWarning) => settings.updateSound({ shotWarning })} />
          </div>
          <button onClick={testSound} className={`${neutral} px-3 py-2 text-sm`}><Volume2 size={16} />Test Sound</button>
        </div>
      </Panel>

      <Panel title="Display Preferences">
        <div className="grid md:grid-cols-2 gap-3">
          <CheckField label="Show shot clock" hint="Turn off for leagues that don't use one." checked={settings.display.showShotClock} onChange={(showShotClock) => settings.updateDisplay({ showShotClock })} />
          <CheckField label="Show LEADING badge" checked={settings.display.showLeadingBadge} onChange={(showLeadingBadge) => settings.updateDisplay({ showLeadingBadge })} />
        </div>
      </Panel>
    </>
  );
};
