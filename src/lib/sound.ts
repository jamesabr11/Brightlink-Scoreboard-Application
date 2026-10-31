import type { BasketballState } from '../types/basketball';

export type SoundName = 'periodEnd' | 'gameEnd' | 'shotWarning';

// [frequency in Hz, seconds] per note; generated so the app ships no audio files.
const SOUNDS: Record<SoundName, [number, number][]> = {
  periodEnd: [[440, 0.9]],
  gameEnd: [[440, 0.5], [330, 0.5], [440, 1]],
  shotWarning: [[880, 0.12]],
};

let context: AudioContext | null = null;

// Browsers only allow audio after a user gesture, so this runs on one.
export const unlockAudio = () => {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
};

export const playSound = (name: SoundName, volume: number) => {
  if (!context || context.state !== 'running') return;
  let start = context.currentTime;
  for (const [frequency, duration] of SOUNDS[name]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume * 0.3, start);
    gain.gain.setValueAtTime(0, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
    start += duration + 0.05;
  }
};

type ClockEndState = Pick<BasketballState, 'gameClock' | 'period' | 'homeTeam' | 'awayTeam' | 'gameConfig'>;

// The horn for a game clock that just ran out, if any. A tied final period goes
// to overtime, so it only gets the period horn.
export const clockEndSound = (previous: ClockEndState, next: ClockEndState): SoundName | null => {
  const expired = previous.gameClock.isRunning && !next.gameClock.isRunning && next.gameClock.remainingTime === 0;
  if (!expired) return null;
  const decided = next.period >= next.gameConfig.numberOfPeriods && next.homeTeam.score !== next.awayTeam.score;
  return decided ? 'gameEnd' : 'periodEnd';
};

export const SHOT_WARNING_SECONDS = 5;

// Fires once on the way through the mark, not on every check below it.
export const crossedShotWarning = (previous: number, current: number) =>
  previous > SHOT_WARNING_SECONDS && current <= SHOT_WARNING_SECONDS && current > 0;
