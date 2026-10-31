import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useBasketballStore } from '../../store/useBasketballStore';
import { themeStyle } from '../../lib/theme';
import { Scoreboard } from './Scoreboard';

const toggleFullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
};

export const DisplayView: React.FC = () => {
  const theme = useBasketballStore((state) => state.gameConfig.theme);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="sb-page" style={themeStyle(theme)} onDoubleClick={toggleFullscreen} title="Press F or double-click for fullscreen">
        <Scoreboard theme={theme} />
      </div>
    </MotionConfig>
  );
};
