import { useState } from 'react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { notify } from '../../lib/feedback';
import { BACKGROUNDS, FONTS, LAYOUTS, THEMES, themePreset } from '../../lib/theme';
import type { BackgroundId, FontId, LayoutId, ScoreboardTheme, ThemeId } from '../../types/basketball';
import { Scoreboard } from './Scoreboard';
import { input, neutral, primary } from './styles';

const Select = <T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Record<T, string>; onChange: (value: T) => void }) => (
  <label className="block text-sm text-white">
    {label}
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={input}>
      {(Object.entries(options) as [T, string][]).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </select>
  </label>
);

const labels = <T extends string>(items: Record<T, { label: string }>) =>
  Object.fromEntries((Object.entries(items) as [T, { label: string }][]).map(([id, item]) => [id, item.label])) as Record<T, string>;

export const ThemeFields: React.FC<{ value: ScoreboardTheme; onChange: (theme: ScoreboardTheme) => void }> = ({ value, onChange }) => (
  <>
    <div role="radiogroup" aria-label="Theme" className="grid sm:grid-cols-3 xl:grid-cols-6 gap-2 mb-4">
      {(Object.keys(THEMES) as ThemeId[]).map((id) => (
        <button key={id} role="radio" aria-checked={value.themeId === id} onClick={() => onChange(themePreset(id))} className={`rounded border p-3 text-left ${value.themeId === id ? 'border-yellow-400 bg-neutral-800' : 'border-neutral-600 hover:bg-neutral-800'}`}>
          <span className="block font-bold text-white text-sm">{THEMES[id].label}</span>
          <span className="block text-xs text-neutral-300 mt-1">{THEMES[id].description}</span>
        </button>
      ))}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Select<LayoutId> label="Layout" value={value.layout} options={labels(LAYOUTS)} onChange={(layout) => onChange({ ...value, layout })} />
      <Select<FontId> label="Typography" value={value.font} options={labels(FONTS)} onChange={(font) => onChange({ ...value, font })} />
      <Select<BackgroundId> label="Background" value={value.background} options={BACKGROUNDS} onChange={(background) => onChange({ ...value, background })} />
      <label className="block text-sm text-white">
        Accent color
        <input type="color" value={value.accent} onChange={(e) => onChange({ ...value, accent: e.target.value })} className={`${input} h-10 p-1`} />
      </label>
      {THEMES[value.themeId].light && (
        <Select<ScoreboardTheme['mode']> label="Brightness" value={value.mode} options={{ dark: 'Dark', light: 'Light' }} onChange={(mode) => onChange({ ...value, mode })} />
      )}
      {value.themeId === 'custom' && (
        <label className="block text-sm text-white">
          Scoreboard color
          <input type="color" value={value.surface} onChange={(e) => onChange({ ...value, surface: e.target.value })} className={`${input} h-10 p-1`} />
          <span className="block mt-1 text-xs text-neutral-400">Text color adjusts itself to stay readable.</span>
        </label>
      )}
    </div>
    <p className="mt-2 text-xs text-neutral-400">{LAYOUTS[value.layout].description}</p>
  </>
);

export const ThemePicker: React.FC = () => {
  const applied = useBasketballStore((state) => state.gameConfig.theme);
  const updateGameConfig = useBasketballStore((state) => state.updateGameConfig);
  const [draft, setDraft] = useState(applied);
  const changed = JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <>
      <ThemeFields value={draft} onChange={setDraft} />
      <h4 className="text-sm font-semibold text-white mt-4 mb-2">Live preview{changed ? ' (not applied yet)' : ''}</h4>
      <div className="max-w-3xl border border-neutral-600 rounded overflow-hidden">
        <Scoreboard theme={draft} />
      </div>
      <div className="flex gap-2 mt-3">
        <button disabled={!changed} onClick={() => { updateGameConfig({ theme: draft }); notify('Theme applied to the public display.'); }} className={`${primary} px-4 py-2`}>Apply to Display</button>
        <button disabled={!changed} onClick={() => setDraft(applied)} className={`${neutral} px-4 py-2`}>Discard Changes</button>
      </div>
    </>
  );
};
