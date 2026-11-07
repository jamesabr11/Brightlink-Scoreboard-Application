import { useEffect, useRef, useState } from 'react';
import { Film, ImageOff, Trash2 } from 'lucide-react';
import { notify } from '../../lib/feedback';
import { formatBytes, formatSeconds, MAX_IMAGE_SECONDS } from '../../lib/media';
import { useMediaStore } from '../../store/useMediaStore';
import type { MediaItem } from '../../types/media';
import { input, negative, neutral } from './styles';
import { NumberField } from './ui';
import { confirmDeleteMedia, useMediaUrl } from './useMedia';

export const MediaThumb: React.FC<{ item: MediaItem; className?: string }> = ({ item, className = '' }) => {
  const { url, missing } = useMediaUrl(item.id, 'thumbs');
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-black ${className}`}>
      {url && <img src={url} alt="" className="h-full w-full object-contain" />}
      {missing && <span className="flex flex-col items-center gap-1 text-xs text-neutral-400"><ImageOff size={20} />File missing</span>}
      {item.kind === 'video' && (
        <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          <Film size={12} />{formatSeconds(item.naturalDuration ?? 0)}
        </span>
      )}
    </div>
  );
};

export const MediaPreview: React.FC<{ item: MediaItem }> = ({ item }) => {
  const { url, missing } = useMediaUrl(item.id, 'files');
  const box = 'flex h-64 items-center justify-center bg-black text-sm text-neutral-300';
  if (missing) return <div className={box}>This file is missing from the browser's storage. Delete it and upload it again.</div>;
  if (!url) return <div className={box}>Loading…</div>;
  return item.kind === 'image'
    ? <img src={url} alt={item.name} className="max-h-[55vh] w-full bg-black object-contain" />
    : <video src={url} controls preload="metadata" className="max-h-[55vh] w-full bg-black" />;
};

export const DurationField: React.FC<{ item: MediaItem; label?: string }> = ({ item, label = 'Display time (seconds)' }) => {
  const updateItem = useMediaStore((state) => state.updateItem);
  const hint = item.kind === 'video'
    ? `Plays up to ${formatSeconds(item.naturalDuration ?? 0)}, the video's full length. Lower it to cut the video short.`
    : `How long the image stays on screen (1 to ${MAX_IMAGE_SECONDS}s).`;
  return <NumberField label={label} hint={hint} min={1} value={item.duration} onChange={(duration) => updateItem(item.id, { duration })} />;
};

const DetailsForm: React.FC<{ item: MediaItem; onClose: () => void }> = ({ item, onClose }) => {
  const { categories, sponsors, updateItem } = useMediaStore();
  const [name, setName] = useState(item.name);
  const saveName = () => {
    if (!name.trim()) setName(item.name);
    else if (name.trim() !== item.name) { updateItem(item.id, { name }); notify('Name saved.'); }
  };

  return (
    <>
      <MediaPreview item={item} />
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <label className="block text-sm text-white sm:col-span-2">
          Name
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={input} />
        </label>
        <label className="block text-sm text-white">
          Category
          <select value={item.categoryId} onChange={(e) => updateItem(item.id, { categoryId: e.target.value })} className={input}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm text-white">
          Sponsor
          <select value={item.sponsorId ?? ''} onChange={(e) => updateItem(item.id, { sponsorId: e.target.value || null })} className={input}>
            <option value="">None</option>
            {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <DurationField item={item} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 self-start text-sm text-neutral-300">
          <dt>Type</dt><dd>{item.kind === 'video' ? 'MP4 video' : item.type.replace('image/', '').toUpperCase() + ' image'}</dd>
          <dt>Size</dt><dd>{item.width} × {item.height} px, {formatBytes(item.size)}</dd>
          {item.naturalDuration !== null && <><dt>Length</dt><dd>{formatSeconds(item.naturalDuration)}</dd></>}
          <dt>Added</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd>
        </dl>
      </div>
      <div className="flex justify-between gap-2 border-t border-neutral-700 p-4">
        <button onClick={() => void confirmDeleteMedia(item)} className={`${negative} px-4 py-2`}><Trash2 size={16} />Delete</button>
        <button autoFocus onClick={onClose} className={`${neutral} px-4 py-2`}>Done</button>
      </div>
    </>
  );
};

// Preview and edit one item. Closes itself if the item is deleted.
export const MediaDetails: React.FC<{ itemId: string | null; onClose: () => void }> = ({ itemId, onClose }) => {
  const item = useMediaStore((state) => state.items.find((i) => i.id === itemId));
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const open = dialog.current?.open;
    if (item && !open) dialog.current?.showModal();
    if (!item && open) dialog.current?.close();
  }, [item]);

  return (
    <dialog ref={dialog} onClose={onClose} aria-label={item ? `Media: ${item.name}` : 'Media'} className="w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-neutral-600 bg-neutral-900 p-0 text-white backdrop:bg-black/80">
      {item && <DetailsForm key={item.id} item={item} onClose={() => dialog.current?.close()} />}
    </dialog>
  );
};
