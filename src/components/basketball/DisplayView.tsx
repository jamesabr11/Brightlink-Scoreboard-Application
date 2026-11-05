import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { themeStyle } from '../../lib/theme';
import { Scoreboard } from './Scoreboard';

const toggleFullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
};

const IDLE_MS = 2500;

export const DisplayView: React.FC = () => {
  const theme = useBasketballStore((state) => state.gameConfig.theme);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [active, setActive] = useState(true); // pointer moved recently: show the control and cursor

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f' && !event.repeat) toggleFullscreen();
    };
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    let timer = setTimeout(() => setActive(false), IDLE_MS);
    const onMove = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), IDLE_MS);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="sb-page" style={{ ...themeStyle(theme), cursor: active ? 'default' : 'none' }} onDoubleClick={toggleFullscreen}>
        <Scoreboard theme={theme} />
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F or double-click)'}
          className={`fixed bottom-4 right-4 flex items-center gap-2 rounded-sm border border-white/30 bg-black/80 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-opacity duration-300 hover:bg-black focus-visible:opacity-100 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          {fullscreen ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
          {fullscreen ? 'Exit' : 'Fullscreen'}
        </button>
      </div>
    </MotionConfig>
  );
};
