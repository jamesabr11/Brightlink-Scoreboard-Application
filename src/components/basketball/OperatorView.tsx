import { useState } from 'react';
import { useBasketballStore } from '../../store/useBasketballStore';
import { ClockDisplay } from './ClockDisplay';
import { Play, Pause, RotateCcw, Plus, Minus, Undo2, Settings } from 'lucide-react';

export const OperatorView: React.FC = () => {
  const store = useBasketballStore();
  const [showSetup, setShowSetup] = useState(false);

  const openDisplay = () => window.open('/display', '_blank');

  return (
    <div className="min-h-screen bg-neutral-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 text-white">
          <h1 className="text-3xl font-bold">Basketball Scoreboard</h1>
          <div className="flex gap-3">
            <button onClick={() => setShowSetup(!showSetup)} className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded font-semibold flex items-center gap-2">
              <Settings size={18} />Setup
            </button>
            <button onClick={openDisplay} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold">
              Open Display ↗
            </button>
          </div>
        </div>

        {showSetup && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 mb-6 text-white">
            <h2 className="text-xl font-bold mb-4">Game Setup</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2">Home Team Name</label>
                <input type="text" value={store.homeTeam.name} onChange={(e) => store.updateTeams({ name: e.target.value }, {})} className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-2">Away Team Name</label>
                <input type="text" value={store.awayTeam.name} onChange={(e) => store.updateTeams({}, { name: e.target.value })} className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm mb-2">Home Team Color</label>
                <input type="color" value={store.homeTeam.primaryColor} onChange={(e) => store.updateTeams({ primaryColor: e.target.value }, {})} className="w-full h-10 bg-neutral-800 border border-neutral-600 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-2">Away Team Color</label>
                <input type="color" value={store.awayTeam.primaryColor} onChange={(e) => store.updateTeams({}, { primaryColor: e.target.value })} className="w-full h-10 bg-neutral-800 border border-neutral-600 rounded" />
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Home Team */}
          <div className="bg-neutral-900 border-2 rounded-lg p-6" style={{ borderColor: store.homeTeam.primaryColor }}>
            <h2 className="text-2xl font-bold text-white mb-4">{store.homeTeam.name}</h2>
            <div className="text-center mb-6">
              <div className="text-7xl font-mono font-bold text-white mb-4">{store.homeTeam.score}</div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => store.addScore('home', 1)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-lg">+1</button>
                <button onClick={() => store.addScore('home', 2)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-lg">+2</button>
                <button onClick={() => store.addScore('home', 3)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-lg">+3</button>
                <button onClick={() => store.subtractScore('home', 1)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded text-lg">-1</button>
              </div>
            </div>
            <div className="bg-neutral-800 rounded p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-300">Fouls</span>
                {store.bonusHome && <span className="text-yellow-400 font-bold">BONUS</span>}
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => store.subtractFoul('home')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Minus size={18} /></button>
                <span className="text-3xl font-mono font-bold text-white">{store.homeTeam.fouls}</span>
                <button onClick={() => store.addFoul('home')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Plus size={18} /></button>
              </div>
            </div>
            <div className="bg-neutral-800 rounded p-4 mb-3">
              <div className="text-neutral-300 mb-2">Timeouts</div>
              <div className="flex items-center justify-between">
                <button onClick={() => store.subtractTimeout('home')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Minus size={18} /></button>
                <span className="text-3xl font-mono font-bold text-white">{store.homeTeam.timeouts}</span>
                <button onClick={() => store.addTimeout('home')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Plus size={18} /></button>
              </div>
            </div>
            <button onClick={() => store.setPossession(store.possession === 'home' ? null : 'home')} className={`w-full py-3 rounded font-bold ${store.possession === 'home' ? 'bg-yellow-500 text-black' : 'bg-neutral-700 hover:bg-neutral-600 text-white'}`}>
              {store.possession === 'home' ? 'HAS POSSESSION' : 'Give Possession'}
            </button>
          </div>

          {/* Center Controls */}
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6">
              <ClockDisplay remainingTime={store.gameClock.remainingTime} isRunning={store.gameClock.isRunning} startTimestamp={store.gameClock.startTimestamp} size="large" label="Game Clock" />
              <div className="flex gap-2 mt-4">
                {!store.gameClock.isRunning ? (
                  <button onClick={store.startGameClock} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                    <Play size={20} />Start
                  </button>
                ) : (
                  <button onClick={store.pauseGameClock} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                    <Pause size={20} />Pause
                  </button>
                )}
                <button onClick={store.resetGameClock} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                  <RotateCcw size={20} />Reset
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6">
              <ClockDisplay remainingTime={store.shotClock.remainingTime} isRunning={store.shotClock.isRunning} startTimestamp={store.shotClock.startTimestamp} size="medium" label="Shot Clock" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                {!store.shotClock.isRunning ? (
                  <button onClick={store.startShotClock} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded flex items-center justify-center gap-2">
                    <Play size={18} />Start
                  </button>
                ) : (
                  <button onClick={store.pauseShotClock} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded flex items-center justify-center gap-2">
                    <Pause size={18} />Pause
                  </button>
                )}
                <button onClick={() => store.resetShotClock(24)} className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded">24</button>
                <button onClick={() => store.resetShotClock(14)} className="col-span-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded">14</button>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-sm text-neutral-400 uppercase mb-2">Period</div>
                <div className="text-5xl font-bold text-white">
                  {store.isOvertime ? `OT${store.period - store.gameConfig.numberOfPeriods}` : store.period}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={store.previousPeriod} disabled={store.period <= 1} className="flex-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded">Previous</button>
                <button onClick={store.nextPeriod} className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 rounded">Next</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={store.undo} disabled={store.history.length === 0} className="flex-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                <Undo2 size={18} />Undo
              </button>
              <button onClick={() => { if (confirm('Reset the entire game? This cannot be undone.')) store.resetGame(); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
                <RotateCcw size={18} />Reset
              </button>
            </div>
          </div>

          {/* Away Team - same structure as home */}
          <div className="bg-neutral-900 border-2 rounded-lg p-6" style={{ borderColor: store.awayTeam.primaryColor }}>
            <h2 className="text-2xl font-bold text-white mb-4">{store.awayTeam.name}</h2>
            <div className="text-center mb-6">
              <div className="text-7xl font-mono font-bold text-white mb-4">{store.awayTeam.score}</div>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => store.addScore('away', 1)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-lg">+1</button>
                <button onClick={() => store.addScore('away', 2)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-lg">+2</button>
                <button onClick={() => store.addScore('away', 3)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-lg">+3</button>
                <button onClick={() => store.subtractScore('away', 1)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded text-lg">-1</button>
              </div>
            </div>
            <div className="bg-neutral-800 rounded p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-300">Fouls</span>
                {store.bonusAway && <span className="text-yellow-400 font-bold">BONUS</span>}
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => store.subtractFoul('away')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Minus size={18} /></button>
                <span className="text-3xl font-mono font-bold text-white">{store.awayTeam.fouls}</span>
                <button onClick={() => store.addFoul('away')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Plus size={18} /></button>
              </div>
            </div>
            <div className="bg-neutral-800 rounded p-4 mb-3">
              <div className="text-neutral-300 mb-2">Timeouts</div>
              <div className="flex items-center justify-between">
                <button onClick={() => store.subtractTimeout('away')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Minus size={18} /></button>
                <span className="text-3xl font-mono font-bold text-white">{store.awayTeam.timeouts}</span>
                <button onClick={() => store.addTimeout('away')} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded"><Plus size={18} /></button>
              </div>
            </div>
            <button onClick={() => store.setPossession(store.possession === 'away' ? null : 'away')} className={`w-full py-3 rounded font-bold ${store.possession === 'away' ? 'bg-yellow-500 text-black' : 'bg-neutral-700 hover:bg-neutral-600 text-white'}`}>
              {store.possession === 'away' ? 'HAS POSSESSION' : 'Give Possession'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
