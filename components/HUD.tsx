
import React from 'react';
import { Player, Commentary, GameState, Weather } from '../types';
import { ROAD_WIDTH } from '../constants';

interface HUDProps {
  player: Player;
  commentary: Commentary | null;
  gameState: GameState;
}

const HUD: React.FC<HUDProps> = ({ player, commentary, gameState }) => {
  if (gameState !== GameState.RACING) return null;

  const healthPercent = Math.max(0, player.health);
  const fuelPercent = Math.max(0, player.fuel);
  const speed = Math.floor(player.speed * 2.237); // Convert m/s to MPH approx
  const isOffRoad = Math.abs(player.x) > (ROAD_WIDTH / 2) - 1;

  // Speedometer calculation (0 to 200mph mapped to -135deg to +135deg)
  const maxDisplaySpeed = 220;
  const speedAngle = -135 + (Math.min(speed, maxDisplaySpeed) / maxDisplaySpeed) * 270;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none font-sans text-white select-none">
      
      {/* Off Road Alert */}
      {isOffRoad && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center animate-pulse-fast">
              <h2 className="text-4xl font-black text-red-500 neon-text italic uppercase tracking-widest border-4 border-red-500 px-6 py-2">
                  OFF TRACK
              </h2>
              <p className="text-red-300 font-bold bg-black/50 px-2 mt-1">RETURN TO ROAD</p>
          </div>
      )}

      {/* Top Left: Distance */}
      <div className="absolute top-8 left-8">
          <div className="flex flex-col">
              <span className="text-xs text-neutral-400 uppercase tracking-widest mb-1">Target Distance</span>
              <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-rajdhani text-white">
                      {(player.score / 1000).toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-cyan-400">KM</span>
              </div>
              <div className="w-32 h-1 bg-gray-800 mt-1">
                  <div 
                    className="h-full bg-cyan-500" 
                    style={{ width: `${Math.min(100, (player.score / 10000) * 100)}%` }} 
                  />
              </div>
          </div>
      </div>

      {/* Center: Commentary/Alerts */}
      {commentary && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-lg text-center">
             <div className="bg-gradient-to-r from-transparent via-black/80 to-transparent px-10 py-4">
                <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">{commentary.speaker}</p>
                <p className="text-xl italic font-serif text-white/90 tracking-wide text-shadow">"{commentary.text}"</p>
             </div>
          </div>
      )}

      {/* Bottom Right: Realistic Cluster */}
      <div className="absolute bottom-8 right-8 scale-90 origin-bottom-right">
         <div className="relative w-64 h-64 bg-black/40 rounded-full border-4 border-gray-800 backdrop-blur-md shadow-2xl">
            
            {/* Tick Marks */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                {/* Major Ticks */}
                {[...Array(11)].map((_, i) => {
                    const deg = -135 + (i * 27);
                    return (
                        <line 
                            key={i}
                            x1="50" y1="50" x2="50" y2="10" 
                            transform={`rotate(${deg} 50 50)`} 
                            stroke="white" 
                            strokeWidth="2"
                            strokeDasharray="5 100" // Only tip
                        />
                    )
                })}
                {/* Redline Zone */}
                <path d="M 85 85 A 40 40 0 0 0 95 60" fill="none" stroke="red" strokeWidth="4" />
            </svg>

            {/* Needle */}
            <div 
                className="absolute top-0 left-0 w-full h-full transition-transform duration-100 ease-out"
                style={{ transform: `rotate(${speedAngle}deg)` }}
            >
                <div className="absolute top-[15%] left-1/2 w-1 h-[35%] bg-red-500 -translate-x-1/2 origin-bottom shadow-[0_0_10px_red]" />
            </div>
            
            {/* Center Cap */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-gray-900 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-gray-600 shadow-inner z-20 flex items-center justify-center">
                <div className="text-[8px] font-bold text-gray-500">KM/H</div>
            </div>

            {/* Digital Speed Readout */}
            <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-center">
               <div className="text-4xl font-black font-mono tracking-tighter leading-none text-white">{speed}</div>
               <div className="text-[10px] text-gray-400 font-bold mt-1">MPH</div>
            </div>

            {/* Gear Indicator */}
            <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-8 h-8 border border-white/20 bg-black/50 flex items-center justify-center rounded">
                <span className="text-xl font-bold text-yellow-500">{player.gear === 0 ? 'N' : player.gear}</span>
            </div>
         </div>

         {/* Fuel & Health Bars (Satellite) */}
         <div className="absolute -left-20 bottom-0 w-16 h-48 flex flex-col justify-end gap-4">
            {/* Fuel */}
            <div className="relative h-24 bg-gray-900/80 rounded-full overflow-hidden border border-gray-700">
                <div 
                    className={`absolute bottom-0 w-full transition-all duration-500 ${fuelPercent < 20 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}
                    style={{ height: `${fuelPercent}%` }}
                />
                <div className="absolute bottom-1 w-full text-center text-[8px] font-bold text-white z-10">FUEL</div>
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-2 px-1">
                    <div className="w-full h-[1px] bg-white/20" />
                    <div className="w-full h-[1px] bg-white/20" />
                    <div className="w-full h-[1px] bg-white/20" />
                </div>
            </div>

            {/* Health */}
            <div className="relative h-24 bg-gray-900/80 rounded-full overflow-hidden border border-gray-700">
                <div 
                    className={`absolute bottom-0 w-full transition-all duration-300 ${healthPercent < 30 ? 'bg-red-600' : 'bg-green-500'}`}
                    style={{ height: `${healthPercent}%` }}
                />
                 <div className="absolute bottom-1 w-full text-center text-[8px] font-bold text-white z-10">DMG</div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default HUD;
