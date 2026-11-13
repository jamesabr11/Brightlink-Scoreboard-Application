import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Film, Image, ListPlus, Play, Square, X } from 'lucide-react';
import { choiceValue, parseChoice, playChoice, resumeQueue, stopAll, type Choice } from '../../lib/mediaPlayback';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { durationFor, usePlaybackStore } from '../../store/usePlaybackStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import type { PresentationMode } from '../../types/presentation';
import type { MediaItem } from '../../types/media';
import { neutral, negative, positive } from './styles';
import { Panel } from './ui';

const MODE_LABELS: Record<PresentationMode, string> = {
  live: 'Live Scoreboard', pregame: 'Pregame', stadium: 'Stadium', halftime: 'Halftime',
  intro: 'Introductions', fullscreen: 'Fullscreen Media', livesponsor: 'Live Sponsor',
};
const MODE_CHOICES: Choice[] = (['live', 'pregame', 'stadium', 'halftime', 'livesponsor'] as const).map((mode) => ({ type: 'mode', mode }));

const KindIcon: React.FC<{ kind: MediaItem['kind'] }> = ({ kind }) =>
  kind === 'video' ? <Film size={14} aria-hidden /> : <Image size={14} aria-hidden />;

// Single source of truth for timed advance. Runs only in the operator tab (this panel is never rendered on the
// display route), which prevents the double-advance race of both tabs running timers.
const usePlaybackTicker = (item: MediaItem | null, index: number, isPlaying: boolean) => {
  const sponsors = useMediaStore((state) => state.sponsors);
  const seconds = item ? durationFor(item, sponsors) : 0;
  const advance = usePlaybackStore((state) => state.advance);
  useEffect(() => {
    if (!isPlaying || !item) return;
    const timer = setTimeout(advance, seconds * 1000);
    return () => clearTimeout(timer);
  }, [item?.id, index, seconds, isPlaying, advance]); // eslint-disable-line react-hooks/exhaustive-deps
};

// One place to choose what the public display shows and to run it: pick content, Play Now or Add to Queue,
// and step through the queue.
export const MediaPlaybackPanel: React.FC = () => {
  const { queue, currentIndex, isPlaying, loop, addToQueue, removeFromQueue, next, prev } = usePlaybackStore();
  const items = useMediaStore((state) => state.items);
  const categories = useMediaStore((state) => state.categories);
  const mode = usePresentationStore((state) => state.mode);
  const home = useBasketballStore((state) => state.homeTeam.name);
  const away = useBasketballStore((state) => state.awayTeam.name);
  const [value, setValue] = useState('');
  const choice = parseChoice(value);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const currentId = currentIndex >= 0 ? queue[currentIndex] : undefined;
  const current = currentId ? byId.get(currentId) ?? null : null;
  usePlaybackTicker(current, currentIndex, isPlaying);

  const atEnd = !loop && currentIndex >= queue.length - 1;
  const play = () => { if (choice) playChoice(choice); else resumeQueue(); };
  const canPlay = choice !== null || queue.length > 0;

  return (
    <Panel title="Media Playback" aside={<span className="text-xs text-neutral-400">On display: {MODE_LABELS[mode]}</span>}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1 text-xs text-neutral-400">
          Content
          <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 block w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-2 text-sm text-white">
            <option value="">{queue.length > 0 ? 'Choose content, or press Play to resume the queue' : 'Choose content…'}</option>
            <optgroup label="Display">
              {MODE_CHOICES.map((c) => <option key={choiceValue(c)} value={choiceValue(c)}>{MODE_LABELS[(c as { mode: PresentationMode }).mode]}</option>)}
            </optgroup>
            <optgroup label="Player Introductions">
              <option value="intro:home">{home}</option>
              <option value="intro:away">{away}</option>
            </optgroup>
            {categories.map((category) => {
              const inCategory = items.filter((item) => item.categoryId === category.id);
              return inCategory.length > 0 && (
                <optgroup key={category.id} label={category.name}>
                  {inCategory.map((item) => <option key={item.id} value={`media:${item.id}`}>{item.kind === 'video' ? '▶ ' : ''}{item.name}</option>)}
                </optgroup>
              );
            })}
          </select>
        </label>
        <button onClick={play} disabled={!canPlay} className={`${positive} px-4 py-2`}><Play size={18} />{choice?.type === 'media' ? 'Play Now' : 'Play'}</button>
        <button onClick={() => choice?.type === 'media' && addToQueue(choice.id)} disabled={choice?.type !== 'media'} title={choice && choice.type !== 'media' ? 'Only media can be queued' : undefined} className={`${neutral} px-4 py-2`}><ListPlus size={18} />Add to Queue</button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={prev} disabled={queue.length === 0 || (!loop && currentIndex <= 0)} aria-label="Previous" className={`${neutral} py-2`}><ChevronLeft size={18} />Prev</button>
        <button onClick={stopAll} aria-label="Stop" className={`${negative} py-2`}><Square size={18} />Stop</button>
        <button onClick={next} disabled={queue.length === 0 || atEnd} aria-label="Next" className={`${neutral} py-2`}>Next<ChevronRight size={18} /></button>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
          <span>Queue{queue.length > 0 ? ` · ${queue.length}` : ''}{loop && queue.length > 1 ? ' · repeating' : ''}</span>
          <span>{queue.length === 0 ? '' : isPlaying ? 'Playing' : 'Stopped'}</span>
        </div>
        {queue.length === 0 ? (
          <p className="rounded border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-500">Nothing queued. Choose media and press Add to Queue.</p>
        ) : (
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
        )}
      </div>
    </Panel>
  );
};
