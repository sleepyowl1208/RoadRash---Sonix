
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Eye, Trophy, User, Zap, Globe, ShieldAlert } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mock Leaderboard Data (Fallbacks)
const MOCK_LEADERBOARD = [
  { id: 1, name: "NeonRider_99", score: 45200, country: "JP" },
  { id: 2, name: "CyberWolf", score: 41050, country: "US" },
  { id: 3, name: "Glitch_Queen", score: 38900, country: "KR" },
  { id: 4, name: "RoadWarriorX", score: 35400, country: "DE" },
  { id: 5, name: "Sonix_Prime", score: 32100, country: "UK" },
];

export default function Home() {
  const { user, signInWithGoogle, loading } = useAuth();
  const { toggleHighContrast } = useTheme();
  const [leaderboard, setLeaderboard] = useState(MOCK_LEADERBOARD);
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'LEADERBOARD'>('LOGIN');

  // Fetch real leaderboard if available
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!db) return; // Skip if DB not initialized
      try {
        const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs.map((doc, i) => ({ 
            id: i, 
            name: doc.data().username || "Unknown", 
            score: doc.data().score, 
            country: "UNK" 
          }));
          setLeaderboard(data as any);
        }
      } catch (e) {
        console.warn("Leaderboard fetch failed (likely no permission or offline):", e);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-cyan-500 font-mono">
       <div className="animate-spin mb-4"><Zap size={48} /></div>
       <div className="tracking-[0.5em] animate-pulse">SYSTEM INITIALIZING...</div>
    </div>
  );

  return (
    <main className="relative w-screen h-screen flex overflow-hidden bg-[#050505] text-white font-rajdhani selection:bg-pink-500 selection:text-white">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605218427306-022ba806c1ea?q=80&w=2671&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black" />
      
      {/* Animated Grid Floor */}
      <div className="absolute bottom-0 w-full h-1/2 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,255,255,0.1)_100%)] perspective-grid pointer-events-none" />

      {/* Main Content Layout */}
      <div className="relative z-10 container mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-12 p-6">
        
        {/* Left: Branding & Action */}
        <div className="flex-1 flex flex-col items-start space-y-8 max-w-xl">
            <div className="relative">
                <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-200 to-cyan-500 filter drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                    ROAD<br/><span className="text-stroke-cyan text-transparent">RASH</span>
                </h1>
                <div className="absolute -top-4 -right-12 px-4 py-1 bg-pink-600 transform rotate-12 border border-pink-400 shadow-[0_0_20px_#db2777]">
                    <span className="font-orbitron font-bold text-xs tracking-widest">SONIX 2026</span>
                </div>
            </div>
            
            <p className="text-xl text-cyan-100/70 font-light border-l-4 border-cyan-500 pl-6 leading-relaxed max-w-md">
                Experience the next evolution of vehicular combat. 
                <span className="text-pink-400 font-semibold"> Survive</span> the infinite highway. 
                <span className="text-pink-400 font-semibold"> Dominate</span> the global elite.
            </p>

            <div className="flex flex-col w-full max-w-sm gap-4">
                {user ? (
                    <div className="p-6 bg-cyan-900/20 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-cyan-400" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-cyan-800 flex items-center justify-center border-2 border-cyan-400">
                                    <User size={24} />
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-cyan-400 uppercase tracking-widest">Operator Connected</div>
                                <div className="text-xl font-bold">{user.displayName}</div>
                            </div>
                        </div>
                        <Link href="/race" className="block w-full">
                            <button className="group relative w-full px-8 py-4 bg-white text-black font-black text-xl uppercase tracking-widest overflow-hidden hover:bg-cyan-400 transition-all clip-path-button">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Initiate Race <Zap size={20} className="fill-black" />
                                </span>
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <button 
                            onClick={signInWithGoogle}
                            className="w-full px-8 py-4 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500 text-cyan-300 font-bold text-lg uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] flex items-center justify-center gap-3"
                        >
                            <Globe size={20} /> Login with Google
                        </button>
                        <Link href="/race">
                            <button className="w-full px-8 py-3 bg-transparent hover:bg-white/5 border border-white/20 text-neutral-400 font-bold text-sm uppercase tracking-widest transition-all">
                                Play as Guest
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>

        {/* Right: Leaderboard Module */}
        <div className="flex-1 w-full max-w-md">
            <div className="bg-black/60 border border-neutral-800 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl">
                <div className="flex border-b border-neutral-800">
                    <button 
                        onClick={() => setActiveTab('LEADERBOARD')}
                        className={`flex-1 py-4 text-center font-orbitron text-sm tracking-widest uppercase transition-colors ${activeTab === 'LEADERBOARD' ? 'bg-pink-600 text-white' : 'text-neutral-500 hover:text-white'}`}
                    >
                        Global Elite
                    </button>
                    <button 
                        onClick={() => setActiveTab('LOGIN')}
                         className={`flex-1 py-4 text-center font-orbitron text-sm tracking-widest uppercase transition-colors ${activeTab === 'LOGIN' ? 'bg-cyan-600 text-white' : 'text-neutral-500 hover:text-white'}`}
                    >
                        System Status
                    </button>
                </div>

                <div className="p-6 min-h-[400px]">
                    {activeTab === 'LEADERBOARD' ? (
                        <div className="space-y-4">
                            {leaderboard.map((entry, idx) => (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded hover:border-pink-500/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`font-mono text-xl font-bold w-8 ${idx < 3 ? 'text-pink-500' : 'text-neutral-600'}`}>
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-pink-400 transition-colors">{entry.name}</div>
                                            <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                <Globe size={10} /> {entry.country}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-cyan-300">{entry.score.toLocaleString()}</div>
                                        <div className="text-[10px] text-neutral-500 uppercase">PTS</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6 text-sm text-neutral-400 font-mono">
                            <div className="flex items-center justify-between">
                                <span>SERVER STATUS</span>
                                <span className="text-green-500">ONLINE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>ACTIVE RIDERS</span>
                                <span className="text-cyan-500">8,421</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>REGION</span>
                                <span className="text-white">US-EAST-1</span>
                            </div>
                            <div className="h-px bg-neutral-800 my-4" />
                            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded text-yellow-500 flex items-start gap-3">
                                <ShieldAlert size={20} className="shrink-0" />
                                <div>
                                    <strong className="block mb-1 text-white">WEATHER WARNING</strong>
                                    Heavy acid rain reported in Sector 7. Visibility reduced to 40%. Equip thermal optics.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {/* Footer / Utilities */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4">
        <button 
          onClick={toggleHighContrast}
          className="p-3 bg-black/50 border border-white/20 rounded-full hover:bg-white hover:text-black transition-colors"
          aria-label="Accessibility Mode"
        >
          <Eye size={20} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .text-stroke-cyan {
          -webkit-text-stroke: 2px #22d3ee;
        }
        .clip-path-button {
            clip-path: polygon(10% 0, 100% 0, 100% 80%, 90% 100%, 0 100%, 0 20%);
        }
        .perspective-grid {
            background-size: 50px 50px;
            background-image:
                linear-gradient(to right, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
            transform: perspective(500px) rotateX(60deg);
            transform-origin: bottom center;
        }
      `}} />
    </main>
  );
}
