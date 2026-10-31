import { useState, useEffect } from 'react';
import { clockRemaining, formatGameClock, formatShotClock } from '../../lib/clock';
import type { GameClock, ShotClock } from '../../types/basketball';

interface ClockDisplayProps {
  clock: GameClock | ShotClock;
  kind?: 'game' | 'shot';
  size?: 'small' | 'medium' | 'large' | 'huge';
  label?: string;
  themed?: boolean; // size and color come from the scoreboard theme
}

export const ClockDisplay: React.FC<ClockDisplayProps> = ({ clock, kind = 'game', size = 'medium', label, themed }) => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!clock.isRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, [clock.isRunning]);

  const remaining = clockRemaining(clock, now);
  const warning = kind === 'shot' && remaining <= 5;

  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-5xl',
    large: 'text-6xl',
    huge: 'text-8xl',
  };
  const color = warning ? 'text-red-500' : clock.isRunning ? 'text-green-400' : 'text-white';
  const text = kind === 'shot' ? formatShotClock(remaining) : formatGameClock(remaining);

  if (themed) {
    return <span data-testid={`${kind}-clock`} data-warning={warning} data-running={clock.isRunning} className="sb-digits">{text}</span>;
  }

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-sm text-neutral-400 uppercase tracking-wider mb-1">{label}</div>}
      <div data-testid={`${kind}-clock`} className={`font-mono font-bold ${sizeClasses[size]} ${color} ${warning && clock.isRunning ? 'animate-pulse' : ''} tabular-nums`}>
        {text}
      </div>
    </div>
  );
};
