import { useState, useEffect } from 'react';

interface ClockDisplayProps {
  remainingTime: number;
  isRunning: boolean;
  startTimestamp: number | null;
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

export const ClockDisplay: React.FC<ClockDisplayProps> = ({
  remainingTime,
  isRunning,
  startTimestamp,
  size = 'medium',
  label
}) => {
  const [displayTime, setDisplayTime] = useState(remainingTime);

  useEffect(() => {
    if (!isRunning || !startTimestamp) {
      setDisplayTime(remainingTime);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimestamp) / 1000;
      const newTime = Math.max(0, remainingTime - elapsed);
      setDisplayTime(newTime);
    }, 100);

    return () => clearInterval(interval);
  }, [remainingTime, isRunning, startTimestamp]);

  const minutes = Math.floor(displayTime / 60);
  const seconds = Math.floor(displayTime % 60);
  const tenths = Math.floor((displayTime % 1) * 10);

  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl md:text-8xl',
  };

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-sm text-neutral-400 uppercase tracking-wider mb-1">{label}</div>}
      <div className={`font-mono font-bold ${sizeClasses[size]} ${isRunning ? 'text-green-400' : 'text-white'} tabular-nums`}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}.{tenths}
      </div>
    </div>
  );
};
