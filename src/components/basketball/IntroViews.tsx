import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useIntroStore } from '../../store/useIntroStore';
import { useRosterStore } from '../../store/useRosterStore';
import { loadPhoto } from '../../lib/rosterPhotos';
import { MediaPlayer } from './MediaPlayer';
import { Stage } from './PresentationViews';
import { TeamLogo } from './ui';
import type { ScoreboardTheme } from '../../types/basketball';
import type { Player } from '../../types/roster';

// ── PlayerPhoto ─────────────────────────────────────────────────────
// Loads a player headshot from IndexedDB by its stored id.
// Falls back gracefully when no photo is set.

const photoUrls = new Map<string, string>();

const PlayerPhoto: React.FC<{ photoId: string; alt: string }> = ({ photoId, alt }) => {
  const [url, setUrl] = useState<string | null>(photoUrls.get(photoId) ?? null);

  useEffect(() => {
    if (photoUrls.has(photoId)) return;
    let alive = true;
    loadPhoto(photoId).then((blob) => {
      if (!blob || !alive) return;
      const objectUrl = URL.createObjectURL(blob);
      photoUrls.set(photoId, objectUrl);
      setUrl(objectUrl);
    }).catch(() => {});
    return () => { alive = false; };
  }, [photoId]);

  if (!url) return null;
  return <img src={url} alt={alt} className="pm-intro-photo" />;
};

// ── Card variants ────────────────────────────────────────────────────

const TeamIntroCard: React.FC<{ name: string; logoId?: string; color: string }> = ({ name, logoId, color: _color }) => (
  <div className="pm-intro">
    <span className="pm-intro-eyebrow">Now Introducing</span>
    <TeamLogo id={logoId} alt="" className="pm-intro-crest" fallback={null} />
    <span className="pm-intro-name">{name}</span>
  </div>
);

const PlayerIntroCard: React.FC<{ player: Player }> = ({ player }) => (
  <div className="pm-intro">
    <span className="pm-intro-watermark" aria-hidden>{player.number}</span>
    {player.photoId && <PlayerPhoto photoId={player.photoId} alt={player.name} />}
    <span className="pm-intro-number">#{player.number}</span>
    <span className="pm-intro-name">{player.name}</span>
    {player.position && <span className="pm-intro-position">{player.position}</span>}
  </div>
);

const WaitingCard: React.FC = () => (
  <div className="pm-intro" style={{ background: 'transparent' }}>
    <span className="pm-intro-eyebrow" style={{ opacity: 0.4 }}>Introductions</span>
  </div>
);

// ── IntroView ────────────────────────────────────────────────────────
// Renders the current intro card on the public display.

export const IntroView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => {
  const { team, playerIndex, isPlaying } = useIntroStore();
  const homeTeam = useBasketballStore((s) => s.homeTeam);
  const awayTeam = useBasketballStore((s) => s.awayTeam);
  const homeRoster = useRosterStore((s) => s.home);
  const awayRoster = useRosterStore((s) => s.away);

  const currentTeam = team === 'home' ? homeTeam : team === 'away' ? awayTeam : null;
  const roster = team === 'home' ? homeRoster : team === 'away' ? awayRoster : [];
  const introPlayers = roster.filter((p) => p.isStarter).length > 0
    ? roster.filter((p) => p.isStarter)
    : roster;
  const player = playerIndex >= 0 ? (introPlayers[playerIndex] ?? null) : null;

  const bgColor = currentTeam?.primaryColor ?? '#111111';

  return (
    <Stage theme={theme} mode="intro">
      <div style={{ flex: 1, background: bgColor, display: 'flex', alignItems: 'stretch' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${team}-${playerIndex}`}
            style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.35 }}
          >
            {!isPlaying || !currentTeam ? (
              <WaitingCard />
            ) : playerIndex === -1 ? (
              <TeamIntroCard name={currentTeam.name} logoId={currentTeam.logo ?? undefined} color={bgColor} />
            ) : player ? (
              <PlayerIntroCard player={player} />
            ) : (
              <WaitingCard />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Stage>
  );
};

// ── FullscreenView ───────────────────────────────────────────────────
// MediaPlayer filling the entire display — no scoreboard, no team info.

export const FullscreenView: React.FC<{ theme: ScoreboardTheme }> = ({ theme }) => (
  <Stage theme={theme} mode="fullscreen">
    <div className="pm-slot" aria-label="Fullscreen media">
      <MediaPlayer />
    </div>
  </Stage>
);
