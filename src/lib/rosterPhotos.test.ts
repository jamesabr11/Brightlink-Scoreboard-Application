import { beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, Blob>();
vi.mock('./idb', () => ({
  idbStores: () => (_: string, __: string, run: (store: unknown) => unknown) =>
    Promise.resolve(run({ put: (blob: Blob, id: string) => { stored.set(id, blob); } })),
}));

beforeEach(() => stored.clear());

describe('savePhoto', () => {
  it('keeps the uploaded file exactly as it was: no resizing or re-encoding', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3000, height: 4000, close })));
    const { savePhoto } = await import('./rosterPhotos');
    const file = new File([new Uint8Array(1024)], 'player.jpg', { type: 'image/jpeg' });
    const id = await savePhoto(file);
    expect(stored.get(id)).toBe(file);
    expect(close).toHaveBeenCalled();
  });

  it('still refuses files that are not images, and files that cannot be decoded', async () => {
    const { savePhoto } = await import('./rosterPhotos');
    await expect(savePhoto(new File(['x'], 'a.gif', { type: 'image/gif' }))).rejects.toThrow('PNG, JPG or WebP');
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('bad'); }));
    await expect(savePhoto(new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow('could not be read');
    expect(stored.size).toBe(0);
  });
});
