import { Volume2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { playSound, unlockAudio } from '../../lib/sound';
import { neutral } from './styles';
import { CheckField, Panel } from './ui';

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
