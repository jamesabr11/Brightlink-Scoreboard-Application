import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBroadcastStore } from "../../store/useBroadcastStore";

export const FootballScorebug = () => {
  const store = useBroadcastStore();

  return (
    <AnimatePresence>
      {store.showScorebug && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="absolute top-10 left-1/2 -translate-x-1/2 flex items-stretch shadow-2xl font-sans"
        >
          {/* Away Team */}
          <div
            className="flex bg-neutral-900 border-l-4"
            style={{ borderColor: store.awayTeam.primaryColor }}
          >
            <div className="px-6 py-2 flex items-center justify-center font-bold text-white text-2xl uppercase tracking-wider min-w-[100px]">
              {store.awayTeam.abbreviation}
            </div>
            <div className="px-6 py-2 bg-neutral-800 flex items-center justify-center min-w-[80px]">
              <motion.span
                key={store.awayTeam.score}
                initial={{ scale: 1.5, color: "#4ade80" }}
                animate={{ scale: 1, color: "#ffffff" }}
                className="text-4xl font-mono font-bold"
              >
                {store.awayTeam.score}
              </motion.span>
            </div>
          </div>

          {/* Center Info (Clock & Game State) */}
          <div className="bg-black text-white px-8 flex flex-col justify-center items-center min-w-[180px] relative overflow-hidden">
            <div className="text-3xl font-mono font-bold tracking-widest">
              {store.clock}
            </div>
            <div className="text-xs font-bold text-neutral-400 uppercase mt-1 tracking-wider">
              {store.down} & {store.toGo} • Ball on {store.ballOn}
            </div>
            {/* Possession Indicator */}
            <div className="absolute bottom-0 w-full h-1 flex">
              <div
                className={`h-full w-1/2 ${store.possession === "away" ? "bg-yellow-400" : "bg-transparent"}`}
              />
              <div
                className={`h-full w-1/2 ${store.possession === "home" ? "bg-yellow-400" : "bg-transparent"}`}
              />
            </div>
          </div>

          {/* Home Team */}
          <div
            className="flex bg-neutral-900 border-r-4 flex-row-reverse"
            style={{ borderColor: store.homeTeam.primaryColor }}
          >
            <div className="px-6 py-2 flex items-center justify-center font-bold text-white text-2xl uppercase tracking-wider min-w-[100px]">
              {store.homeTeam.abbreviation}
            </div>
            <div className="px-6 py-2 bg-neutral-800 flex items-center justify-center min-w-[80px]">
              <motion.span
                key={store.homeTeam.score}
                initial={{ scale: 1.5, color: "#4ade80" }}
                animate={{ scale: 1, color: "#ffffff" }}
                className="text-4xl font-mono font-bold"
              >
                {store.homeTeam.score}
              </motion.span>
            </div>
          </div>

          {/* Quarter Indicator */}
          <div className="bg-neutral-700 text-white px-4 flex items-center justify-center font-bold text-lg rounded-r-lg">
            Q{store.quarter}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
