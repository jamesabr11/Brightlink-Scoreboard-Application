import type { BackgroundId, FontId, LayoutId, ScoreboardTheme, ThemeId } from '../types/basketball';

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

export const THEMES: Record<ThemeId, ThemePreset> = {
  classic: {
    label: 'Classic Sports Arena',
    description: 'Traditional scoreboard with amber digits on black.',
    layout: 'classic',
    font: 'athletic',
    background: 'solid',
    accent: '#ffb300',
    dark: { bg: '#000000', panel: '#0b0b0b', border: '#2b2b2b', text: '#ffb300', muted: '#e0cc9a', warning: '#e52020' },
  },
  modern: {
    label: 'Modern Dark',
    description: 'Black board with huge scores and team-color panels.',
    layout: 'modern',
    font: 'athletic',
    background: 'gradient',
    accent: '#22d3ee',
    dark: { bg: '#000000', panel: '#0f0f10', border: '#2a2a2d', text: '#ffffff', muted: '#a7a7a7', warning: '#e52020' },
  },
  minimal: {
    label: 'Minimal',
    description: 'Simple and distraction-free. Light or dark.',
    layout: 'minimal',
    font: 'sans',
    background: 'solid',
    accent: '#3b82f6',
    dark: { bg: '#000000', panel: '#000000', border: '#333333', text: '#ffffff', muted: '#a1a1a1', warning: '#e52020' },
    light: { bg: '#ffffff', panel: '#ffffff', border: '#a1a1aa', text: '#09090b', muted: '#3f3f46', warning: '#b91c1c' },
  },
  tournament: {
    label: 'Tournament',
    description: 'Detailed board with event name, logos and game stats.',
    layout: 'tournament',
    font: 'athletic',
    background: 'court',
    accent: '#facc15',
    dark: { bg: '#07101f', panel: '#0d1a2e', border: '#23395a', text: '#ffffff', muted: '#b7c4da', warning: '#e52020' },
  },
  custom: {
    label: 'Custom',
    description: 'Pick your own colors, layout, font and background.',
    layout: 'classic',
    font: 'sans',
    background: 'gradient',
    accent: '#22c55e',
    dark: CUSTOM_DARK,
  },
};

export const LAYOUTS: Record<LayoutId, { label: string; description: string }> = {
  classic: { label: 'Arena Classic', description: 'Team panels either side of a central clock, possession arrows, shot clock, fouls and timeouts.' },
  modern: { label: 'Modern Sports', description: 'Full team-color panels with huge scores over a broadcast clock bar.' },
  tournament: { label: 'Tournament', description: 'Event header, large logos, possession, bonus and a full team stats row.' },
  minimal: { label: 'Minimal', description: 'Scores, clock, shot clock and period. Nothing else.' },
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
    mode: preset.light && themeId === 'minimal' ? 'light' : 'dark',
    accent: preset.accent,
    font: preset.font,
    background: preset.background,
    surface: CUSTOM_DARK.bg,
  };
};

export const defaultTheme = themePreset('modern');

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
