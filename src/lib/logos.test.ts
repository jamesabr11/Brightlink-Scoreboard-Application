import { describe, expect, it } from 'vitest';
import { MAX_LOGO_BYTES, logoFileError, saveLogo } from './logos';

describe('logoFileError', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s', (type) => {
    expect(logoFileError({ type, size: 1000 })).toBeNull();
  });

  it.each(['image/svg+xml', 'image/gif', 'text/plain', ''])('rejects type "%s"', (type) => {
    expect(logoFileError({ type, size: 1000 })).toContain('PNG, JPG or WebP');
  });

  it('rejects files that are too large or empty', () => {
    expect(logoFileError({ type: 'image/png', size: MAX_LOGO_BYTES + 1 })).toContain('5 MB');
    expect(logoFileError({ type: 'image/png', size: MAX_LOGO_BYTES })).toBeNull();
    expect(logoFileError({ type: 'image/png', size: 0 })).toContain('empty');
  });

  it('saveLogo reports the problem instead of storing a bad file', async () => {
    await expect(saveLogo(new File(['hello'], 'notes.txt', { type: 'text/plain' }))).rejects.toThrow('PNG, JPG or WebP');
  });
});
