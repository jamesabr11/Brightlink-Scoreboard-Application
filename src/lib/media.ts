import type { MediaItem, MediaKind } from '../types/media';
import { idbStores } from './idb';
import { newId } from './storage';

// Files and thumbnails live in IndexedDB, keyed by the item id; useMediaStore
// keeps the small metadata. Nothing here touches localStorage.
const mediaDb = idbStores('basketball-media', ['files', 'thumbs']);
type BlobStore = 'files' | 'thumbs';

export const MEDIA_TYPES: Record<string, MediaKind> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
};
export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).join(',');
export const MAX_BYTES: Record<MediaKind, number> = { image: 25 * 1024 * 1024, video: 500 * 1024 * 1024 };
export const DEFAULT_IMAGE_SECONDS = 10;
export const MAX_IMAGE_SECONDS = 600;
const THUMB_SIZE = [480, 270];

// Some systems hand over files with no MIME type, so fall back to the extension.
const EXTENSIONS: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4' };
export const mediaType = (file: { name: string; type: string }) =>
  file.type || EXTENSIONS[file.name.split('.').pop()?.toLowerCase() ?? ''] || '';

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

export const mediaFileError = (file: { name: string; type: string; size: number }): string | null => {
  const kind = MEDIA_TYPES[mediaType(file)];
  if (!kind) return `"${file.name}" isn't supported. Use PNG, JPG, WebP images or MP4 video.`;
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_BYTES[kind]) return `"${file.name}" is over ${mb(MAX_BYTES[kind])}, the ${kind} limit.`;
  return null;
};

// Seconds the item stays on screen: whole seconds, at least 1, and a video
// can be cut short but never run past its own end.
export const clampDuration = (item: Pick<MediaItem, 'kind' | 'naturalDuration'>, seconds: unknown) => {
  const max = item.kind === 'video' && item.naturalDuration ? Math.ceil(item.naturalDuration) : MAX_IMAGE_SECONDS;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return item.kind === 'video' ? max : DEFAULT_IMAGE_SECONDS;
  return Math.min(max, Math.max(1, Math.round(seconds)));
};

export const nameFromFile = (fileName: string) => fileName.replace(/\.[^.]+$/, '').trim().slice(0, 80) || 'Untitled';

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 * 1024 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes >= 1024 * 1024 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Rounds up, like clampDuration's limit, so a 3.2s video reads "4s" everywhere.
export const formatSeconds = (seconds: number) => {
  const whole = Math.ceil(seconds - 1e-6);
  return whole < 60 ? `${whole}s` : `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const toThumb = (source: CanvasImageSource, width: number, height: number) => {
  const scale = Math.min(1, THUMB_SIZE[0] / width, THUMB_SIZE[1] / height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No thumbnail'))), 'image/webp', 0.8));
};

interface Probe { width: number; height: number; naturalDuration: number | null; thumb: Blob }

const probeImage = async (file: Blob): Promise<Probe> => {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height, naturalDuration: null, thumb: await toThumb(bitmap, bitmap.width, bitmap.height) };
  } finally {
    bitmap.close();
  }
};

// Loading the video proves this browser can actually play it (an MP4 with an
// unsupported codec fails here, at upload, instead of mid-game).
const probeVideo = (file: Blob) =>
  new Promise<Probe>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      settle();
    };
    const fail = () => finish(() => reject(new Error('unplayable')));
    const timer = setTimeout(fail, 20000);
    video.muted = true;
    video.preload = 'auto';
    video.onerror = fail;
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth) fail();
      else video.currentTime = Math.min(1, video.duration / 2); // skip a black first frame
    };
    video.onseeked = () => {
      const { videoWidth: width, videoHeight: height, duration } = video;
      toThumb(video, width, height).then((thumb) => finish(() => resolve({ width, height, naturalDuration: duration, thumb })), fail);
    };
    video.src = url;
  });

const quotaError = (error: unknown) =>
  error instanceof DOMException && error.name === 'QuotaExceededError'
    ? new Error('The browser is out of storage space for media. Delete unused media and try again.')
    : error;

export const saveMedia = async (file: File, categoryId: string, sponsorId: string | null = null): Promise<MediaItem> => {
  const problem = mediaFileError(file);
  if (problem) throw new Error(problem);
  const type = mediaType(file);
  const kind = MEDIA_TYPES[type];
  let probe: Probe;
  try {
    probe = kind === 'image' ? await probeImage(file) : await probeVideo(file);
  } catch {
    throw new Error(kind === 'image'
      ? `"${file.name}" could not be read as an image.`
      : `"${file.name}" can't be played in this browser. Export it as MP4 (H.264).`);
  }
  const id = newId();
  try {
    await mediaDb('files', 'readwrite', (store) => store.put(file, id));
    await mediaDb('thumbs', 'readwrite', (store) => store.put(probe.thumb, id));
  } catch (error) {
    await deleteMediaFiles(id).catch(() => {});
    throw quotaError(error);
  }
  return {
    id,
    name: nameFromFile(file.name),
    kind,
    type,
    size: file.size,
    width: probe.width,
    height: probe.height,
    naturalDuration: probe.naturalDuration,
    duration: clampDuration({ kind, naturalDuration: probe.naturalDuration }, kind === 'image' ? DEFAULT_IMAGE_SECONDS : undefined),
    categoryId,
    sponsorId,
    createdAt: Date.now(),
  };
};

export const loadMedia = (id: string, store: BlobStore) => mediaDb<Blob | undefined>(store, 'readonly', (s) => s.get(id));

export const deleteMediaFiles = async (id: string) => {
  await mediaDb('files', 'readwrite', (store) => store.delete(id));
  await mediaDb('thumbs', 'readwrite', (store) => store.delete(id));
};

// Files whose metadata is gone (deleted elsewhere, or site data partly cleared)
// would otherwise sit in storage forever.
// ponytail: an upload in another tab between its file write and its metadata
// write could be swept; the window is milliseconds and only on library open.
export const pruneMediaFiles = async (keep: Set<string>) => {
  const ids = await mediaDb('files', 'readonly', (store) => store.getAllKeys());
  const thumbs = await mediaDb('thumbs', 'readonly', (store) => store.getAllKeys());
  const orphans = [...new Set([...ids, ...thumbs].map(String))].filter((id) => !keep.has(id));
  for (const id of orphans) await deleteMediaFiles(id);
  return orphans.length;
};

export const storageUsage = async () => {
  const estimate = await navigator.storage?.estimate?.();
  return estimate?.quota ? { used: estimate.usage ?? 0, quota: estimate.quota } : null;
};

// Asks the browser not to evict media under storage pressure. Chrome decides
// silently; it may say no, in which case media is still kept unless space runs out.
export const keepMediaStored = () => navigator.storage?.persist?.().catch(() => false);
