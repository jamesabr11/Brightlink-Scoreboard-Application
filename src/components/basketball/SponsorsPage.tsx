import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Handshake, ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { askConfirm, notify } from '../../lib/feedback';
import { formatSeconds, MEDIA_ACCEPT, MEDIA_TYPES, mediaType } from '../../lib/media';
import { useMediaStore } from '../../store/useMediaStore';
import type { Sponsor, MediaItem } from '../../types/media';
import { MediaDetails, MediaThumb } from './MediaParts';
import { useUpload } from './useMedia';
import { brand, input, negative, neutral } from './styles';
import { Panel } from './ui';

// Sponsor uploads are filed in the library's Sponsors category.
const SPONSOR_CATEGORY = 'sponsors';
const IMAGE_ACCEPT = Object.keys(MEDIA_TYPES).filter((type) => MEDIA_TYPES[type] === 'image').join(',');

const SponsorCard: React.FC<{ sponsor: Sponsor; onOpen: (id: string) => void }> = ({ sponsor, onOpen }) => {
  const { items, updateSponsor, removeSponsor, addSponsorImage, removeSponsorImage, moveSponsorImage, setSponsorImageDuration } = useMediaStore();
  const { upload, status } = useUpload();
  const [name, setName] = useState(sponsor.name);
  const logoInput = useRef<HTMLInputElement>(null);
  const adInput = useRef<HTMLInputElement>(null);

  const logo = items.find((item) => item.id === sponsor.logoId);
  // Get all images linked to this sponsor in display order: logo first, then imageIds
  const sponsorMediaIds = [
    sponsor.logoId,
    ...sponsor.imageIds,
  ].filter((id): id is string => Boolean(id));
  const sponsorImages = sponsorMediaIds.map((id) => items.find((item) => item.id === id)).filter((item): item is MediaItem => Boolean(item));
  const allImages = items.filter((item) => item.kind === 'image');
  const linkable = allImages.filter((item) => item.sponsorId !== sponsor.id && item.id !== sponsor.logoId && !sponsor.imageIds.includes(item.id));

  // Total display time for all sponsor images
  const total = sponsorImages.reduce((sum, img) => {
    const dur = sponsor.imageDurations[img.id];
    return sum + (dur ?? img.duration);
  }, 0);

  const saveName = () => {
    if (name.trim() === sponsor.name) return;
    if (updateSponsor(sponsor.id, { name })) notify('Sponsor renamed.');
    else { notify('Sponsor names must be filled in and different from the others.', 'error'); setName(sponsor.name); }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (MEDIA_TYPES[mediaType(file)] !== 'image') { notify('A logo must be a PNG, JPG or WebP image.', 'error'); return; }
    const [saved] = await upload([file], SPONSOR_CATEGORY);
    if (!saved) return;
    useMediaStore.getState().updateItem(saved.id, { name: `${sponsor.name} logo` });
    updateSponsor(sponsor.id, { logoId: saved.id });
  };

  const remove = async () => {
    const confirmed = await askConfirm({
      title: `Remove ${sponsor.name}?`,
      message: 'The sponsor is removed. Its logo and advertisements stay in the Media Library, no longer linked to a sponsor.',
      confirmLabel: 'Remove Sponsor',
      danger: true,
    });
    if (!confirmed) return;
    removeSponsor(sponsor.id);
    notify(`${sponsor.name} removed.`);
  };

  const handleAddSponsorImage = (mediaId: string) => {
    addSponsorImage(sponsor.id, mediaId);
    notify('Image added to sponsor rotation.');
  };

  const handleRemoveSponsorImage = (mediaId: string) => {
    removeSponsorImage(sponsor.id, mediaId);
    notify('Image removed from sponsor rotation.');
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) moveSponsorImage(sponsor.id, index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < sponsor.imageIds.length - 1) moveSponsorImage(sponsor.id, index, index + 1);
  };

  const handleDurationChange = (mediaId: string, duration: number) => {
    setSponsorImageDuration(sponsor.id, mediaId, duration);
  };

  return (
    <li className="rounded-lg border border-neutral-700 bg-neutral-900">
      <div className="flex flex-wrap items-start gap-4 border-b border-neutral-700 p-4" style={{ borderLeft: '4px solid var(--brand)' }}>
        <div className="flex w-28 flex-none flex-col gap-2">
          {logo ? (
            <button onClick={() => onOpen(logo.id)} aria-label={`Preview ${sponsor.name} logo`} className="overflow-hidden rounded border border-neutral-600">
              <MediaThumb item={logo} className="aspect-square bg-white/5" />
            </button>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded border border-dashed border-neutral-600 text-xs text-neutral-400">No logo</div>
          )}
          <input ref={logoInput} type="file" hidden accept={IMAGE_ACCEPT} aria-label={`${sponsor.name} logo file`} onChange={(e) => { void uploadLogo(e.target.files?.[0]); e.target.value = ''; }} />
          <button onClick={() => logoInput.current?.click()} disabled={status !== null} className={`${neutral} px-2 py-1.5 text-xs`}><ImagePlus size={14} />{logo ? 'Replace' : 'Upload'}</button>
        </div>

        <div className="min-w-56 flex-1 space-y-3">
          <label className="block text-sm text-white">
            Sponsor name
            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={`${input} text-lg font-bold`} />
          </label>
          <label className="block text-sm text-white">
            Logo from the library
            <select value={sponsor.logoId ?? ''} onChange={(e) => updateSponsor(sponsor.id, { logoId: e.target.value || null })} className={input}>
              <option value="">No logo</option>
              {allImages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>

        <button onClick={remove} aria-label={`Remove ${sponsor.name}`} className={`${negative} px-3 py-2 text-sm`}><Trash2 size={16} />Remove</button>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
            Sponsor Images <span className="normal-case tracking-normal text-neutral-400">· {sponsorImages.length === 0 ? 'none yet' : `${sponsorImages.length}, ${formatSeconds(total)} in total`}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label={`Add existing image to ${sponsor.name} rotation`}
              value=""
              onChange={(e) => { if (e.target.value) { handleAddSponsorImage(e.target.value); } }}
              className={`${input} mt-0 w-auto py-1.5 text-sm`}
              disabled={linkable.length === 0}
            >
              <option value="">Add from library…</option>
              {linkable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input ref={adInput} type="file" multiple hidden accept={MEDIA_ACCEPT} aria-label={`${sponsor.name} sponsor image files`} onChange={(e) => { const files = [...(e.target.files ?? [])]; void upload(files, SPONSOR_CATEGORY, sponsor.id).then((saved) => { saved.forEach((item) => addSponsorImage(sponsor.id, item.id)); }); e.target.value = ''; }} />
            <button onClick={() => adInput.current?.click()} disabled={status !== null} className={`${brand} px-3 py-1.5 text-sm`}><Upload size={16} />Upload Images</button>
          </div>
        </div>
        {status && <p role="status" className="text-sm text-neutral-300">{status}</p>}

        {sponsorImages.length > 0 && (
          <ul className="divide-y divide-neutral-800">
            {sponsorImages.map((img, idx) => {
              const isLogo = idx === 0 && img.id === sponsor.logoId;
              const duration = sponsor.imageDurations[img.id] ?? img.duration;
              return (
                <li key={img.id} className="grid items-center gap-3 py-3 sm:grid-cols-[8rem_1fr_6rem_auto_auto_auto]">
                  <button onClick={() => onOpen(img.id)} aria-label={`Preview ${img.name}`} className="overflow-hidden rounded border border-neutral-700">
                    <MediaThumb item={img} className="aspect-video" />
                  </button>
                  <div className="min-w-0">
                    <div className="truncate font-semibold flex items-center gap-2">
                      {img.name}
                      {isLogo && <span className="text-xs bg-brand/20 text-brand px-1.5 py-0.5 rounded">Logo</span>}
                    </div>
                    <div className="text-xs text-neutral-400">{img.kind === 'video' ? 'Video' : 'Image'} · {img.width} × {img.height}</div>
                  </div>
                  <NumberField
                    label="Duration (s)"
                    min={1}
                    value={duration}
                    onChange={(d) => handleDurationChange(img.id, d)}
                    className="w-24"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} aria-label="Move up" className={`${neutral} p-2`}><ChevronLeft size={16} /></button>
                    <button onClick={() => handleMoveDown(idx)} disabled={idx === sponsor.imageIds.length - 1} aria-label="Move down" className={`${neutral} p-2`}><ChevronRight size={16} /></button>
                    {!isLogo && (
                      <button onClick={() => handleRemoveSponsorImage(img.id)} aria-label={`Remove ${img.name} from ${sponsor.name}`} className={`${negative} p-2`}><X size={16} /></button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {sponsorImages.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-4">No sponsor images yet. Upload or add from the library to build the rotation.</p>
        )}
      </div>
    </li>
  );
};

// NumberField component for inline number input
const NumberField: React.FC<{ label: string; min: number; value: number; onChange: (v: number) => void; className?: string }> = ({ label, min, value, onChange, className = '' }) => (
  <label className={`block text-xs text-neutral-400 ${className}`}>
    {label}
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
      onBlur={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
      className={`${input} w-full mt-1 text-center`}
    />
  </label>
);

export const SponsorsPage: React.FC = () => {
  const { sponsors, addSponsor } = useMediaStore();
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const add = () => {
    if (!addSponsor(name)) { notify('Give the sponsor a name that isn\'t already used.', 'error'); return; }
    notify(`${name.trim()} added.`);
    setName('');
  };

  const sorted = [...sponsors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">Sponsors</h2>
      <Panel title="Add a Sponsor">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <label className="min-w-48 flex-1 text-sm">
            Sponsor name
            <input maxLength={80} placeholder="e.g. Main Street Pizza" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <button type="submit" className={`${brand} px-4 py-2`}><Plus size={16} />Add Sponsor</button>
        </form>
        <p className="mt-2 text-xs text-neutral-400">Each sponsor gets a logo and multiple images/videos with individual display times. Images rotate in order. Sponsor uploads are filed under Sponsors in the Media Library.</p>
      </Panel>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-neutral-600 px-6 py-14 text-center">
          <Handshake size={36} className="text-[var(--brand)]" aria-hidden />
          <p className="text-lg font-semibold">No sponsors yet</p>
          <p className="max-w-md text-sm text-neutral-300">Add a sponsor above, then upload its logo and sponsor images.</p>
        </div>
      ) : (
        <ul className="space-y-3">{sorted.map((sponsor) => <SponsorCard key={sponsor.id} sponsor={sponsor} onOpen={setOpenId} />)}</ul>
      )}
      <MediaDetails itemId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
};
