import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Film, Image, ListPlus, ListVideo, Play, Square, X } from 'lucide-react';
import { mediaIdOf, mediaValue, play as playValue, playCustomLayout, QUEUE, runPlaybackTimer, secondsUntilAdvance, stopAll } from '../../lib/mediaPlayback';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import type { PresentationMode } from '../../types/presentation';
import type { MediaItem } from '../../types/media';
import { neutral, negative, positive } from './styles';
import { Panel } from './ui';

const MODE_LABELS: Record<PresentationMode, string> = {
  live: 'Live', pregame: 'Pregame', halftime: 'Halftime',
  intro: 'Introductions', fullscreen: 'Fullscreen', livesponsor: 'Custom Layout',
};

const KindIcon: React.FC<{ kind: MediaItem['kind'] }> = ({ kind }) =>
  kind === 'video' ? <Film size={14} aria-hidden /> : <Image size={14} aria-hidden />;

// Seconds left on the item showing, ticking down while it plays (display only; the timer itself is runPlaybackTimer).
const useCountdown = (active: boolean, itemKey: string) => {
  const [read, setRead] = useState<{ key: string; seconds: number | null }>({ key: '', seconds: null });
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setRead({ key: itemKey, seconds: secondsUntilAdvance() }), 250);
    return () => clearInterval(tick);
  }, [active, itemKey]);
  return active && read.key === itemKey ? read.seconds : null; // a reading from the previous item is never shown
};

// Plays media on the display mode picked with the Display Mode buttons: choose content, Play Now or Add to Queue,
// and step through the queue.
export const MediaPlaybackPanel: React.FC = () => {
  const { queue, currentIndex, isPlaying, loop, addToQueue, removeFromQueue, next, prev } = usePlaybackStore();
  const items = useMediaStore((state) => state.items);
  const categories = useMediaStore((state) => state.categories);
  const mode = usePresentationStore((state) => state.mode);
  const [value, setValue] = useState('');
  const chosenId = mediaIdOf(value);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const currentId = currentIndex >= 0 ? queue[currentIndex] : undefined;
  const current = currentId ? byId.get(currentId) ?? null : null;
  useEffect(runPlaybackTimer, []); // the single advance timer; see runPlaybackTimer

  // A choice that no longer exists (media deleted, or a mode without a rotation) falls back to nothing chosen.
  const valid = value === '' || (chosenId ? byId.has(chosenId) : value === QUEUE && queue.length > 0);
  const choice = valid ? value : '';
  const showing = isPlaying && current ? current.name : null;
  const remaining = useCountdown(showing !== null, `${currentIndex}:${currentId}`);

  // Custom Layout runs the media and sponsor sections set up in the Layout Editor, so there is nothing to choose:
  // just Play (the sponsor rotation) and Stop. The timer above keeps that rotation moving.
  if (mode === 'livesponsor') {
    return (
      <Panel title="Custom Layout" aside={<span className="text-xs text-neutral-400">{isPlaying ? 'Playing' : 'Stopped'}</span>}>
        <p className="mb-3 text-xs text-neutral-400">Shows the layout saved in the <Link to="/layout" className="underline text-neutral-200">Layout Editor</Link>, with its own media and sponsor sections.</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={playCustomLayout} className={`${positive} py-2`}><Play size={18} />Play</button>
          <button onClick={stopAll} aria-label="Stop" className={`${negative} py-2`}><Square size={18} />Stop</button>
        </div>
        {showing && <p className="mt-3 truncate text-sm text-neutral-300">Now playing: {showing}</p>}
      </Panel>
    );
  }

  const atEnd = !loop && currentIndex >= queue.length - 1;

  return (
    <Panel title="Media Playback" aside={<span className="text-xs text-neutral-400">{queue.length > 0 ? `${queue.length} in queue` : 'No queue'}</span>}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1 text-xs text-neutral-400">
          Media for {MODE_LABELS[mode]}
          <select value={choice} onChange={(e) => setValue(e.target.value)} className="mt-1 block w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-2 text-sm text-white">
            <option value="">Choose media…</option>
            <option value={QUEUE} disabled={queue.length === 0}>Rotate Through Queue{queue.length > 0 ? ` (${queue.length})` : ' (queue is empty)'}</option>
            {categories.map((category) => {
              const inCategory = items.filter((item) => item.categoryId === category.id);
              return inCategory.length > 0 && (
                <optgroup key={category.id} label={category.name}>
                  {inCategory.map((item) => <option key={item.id} value={mediaValue(item.id)}>{item.kind === 'video' ? '▶ ' : ''}{item.name}</option>)}
                </optgroup>
              );
            })}
          </select>
        </label>
        <button onClick={() => playValue(choice)} disabled={choice === '' && queue.length === 0} className={`${positive} px-4 py-2`}><Play size={18} />{chosenId ? 'Play Now' : 'Play'}</button>
        {choice !== QUEUE && <button onClick={() => chosenId && addToQueue(chosenId)} disabled={!chosenId} className={`${neutral} px-4 py-2`}><ListPlus size={18} />Add to Queue</button>}
        <button onClick={stopAll} aria-label="Stop" className={`${negative} px-4 py-2`}><Square size={18} />Stop</button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900 p-2 text-sm">
        <ListVideo size={16} aria-hidden className="flex-none text-neutral-400" />
        <span className={`min-w-0 flex-1 truncate ${showing ? 'text-white' : 'text-neutral-500'}`}>{showing ? `Now playing: ${showing}` : 'Nothing playing'}</span>
        <div className="flex flex-none items-center gap-1">
          {remaining !== null && <span className="mr-1 w-9 text-right text-xs tabular-nums text-neutral-300" title="Time until the next item" aria-label={`${remaining} seconds until the next item`}>{remaining}s</span>}
          <button onClick={prev} disabled={queue.length === 0 || (!loop && currentIndex <= 0)} aria-label="Previous" className={`${neutral} px-2 py-1`}><ChevronLeft size={16} />Prev</button>
          <button onClick={next} disabled={queue.length === 0 || atEnd} aria-label="Next" className={`${neutral} px-2 py-1`}>Next<ChevronRight size={16} /></button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
            <span>Queue{loop && queue.length > 1 ? ' · repeating' : ''}</span>
            <span>{isPlaying ? 'Playing' : 'Stopped'}</span>
          </div>
          <ol className="max-h-56 space-y-1 overflow-y-auto" aria-label="Playback queue">
            {queue.map((id, index) => {
              const item = byId.get(id);
              const now = index === currentIndex;
              return (
                <li key={`${index}-${id}`} aria-current={now ? 'true' : undefined} className={`flex items-center gap-2 rounded border p-1.5 text-sm ${now ? 'border-[var(--brand)] bg-neutral-800' : 'border-neutral-700 bg-neutral-900'}`}>
                  <span className="w-5 flex-none text-center text-xs tabular-nums text-neutral-400">{index + 1}</span>
                  {item && <KindIcon kind={item.kind} />}
                  <span className="min-w-0 flex-1 truncate">{item?.name ?? 'Removed from library'}</span>
                  {now && <span className="flex-none text-xs font-semibold text-white">{isPlaying ? 'Now playing' : 'Up next'}</span>}
                  <button onClick={() => removeFromQueue(index)} aria-label={`Remove ${item?.name ?? 'item'} from queue`} className={`${neutral} p-1`}><X size={14} /></button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Panel>
  );
};
