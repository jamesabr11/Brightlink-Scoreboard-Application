import { useState } from 'react';
import { Download, Printer, Trash2 } from 'lucide-react';
import { askConfirm, notify } from '../../lib/feedback';
import { downloadCsv, filterGames, formatDate, formatTime, gameStats, gameWinner, type GameFilter } from '../../lib/gameRecords';
import { useGameLog } from '../../store/useGameLog';
import type { GameRecord } from '../../types/basketball';
import { input, negative, neutral, primary } from './styles';
import { Panel } from './ui';

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 min-w-0">
    <div className="text-xs text-neutral-300 uppercase tracking-wider">{label}</div>
    <div className="text-2xl font-bold truncate">{value}</div>
  </div>
);

const GameSummary: React.FC<{ game: GameRecord; onDelete: () => void }> = ({ game, onDelete }) => (
  <div className="print-area mt-2 text-sm">
    <h3 className="text-lg font-bold">{game.homeName} {game.homeScore}, {game.awayName} {game.awayScore}</h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 my-2 max-w-lg">
      <dt>Date</dt><dd>{formatDate(game.finishedAt)} {formatTime(game.finishedAt)}</dd>
      <dt>Result</dt><dd>{{ home: `${game.homeName} won`, away: `${game.awayName} won`, tie: 'Tie' }[gameWinner(game)]}</dd>
      <dt>Periods played</dt><dd>{game.periodsPlayed}{game.overtimePeriods > 0 && ` (${game.overtimePeriods} overtime)`}</dd>
      <dt>Configuration</dt><dd>{game.configName}</dd>
      <dt>Rules</dt><dd>{game.numberOfPeriods} × {game.periodDuration} min, {game.overtimeDuration} min OT, shot clock {game.shotClockDuration}, bonus at {game.foulsForBonus}, {game.maxTimeouts} timeouts</dd>
    </dl>
    <div className="flex gap-2 print:hidden">
      <button onClick={() => window.print()} className={`${neutral} px-3 py-2`}><Printer size={16} />Print Summary</button>
      <button onClick={onDelete} className={`${negative} px-3 py-2`}><Trash2 size={16} />Delete Record</button>
    </div>
  </div>
);

export const HistoryPage: React.FC = () => {
  const { games, deleteGame } = useGameLog();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GameFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = filterGames(games, search, filter);
  const stats = gameStats(shown);

  const remove = async (game: GameRecord) => {
    const confirmed = await askConfirm({ title: 'Delete this game record?', message: `${game.homeName} ${game.homeScore}, ${game.awayName} ${game.awayScore} will be permanently removed from history.`, confirmLabel: 'Delete', danger: true });
    if (!confirmed) return;
    deleteGame(game.id);
    notify('Game record deleted.');
  };

  const exportCsv = () => {
    if (shown.length === 0) { notify('There are no games to export.', 'error'); return; }
    downloadCsv(shown);
    notify(`Exported ${shown.length} ${shown.length === 1 ? 'game' : 'games'}.`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 print:hidden">
        <h2 className="text-2xl font-bold">Game History</h2>
        <button onClick={exportCsv} className={`${primary} px-4 py-2`}><Download size={16} />Export CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden" data-testid="history-stats">
        <Stat label="Games" value={stats.total} />
        <Stat label="Home wins" value={stats.homeWins} />
        <Stat label="Away wins" value={stats.awayWins} />
        <Stat label="Avg combined score" value={stats.averageCombined.toFixed(1)} />
        <Stat label="Highest scoring" value={stats.highestScoring ? stats.highestScoring.homeScore + stats.highestScoring.awayScore : '–'} />
      </div>

      <Panel title="Results">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 mb-3 print:hidden">
          <label className="text-sm">
            Search teams or configurations
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={input} />
          </label>
          <label className="text-sm">
            Show
            <select value={filter} onChange={(e) => setFilter(e.target.value as GameFilter)} className={input}>
              <option value="all">All games</option>
              <option value="home">Home wins</option>
              <option value="away">Away wins</option>
              <option value="tie">Ties</option>
              <option value="overtime">Overtime games</option>
            </select>
          </label>
        </div>

        {shown.length === 0 ? (
          <p className="text-neutral-300 py-6 text-center">
            {games.length === 0 ? 'No completed games yet. Use Finish & Save on the Scoreboard page to add one.' : 'No games match that search.'}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-700">
            {shown.map((game) => (
              <li key={game.id} className={`py-2 ${openId === game.id ? '' : 'print:hidden'}`}>
                <button onClick={() => setOpenId(openId === game.id ? null : game.id)} aria-expanded={openId === game.id} className="w-full text-left flex flex-wrap justify-between gap-x-4 rounded px-2 py-1 hover:bg-neutral-800 print:hidden">
                  <span className="font-semibold">{game.homeName} {game.homeScore} – {game.awayScore} {game.awayName}{game.overtimePeriods > 0 && ' (OT)'}</span>
                  <span className="text-sm text-neutral-300">{formatDate(game.finishedAt)} {formatTime(game.finishedAt)}</span>
                </button>
                {openId === game.id && <GameSummary game={game} onDelete={() => void remove(game)} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};
