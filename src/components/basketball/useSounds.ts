import { useEffect } from 'react';
import { clockRemaining } from '../../lib/clock';
import { clockEndSound, crossedShotWarning, playSound, unlockAudio, type SoundName } from '../../lib/sound';
import { useBasketballStore } from '../../store/useBasketballStore';
import { useSettingsStore } from '../../store/useSettingsStore';

// Only the operator page plays sound, so a display tab can't double every alert.
export const useSounds = () => {
  useEffect(() => {
    const play = (name: SoundName) => {
      const { sound } = useSettingsStore.getState();
      if (sound.enabled && sound[name]) playSound(name, sound.volume);
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    const unsubscribe = useBasketballStore.subscribe((next, previous) => {
      const sound = clockEndSound(previous, next);
      if (sound) play(sound);
    });

    let lastShotTime = Infinity;
    const watcher = setInterval(() => {
      const { shotClock } = useBasketballStore.getState();
      const time = clockRemaining(shotClock, Date.now());
      if (shotClock.isRunning && crossedShotWarning(lastShotTime, time)) play('shotWarning');
      lastShotTime = time;
    }, 100);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      unsubscribe();
      clearInterval(watcher);
    };
  }, []);
};
