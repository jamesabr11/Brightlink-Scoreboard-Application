import { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Square, Users } from 'lucide-react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useIntroStore } from '../../store/useIntroStore';
import { useRosterStore } from '../../store/useRosterStore';
import { buttonBase, negative, neutral } from './styles';
import { NumberField, Panel } from './ui';
import type { RosterSide } from '../../types/roster';

// Auto-advance timer for the intro sequence.
// Runs only in the operator tab (IntroPanel is never rendered on the display route).
// Same pattern as usePlaybackTicker: single source of truth, prevents race conditions.
const useIntroTicker = (total: number) => {
  const { isPlaying, playerIndex, autoAdvanceMs, next } = useIntroStore();
  useEffect(() => {
    if (!isPlaying || autoAdvanceMs <= 0 || total === 0) return;
    const timer = setTimeout(() => next(total), autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [isPlaying, playerIndex, autoAdvanceMs, total, next]);
};

export const IntroPanel: React.FC = () => {
  const { team, playerIndex, isPlaying, autoAdvanceMs, startIntro, next, prev, stop, setAutoAdvance } = useIntroStore();
  const homeTeam = useBasketballStore((s) => s.homeTeam);
  const awayTeam = useBasketballStore((s) => s.awayTeam);
  const homeRoster = useRosterStore((s) => s.home);
  const awayRoster = useRosterStore((s) => s.away);

  const introPlayers = useMemo(() => {
    const roster = team === 'home' ? homeRoster : team === 'away' ? awayRoster : [];
    const starters = roster.filter((p) => p.isStarter);
    return starters.length > 0 ? starters : roster;
  }, [team, homeRoster, awayRoster]);

  // Total = players to introduce (team card is implicit at index -1)
  const total = introPlayers.length;

  useIntroTicker(total);

  const currentPlayer = playerIndex >= 0 ? (introPlayers[playerIndex] ?? null) : null;

  const teamLabel = (side: RosterSide) =>
    side === 'home' ? homeTeam.name : awayTeam.name;

  const sides: RosterSide[] = ['home', 'away'];

  return (
    <Panel
      title="Player Introductions"
      aside={<a href="/roster" className="text-xs text-blue-400 hover:underline" target="_blank" rel="noreferrer">Edit Roster</a>}
    >
      {/* Team selector */}
      <div className="grid grid-cols-2 gap-2 mb-3" role="group" aria-label="Select team">
        {sides.map((side) => (
          <button
            key={side}
            onClick={() => startIntro(side)}
            aria-pressed={team === side && isPlaying}
            className={team === side && isPlaying
              ? `${buttonBase} bg-[var(--brand)] py-2 ring-2 ring-white`
              : `${neutral} py-2`}
          >
            <Users size={16} />
            {teamLabel(side)}
          </button>
        ))}
      </div>

      {/* Now showing */}
      <div className="flex items-center gap-2 min-w-0 mb-3 p-2 bg-neutral-900 rounded border border-neutral-700">
        {isPlaying ? (
          <>
            <span className="flex-1 text-sm text-white truncate">
              {playerIndex === -1 ? `Team: ${team ? teamLabel(team) : ''}` : currentPlayer ? `#${currentPlayer.number} ${currentPlayer.name}` : '—'}
            </span>
            <span className="text-xs text-neutral-400 flex-none">
              {playerIndex === -1 ? 'Team card' : `${playerIndex + 1}/${total}`}
            </span>
          </>
        ) : (
          <span className="text-sm text-neutral-500">
            {team ? `${teamLabel(team)} — finished` : 'No intro active'}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button onClick={() => prev()} disabled={!isPlaying || playerIndex <= -1} aria-label="Previous card" className={`${neutral} py-2`}>
          <ChevronLeft size={18} />Prev
        </button>
        <button onClick={stop} disabled={!isPlaying} aria-label="Stop intro" className={`${negative} py-2`}>
          <Square size={18} />Stop
        </button>
        <button onClick={() => next(total)} disabled={!isPlaying} aria-label="Next card" className={`${neutral} py-2`}>
          Next<ChevronRight size={18} />
        </button>
      </div>

      {/* Auto-advance */}
      <NumberField
        label="Auto-advance (seconds, 0 = manual)"
        min={0}
        value={Math.round(autoAdvanceMs / 1000)}
        onChange={(s) => setAutoAdvance(s * 1000)}
      />
    </Panel>
  );
};
