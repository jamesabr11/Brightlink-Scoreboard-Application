import { idbStores } from './idb';
import { newId } from './storage';

export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const photoFileError = (file: { type: string; size: number }): string | null => {
  if (!PHOTO_TYPES.includes(file.type)) return 'Photos must be PNG, JPG or WebP images.';
  if (file.size > MAX_PHOTO_BYTES) return 'That image is over 5 MB. Please choose a smaller one.';
  if (file.size === 0) return 'That file is empty.';
  return null;
};

const photosDb = idbStores('basketball-roster', ['photos']);
const withPhotos = <T,>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) =>
  photosDb('photos', mode, run);

// The uploaded file is stored exactly as it was: no resizing and no re-encoding, so the display always has the
// original resolution to draw (a 400px, re-compressed copy went soft once it filled a fullscreen display).
// It is only decoded once, to refuse a file that is not really an image.
export const savePhoto = async (file: File): Promise<string> => {
  const problem = photoFileError(file);
  if (problem) throw new Error(problem);
  try {
    (await createImageBitmap(file)).close();
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const id = newId();
  await withPhotos('readwrite', (store) => store.put(file, id));
  return id;
};

export const loadPhoto = (id: string) => withPhotos<Blob | undefined>('readonly', (store) => store.get(id));

export const deletePhoto = (id: string) => withPhotos<undefined>('readwrite', (store) => store.delete(id));

export const prunePhotos = async (inUse: Set<string>) => {
  const ids = await withPhotos('readonly', (store) => store.getAllKeys());
  await Promise.all(
    ids.filter((id) => !inUse.has(String(id)))
       .map((id) => withPhotos('readwrite', (store) => store.delete(id))),
  );
};
