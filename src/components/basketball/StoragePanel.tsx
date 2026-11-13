import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { askConfirm, notify } from '../../lib/feedback';
import { formatBytes } from '../../lib/media';
import { mediaUsedBy } from '../../lib/mediaUsage';
import { useMediaStore } from '../../store/useMediaStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import type { MediaItem } from '../../types/media';
import { MediaThumb } from './MediaParts';
import { negative } from './styles';
import { deleteMediaItems } from './useMedia';

// Every file kept in the browser's IndexedDB for the Media Library, with what uses it. Deleting goes through
// deleteMediaItems, which also removes the thumbnail and clears sponsor and layout references.
export const StoragePanel: React.FC = () => {
  const items = useMediaStore((s) => s.items);
  const sponsors = useMediaStore((s) => s.sponsors);
  const sponsorLayout = usePresentationStore((s) => s.sponsorLayout);
  const savedLayouts = usePresentationStore((s) => s.savedLayouts);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const files = [...items].sort((a, b) => b.size - a.size);
  const usedBy = new Map(files.map((f) => [f.id, mediaUsedBy(f.id, sponsors, { sponsorLayout, savedLayouts })]));
  const chosen = files.filter((f) => picked.has(f.id)); // ids of deleted files drop out on their own
  const total = files.reduce((sum, f) => sum + f.size, 0);

  const toggle = (id: string) => setPicked((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; });

  const remove = async (list: MediaItem[]) => {
    if (list.length === 0) return;
    const inUse = list.filter((f) => (usedBy.get(f.id) ?? []).length > 0);
    const confirmed = await askConfirm({
      title: list.length === 1 ? `Delete "${list[0].name}"?` : `Delete ${list.length} files?`,
      message: `${formatBytes(list.reduce((n, f) => n + f.size, 0))} is permanently removed from this computer.${inUse.length > 0
        ? ` In use, and will be removed from where they play: ${inUse.map((f) => `${f.name} (${usedBy.get(f.id)!.join(', ')})`).join('; ')}.`
        : ''}`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    await deleteMediaItems(list.map((f) => f.id));
    setPicked(new Set());
    notify(list.length === 1 ? `"${list[0].name}" deleted.` : `${list.length} files deleted.`);
  };

  if (files.length === 0) return <p className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-10 text-center text-neutral-300">No media is stored.</p>;

  return (
    <section aria-label="Storage Management" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-3">
        <div>
          <h3 className="font-semibold">Storage Management</h3>
          <p className="text-sm text-neutral-300">{files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(total)} used by the media library</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={chosen.length === files.length} onChange={(e) => setPicked(e.target.checked ? new Set(files.map((f) => f.id)) : new Set())} />
            Select all
          </label>
          <button onClick={() => void remove(chosen)} disabled={chosen.length === 0} className={`${negative} px-4 py-2`}>
            <Trash2 size={16} />Delete selected{chosen.length > 0 ? ` (${chosen.length}, ${formatBytes(chosen.reduce((n, f) => n + f.size, 0))})` : ''}
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {files.map((f) => {
          const users = usedBy.get(f.id) ?? [];
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-2">
              <input type="checkbox" aria-label={`Select ${f.name}`} checked={picked.has(f.id)} onChange={() => toggle(f.id)} />
              <MediaThumb item={f} className="h-14 w-24 flex-none rounded" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{f.name}</div>
                <div className="text-xs text-neutral-400">{f.type || f.kind} · {formatBytes(f.size)}{f.width > 0 ? ` · ${f.width}×${f.height}` : ''}</div>
                {users.length > 0
                  ? <div className="flex items-center gap-1 truncate text-xs font-semibold text-amber-400"><AlertTriangle size={12} aria-hidden />In use: {users.join(', ')}</div>
                  : <div className="text-xs text-neutral-500">Not in use</div>}
              </div>
              <button onClick={() => void remove([f])} aria-label={`Delete ${f.name}`} className={`${negative} px-3 py-2`}><Trash2 size={16} /></button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
