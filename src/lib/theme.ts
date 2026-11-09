import type { BackgroundId, FontId, LayoutId, ScoreboardTheme, ThemeId } from '../types/basketball';
import { BRAND, BRAND_TEAM } from './branding';

interface Palette {
  bg: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  warning: string;
}

interface ThemePreset {
  label: string;
  description: string;
  layout: LayoutId;
  font: FontId;
  background: BackgroundId;
  accent: string;
  dark: Palette;
  light?: Palette;
}

const CUSTOM_DARK: Palette = { bg: '#101522', panel: '#1b2233', border: '#39435c', text: '#ffffff', muted: '#c3cbdc', warning: '#ff5a5f' };

// The shot-clock warning stays a brighter, hotter red than the brand red, and it
// fills the whole shot-clock box, so it never reads as a branded accent.
const WARNING = '#ff2a2a';

// Every preset carries the school accent (lib/branding.ts); they differ in
// layout, surfaces and type, not just color.
export const THEMES: Record<ThemeId, ThemePreset> = {
  classic: {
    label: `${BRAND_TEAM.name} Classic`,
    description: 'Traditional board: white digits on black, school-red accents.',
    layout: 'classic',
    font: 'athletic',
    background: 'solid',
    accent: BRAND.red,
    dark: { bg: '#000000', panel: '#0b0b0b', border: '#2e2e2e', text: '#ffffff', muted: '#c4c4c4', warning: WARNING },
  },
  modern: {
    label: 'Arena',
    description: 'Stadium board: full team-color panels over a big central clock.',
    layout: 'modern',
    font: 'athletic',
    background: 'gradient',
    accent: BRAND.red,
    dark: { bg: '#000000', panel: BRAND.black, border: '#2e2e2e', text: '#ffffff', muted: '#a7a7a7', warning: WARNING },
  },
  minimal: {
    label: 'Minimal',
    description: 'Black and white, red only for live game state. Light or dark.',
    layout: 'minimal',
    font: 'sans',
    background: 'solid',
    accent: BRAND.red,
    dark: { bg: '#000000', panel: '#000000', border: '#333333', text: '#ffffff', muted: '#a1a1a1', warning: WARNING },
    light: { bg: '#ffffff', panel: '#ffffff', border: '#a1a1aa', text: '#09090b', muted: '#3f3f46', warning: '#b91c1c' },
  },
  tournament: {
    label: 'Tournament',
    description: 'Event board: red header band, large crests and a team stats row.',
    layout: 'tournament',
    font: 'athletic',
    background: 'court',
    accent: BRAND.red,
    dark: { bg: '#0c0204', panel: '#1a070b', border: '#4a141c', text: '#ffffff', muted: '#d9bcc0', warning: WARNING },
  },
  broadcast: {
    label: 'Broadcast',
    description: 'TV-style: stacked team rows with scores beside a clock column.',
    layout: 'broadcast',
    font: 'athletic',
    background: 'solid',
    accent: BRAND.red,
    dark: { bg: BRAND.black, panel: '#1c1c1c', border: '#3a3a3a', text: '#ffffff', muted: '#b8b8b8', warning: WARNING },
  },
  livesponsor: {
    label: 'Live Sponsor',
    description: 'Professional commercial display: scoreboard with dedicated sponsor panel on the right.',
    layout: 'livesponsor',
    font: 'athletic',
    background: 'solid',
    accent: BRAND.red,
    dark: { bg: BRAND.black, panel: '#1c1c1c', border: '#3a3a3a', text: '#ffffff', muted: '#b8b8b8', warning: WARNING },
  },
  custom: {
    label: 'Custom',
    description: 'Pick your own colors, layout, font and background.',
    layout: 'classic',
    font: 'sans',
    background: 'gradient',
    accent: BRAND.red,
    dark: CUSTOM_DARK,
  },
};

export const LAYOUTS: Record<LayoutId, { label: string; description: string }> = {
  classic: { label: 'Traditional', description: 'Team panels either side of a central clock, possession arrows, shot clock, fouls and timeouts.' },
  modern: { label: 'Arena', description: 'Full team-color panels with huge scores over a large clock bar.' },
  tournament: { label: 'Tournament', description: 'Event header band, large logos, possession, bonus and a full team stats row.' },
  minimal: { label: 'Minimal', description: 'Scores, clock, shot clock and period. Nothing else.' },
  broadcast: { label: 'Broadcast', description: 'Stacked team rows with fouls, timeouts and bonus, beside the period, clock and shot clock.' },
  livesponsor: { label: 'Live Sponsor', description: 'Professional commercial display with scoreboard and dedicated sponsor panel.' },
};

