import React from 'react';
import { GameState } from '../types';

interface MainMenuProps {
  gameState: GameState;
  startGame: () => void;
  summary?: string;
}

const MainMenu: React.FC<MainMenuProps> = ({ gameState, startGame, summary }) => {
  if (gameState === GameState.RACING) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center bg-no-repeat bg-blend-multiply">
      <div className="max-w-2xl w-full p-8 bg-black/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.2)] text-center">
        
        {gameState === GameState.MENU && (
            <>
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 mb-2 neon-text italic transform -skew-x-12">
                ROAD RASH<br/>SONIX
                </h1>
                <p className="text-xl text-cyan-200 mb-8 font-mono tracking-widest">2026 EDITION</p>
                
                <div className="space-y-4 mb-8 text-left bg-black/50 p-6 rounded border-l-4 border-pink-500">
                    <p className="text-gray-300"><strong className="text-white">MISSION:</strong> Survive the infinite highway.</p>
                    <p className="text-gray-300"><strong className="text-white">CONTROLS:</strong> Arrow Keys to Drive. Space to PUNCH.</p>
                    <p className="text-gray-300"><strong className="text-white">WARNING:</strong> AI Rivals learn from your violence.</p>
                </div>

                <button 
                onClick={startGame}
                className="px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded text-white font-bold text-2xl hover:scale-105 transition-transform hover:shadow-[0_0_30px_#ff00de] uppercase tracking-wider"
                >
                Ignite Engine
                </button>
            </>
        )}

        {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
             <>
             <h1 className={`text-6xl font-black mb-4 ${gameState === GameState.VICTORY ? 'text-green-500' : 'text-red-600'} neon-text`}>
                {gameState === GameState.VICTORY ? 'FIRST PLACE' : 'CRASHED OUT'}
             </h1>
             
             {summary ? (
                 <div className="mb-8 p-6 bg-gray-900/80 border border-gray-700 rounded text-left font-serif text-lg text-gray-300 italic">
                     <span className="block text-xs font-sans text-gray-500 not-italic mb-2 border-b border-gray-800 pb-1">DAILY BUGLE 2026</span>
                     "{summary}"
                 </div>
             ) : (
                <div className="mb-8 text-gray-400 animate-pulse">Scanning police frequencies...</div>
             )}

             <button 
             onClick={startGame}
             className="px-8 py-3 bg-cyan-700 hover:bg-cyan-600 rounded text-white font-bold text-xl uppercase"
             >
             Race Again
             </button>
         </>
        )}
      </div>
    </div>
  );
};

export default MainMenu;