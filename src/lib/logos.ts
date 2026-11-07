import { idbStores } from './idb';
import { newId } from './storage';

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_SIDE = 512;

export const logoFileError = (file: { type: string; size: number }): string | null => {
  if (!LOGO_TYPES.includes(file.type)) return 'Logos must be PNG, JPG or WebP images.';
  if (file.size > MAX_LOGO_BYTES) return 'That image is over 5 MB. Please choose a smaller one.';
  if (file.size === 0) return 'That file is empty.';
  return null;
};

const logoDb = idbStores('basketball-logos', ['logos']);
const withLogos = <T,>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => logoDb('logos', mode, run);

const shrink = async (file: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', 0.9));
};

export const saveLogo = async (file: File): Promise<string> => {
  const problem = logoFileError(file);
  if (problem) throw new Error(problem);
  let image: Blob;
  try {
    image = await shrink(file);
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const id = newId();
  await withLogos('readwrite', (store) => store.put(image, id));
  return id;
};

export const loadLogo = (id: string) => withLogos<Blob | undefined>('readonly', (store) => store.get(id));

export const pruneLogos = async (inUse: Set<string>) => {
  const ids = await withLogos('readonly', (store) => store.getAllKeys());
  await Promise.all(ids.filter((id) => !inUse.has(String(id))).map((id) => withLogos('readwrite', (store) => store.delete(id))));
};
