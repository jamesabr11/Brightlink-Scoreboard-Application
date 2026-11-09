import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import { askConfirm, notify } from '../../lib/feedback';
import { photoFileError, savePhoto } from '../../lib/rosterPhotos';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useRosterStore } from '../../store/useRosterStore';
import { brand, buttonBase, input, negative, neutral, positive } from './styles';
import { Panel } from './ui';
import type { Player, RosterSide } from '../../types/roster';

const POSITIONS = ['', 'PG', 'SG', 'SF', 'PF', 'C'];

// ── PlayerForm ───────────────────────────────────────────────────────

type PlayerDraft = Omit<Player, 'id' | 'createdAt'>;
const blankDraft = (): PlayerDraft => ({ name: '', number: '', position: '', isStarter: false, photoId: null });

const PlayerForm: React.FC<{
  initial?: PlayerDraft;
  onSave: (data: PlayerDraft) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [draft, setDraft] = useState<PlayerDraft>(initial ?? blankDraft());
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const patch = (fields: Partial<PlayerDraft>) => setDraft((d) => ({ ...d, ...fields }));

  const handlePhoto = async (file: File) => {
    const error = photoFileError(file);
    if (error) { notify(error, 'error'); return; }
    setUploading(true);
    try {
      const id = await savePhoto(file);
      patch({ photoId: id });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save photo.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) { notify('Player name is required.', 'error'); return; }
    onSave({ ...draft, name: draft.name.trim(), number: draft.number.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-3 bg-neutral-800 rounded-lg border border-neutral-600">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-white">
          Name *
          <input
            type="text"
            required
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            className={input}
            placeholder="Player Name"
          />
        </label>
        <label className="block text-sm text-white">
          #
          <input
            type="text"
            value={draft.number}
            onChange={(e) => patch({ number: e.target.value })}
            className={input}
            placeholder="00"
            maxLength={3}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <label className="block text-sm text-white">
          Position
          <select
            value={draft.position}
            onChange={(e) => patch({ position: e.target.value })}
            className={`${input} appearance-none`}
          >
            {POSITIONS.map((p) => <option key={p} value={p}>{p || '—'}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-white pb-2">
          <input
            type="checkbox"
            checked={draft.isStarter}
            onChange={(e) => patch({ isStarter: e.target.checked })}
          />
          <Star size={14} aria-hidden />
          Starter
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          disabled={uploading}
          className={`${neutral} py-2 px-3 text-sm`}
        >
          <Upload size={14} />{uploading ? 'Uploading…' : draft.photoId ? 'Change Photo' : 'Add Photo'}
        </button>
        {draft.photoId && (
          <button type="button" onClick={() => patch({ photoId: null })} className={`${negative} py-2 px-2 text-sm`} aria-label="Remove photo">
            <X size={14} />
          </button>
        )}
        <input
          ref={photoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePhoto(f); e.target.value = ''; }}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={`${neutral} py-2 px-3 text-sm`}>Cancel</button>
        <button type="submit" className={`${positive} py-2 px-3 text-sm`}>Save Player</button>
      </div>
    </form>
  );
};

// ── PlayerRow ────────────────────────────────────────────────────────

const PlayerRow: React.FC<{
  player: Player;
  side: RosterSide;
  isFirst: boolean;
  isLast: boolean;
}> = ({ player, side, isFirst, isLast }) => {
  const { updatePlayer, removePlayer, movePlayer } = useRosterStore();
  const [editing, setEditing] = useState(false);

  const handleSave = (data: Omit<Player, 'id' | 'createdAt'>) => {
    updatePlayer(side, player.id, data);
    notify('Player updated.');
    setEditing(false);
  };

  const handleRemove = async () => {
    const confirmed = await askConfirm({
      title: `Remove ${player.name}?`,
      message: 'Their photo will be deleted. This cannot be undone.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (confirmed) { removePlayer(side, player.id); notify(`${player.name} removed.`); }
  };

  if (editing) {
    return (
      <li>
        <PlayerForm
          initial={{ name: player.name, number: player.number, position: player.position, isStarter: player.isStarter, photoId: player.photoId }}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 p-2 bg-neutral-900 rounded border border-neutral-700">
      <div className="flex flex-col gap-0.5">
        <button onClick={() => movePlayer(side, player.id, 'up')} disabled={isFirst} aria-label="Move up" className={`${buttonBase} bg-transparent hover:bg-neutral-700 p-0.5 disabled:opacity-20`}>
          <ChevronUp size={14} />
        </button>
        <button onClick={() => movePlayer(side, player.id, 'down')} disabled={isLast} aria-label="Move down" className={`${buttonBase} bg-transparent hover:bg-neutral-700 p-0.5 disabled:opacity-20`}>
          <ChevronDown size={14} />
        </button>
      </div>
      <span className="w-10 text-center font-mono font-bold text-white text-lg">{player.number || '—'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-semibold truncate">{player.name}</span>
          {player.isStarter && <Star size={12} className="text-yellow-400 flex-none" aria-label="Starter" />}
        </div>
        {player.position && <span className="text-xs text-neutral-400">{player.position}</span>}
      </div>
      {player.photoId && <span className="text-xs text-neutral-400 italic">photo</span>}
      <button onClick={() => setEditing(true)} aria-label="Edit player" className={`${neutral} p-2`}><Pencil size={14} /></button>
      <button onClick={() => void handleRemove()} aria-label="Remove player" className={`${negative} p-2`}><Trash2 size={14} /></button>
    </li>
  );
};

// ── RosterSection ────────────────────────────────────────────────────

const RosterSection: React.FC<{ side: RosterSide }> = ({ side }) => {
  const homeTeam = useBasketballStore((s) => s.homeTeam);
  const awayTeam = useBasketballStore((s) => s.awayTeam);
  const players = useRosterStore((s) => s[side]);
  const { addPlayer } = useRosterStore();
  const [adding, setAdding] = useState(false);

  const team = side === 'home' ? homeTeam : awayTeam;
  const starters = players.filter((p) => p.isStarter).length;

  const handleAdd = (data: Omit<Player, 'id' | 'createdAt'>) => {
    addPlayer(side, data);
    notify('Player added.');
    setAdding(false);
  };

  return (
    <Panel
      title={`${team.name} (${side === 'home' ? 'Home' : 'Away'})`}
      aside={
        <span className="text-xs text-neutral-400">
          {players.length} player{players.length !== 1 ? 's' : ''}{starters > 0 ? `, ${starters} starter${starters !== 1 ? 's' : ''}` : ''}
        </span>
      }
    >
      <ul className="space-y-2 mb-3" aria-label={`${team.name} roster`}>
        {players.length === 0 && (
          <li className="text-sm text-neutral-500 py-2 text-center">No players — add one below.</li>
        )}
        {players.map((player, idx) => (
          <PlayerRow
            key={player.id}
            player={player}
            side={side}
            isFirst={idx === 0}
            isLast={idx === players.length - 1}
          />
        ))}
      </ul>

      {adding ? (
        <PlayerForm onSave={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className={`${brand} w-full py-2`}>
          <Plus size={16} />Add Player
        </button>
      )}
    </Panel>
  );
};

// ── RosterPage ───────────────────────────────────────────────────────

export const RosterPage: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-lg font-bold text-white">Roster Management</h2>
      <p className="text-sm text-neutral-400">Star (★) players are introduced first. Use ↑↓ to set the intro order.</p>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <RosterSection side="home" />
      <RosterSection side="away" />
    </div>
  </div>
);
