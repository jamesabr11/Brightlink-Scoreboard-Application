import { useEffect, useRef } from 'react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useMediaStore } from '../../store/useMediaStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { useMediaUrl } from './useMedia';
import type { MediaItem } from '../../types/media';

// Renders inside the pm-slot on the display side. Never touches the live
// scoreboard — it only populates the reserved media/sponsor slot area.

// Shown when nothing is queued or playing.
const FallbackSlot: React.FC = () => {
  const name = useBasketballStore((state) => state.gameConfig.name);
  return <span className="sb-eyebrow sb-truncate">{name}</span>;
};

interface MediaProps {
  item: MediaItem;
  isPlaying: boolean;
  onDone: () => void;
}

const ImageMedia: React.FC<MediaProps> = ({ item, isPlaying, onDone }) => {
  const { url, missing } = useMediaUrl(item.id, 'files');

  // Deleted blob — skip to the next item.
  useEffect(() => { if (missing) onDone(); }, [missing, onDone]);

  // Timed advance: start the timer when the image is loaded and playback is active.
  useEffect(() => {
    if (!isPlaying || !url) return;
    const timer = setTimeout(onDone, item.duration * 1000);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, isPlaying, url, onDone]);

  if (!url) return null;
  return (
    <img
      src={url}
      alt={item.name}
      className="pm-media-img"
      onError={onDone}
    />
  );
};

const VideoMedia: React.FC<MediaProps> = ({ item, isPlaying, onDone }) => {
  const { url, missing } = useMediaUrl(item.id, 'files');
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (missing) onDone(); }, [missing, onDone]);

  // Drive play/pause imperatively (the HTML attribute alone isn't reliable).
  useEffect(() => {
    const video = ref.current;
    if (!video || !url) return;
    if (isPlaying) {
      video.play().catch(() => onDone());
    } else {
      video.pause();
    }
  }, [isPlaying, url, onDone]);

  // Fallback timer: guard against onEnded not firing (e.g., codec issue).
  useEffect(() => {
    if (!isPlaying || !url) return;
    const timer = setTimeout(onDone, item.duration * 1000 + 1000);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, isPlaying, url, onDone]);

  if (!url) return null;
  return (
    <video
      ref={ref}
      src={url}
      onEnded={onDone}
      onError={onDone}
      playsInline
      className="pm-media-video"
    />
  );
};

export const MediaPlayer: React.FC = () => {
  const { queue, currentIndex, isPlaying, advance } = usePlaybackStore();
  const items = useMediaStore((state) => state.items);

  const currentId = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;
  const item = currentId ? (items.find((i) => i.id === currentId) ?? null) : null;

  // If the queued item was deleted from the store, skip it.
  useEffect(() => {
    if (currentId !== null && item === null) advance();
  }, [currentId, item, advance]);

  if (!item) return <FallbackSlot />;

  return item.kind === 'image'
    ? <ImageMedia item={item} isPlaying={isPlaying} onDone={advance} />
    : <VideoMedia item={item} isPlaying={isPlaying} onDone={advance} />;
};
