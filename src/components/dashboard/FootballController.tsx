import React from 'react';
import { useBroadcastStore } from '../../store/useBroadcastStore';
import { MonitorPlay, MonitorOff } from 'lucide-react';

export const FootballController = () => {
  const store = useBroadcastStore();

  return (
    <div className="bg-broadcast-dark text-white p-6 rounded-lg shadow-xl font-sans w-full max-w-4xl">
      <div className="flex justify-between items-center mb-6 border-b border-neutral-700 pb-4">
        <h2 className="text-xl font-bold">Football Scoreboard Controls</h2>
        <button 
          onClick={store.toggleScorebug}
          className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-colors ${store.showScorebug ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {store.showScorebug ? <MonitorOff size={18} /> : <MonitorPlay size={18} />}
          {store.showScorebug ? 'Hide Scorebug' : 'Show Scorebug'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-broadcast-panel p-4 rounded border border-neutral-700">
          <h3 className="text-lg font-semibold text-red-500 mb-4">{store.homeTeam.name} (Home)</h3>
          <div className="text-5xl font-mono text-center mb-6 bg-black py-4 rounded">{store.homeTeam.score}</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={() => store.updateHomeScore(1)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded">+1</button>
            <button onClick={() => store.updateHomeScore(3)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded">+3</button>
            <button onClick={() => store.updateHomeScore(6)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded">+6</button>
            <button onClick={() => store.updateHomeScore(-1)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded col-span-3 text-red-400">-1</button>
          </div>
        </div>

        <div className="bg-broadcast-panel p-4 rounded border border-neutral-700">
          <h3 className="text-lg font-semibold text-blue-500 mb-4">{store.awayTeam.name} (Away)</h3>
          <div className="text-5xl font-mono text-center mb-6 bg-black py-4 rounded">{store.awayTeam.score}</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={() => store.updateAwayScore(1)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded">+1</button>
            <button onClick={() => store.updateAwayScore(3)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded">+3</button>
            <button onClick={() => store.updateAwayScore(6)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded">+6</button>
            <button onClick={() => store.updateAwayScore(-1)} className="bg-neutral-700 hover:bg-neutral-600 p-2 rounded col-span-3 text-red-400">-1</button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-broadcast-panel p-4 rounded border border-neutral-700 grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Down</label>
          <div className="flex items-center gap-2">
            <button onClick={() => store.setDown(Math.max(1, store.down - 1))} className="bg-neutral-700 px-3 py-1 rounded">-</button>
            <span className="text-xl font-mono w-8 text-center">{store.down}</span>
            <button onClick={() => store.setDown(Math.min(4, store.down + 1))} className="bg-neutral-700 px-3 py-1 rounded">+</button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">To Go</label>
          <input type="text" value={store.toGo} onChange={(e) => store.setToGo(e.target.value)} className="bg-black border border-neutral-600 rounded px-3 py-1.5 w-full text-white font-mono" />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Ball On</label>
          <input type="text" value={store.ballOn} onChange={(e) => store.setBallOn(e.target.value)} className="bg-black border border-neutral-600 rounded px-3 py-1.5 w-full text-white font-mono" />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Quarter</label>
          <div className="flex items-center gap-2">
            <button onClick={() => store.setQuarter(Math.max(1, store.quarter - 1))} className="bg-neutral-700 px-3 py-1 rounded">-</button>
            <span className="text-xl font-mono w-8 text-center">{store.quarter}</span>
            <button onClick={() => store.setQuarter(Math.min(5, store.quarter + 1))} className="bg-neutral-700 px-3 py-1 rounded">+</button>
          </div>
        </div>
      </div>
    </div>
  );
};
