import { usePresentationStore } from '../../store/usePresentationStore';
import { PRESENTATION_MODES, SPONSOR_PLACEMENTS, SPONSOR_SIZE_MAX, SPONSOR_SIZE_MIN } from '../../types/presentation';
import type { CountdownId, PresentationMode } from '../../types/presentation';
import { ClockDisplay } from './ClockDisplay';
import { IntroPanel } from './IntroPanel';
import { PlaybackPanel } from './PlaybackPanel';
import { NumberField, Panel } from './ui';
import { buttonBase, neutral, negative, positive } from './styles';
import { Pause, Play, RotateCcw } from 'lucide-react';

const LABELS: Record<PresentationMode, string> = {
  pregame: 'Pregame', live: 'Live', stadium: 'Stadium', halftime: 'Halftime',
  intro: 'Introductions', fullscreen: 'Fullscreen', livesponsor: 'Live Sponsor',
};
const COUNTDOWN_FOR: Partial<Record<PresentationMode, { id: CountdownId; title: string }>> = {
  pregame: { id: 'pregame', title: 'Tip-off countdown' },
  halftime: { id: 'halftime', title: 'Second-half countdown' },
};

const CountdownControls: React.FC<{ id: CountdownId; title: string }> = ({ id, title }) => {
  const countdown = usePresentationStore((state) => state.countdowns[id]);
  const { startCountdown, pauseCountdown, resetCountdown, setCountdownDuration, adjustCountdown } = usePresentationStore.getState();
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-[auto_1fr_auto] items-end" role="group" aria-label={title}>
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

export const SponsorLayoutControls: React.FC = () => {
  const { placement, size, fit } = usePresentationStore((state) => state.sponsorLayout);
  const set = usePresentationStore((state) => state.setSponsorLayout);
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-[auto_1fr_auto] items-end" role="group" aria-label="Sponsor media area">
      <div>
        <span className="block text-xs text-neutral-400 mb-1">Placement</span>
        <div className="flex gap-2">
          {SPONSOR_PLACEMENTS.map((p) => (
            <button key={p} onClick={() => set({ placement: p })} aria-pressed={placement === p} className={`${placement === p ? `${buttonBase} bg-[var(--brand)] ring-2 ring-white` : neutral} px-3 py-2 text-sm capitalize`}>{p}</button>
          ))}
        </div>
      </div>
      <label className="block text-xs text-neutral-400">
        Media area size: {size}%
        <input type="range" min={SPONSOR_SIZE_MIN} max={SPONSOR_SIZE_MAX} step={5} value={size} onChange={(e) => set({ size: Number(e.target.value) })} className="mt-2 w-full" />
      </label>
      <button onClick={() => set({ fit: fit === 'contain' ? 'cover' : 'contain' })} className={`${neutral} px-3 py-2 text-sm`} title="Fit shows the whole image; Fill crops the edges to fill the area">
        Scaling: {fit === 'contain' ? 'Fit' : 'Fill'}
      </button>
    </div>
  );
};

export const PresentationPanel: React.FC = () => {
  const mode = usePresentationStore((state) => state.mode);
  const setMode = usePresentationStore((state) => state.setMode);
  const countdown = COUNTDOWN_FOR[mode];
  return (
    <div className="mb-3">
      <Panel title="Display Mode" aside={<span className="text-xs text-neutral-400">Changes only what the public display shows</span>}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2" role="group" aria-label="Display mode">
          {PRESENTATION_MODES.map((id) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={mode === id ? `${buttonBase} bg-[var(--brand)] py-3 ring-2 ring-white` : `${neutral} py-3`}
            >
              {LABELS[id]}
            </button>
          ))}
        </div>
        {countdown && <CountdownControls {...countdown} />}
        {mode === 'livesponsor' && <SponsorLayoutControls />}
      </Panel>
      {mode === 'intro' && <IntroPanel />}
      <PlaybackPanel />
    </div>
  );
};
