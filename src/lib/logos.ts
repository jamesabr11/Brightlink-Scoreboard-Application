import { idbStores } from './idb';
import { newId } from './storage';

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export const logoFileError = (file: { type: string; size: number }): string | null => {
  if (!LOGO_TYPES.includes(file.type)) return 'Logos must be PNG, JPG or WebP images.';
  if (file.size > MAX_LOGO_BYTES) return 'That image is over 5 MB. Please choose a smaller one.';
  if (file.size === 0) return 'That file is empty.';
  return null;
};

const logoDb = idbStores('basketball-logos', ['logos']);
const withLogos = <T,>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => logoDb('logos', mode, run);

// Stored exactly as uploaded (no resizing or re-encoding) so the display always has the original resolution.
// It is only decoded once, to refuse a file that is not really an image.
export const saveLogo = async (file: File): Promise<string> => {
  const problem = logoFileError(file);
  if (problem) throw new Error(problem);
  try {
    (await createImageBitmap(file)).close();
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const id = newId();
  await withLogos('readwrite', (store) => store.put(file, id));
  return id;
};

export const loadLogo = (id: string) => withLogos<Blob | undefined>('readonly', (store) => store.get(id));

export const pruneLogos = async (inUse: Set<string>) => {
  const ids = await withLogos('readonly', (store) => store.getAllKeys());
  await Promise.all(ids.filter((id) => !inUse.has(String(id))).map((id) => withLogos('readwrite', (store) => store.delete(id))));
};
