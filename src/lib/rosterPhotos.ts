import { idbStores } from './idb';
import { newId } from './storage';

export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_SIDE = 400;

export const photoFileError = (file: { type: string; size: number }): string | null => {
  if (!PHOTO_TYPES.includes(file.type)) return 'Photos must be PNG, JPG or WebP images.';
  if (file.size > MAX_PHOTO_BYTES) return 'That image is over 5 MB. Please choose a smaller one.';
  if (file.size === 0) return 'That file is empty.';
  return null;
};

const photosDb = idbStores('basketball-roster', ['photos']);
const withPhotos = <T,>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) =>
  photosDb('photos', mode, run);

const shrink = async (file: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', 0.9));
};

export const savePhoto = async (file: File): Promise<string> => {
  const problem = photoFileError(file);
  if (problem) throw new Error(problem);
  let image: Blob;
  try {
    image = await shrink(file);
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const id = newId();
  await withPhotos('readwrite', (store) => store.put(image, id));
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
