import { usePresentationStore } from '../../store/usePresentationStore';
import type { CountdownId, PresentationMode } from '../../types/presentation';
import { ClockDisplay } from './ClockDisplay';
import { IntroPanel } from './IntroPanel';
import { MediaPlaybackPanel } from './MediaPlaybackPanel';
import { NumberField, Panel } from './ui';
import { neutral, negative, positive } from './styles';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const COUNTDOWN_FOR: Partial<Record<PresentationMode, { id: CountdownId; title: string }>> = {
  pregame: { id: 'pregame', title: 'Tip-off countdown' },
  halftime: { id: 'halftime', title: 'Second-half countdown' },
};

const CountdownControls: React.FC<{ id: CountdownId; title: string }> = ({ id, title }) => {
  const countdown = usePresentationStore((state) => state.countdowns[id]);
  const { startCountdown, pauseCountdown, resetCountdown, setCountdownDuration, adjustCountdown } = usePresentationStore.getState();
  return (
    <div className="grid gap-2 md:grid-cols-[auto_1fr_auto] items-end" role="group" aria-label={title}>
      <ClockDisplay clock={countdown} kind="countdown" size="large" label={title} />
      <div className="grid grid-cols-4 gap-2">
        {countdown.isRunning ? (
          <button onClick={() => pauseCountdown(id)} className={`${negative} py-2`}><Pause size={18} />Pause</button>
        ) : (
          <button onClick={() => startCountdown(id)} disabled={countdown.remainingTime <= 0} className={`${positive} py-2`}><Play size={18} />Start</button>
        )}
        <button onClick={() => resetCountdown(id)} className={`${neutral} py-2`}><RotateCcw size={18} />Reset</button>
        <button aria-label={`${title} minus 1 minute`} onClick={() => adjustCountdown(id, -60)} className={`${neutral} py-2`}>-1m</button>
        <button aria-label={`${title} plus 1 minute`} onClick={() => adjustCountdown(id, 60)} className={`${neutral} py-2`}>+1m</button>
      </div>
      <NumberField label="Length (min, 0 hides)" min={0} value={Math.round(countdown.duration / 60)} onChange={(minutes) => setCountdownDuration(id, minutes * 60)} />
    </div>
  );
};

export const PresentationPanel: React.FC = () => {
  const mode = usePresentationStore((state) => state.mode);
  const countdown = COUNTDOWN_FOR[mode];
  return (
    <div className="mb-3 space-y-3">
      <MediaPlaybackPanel />
      {(countdown || mode === 'livesponsor') && (
        <Panel title={countdown ? countdown.title : 'Live Sponsor'}>
          {countdown && <CountdownControls {...countdown} />}
          {mode === 'livesponsor' && <p className="text-xs text-neutral-400">Placement, size and scaling of the sponsor area are set in the <Link to="/layout" className="underline text-neutral-200">Layout Editor</Link>.</p>}
        </Panel>
      )}
      {mode === 'intro' && <IntroPanel />}
    </div>
  );
};
