import { useEffect, useState } from 'react';
import { askConfirm, notify } from '../../lib/feedback';
import { deleteMediaFiles, keepMediaStored, loadMedia, saveMedia } from '../../lib/media';
import { layoutsUsing } from '../../lib/mediaUsage';
import { useMediaStore } from '../../store/useMediaStore';
import { usePresentationStore } from '../../store/usePresentationStore';
import type { MediaItem } from '../../types/media';

// An object URL for a stored file or thumbnail, revoked when no longer shown.
export const useMediaUrl = (id: string | null | undefined, store: 'files' | 'thumbs') => {
  const key = id ? `${store}:${id}` : '';
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    let url: string | null = null;
    const done = (blob: Blob | undefined) => {
      if (!live) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setLoaded({ key: `${store}:${id}`, url });
    };
    loadMedia(id, store).then(done, (error) => { console.error('Could not load media', error); done(undefined); });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, store]);

  return loaded?.key === key ? { url: loaded.url, missing: loaded.url === null } : { url: null, missing: false };
};

// Uploads one file at a time, so a big video can't stall a batch of images
// behind it, and reports what didn't make it in one message.
export const useUpload = () => {
  const [status, setStatus] = useState<string | null>(null);

  const upload = async (files: File[], categoryId: string, sponsorId: string | null = null) => {
    if (files.length === 0) return [];
    void keepMediaStored();
    const saved: MediaItem[] = [];
    const failed: string[] = [];
    for (const [index, file] of files.entries()) {
      setStatus(files.length > 1 ? `Adding ${index + 1} of ${files.length}: ${file.name}` : `Adding ${file.name}`);
      try {
        const item = await saveMedia(file, categoryId, sponsorId);
        useMediaStore.getState().addItem(item);
        saved.push(item);
      } catch (error) {
        failed.push(error instanceof Error ? error.message : `"${file.name}" could not be saved.`);
      }
    }
    setStatus(null);
    if (failed.length > 0) {
      const added = saved.length > 0 ? `${saved.length} added. ` : '';
      notify(failed.length === 1 ? `${added}${failed[0]}` : `${added}${failed.length} files weren't added. ${failed[0]}`, 'error');
    } else {
      notify(saved.length === 1 ? `"${saved[0].name}" added.` : `${saved.length} files added.`);
    }
    return saved;
  };

  return { upload, status };
};

// Removes items from the library and every place that points at them (sponsors, working and saved layouts),
// then their blobs and thumbnails. Unreadable files are swept up the next time the library opens.
export const deleteMediaItems = async (ids: string[]) => {
  useMediaStore.getState().removeItems(ids);
  usePresentationStore.getState().removeMedia(ids);
  await Promise.all(ids.map((id) => deleteMediaFiles(id).catch((error) => console.error('Could not delete media file', error))));
};

export const confirmDeleteMedia = async (item: MediaItem) => {
  const { sponsors } = useMediaStore.getState();
  const logoOf = sponsors.filter((s) => s.logoId === item.id).map((s) => s.name);
  const layouts = layoutsUsing(item.id, usePresentationStore.getState());
  const confirmed = await askConfirm({
    title: `Delete "${item.name}"?`,
    message: `The file is permanently removed from this computer.${logoOf.length > 0 ? ` ${logoOf.join(', ')} will no longer have a logo.` : ''}${layouts.length > 0 ? ` It is removed from: ${layouts.join(', ')}.` : ''}`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return false;
  await deleteMediaItems([item.id]);
  notify(`"${item.name}" deleted.`);
  return true;
};
