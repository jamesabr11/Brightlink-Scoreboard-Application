import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Film, Image, ListVideo, Play, Square } from 'lucide-react';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore, queueForMode } from '../../store/usePlaybackStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import { buttonBase, neutral, positive, negative } from './styles';
import { Panel } from './ui';
import type { MediaItem } from '../../types/media';

// Operator-side controls for media playback. Part of the PresentationPanel.

const KindIcon: React.FC<{ kind: MediaItem['kind'] }> = ({ kind }) =>
  kind === 'video' ? <Film size={14} aria-hidden /> : <Image size={14} aria-hidden />;

// Single source of truth for timed advance. Runs only in the operator tab
// (PlaybackPanel is never rendered in the display route). This prevents the
// double-advance race that occurs when both tabs independently run timers.
const usePlaybackTicker = (item: MediaItem | null, isPlaying: boolean) => {
  const advance = usePlaybackStore((state) => state.advance);
  useEffect(() => {
    if (!isPlaying || !item) return;
    const timer = setTimeout(advance, item.duration * 1000);
    return () => clearTimeout(timer);
  }, [item?.id, item?.duration, isPlaying, advance]); // eslint-disable-line react-hooks/exhaustive-deps
};

export const PlaybackPanel: React.FC = () => {
  const { queue, currentIndex, isPlaying, setQueue, playNow, play, stop, next, prev } = usePlaybackStore();
  const items = useMediaStore((state) => state.items);
  const mode = usePresentationStore((state) => state.mode);
  const [playNowId, setPlayNowId] = useState('');

  const currentId = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;
  const currentItem = currentId ? items.find((i) => i.id === currentId) ?? null : null;

  // Advance timer — operator tab only. See usePlaybackTicker above.
  usePlaybackTicker(currentItem, isPlaying);

  // Auto-queue: items that match the current presentation mode's categories.
  const autoQueueIds = useMemo(() => queueForMode(mode, items), [mode, items]);
  const autoQueueCount = autoQueueIds.length;

  const handleLoadModeQueue = () => {
    if (autoQueueIds.length > 0) setQueue(autoQueueIds, true);
  };

  const handlePlayNow = () => {
    if (playNowId) {
      playNow(playNowId);
      setPlayNowId('');
    }
  };

  const modeLabel: Record<typeof mode, string> = {
    pregame: 'Pregame', live: 'Live', stadium: 'Stadium', halftime: 'Halftime',
    intro: 'Intro', fullscreen: 'Fullscreen',
  };

  return (
    <Panel
      title="Media Playback"
      aside={
        <span className="text-xs text-neutral-400">
          {queue.length > 0 ? `${queue.length} in queue` : 'No queue'}
        </span>
      }
    >
      {/* Now playing */}
      <div className="flex items-center gap-2 min-w-0 mb-3 p-2 bg-neutral-900 rounded border border-neutral-700">
        {currentItem ? (
          <>
            <KindIcon kind={currentItem.kind} />
            <span className="flex-1 text-sm text-white truncate">{currentItem.name}</span>
            <span className="text-xs text-neutral-400 flex-none">
              {isPlaying ? 'Playing' : 'Paused'} · {currentIndex + 1}/{queue.length}
            </span>
          </>
        ) : (
          <span className="text-sm text-neutral-500">Nothing playing</span>
        )}
      </div>

      {/* Playback controls */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <button
          onClick={prev}
          disabled={queue.length === 0}
          aria-label="Previous"
          className={`${neutral} py-2`}
        >
          <ChevronLeft size={18} />Prev
        </button>

        {isPlaying ? (
          <button onClick={stop} aria-label="Stop" className={`${negative} py-2 col-span-2`}>
            <Square size={18} />Stop
          </button>
        ) : (
          <button
            onClick={play}
            disabled={queue.length === 0}
            aria-label="Play"
            className={`${positive} py-2 col-span-2`}
          >
            <Play size={18} />Play
          </button>
        )}

        <button
          onClick={next}
          disabled={queue.length === 0}
          aria-label="Next"
          className={`${neutral} py-2`}
        >
          Next<ChevronRight size={18} />
        </button>
      </div>

      {/* Auto-queue for current presentation mode */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleLoadModeQueue}
          disabled={autoQueueCount === 0}
          className={`${buttonBase} bg-neutral-700 hover:bg-neutral-600 py-2 px-3 text-sm flex-1`}
          title={autoQueueCount === 0 ? `No ${modeLabel[mode]} media in the library` : undefined}
        >
          <ListVideo size={16} />
          Load {modeLabel[mode]} Media
          {autoQueueCount > 0 && <span className="text-neutral-400">({autoQueueCount})</span>}
        </button>
      </div>

      {/* Play Now: pick any item and play it immediately */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <label htmlFor="play-now-select" className="text-xs text-neutral-400 block mb-1">
            Play Now
          </label>
          <select
            id="play-now-select"
            value={playNowId}
            onChange={(e) => setPlayNowId(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-2 text-sm text-white"
          >
            <option value="">— choose an item —</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kind === 'video' ? '▶ ' : '⬛ '}{item.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handlePlayNow}
          disabled={!playNowId}
          className={`${positive} py-2 px-3 text-sm flex-none`}
        >
          <Play size={16} />Play
        </button>
      </div>
    </Panel>
  );
};
