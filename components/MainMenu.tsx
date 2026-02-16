
import React, { useState } from 'react';
import { GameState } from '../types';
import { generateRiderImage, generateVictoryVideo } from '../services/geminiService';
import { Loader, Camera, Video, Play, Zap, AlertTriangle, ShieldAlert } from 'lucide-react';

interface MainMenuProps {
  gameState: GameState;
  startGame: () => void;
  summary?: string;
  setGameState: (s: GameState) => void;
  setPlayerImage: (img: string) => void;
  playerImage?: string;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
    gameState, startGame, summary, setGameState, setPlayerImage, playerImage 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("Neon skull helmet, black leather armor");
  const [genVideoUrl, setGenVideoUrl] = useState<string | null>(null);

  const handleGenImage = async () => {
      setIsGenerating(true);
      const img = await generateRiderImage(prompt, '1K');
      if (img) setPlayerImage(img);
      setIsGenerating(false);
  };

  const handleGenVideo = async () => {
      if (!playerImage) return;
      setIsGenerating(true);
      const vid = await generateVictoryVideo(playerImage);
      if (vid) setGenVideoUrl(vid);
      setIsGenerating(false);
  };

  if (gameState === GameState.RACING) return null;

  // --- GARAGE (GenAI) ---
  if (gameState === GameState.GARAGE) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md" role="dialog" aria-label="Garage Menu">
            <div className="w-full max-w-4xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left: Preview */}
                <div className="bg-gray-900 border border-cyan-500/30 rounded-xl p-4 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group">
                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-cyan-400">
                             <Loader className="animate-spin mb-4 w-10 h-10" />
                             <span className="font-mono animate-pulse">GENERATING ASSETS...</span>
                        </div>
                    )}
                    
                    {genVideoUrl ? (
                        <video src={genVideoUrl} controls autoPlay loop className="w-full h-full object-cover rounded" />
                    ) : playerImage ? (
                        <img src={playerImage} alt="Rider Preview" className="w-full h-full object-cover rounded shadow-[0_0_30px_cyan]" />
                    ) : (
                        <div className="text-gray-600 font-mono text-sm">NO RIDER DATA</div>
                    )}
                    
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(0,255,255,0.2)_100%)] bg-[size:20px_20px] pointer-events-none" />
                </div>

                {/* Right: Controls */}
                <div className="flex flex-col space-y-6">
                    <div>
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 italic">
                            NEON GARAGE
                        </h2>
                        <p className="text-gray-400 text-sm mt-2">Powered by Gemini Nano Banana Pro & Veo</p>
                    </div>

                    <div className="space-y-4">
                        <label htmlFor="rider-prompt" className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Rider Prompt</label>
                        <textarea 
                            id="rider-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-4 text-white focus:border-cyan-500 focus:outline-none font-mono text-sm focus:ring-2 focus:ring-cyan-500"
                            rows={3}
                            aria-label="Enter description for AI rider generation"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleGenImage}
                            disabled={isGenerating}
                            className="flex items-center justify-center gap-2 py-4 bg-cyan-900/50 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all font-bold uppercase text-sm focus:ring-2 focus:ring-cyan-500"
                            aria-label="Generate new rider image"
                        >
                            <Camera size={18} /> Generate Rider
                        </button>
                        <button 
                            onClick={handleGenVideo}
                            disabled={!playerImage || isGenerating}
                            className="flex items-center justify-center gap-2 py-4 bg-purple-900/50 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-black transition-all font-bold uppercase text-sm disabled:opacity-50 focus:ring-2 focus:ring-purple-500"
                            aria-label="Animate rider with Veo"
                        >
                            <Video size={18} /> Animate (Veo)
                        </button>
                    </div>

                    <div className="pt-8 border-t border-gray-800">
                        <button 
                            onClick={() => setGameState(GameState.MENU)}
                            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 focus:ring-2 focus:ring-white"
                            aria-label="Return to Main Menu"
                        >
                            Return to Menu
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- PAUSE MENU ---
  if (gameState === GameState.PAUSED) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-label="Pause Menu">
            <div className="bg-gray-900 border border-yellow-500/50 p-10 rounded-xl text-center shadow-[0_0_100px_rgba(255,200,0,0.1)] max-w-md w-full">
                <h1 className="text-5xl font-black text-yellow-500 mb-2 italic">PAUSED</h1>
                <div className="w-full h-1 bg-yellow-900/50 mb-8" />
                <div className="flex flex-col gap-4">
                    <button onClick={startGame} className="w-full py-4 bg-yellow-500 text-black font-bold uppercase tracking-wider hover:bg-white transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-yellow-500" aria-label="Resume Game">
                        <Play size={20} fill="black" /> Resume
                    </button>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-transparent border border-gray-600 text-gray-400 font-bold uppercase hover:border-white hover:text-white transition-colors focus:ring-2 focus:ring-white" aria-label="Abort Race">
                        Abort
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- MAIN MENU / GAME OVER ---
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 bg-[url('https://picsum.photos/seed/cyber/1920/1080?blur=4')] bg-cover bg-center bg-blend-overlay">
      <div className="relative z-10 max-w-2xl w-full p-8 flex flex-col items-center">
        
        {gameState === GameState.MENU && (
            <div className="text-center animate-in fade-in zoom-in duration-500">
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-2 italic tracking-tighter drop-shadow-2xl">
                    ROAD<span className="text-cyan-500">RASH</span>
                </h1>
                <div className="flex items-center justify-center gap-4 mb-12">
                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500 text-cyan-400 text-xs font-bold tracking-[0.3em]">SONIX EDITION</span>
                    <span className="px-3 py-1 bg-purple-500/20 border border-purple-500 text-purple-400 text-xs font-bold tracking-[0.3em]">2026</span>
                </div>
                
                <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                    <button 
                        onClick={startGame}
                        className="group relative w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl uppercase tracking-widest skew-x-[-12deg] transition-all hover:scale-105 hover:shadow-[0_0_40px_cyan] focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
                        aria-label="Start Race"
                    >
                        <span className="block skew-x-[12deg]">Start Race</span>
                    </button>
                    
                    <button 
                        onClick={() => setGameState(GameState.GARAGE)}
                        className="group relative w-full py-5 bg-transparent border border-gray-600 hover:border-purple-500 text-gray-300 hover:text-purple-400 font-bold text-lg uppercase tracking-widest skew-x-[-12deg] transition-all focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                        aria-label="Open Garage"
                    >
                        <span className="block skew-x-[12deg] flex items-center justify-center gap-2">
                           <Zap size={16} /> Garage
                        </span>
                    </button>
                </div>
            </div>
        )}

        {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY || gameState === GameState.BUSTED) && (
             <div className="bg-black/80 backdrop-blur-xl p-10 rounded-2xl border border-gray-800 text-center w-full shadow-2xl" role="alert" aria-live="assertive">
                 <div className="mb-6">
                     {gameState === GameState.VICTORY && <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4 animate-bounce" />}
                     {gameState === GameState.BUSTED && <ShieldAlert className="w-20 h-20 text-blue-500 mx-auto mb-4 animate-pulse" />}
                     {gameState === GameState.GAME_OVER && <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-4" />}
                     
                     <h1 className={`text-6xl font-black italic uppercase ${
                         gameState === GameState.VICTORY ? 'text-yellow-400' : 
                         gameState === GameState.BUSTED ? 'text-blue-500' : 'text-red-600'
                     }`}>
                        {gameState === GameState.VICTORY ? 'DOMINATED' : gameState === GameState.BUSTED ? 'BUSTED' : 'WASTED'}
                     </h1>
                 </div>
                 
                 {summary && (
                     <div className="mb-8 p-4 bg-white/5 rounded border-l-4 border-gray-500 text-left font-mono text-sm text-gray-300">
                         {summary}
                     </div>
                 )}

                 <div className="flex gap-4 justify-center">
                     <button 
                        onClick={startGame}
                        className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors focus:ring-2 focus:ring-white"
                        aria-label="Replay Game"
                     >
                        Replay
                     </button>
                     <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="px-8 py-3 border border-gray-600 text-gray-400 font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors focus:ring-2 focus:ring-gray-400"
                        aria-label="Return to Menu"
                     >
                        Menu
                     </button>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

const Trophy = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
)

export default MainMenu;
