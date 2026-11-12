import { useEffect, useRef, useState } from 'react';
import { Check, FolderPlus, Handshake, HardDrive, Images, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import { askConfirm, notify } from '../../lib/feedback';
import { formatBytes, formatSeconds, MEDIA_ACCEPT, pruneMediaFiles, storageUsage } from '../../lib/media';
import { FALLBACK_CATEGORY, sponsorOf, useMediaStore } from '../../store/useMediaStore';
import type { MediaCategory, MediaItem, MediaKind } from '../../types/media';
import { MediaDetails, MediaThumb } from './MediaParts';
import { SponsorsPanel } from './SponsorsPanel';
import { useUpload } from './useMedia';
import { brand, input, neutral } from './styles';

const ALL = 'all';

const StorageMeter: React.FC<{ usage: { used: number; quota: number } | null }> = ({ usage }) => {
  if (!usage) return null;
  const share = Math.min(1, usage.used / usage.quota);
  return (
    <div className="flex min-w-48 items-center gap-2 text-xs text-neutral-300" title="Space this browser allows the app to use on this computer">
      <HardDrive size={16} aria-hidden />
      <div className="flex-1">
        <div className="mb-1">{formatBytes(usage.used)} used of {formatBytes(usage.quota)}</div>
        <div className="h-1.5 rounded bg-neutral-700" role="meter" aria-label="Media storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
          <div className="h-full rounded" style={{ width: `${Math.max(2, share * 100)}%`, background: share > 0.9 ? '#f87171' : 'var(--brand)' }} />
        </div>
      </div>
    </div>
  );
};

const CategoryRow: React.FC<{ category: MediaCategory; count: number; selected: boolean; onSelect: () => void }> = ({ category, count, selected, onSelect }) => {
  const { renameCategory, removeCategory } = useMediaStore();
  const [draft, setDraft] = useState<string | null>(null);

  const rename = () => {
    if (draft === null) return;
    if (renameCategory(category.id, draft)) { notify('Category renamed.'); setDraft(null); }
    else notify('Category names must be filled in and different from the others.', 'error');
  };

  const remove = async () => {
    const confirmed = await askConfirm({
      title: `Delete the "${category.name}" category?`,
      message: count > 0 ? `Its ${count} ${count === 1 ? 'item moves' : 'items move'} to General Promotions. No media is deleted.` : 'It has no media in it.',
      confirmLabel: 'Delete Category',
      danger: true,
    });
    if (!confirmed) return;
    removeCategory(category.id);
    notify('Category deleted.');
  };

  if (draft !== null) {
    return (
      <form className="flex gap-1 p-1" onSubmit={(e) => { e.preventDefault(); rename(); }}>
        <input autoFocus aria-label="Category name" maxLength={80} value={draft} onChange={(e) => setDraft(e.target.value)} className={`${input} mt-0 py-1`} />
        <button type="submit" aria-label="Save category name" className={`${neutral} px-2`}><Check size={16} /></button>
        <button type="button" aria-label="Cancel renaming" onClick={() => setDraft(null)} className={`${neutral} px-2`}><X size={16} /></button>
      </form>
    );
  }

  return (
    <div className={`group flex items-center rounded border-l-4 ${selected ? 'border-[var(--brand)] bg-neutral-800' : 'border-transparent hover:bg-neutral-800/60'}`}>
      <button onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm">
        <span className="truncate">{category.name}</span>
        <span className="text-xs tabular-nums text-neutral-400">{count}</span>
      </button>
      {!category.builtIn && (
        <span className="flex pr-1">
          <button onClick={() => setDraft(category.name)} aria-label={`Rename ${category.name}`} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"><Pencil size={14} /></button>
          <button onClick={remove} aria-label={`Delete ${category.name}`} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"><Trash2 size={14} /></button>
        </span>
      )}
    </div>
  );
};

const NewCategory: React.FC<{ onAdded: (id: string) => void }> = ({ onAdded }) => {
  const addCategory = useMediaStore((state) => state.addCategory);
  const [name, setName] = useState<string | null>(null);

  if (name === null) {
    return <button onClick={() => setName('')} className="mt-2 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"><FolderPlus size={16} />New category</button>;
  }
  const add = () => {
    const id = addCategory(name);
    if (!id) { notify('Give the category a name that isn\'t already used.', 'error'); return; }
    setName(null);
    onAdded(id);
    notify('Category added.');
  };
  return (
    <form className="mt-2 flex gap-1 p-1" onSubmit={(e) => { e.preventDefault(); add(); }}>
      <input autoFocus aria-label="New category name" placeholder="e.g. Senior Night" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-0 py-1`} />
      <button type="submit" aria-label="Add category" className={`${brand} px-2`}><Check size={16} /></button>
      <button type="button" aria-label="Cancel" onClick={() => setName(null)} className={`${neutral} px-2`}><X size={16} /></button>
    </form>
  );
};

export const MediaPage: React.FC = () => {
  const { items, categories, sponsors } = useMediaStore();
  const [tab, setTab] = useState<'library' | 'sponsors'>('library');
  const [category, setCategory] = useState(ALL);
  const [kind, setKind] = useState<MediaKind | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const { upload, status } = useUpload();
  const fileInput = useRef<HTMLInputElement>(null);

  // A deleted custom category can't stay selected.
  const selected = category === ALL || categories.some((c) => c.id === category) ? category : ALL;
  const uploadCategory = selected === ALL ? FALLBACK_CATEGORY : selected;
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
  const sponsorName = (item: MediaItem) => sponsorOf(item, sponsors)?.name ?? '';

  useEffect(() => {
    pruneMediaFiles(new Set(useMediaStore.getState().items.map((item) => item.id)))
      .catch((error) => console.error('Could not tidy media storage', error));
  }, []);

  useEffect(() => {
    storageUsage().then(setUsage, () => setUsage(null));
  }, [items.length]);

  const add = (files: FileList | null) => {
    if (files && !status) void upload([...files], uploadCategory);
  };

  const query = search.trim().toLowerCase();
  const shown = items
    .filter((item) => selected === ALL || item.categoryId === selected)
    .filter((item) => kind === ALL || item.kind === kind)
    .filter((item) => !query || item.name.toLowerCase().includes(query) || sponsorName(item).toLowerCase().includes(query))
    .sort((a, b) => b.createdAt - a.createdAt);
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);

  return (
    <div
      className="relative space-y-3"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <div className="flex flex-wrap items-center gap-3">
          <StorageMeter usage={usage} />
          <input ref={fileInput} type="file" multiple hidden accept={MEDIA_ACCEPT} aria-label="Media files" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          <button onClick={() => fileInput.current?.click()} disabled={status !== null} className={`${brand} px-4 py-2`}>
            <Upload size={18} />Upload to {categoryName(uploadCategory)}
          </button>
        </div>
      </div>

      <div role="status" className="min-h-5 text-sm text-neutral-300">
        {status ?? 'PNG, JPG and WebP images up to 25 MB, MP4 video up to 500 MB. Drag files anywhere on this page to add them.'}
      </div>

      <div role="tablist" aria-label="Media Library sections" className="flex gap-1 border-b border-neutral-700">
        {([['library', 'Library', Images, items.length], ['sponsors', 'Sponsors', Handshake, sponsors.length]] as const).map(([value, label, Icon, n]) => (
          <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold ${tab === value ? 'border-[var(--brand)] text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
            <Icon size={16} aria-hidden />{label} <span className="text-xs tabular-nums text-neutral-400">{n}</span>
          </button>
        ))}
      </div>

      {tab === 'sponsors' ? <SponsorsPanel onOpen={setOpenId} /> : (
      <div className="grid gap-3 md:grid-cols-[15rem_1fr]">
        <nav aria-label="Media categories" className="self-start rounded-lg border border-neutral-700 bg-neutral-900 p-2">
          <div className={`flex items-center rounded border-l-4 ${selected === ALL ? 'border-[var(--brand)] bg-neutral-800' : 'border-transparent hover:bg-neutral-800/60'}`}>
            <button onClick={() => setCategory(ALL)} aria-pressed={selected === ALL} className="flex flex-1 items-center justify-between px-3 py-2 text-left text-sm font-semibold">
              All media <span className="text-xs tabular-nums text-neutral-400">{items.length}</span>
            </button>
          </div>
          <div className="my-2 border-t border-neutral-700" />
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} count={counts.get(c.id) ?? 0} selected={selected === c.id} onSelect={() => setCategory(c.id)} />
          ))}
          <NewCategory onAdded={setCategory} />
        </nav>

        <section aria-label="Media" className="min-w-0 space-y-3">
                    <div className="flex flex-wrap gap-2">
            <label className="relative min-w-56 flex-1">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="search" aria-label="Search media" placeholder="Search by name or sponsor" value={search} onChange={(e) => setSearch(e.target.value)} className={`${input} mt-0 pl-9`} />
            </label>
            <div role="radiogroup" aria-label="Media type" className="flex overflow-hidden rounded border border-neutral-600">
              {([[ALL, 'All'], ['image', 'Images'], ['video', 'Videos']] as const).map(([value, label]) => (
                <button key={value} role="radio" aria-checked={kind === value} onClick={() => setKind(value)} className={`px-4 py-2 text-sm font-semibold ${kind === value ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'}`}>{label}</button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-neutral-600 px-6 py-16 text-center">
              <Upload size={36} className="text-[var(--brand)]" aria-hidden />
              <p className="text-lg font-semibold">No media yet</p>
              <p className="max-w-md text-sm text-neutral-300">Add sponsor ads, hype videos, player introductions and promotions. They stay on this computer, in this browser, and are ready for the scoreboard's presentation modes.</p>
              <button onClick={() => fileInput.current?.click()} disabled={status !== null} className={`${brand} px-4 py-2`}><Upload size={18} />Upload Media</button>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-10 text-center text-neutral-300">No media matches. Try another category, type or search.</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
              {shown.map((item) => (
                <li key={item.id}>
                  <button onClick={() => setOpenId(item.id)} aria-label={`Open ${item.name}`} className="group w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 text-left hover:border-[var(--brand)] focus-visible:border-[var(--brand)]">
                    <MediaThumb item={item} className="aspect-video" />
                    <div className="space-y-1 p-3">
                      <div className="truncate font-semibold">{item.name}</div>
                      <div className="truncate text-xs text-neutral-400">{categoryName(item.categoryId)} · {item.kind === 'image' ? `${formatSeconds(item.duration)} on screen` : formatBytes(item.size)}</div>
                      {sponsorName(item) && <div className="truncate text-xs font-semibold text-[#ff6b7f]">{sponsorName(item)}</div>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="rounded-lg border-2 border-dashed border-[var(--brand)] bg-neutral-900 px-10 py-8 text-xl font-bold">Drop to add to {categoryName(uploadCategory)}</div>
        </div>
      )}
      <MediaDetails itemId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
};
