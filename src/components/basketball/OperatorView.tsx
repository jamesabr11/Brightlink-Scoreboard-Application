import { useState } from 'react';
import { inBonus, isGameActive, useBasketballStore } from '../../store/useBasketballStore';
import { askConfirm, notify } from '../../lib/feedback';
import { ClockDisplay } from './ClockDisplay';
import { SHORTCUTS, keyName, shortcutKey, useShortcuts } from './shortcuts';
import { negative, neutral, positive, primary, buttonBase } from './styles';
import { Panel, TeamLogo } from './ui';
import { PresentationPanel } from './PresentationPanel';
import { ChevronDown, ChevronRight, Flag, Play, Pause, Plus, Minus, RotateCcw, Undo2 } from 'lucide-react';

const Kbd: React.FC<{ id: string }> = ({ id }) => (
  <kbd className="text-[10px] font-mono font-normal text-white bg-black/40 rounded px-1 py-0.5">{shortcutKey(id)}</kbd>
);

const Counter: React.FC<{ name: string; value: number; onMinus: () => void; onPlus: () => void; minusDisabled: boolean; plusDisabled?: boolean }> = ({ name, value, onMinus, onPlus, minusDisabled, plusDisabled }) => (
  <div className="flex items-center justify-between">
    <button aria-label={`${name} minus`} onClick={onMinus} disabled={minusDisabled} className={`${neutral} w-14 h-12`}><Minus size={20} /></button>
    <span className="text-4xl font-mono font-bold text-white">{value}</span>
    <button aria-label={`${name} plus`} onClick={onPlus} disabled={plusDisabled} className={`${neutral} w-14 h-12`}><Plus size={20} /></button>
  </div>
);

const TeamPanel: React.FC<{ side: 'home' | 'away' }> = ({ side }) => {
  const store = useBasketballStore();
  const team = side === 'home' ? store.homeTeam : store.awayTeam;
  const label = side === 'home' ? 'Home' : 'Away';

  return (
    <div className="bg-neutral-950 border-2 rounded-lg p-3 space-y-3" style={{ borderColor: team.primaryColor }}>
      <div className="flex items-center gap-2 min-w-0">
        <TeamLogo id={team.logo} alt="" className="w-9 h-9 object-contain flex-none" />
        <h2 className="text-2xl font-bold text-white truncate">{team.name}</h2>
      </div>
      <Panel title="Scoring">
        <div data-testid={`${side}-score`} className="text-7xl font-mono font-bold text-white text-center mb-3">{team.score}</div>
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3] as const).map((points) => (
            <button key={points} aria-label={`${label} plus ${points}`} onClick={() => store.addScore(side, points)} className={`${positive} py-4 text-xl`}>
              +{points} <Kbd id={`${side}+${points}`} />
            </button>
          ))}
          <button aria-label={`${label} minus 1`} onClick={() => store.subtractScore(side, 1)} disabled={team.score === 0} className={`${negative} py-4 text-xl`}>-1</button>
        </div>
      </Panel>
      <Panel title="Team Fouls" aside={inBonus(team, store.gameConfig) && <span className="text-xs bg-yellow-400 text-black rounded px-2 font-bold">BONUS</span>}>
        <Counter name={`${label} fouls`} value={team.fouls} onMinus={() => store.subtractFoul(side)} onPlus={() => store.addFoul(side)} minusDisabled={team.fouls === 0} />
      </Panel>
      <Panel title={`Timeouts left (of ${store.gameConfig.maxTimeouts})`}>
        <Counter name={`${label} timeouts`} value={team.timeouts} onMinus={() => store.subtractTimeout(side)} onPlus={() => store.addTimeout(side)} minusDisabled={team.timeouts === 0} plusDisabled={team.timeouts >= store.gameConfig.maxTimeouts} />
      </Panel>
    </div>
  );
};

const Nudges: React.FC<{ name: string; steps: [string, number][]; onAdjust: (delta: number) => void }> = ({ name, steps, onAdjust }) => (
  <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
    {steps.map(([label, delta]) => (
      <button key={label} aria-label={`${name} ${label}`} onClick={() => onAdjust(delta)} className={`${neutral} py-2 text-xs`}>{label}</button>
    ))}
  </div>
);

const GameActions: React.FC = () => {
  const store = useBasketballStore();

  const finish = async () => {
    const { homeTeam: home, awayTeam: away } = useBasketballStore.getState();
    const confirmed = await askConfirm({
      title: 'Finish and save this game?',
      message: `The final score ${home.name} ${home.score}, ${away.name} ${away.score} goes into game history and both clocks stop.`,
      confirmLabel: 'Finish & Save',
    });
    if (!confirmed) return;
    store.finishGame();
    notify('Game saved to history.');
  };

  const reset = async () => {
    const state = useBasketballStore.getState();
    const confirmed = !isGameActive(state) || await askConfirm({
      title: 'Reset this game?',
      message: 'Scores, fouls, timeouts and clocks start again. Team names and rules are kept, and Undo can bring the game back.',
      confirmLabel: 'Reset Game',
      danger: true,
    });
    if (confirmed) store.resetGame();
  };

  return (
    <>
      {store.finished ? (
        <button onClick={store.reopenGame} className={`${neutral} px-4 py-2`}>Reopen Game</button>
      ) : (
        <button onClick={finish} className={`${primary} px-4 py-2`}><Flag size={18} />Finish &amp; Save</button>
      )}
      <button onClick={reset} className={`${negative} px-4 py-2`}><RotateCcw size={18} />{store.finished ? 'New Game' : 'Reset Game'}</button>
    </>
  );
};

