import { useBasketballStore } from '../../store/useBasketballStore';
import { ClockDisplay } from './ClockDisplay';
import { motion } from 'framer-motion';

export const DisplayView: React.FC = () => {
  const store = useBasketballStore();
  const leading = store.homeTeam.score > store.awayTeam.score ? 'home' : store.awayTeam.score > store.homeTeam.score ? 'away' : null;

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center p-8 overflow-hidden">
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Home Team */}
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-3xl p-8 border-4 relative overflow-hidden" style={{ borderColor: store.homeTeam.primaryColor }}>
            {leading === 'home' && <div className="absolute top-4 right-4 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">LEADING</div>}
            {store.possession === 'home' && <div className="absolute bottom-4 left-1/2 -translate-x-1/2"><div className="w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div></div>}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wide">{store.homeTeam.name}</h2>
              <div className="text-9xl font-mono font-black text-white mb-4">{store.homeTeam.score}</div>
              <div className="flex justify-center gap-8 text-neutral-300">
                <div>
                  <div className="text-sm uppercase">Fouls</div>
                  <div className="text-3xl font-bold">{store.homeTeam.fouls}</div>
                  {store.bonusHome && <div className="text-yellow-400 text-sm font-bold">BONUS</div>}
                </div>
                <div>
                  <div className="text-sm uppercase">Timeouts</div>
                  <div className="text-3xl font-bold">{store.homeTeam.timeouts}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Center Info */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col justify-between">
            <div className="bg-black rounded-3xl p-8 border-4 border-neutral-700 mb-4">
              <ClockDisplay remainingTime={store.gameClock.remainingTime} isRunning={store.gameClock.isRunning} startTimestamp={store.gameClock.startTimestamp} size="large" />
              <div className="text-center mt-4">
                <div className="text-3xl font-bold text-white">{store.isOvertime ? `OVERTIME ${store.period - store.gameConfig.numberOfPeriods}` : `Q${store.period}`}</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-900 to-red-950 rounded-3xl p-6 border-4 border-red-700">
              <div className="text-center">
                <div className="text-sm text-red-300 uppercase tracking-wider mb-2">Shot Clock</div>
                <div className={`text-6xl font-mono font-black ${store.shotClock.remainingTime <= 5 && store.shotClock.isRunning ? 'text-red-400 animate-pulse' : 'text-white'} tabular-nums`}>
                  {Math.ceil(store.shotClock.remainingTime)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Away Team */}
          <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-3xl p-8 border-4 relative overflow-hidden" style={{ borderColor: store.awayTeam.primaryColor }}>
            {leading === 'away' && <div className="absolute top-4 right-4 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">LEADING</div>}
            {store.possession === 'away' && <div className="absolute bottom-4 left-1/2 -translate-x-1/2"><div className="w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div></div>}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-wide">{store.awayTeam.name}</h2>
              <div className="text-9xl font-mono font-black text-white mb-4">{store.awayTeam.score}</div>
              <div className="flex justify-center gap-8 text-neutral-300">
                <div>
                  <div className="text-sm uppercase">Fouls</div>
                  <div className="text-3xl font-bold">{store.awayTeam.fouls}</div>
                  {store.bonusAway && <div className="text-yellow-400 text-sm font-bold">BONUS</div>}
                </div>
                <div>
                  <div className="text-sm uppercase">Timeouts</div>
                  <div className="text-3xl font-bold">{store.awayTeam.timeouts}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
