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
  teamFill: boolean; // paint team panels in the team color
  dark: Palette;
  light?: Palette;
}

const CUSTOM_DARK: Palette = { bg: '#101522', panel: '#1b2233', border: '#39435c', text: '#ffffff', muted: '#c3cbdc', warning: '#ff5a5f' };

export const THEMES: Record<ThemeId, ThemePreset> = {
  classic: {
    label: 'Classic Sports Arena',
    description: 'Traditional scoreboard with amber digits on black.',
    layout: 'classic',
    font: 'mono',
    background: 'solid',
    accent: '#ffb300',
    teamFill: false,
    dark: { bg: '#050505', panel: '#0f0f0f', border: '#3d3d3d', text: '#ffb300', muted: '#e6d3a3', warning: '#ff3b30' },
  },
  modern: {
    label: 'Modern Dark',
    description: 'Clean dark board with huge scores and team colors.',
    layout: 'modern',
    font: 'athletic',
    background: 'gradient',
    accent: '#22d3ee',
    teamFill: true,
    dark: { bg: '#0b0f19', panel: '#151b2b', border: '#2f3a55', text: '#ffffff', muted: '#c6d0e3', warning: '#ff5a5f' },
  },
  minimal: {
    label: 'Minimal',
    description: 'Simple and distraction-free. Light or dark.',
    layout: 'modern',
    font: 'sans',
    background: 'solid',
    accent: '#2563eb',
    teamFill: false,
    dark: { bg: '#000000', panel: '#000000', border: '#3f3f46', text: '#ffffff', muted: '#d4d4d8', warning: '#ff5a5f' },
    light: { bg: '#ffffff', panel: '#ffffff', border: '#a1a1aa', text: '#09090b', muted: '#3f3f46', warning: '#b91c1c' },
  },
  tournament: {
    label: 'Tournament',
    description: 'Detailed board with event name, logos and game stats.',
    layout: 'tournament',
    font: 'sans',
    background: 'court',
    accent: '#facc15',
    teamFill: false,
    dark: { bg: '#10203a', panel: '#0a1628', border: '#3b5478', text: '#ffffff', muted: '#c9d6ea', warning: '#ff6b6b' },
  },
  custom: {
    label: 'Custom',
    description: 'Pick your own colors, layout, font and background.',
    layout: 'classic',
    font: 'sans',
    background: 'gradient',
    accent: '#22c55e',
    teamFill: false,
    dark: CUSTOM_DARK,
  },
};

export const LAYOUTS: Record<LayoutId, { label: string; description: string }> = {
  classic: { label: 'Classic', description: 'Scores either side of a central clock, with fouls and timeouts.' },
  modern: { label: 'Modern', description: 'Very large scores and team branding, minimal extras.' },
  tournament: { label: 'Tournament', description: 'Logos, full stats, possession, bonus and event name.' },
};

export const FONTS: Record<FontId, { label: string; stack: string }> = {
  athletic: { label: 'Athletic', stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", sans-serif' },
  sans: { label: 'Clean sans', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' },
  mono: { label: 'Digital mono', stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  rounded: { label: 'Rounded', stack: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif' },
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
  if (background === 'gradient') return `linear-gradient(135deg, ${mix(palette.bg, palette.text, 0.1)}, ${palette.bg} 60%)`;
  if (background === 'court') {
    const line = mix(palette.bg, accent, 0.25);
    return `radial-gradient(circle at 50% 50%, transparent 17cqw, ${line} 17cqw, ${line} 17.3cqw, transparent 17.3cqw), linear-gradient(90deg, transparent calc(50% - 0.15cqw), ${line} calc(50% - 0.15cqw), ${line} calc(50% + 0.15cqw), transparent calc(50% + 0.15cqw))`;
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