export const OperatorView: React.FC = () => {
  const store = useBasketballStore();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useShortcuts();

  const { shotClockDuration, shotClockShort } = store.gameConfig;
  const possessionOptions = [
    { value: 'home', label: store.homeTeam.name },
    { value: null, label: 'None' },
    { value: 'away', label: store.awayTeam.name },
  ] as const;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div role="status" key={store.lastAction} className="action-flash flex-1 min-w-[240px] text-sm rounded-lg px-4 py-2.5 bg-neutral-900 border border-neutral-700 truncate">
          {store.finished ? 'Final: game saved to history' : store.lastAction ?? 'Ready'}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={store.undo} disabled={store.history.length === 0} className={`${neutral} px-4 py-2.5`}>
            <Undo2 size={18} />Undo <Kbd id="undo" />
          </button>
          <GameActions />
        </div>
      </div>

      <PresentationPanel />

      <div className="grid xl:grid-cols-3 gap-4 mb-4">
        <TeamPanel side="home" />

        <div className="space-y-4">
          <Panel title="Game Clock">
            <ClockDisplay clock={store.gameClock} size="large" />
            <div className="flex gap-2 mt-3">
              {!store.gameClock.isRunning ? (
                <button onClick={store.startGameClock} className={`${positive} flex-1 py-2.5`}><Play size={20} />Start <Kbd id="game" /></button>
              ) : (
                <button onClick={store.pauseGameClock} className={`${negative} flex-1 py-2.5`}><Pause size={20} />Pause <Kbd id="game" /></button>
              )}
              <button onClick={store.resetGameClock} className={`${neutral} flex-1 py-2.5`}><RotateCcw size={20} />Reset</button>
            </div>
            <Nudges name="Game clock" steps={[['-1m', -60], ['-1s', -1], ['-.1s', -0.1], ['+.1s', 0.1], ['+1s', 1], ['+1m', 60]]} onAdjust={store.adjustGameClock} />
          </Panel>

          <Panel title="Shot Clock">
            <ClockDisplay clock={store.shotClock} kind="shot" size="large" />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {!store.shotClock.isRunning ? (
                <button onClick={store.startShotClock} className={`${positive} py-2.5`}><Play size={18} />Start <Kbd id="shot" /></button>
              ) : (
                <button onClick={store.pauseShotClock} className={`${negative} py-2.5`}><Pause size={18} />Pause <Kbd id="shot" /></button>
              )}
              <button onClick={() => store.resetShotClock(shotClockDuration)} className={`${neutral} py-2.5`}>{shotClockDuration} <Kbd id="shot24" /></button>
              <button onClick={() => store.resetShotClock(shotClockShort)} className={`${neutral} py-2.5`}>{shotClockShort} <Kbd id="shot14" /></button>
            </div>
            <Nudges name="Shot clock" steps={[['-1s', -1], ['-.1s', -0.1], ['+.1s', 0.1], ['+1s', 1]]} onAdjust={store.adjustShotClock} />
          </Panel>

          <Panel title="Possession" aside={<Kbd id="possession" />}>
            <div className="grid grid-cols-3 gap-2">
              {possessionOptions.map(({ value, label }) => (
                <button key={String(value)} onClick={() => store.setPossession(value)} aria-pressed={store.possession === value} className={store.possession === value ? `${buttonBase} !text-black bg-yellow-400 py-2.5 px-2 truncate` : `${neutral} py-2.5 px-2 truncate`}>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Period">
            <div className="flex items-center gap-3">
              <button onClick={store.previousPeriod} disabled={store.period <= 1} className={`${neutral} flex-1 py-2.5`}>Previous</button>
              <div data-testid="period" className="text-4xl font-bold text-white w-24 text-center">
                {store.isOvertime ? `OT${store.period - store.gameConfig.numberOfPeriods}` : store.period}
              </div>
              <button onClick={store.nextPeriod} className={`${neutral} flex-1 py-2.5`}>Next</button>
            </div>
          </Panel>
        </div>

        <TeamPanel side="away" />
      </div>

      <div className="grid xl:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShortcutsOpen((o) => !o)}
            aria-expanded={shortcutsOpen}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
          >
            <span>Keyboard Shortcuts</span>
            {shortcutsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {shortcutsOpen && (
            <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm text-neutral-300 px-4 py-4 border-t border-neutral-800">
              {SHORTCUTS.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5"><kbd className="font-mono text-xs bg-neutral-700 rounded px-1.5 py-0.5 text-white">{keyName(s.key)}</kbd>{s.label}</li>
              ))}
            </ul>
          )}
        </div>
        <Panel title={`Recent Actions (${store.history.length}/50)`}>
          <ol className="text-sm text-neutral-300 h-32 overflow-y-auto" tabIndex={0} aria-label="Recent actions">
            {store.history.length === 0 && <li className="text-neutral-400">No actions yet</li>}
            {store.history.map((entry, index) => (
              <li key={index} className="truncate py-0.5">
                <span className="text-neutral-400 tabular-nums">{new Date(entry.timestamp).toLocaleTimeString()}</span> {entry.action}
              </li>
            )).reverse()}
          </ol>
        </Panel>
      </div>
    </>
  );
};
