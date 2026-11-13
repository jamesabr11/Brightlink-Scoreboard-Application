import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useFeedback } from '../../lib/feedback';
import { loadLogo } from '../../lib/logos';
import type { GameRules } from '../../types/basketball';
import { input, negative, neutral, primary } from './styles';

export const Panel: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ title, aside, children }) => (
  <section aria-label={title} className="bg-neutral-900 border border-neutral-700 rounded-lg p-3">
    <div className="flex justify-between items-center mb-2 min-h-5">
      <h3 className="text-xs text-neutral-300 uppercase tracking-wider">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

export const NumberField: React.FC<{ label: string; hint?: string; value: number; min: number; onChange: (value: number) => void }> = ({ label, hint, value, min, onChange }) => {
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null); // lets the field be empty mid-edit

  return (
    <label className="block text-sm text-white">
      {label}
      <input
        type="number"
        min={min}
        value={draft ?? value}
        aria-describedby={hint && hintId}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value !== '') onChange(Number(e.target.value));
        }}
        onBlur={() => setDraft(null)}
        className={input}
      />
      {hint && <span id={hintId} className="block mt-1 text-xs text-neutral-400">{hint}</span>}
    </label>
  );
};

export const CheckField: React.FC<{ label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, hint, checked, onChange }) => (
  <label className="flex items-start gap-2 text-sm text-white">
    <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>
      {label}
      {hint && <span className="block text-xs text-neutral-400">{hint}</span>}
    </span>
  </label>
);

export const RulesFields: React.FC<{ rules: GameRules; onChange: (rules: Partial<GameRules>) => void }> = ({ rules, onChange }) => (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <NumberField label="Periods" min={1} value={rules.numberOfPeriods} onChange={(numberOfPeriods) => onChange({ numberOfPeriods })} hint="4 for quarters, 2 for halves." />
      <NumberField label="Period minutes" min={1} value={rules.periodDuration} onChange={(periodDuration) => onChange({ periodDuration })} />
      <NumberField label="Overtime minutes" min={1} value={rules.overtimeDuration} onChange={(overtimeDuration) => onChange({ overtimeDuration })} />
      <NumberField label="Shot clock seconds" min={1} value={rules.shotClockDuration} onChange={(shotClockDuration) => onChange({ shotClockDuration })} hint="The full reset, R." />
      <NumberField label="Short reset seconds" min={1} value={rules.shotClockShort} onChange={(shotClockShort) => onChange({ shotClockShort })} hint="After an offensive rebound, E." />
      <NumberField label="Fouls for bonus" min={1} value={rules.foulsForBonus} onChange={(foulsForBonus) => onChange({ foulsForBonus })} hint="Team fouls that show BONUS." />
      <NumberField label="Max timeouts" min={0} value={rules.maxTimeouts} onChange={(maxTimeouts) => onChange({ maxTimeouts })} hint="Changing this keeps the number already used." />
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      <CheckField label="Reset team fouls each new period" hint="Turn off for leagues where fouls carry over." checked={rules.resetFoulsEachPeriod} onChange={(resetFoulsEachPeriod) => onChange({ resetFoulsEachPeriod })} />
      <CheckField label="Restore timeouts each new period" hint="Turn on for leagues with per-period allowances." checked={rules.restoreTimeoutsEachPeriod} onChange={(restoreTimeoutsEachPeriod) => onChange({ restoreTimeoutsEachPeriod })} />
    </div>
  </>
);

const logoUrls = new Map<string, string>();

export const TeamLogo: React.FC<{ id?: string; alt: string; className?: string; fallback?: React.ReactNode }> = ({ id, alt, className, fallback = null }) => {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!id || logoUrls.has(id)) return;
    let current = true;
    // A logo that can't be read just isn't shown; it never gets in the way of a game.
    loadLogo(id).then((blob) => {
      if (!blob || !current) return;
      const url = URL.createObjectURL(blob);
      logoUrls.set(id, url);
      setLoaded({ id, url });
    }).catch((error) => console.error('Could not load logo', error));
    return () => { current = false; };
  }, [id]);

  const url = id && (logoUrls.get(id) ?? (loaded?.id === id ? loaded.url : undefined));
  return url ? <img src={url} alt={alt} className={className} decoding="async" /> : fallback;
};

const Toast: React.FC = () => {
  const toast = useFeedback((state) => state.toast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useFeedback.setState({ toast: null }), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  const failed = toast.kind === 'error';
  return (
    <div role={failed ? 'alert' : 'status'} className={`fixed bottom-4 right-4 z-50 max-w-sm flex items-center gap-2 rounded-lg px-4 py-3 font-semibold text-white shadow-lg ${failed ? 'bg-red-700' : 'bg-green-700'}`}>
      {failed ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
      {toast.message}
    </div>
  );
};

const ConfirmDialog: React.FC = () => {
  const request = useFeedback((state) => state.confirmRequest);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (request) dialog.current?.showModal();
  }, [request]);

  const answer = (confirmed: boolean) => {
    dialog.current?.close();
    request?.resolve(confirmed);
    useFeedback.setState({ confirmRequest: null });
  };

  return (
    <dialog ref={dialog} aria-labelledby="confirm-title" onCancel={() => answer(false)} className="bg-neutral-900 text-white border border-neutral-600 rounded-lg p-6 max-w-md backdrop:bg-black/70">
      {request && (
        <>
          <h2 id="confirm-title" className="text-xl font-bold mb-2">{request.title}</h2>
          <p className="text-neutral-200 mb-6">{request.message}</p>
          <div className="flex justify-end gap-2">
            <button autoFocus onClick={() => answer(false)} className={`${neutral} px-4 py-2`}>Cancel</button>
            <button onClick={() => answer(true)} className={`${request.danger ? negative : primary} px-4 py-2`}>{request.confirmLabel}</button>
          </div>
        </>
      )}
    </dialog>
  );
};

export const FeedbackHost: React.FC = () => (
  <>
    <Toast />
    <ConfirmDialog />
  </>
);