// digitScale (measured: Bebas digits are 0.40em wide, Inter 0.67em, mono 0.60em) evens out how wide each face's numbers are, so a score or clock fits its box in any font.
export const FONTS: Record<FontId, { label: string; stack: string; digitScale: number }> = {
  athletic: { label: 'Athletic', stack: '"Bebas Neue", Impact, "Arial Narrow Bold", sans-serif', digitScale: 1 },
  sans: { label: 'Clean sans', stack: '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif', digitScale: 0.6 },
  mono: { label: 'Digital mono', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', digitScale: 0.6 },
  rounded: { label: 'Rounded', stack: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif', digitScale: 0.66 },
};

export const BACKGROUNDS: Record<BackgroundId, string> = {
  solid: 'Solid',
  gradient: 'Gradient',
  court: 'Court lines',
};

export const themePreset = (themeId: ThemeId): ScoreboardTheme => {
  const preset = THEMES[themeId];
  return {
    themeId,
    layout: preset.layout,
    mode: 'dark', // dark boards suit LED walls and gyms; Minimal can still switch to light
    accent: preset.accent,
    font: preset.font,
    background: preset.background,
    surface: CUSTOM_DARK.bg,
  };
};

export const defaultTheme = themePreset('classic');

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Black or white, whichever reads better on the color.
export const readableOn = (hex: string) => (contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff');

const mix = (a: string, b: string, amount: number) => {
  const [from, to] = [channels(a), channels(b)];
  return `#${from.map((c, i) => Math.round(c + (to[i] - c) * amount).toString(16).padStart(2, '0')).join('')}`;
};

// The custom palette is derived from one color, so no choice can make text unreadable.
const customPalette = (surface: string): Palette => {
  const text = readableOn(surface);
  const dark = text === '#ffffff';
  const panel = mix(surface, text, 0.08);
  return {
    bg: surface,
    panel,
    border: mix(surface, text, 0.35),
    text,
    muted: mix(text, panel, 0.2),
    warning: dark ? '#ff6b6b' : '#a51212',
  };
};

export const themePalette = (theme: ScoreboardTheme): Palette => {
  if (theme.themeId === 'custom') return customPalette(theme.surface);
  const preset = THEMES[theme.themeId];
  return theme.mode === 'light' && preset.light ? preset.light : preset.dark;
};

const backgroundImage = (background: BackgroundId, palette: Palette, accent: string) => {
  if (background === 'gradient') return `radial-gradient(ellipse 120% 80% at 50% 0%, ${mix(palette.bg, palette.text, 0.09)}, ${palette.bg} 70%)`;
  if (background === 'court') {
    const line = mix(palette.bg, accent, 0.2);
    return `radial-gradient(circle at 50% 50%, transparent 24cqmin, ${line} 24cqmin, ${line} 24.3cqmin, transparent 24.3cqmin), linear-gradient(90deg, transparent calc(50% - 0.15cqmin), ${line} calc(50% - 0.15cqmin), ${line} calc(50% + 0.15cqmin), transparent calc(50% + 0.15cqmin))`;
  }
  return 'none';
};

// Accents are user-chosen, so text only uses one that reads well on the panel.
export const accentText = (theme: ScoreboardTheme) => {
  const palette = themePalette(theme);
  return contrast(theme.accent, palette.panel) >= 4.5 ? theme.accent : palette.text;
};

export const themeStyle = (theme: ScoreboardTheme) => {
  const palette = themePalette(theme);
  return {
    '--sb-accent-text': accentText(theme),
    '--sb-bg': palette.bg,
    '--sb-bg-image': backgroundImage(theme.background, palette, theme.accent),
    '--sb-panel': palette.panel,
    '--sb-border': palette.border,
    '--sb-text': palette.text,
    '--sb-muted': palette.muted,
    '--sb-warning': palette.warning,
    '--sb-on-warning': readableOn(palette.warning),
    '--sb-accent': theme.accent,
    '--sb-on-accent': readableOn(theme.accent),
    '--sb-font': FONTS[theme.font].stack,
    '--sb-digit-scale': FONTS[theme.font].digitScale,
  } as React.CSSProperties;
};

export const cleanTheme = (theme: Partial<ScoreboardTheme> | undefined): ScoreboardTheme => {
  const themeId = theme?.themeId && theme.themeId in THEMES ? theme.themeId : defaultTheme.themeId;
  const preset = themePreset(themeId);
  return {
    themeId,
    layout: theme?.layout && theme.layout in LAYOUTS ? theme.layout : preset.layout,
    mode: theme?.mode === 'light' && THEMES[themeId].light ? 'light' : theme?.mode === 'dark' ? 'dark' : preset.mode,
    accent: isHexColor(theme?.accent) ? theme.accent : preset.accent,
    font: theme?.font && theme.font in FONTS ? theme.font : preset.font,
    background: theme?.background && theme.background in BACKGROUNDS ? theme.background : preset.background,
    surface: isHexColor(theme?.surface) ? theme.surface : preset.surface,
  };
};
