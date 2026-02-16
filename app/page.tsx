
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Eye, Zap, Globe, ShieldAlert, Lock, User, Trophy } from "lucide-react";
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

  // Fetch real leaderboard if available
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!db) return; 
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
        console.warn("Leaderboard fetch failed:", e);
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
    <main className="relative w-screen h-screen flex overflow-hidden bg-[#0a0a0a] text-white font-rajdhani selection:bg-cyan-500 selection:text-black">
      
      {/* Neon Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0a0a0a_0%,#1a1a2e_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom opacity-50 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-12 p-6">
        
        {/* Left: Branding & Login */}
        <div className="flex-1 flex flex-col items-start space-y-8 max-w-xl">
            <div className="relative">
                <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
                    NEON<br/><span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">RASH</span>
                </h1>
                <div className="absolute -top-6 -right-8 px-4 py-1 bg-yellow-400 text-black font-bold transform rotate-6 skew-x-12 border-2 border-white shadow-[0_0_20px_yellow]">
                    <span className="font-orbitron text-sm tracking-widest">5KM SPRINT</span>
                </div>
            </div>
            
            <p className="text-xl text-cyan-100/80 font-light border-l-4 border-cyan-500 pl-6 leading-relaxed max-w-md">
                Full-contact motorcycle racing in the digital void.
                <br />
                <span className="text-purple-400 font-semibold"> Objective:</span> Survive 5KM.
                <br />
                <span className="text-purple-400 font-semibold"> Combat:</span> Authorized.
            </p>

            <div className="flex flex-col w-full max-w-sm gap-4">
                {user ? (
                    <div className="p-6 bg-gray-900/80 border border-cyan-500/50 rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                        <div className="flex items-center gap-4 mb-6">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-cyan-400 shadow-[0_0_10px_cyan]" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-cyan-900 flex items-center justify-center border-2 border-cyan-400">
                                    <User size={24} />
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-cyan-400 uppercase tracking-widest mb-1">Welcome Back</div>
                                <div className="text-2xl font-bold font-orbitron">{user.displayName}</div>
                            </div>
                        </div>
                        <Link href="/race" className="block w-full">
                            <button className="group relative w-full px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl uppercase tracking-widest transition-all skew-x-[-10deg] hover:skew-x-[-15deg] hover:shadow-[0_0_30px_cyan]">
                                <span className="inline-block transform skew-x-[10deg] group-hover:skew-x-[15deg]">
                                    ENTER RACE
                                </span>
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4 p-8 bg-black/40 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs mb-2">
                            <Lock size={12} /> Access Restricted
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Authentication Required</h3>
                        <button 
                            onClick={signInWithGoogle}
                            className="w-full px-8 py-4 bg-white text-black font-bold text-lg uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            <Globe size={24} /> Sign In with Google
                        </button>
                        <p className="text-center text-xs text-neutral-500 mt-4">
                            Guest access disabled for ranked play.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Right: Leaderboard */}
        <div className="hidden md:block flex-1 max-w-md">
            <div className="bg-black/80 border border-gray-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="bg-gray-900/50 p-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="font-orbitron tracking-widest text-cyan-400">TOP RUNNERS</h3>
                    <Trophy size={16} className="text-yellow-500" />
                </div>
                <div className="divide-y divide-gray-800">
                    {leaderboard.map((entry, idx) => (
                        <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold text-lg w-6 ${idx === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                                    {idx + 1}
                                </span>
                                <span className="text-gray-300 font-bold">{entry.name}</span>
                            </div>
                            <span className="font-mono text-cyan-500">{entry.score.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
