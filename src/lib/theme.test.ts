import { describe, expect, it } from 'vitest';
import type { ScoreboardTheme, ThemeId } from '../types/basketball';
import { BRAND } from './branding';
import { LAYOUTS, THEMES, accentText, cleanTheme, contrast, defaultTheme, readableOn, themePalette, themePreset } from './theme';

const themeIds = Object.keys(THEMES) as ThemeId[];
const variants = themeIds.flatMap((id): ScoreboardTheme[] => [
  themePreset(id),
  ...(THEMES[id].light ? [{ ...themePreset(id), mode: 'light' as const }, { ...themePreset(id), mode: 'dark' as const }] : []),
]);

describe('theme readability', () => {
  it.each(variants.map((theme) => [`${theme.themeId} ${theme.mode}`, theme] as const))('%s has high contrast', (_, theme) => {
    const palette = themePalette(theme);
    for (const background of [palette.bg, palette.panel]) {
      expect(contrast(palette.text, background)).toBeGreaterThanOrEqual(7);
      expect(contrast(palette.muted, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['#000000', '#ffffff', '#808080', '#ff0000', '#ffff00', '#0000ff', '#00ff00'])('custom surface %s stays readable', (surface) => {
    const palette = themePalette({ ...themePreset('custom'), surface });
    expect(contrast(palette.text, palette.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.text, palette.panel)).toBeGreaterThanOrEqual(3.5);
  });

  it.each(['#000000', '#ffffff', '#ffb300', '#2563eb', '#EF4444', '#808080'])('text on %s is readable', (color) => {
    expect(contrast(readableOn(color), color)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['#22c55e', '#ffff00', '#ffffff', '#000000', '#2563eb'])('text in accent %s stays readable on any board', (accent) => {
    for (const theme of [...variants, { ...themePreset('custom'), surface: '#ffffff' }]) {
      const withAccent = { ...theme, accent };
      expect(contrast(accentText(withAccent), themePalette(withAccent).panel)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives each preset its own look', () => {
    const looks = themeIds.map((id) => JSON.stringify([themePreset(id).layout, themePalette(themePreset(id))]));
    expect(new Set(looks).size).toBe(themeIds.length);
  });
});

describe('cleanTheme', () => {
  it('fills a missing theme with the default', () => {
    expect(cleanTheme(undefined).themeId).toBe(defaultTheme.themeId);
  });

  it('replaces invalid values and keeps valid ones', () => {
    const theme = cleanTheme({ themeId: 'tournament', layout: 'spiral' as never, accent: 'red', font: 'mono', mode: 'light' });
    expect(theme).toMatchObject({ themeId: 'tournament', layout: 'tournament', accent: BRAND.red, font: 'mono', mode: 'dark' });
  });

  it('keeps every layout, including Minimal, through a save and reload', () => {
    for (const layout of Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[]) {
      expect(cleanTheme({ ...themePreset('modern'), layout }).layout).toBe(layout);
    }
    for (const id of themeIds) expect(LAYOUTS).toHaveProperty(themePreset(id).layout);
  });

  it('rejects an unknown theme id', () => {
    expect(cleanTheme({ themeId: 'neon' as never }).themeId).toBe(defaultTheme.themeId);
  });
});

describe('branding', () => {
  it('gives every preset the school accent and a dark default board', () => {
    for (const id of themeIds) expect(themePreset(id)).toMatchObject({ accent: BRAND.red, mode: 'dark' });
  });

  it('keeps the shot-clock warning distinct from the brand red', () => {
    for (const theme of variants) expect(themePalette(theme).warning.toLowerCase()).not.toBe(BRAND.red.toLowerCase());
  });

  it('gives each preset its own layout, apart from Custom', () => {
    const layouts = themeIds.filter((id) => id !== 'custom').map((id) => THEMES[id].layout);
    expect(new Set(layouts).size).toBe(layouts.length);
  });
});
