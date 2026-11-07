import { describe, expect, it } from 'vitest';
import { MAX_BYTES, MAX_IMAGE_SECONDS, clampDuration, formatSeconds, mediaFileError, mediaType, nameFromFile, saveMedia } from './media';

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('mediaFileError', () => {
  it.each([['a.png', 'image/png'], ['a.jpg', 'image/jpeg'], ['a.webp', 'image/webp'], ['a.mp4', 'video/mp4']])('accepts %s', (name, type) => {
    expect(mediaFileError(file(name, type))).toBeNull();
  });

  it.each([['a.gif', 'image/gif'], ['a.svg', 'image/svg+xml'], ['a.mov', 'video/quicktime'], ['a.webm', 'video/webm'], ['notes.txt', 'text/plain']])('rejects %s', (name, type) => {
    expect(mediaFileError(file(name, type))).toContain('PNG, JPG, WebP images or MP4 video');
  });

  it('uses the extension when the system gives no file type', () => {
    expect(mediaType(file('promo.MP4', ''))).toBe('video/mp4');
    expect(mediaFileError(file('logo.jpeg', ''))).toBeNull();
    expect(mediaFileError(file('mystery', ''))).not.toBeNull();
  });

  it('applies separate size limits to images and video', () => {
    expect(mediaFileError(file('a.png', 'image/png', MAX_BYTES.image))).toBeNull();
    expect(mediaFileError(file('a.png', 'image/png', MAX_BYTES.image + 1))).toContain('25 MB');
    expect(mediaFileError(file('a.mp4', 'video/mp4', MAX_BYTES.image + 1))).toBeNull();
    expect(mediaFileError(file('a.mp4', 'video/mp4', MAX_BYTES.video + 1))).toContain('500 MB');
    expect(mediaFileError(file('a.png', 'image/png', 0))).toContain('empty');
  });

  it('saveMedia reports the problem instead of storing a bad file', async () => {
    await expect(saveMedia(new File(['hello'], 'notes.txt', { type: 'text/plain' }), 'promotions')).rejects.toThrow('isn\'t supported');
  });
});

describe('clampDuration', () => {
  const image = { kind: 'image' as const, naturalDuration: null };
  const video = { kind: 'video' as const, naturalDuration: 14.2 };

  it('keeps images between 1 second and the maximum, in whole seconds', () => {
    expect(clampDuration(image, 10)).toBe(10);
    expect(clampDuration(image, 0)).toBe(1);
    expect(clampDuration(image, 7.6)).toBe(8);
    expect(clampDuration(image, 99999)).toBe(MAX_IMAGE_SECONDS);
    expect(clampDuration(image, 'ten')).toBe(10);
  });

  it('lets a video be cut short but never run past its end', () => {
    expect(clampDuration(video, 5)).toBe(5);
    expect(clampDuration(video, 60)).toBe(15);
    expect(clampDuration(video, undefined)).toBe(15);
  });
});

describe('formatting', () => {
  it('names an item after its file', () => {
    expect(nameFromFile('Main Street Pizza Ad.final.mp4')).toBe('Main Street Pizza Ad.final');
    expect(nameFromFile('.png')).toBe('Untitled');
  });

  it('shows seconds, then minutes', () => {
    expect(formatSeconds(9.6)).toBe('10s');
    expect(formatSeconds(75)).toBe('1:15');
  });
});
