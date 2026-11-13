import { useEffect, useRef } from 'react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { useMediaUrl } from './useMedia';
import type { MediaItem } from '../../types/media';

// Renders inside the pm-slot on the display side. This component is a pure
// renderer — it shows whatever the playback store says to show. Timed advance
// and queue management live in PlaybackPanel (operator-only), so only one tab
// drives playback. Never touches the live scoreboard.

// Shown when nothing is queued or the queue is empty.
const FallbackSlot: React.FC = () => {
  const name = useBasketballStore((state) => state.gameConfig.name);
  return <span className="sb-eyebrow sb-truncate">{name}</span>;
};

interface MediaProps {
  item: MediaItem;
  isPlaying: boolean; // drives video play/pause; unused by images (timer lives in PlaybackPanel)
  onMissing: () => void; // called when the blob was deleted from IndexedDB
}

export const ImageMedia: React.FC<MediaProps> = ({ item, onMissing }) => {
  const { url, missing } = useMediaUrl(item.id, 'files');
  useEffect(() => { if (missing) onMissing(); }, [missing, onMissing]);
  if (!url) return null;
  return (
    <img
      key={item.id}
      src={url}
      alt={item.name}
      className="pm-media-img"
      // A hard load error (corrupt file, wrong MIME) is treated like missing.
      onError={onMissing}
    />
  );
};

export const VideoMedia: React.FC<MediaProps & { onError: () => void; onEnded?: () => void; loop?: boolean }> = ({ item, isPlaying, onMissing, onError, onEnded, loop }) => {
  const { url, missing } = useMediaUrl(item.id, 'files');
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (missing) onMissing(); }, [missing, onMissing]);

  // Drive play/pause imperatively — the autoplay attribute alone is not reliable.
  useEffect(() => {
    const video = ref.current;
    if (!video || !url) return;
    if (isPlaying) {
      video.play().catch(onError);
    } else {
      video.pause();
    }
  }, [isPlaying, url, onError]);

  // Ensure audio is enabled (not muted) for sponsor/intro videos
  useEffect(() => {
    const video = ref.current;
    if (video) video.muted = false;
  }, []);

  if (!url) return null;
  return (
    <video
      key={item.id}
      ref={ref}
      src={url}
      // onEnded is intentionally not wired to advance(): the timer in
      // PlaybackPanel is the single source of truth for advancing. This
      // prevents double-advance when both the operator and display tabs
      // each have a <video> element firing onEnded at the same time.
      onError={onError}
      onEnded={onEnded}
      loop={loop}
      playsInline
      preload="auto"
      className="pm-media-video"
    />
  );
};

export const MediaPlayer: React.FC = () => {
  const { queue, currentIndex, isPlaying, advance } = usePlaybackStore();
  const items = useMediaStore((state) => state.items);

  const currentId = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;
  const item = currentId ? (items.find((i) => i.id === currentId) ?? null) : null;

  // If the queued item was deleted from the metadata store, skip it.
  // This is a one-shot correction, not a recurring timer.
  useEffect(() => {
    if (currentId !== null && item === null) advance();
  }, [currentId, item, advance]);

  // Stopped means nothing on screen; the queue stays lined up for Play.
  if (!item || !isPlaying) return <FallbackSlot />;

  return item.kind === 'image'
    ? <ImageMedia item={item} isPlaying={isPlaying} onMissing={advance} />
    : <VideoMedia item={item} isPlaying={isPlaying} onMissing={advance} onError={advance} />;
};
