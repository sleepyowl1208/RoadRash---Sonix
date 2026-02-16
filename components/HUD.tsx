
import React from 'react';
import { Player, Commentary, GameState } from '../types';

interface HUDProps {
  player: Player;
  commentary: Commentary | null;
  gameState: GameState;
}

const HUD: React.FC<HUDProps> = ({ player, commentary, gameState }) => {
  if (gameState !== GameState.RACING) return null;

  const speedPercent = Math.min(player.speed / player.maxSpeed, 1);
  const healthPercent = Math.max(0, player.health);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between font-sans">
      
      {/* Top Left: Score/Distance Panel (Glass Morphism) */}
      <div className="flex justify-between items-start">
        <div className="bg-black/30 backdrop-blur-md border-l-4 border-orange-500 px-6 py-3 rounded-r-lg shadow-lg">
           <div className="text-gray-300 text-xs font-bold uppercase tracking-widest">Distance</div>
           <div className="text-white text-3xl font-mono font-bold tracking-tighter">
             {(player.score / 100).toFixed(1)} <span className="text-sm text-gray-400">KM</span>
           </div>
        </div>

        {/* Top Right: Integrity Monitor */}
        <div className="bg-black/30 backdrop-blur-md border-r-4 border-red-500 px-6 py-3 rounded-l-lg shadow-lg text-right">
           <div className="text-gray-300 text-xs font-bold uppercase tracking-widest">Chassis Integrity</div>
           <div className="w-48 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${healthPercent < 30 ? 'bg-red-600 animate-pulse' : 'bg-white'}`}
                style={{ width: `${healthPercent}%` }}
              />
           </div>
           <div className="text-xl font-bold text-white mt-1">{Math.floor(healthPercent)}%</div>
        </div>
      </div>

      {/* Commentary / Alerts */}
      {commentary && (
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 w-full max-w-md text-center">
             <div className="bg-gradient-to-r from-transparent via-black/60 to-transparent py-4 px-8 text-white">
                <div className="text-xs font-bold uppercase text-orange-400 tracking-[0.2em] mb-1">{commentary.speaker} COMM</div>
                <div className="text-lg font-medium italic font-serif">"{commentary.text}"</div>
             </div>
          </div>
      )}

      {/* Bottom Right: Realistic Dashboard Cluster */}
      <div className="absolute bottom-8 right-8 flex items-end">
         
         {/* Tachometer / Speedometer Circular Graphic */}
         <div className="relative w-48 h-48">
            {/* SVG Dashboard background */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
               {/* Gauge Background */}
               <circle cx="50" cy="50" r="45" fill="rgba(0,0,0,0.6)" stroke="#333" strokeWidth="2" />
               <path d="M 15 85 A 45 45 0 1 1 85 85" fill="none" stroke="#444" strokeWidth="4" strokeLinecap="round" />
               
               {/* Speed Arc */}
               <path 
                 d="M 15 85 A 45 45 0 1 1 85 85" 
                 fill="none" 
                 stroke={speedPercent > 0.9 ? "#ef4444" : "#f97316"} 
                 strokeWidth="4" 
                 strokeLinecap="round" 
                 strokeDasharray="220"
                 strokeDashoffset={220 - (220 * speedPercent)}
                 className="transition-all duration-100 ease-out"
               />
            </svg>
            
            {/* Digital Speed Readout centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
               <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                 {player.speed}
               </span>
               <span className="text-xs font-bold text-gray-400 uppercase mt-[-5px]">KM/H</span>
            </div>

            {/* Gear Indicator */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded px-2 py-0.5 border border-gray-600">
               <span className="text-orange-500 font-bold font-mono">
                 {player.speed < 10 ? 'N' : Math.min(6, Math.ceil(player.speed / 30))}
               </span>
            </div>
         </div>
      </div>

      {/* Controls Hint */}
      <div className="absolute bottom-8 left-8 text-white/40 text-xs font-bold uppercase tracking-widest">
         INPUT :: [WASD / ARROWS] MANEUVER
      </div>
    </div>
  );
};

export default HUD;
