"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Eye } from "lucide-react";

export default function Home() {
  const { user, signInWithGoogle, loading } = useAuth();
  const { toggleHighContrast } = useTheme();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center text-neon-blue">LOADING SYSTEM...</div>;

  return (
    <main className="relative w-screen h-screen flex flex-col items-center justify-center bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Accessbility Controls */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={toggleHighContrast}
          className="flex items-center gap-2 px-4 py-2 border border-neon-blue text-neon-blue hover:bg-neon-blue/10 rounded focus:ring-2 focus:ring-neon-yellow"
          aria-label="Toggle High Contrast Mode"
        >
          <Eye size={20} />
          <span className="font-orbitron text-sm">High Contrast</span>
        </button>
      </div>

      <div className="z-10 text-center max-w-2xl px-4">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-neon-blue via-purple-500 to-neon-pink mb-4 neon-text italic transform -skew-x-12 font-orbitron">
          NEON<br/>VENGEANCE
        </h1>
        <p className="text-xl text-cyan-200 mb-12 font-mono tracking-widest uppercase">
          Road Rash 2026 Edition
        </p>

        {user ? (
           <div className="space-y-6">
              <div className="p-4 border-l-4 border-neon-blue bg-black/60 text-left mb-6">
                <p className="text-gray-400 text-sm">RIDER DETECTED</p>
                <p className="text-xl font-bold">{user.displayName}</p>
              </div>
              
              <Link href="/race" className="block w-full">
                <button className="w-full px-12 py-5 bg-gradient-to-r from-neon-pink to-purple-600 rounded-sm text-white font-bold text-2xl hover:scale-105 transition-transform hover:shadow-[0_0_30px_#ff00de] uppercase tracking-wider font-orbitron">
                  ENTER RACE
                </button>
              </Link>
           </div>
        ) : (
          <button 
            onClick={signInWithGoogle}
            className="group relative px-8 py-4 bg-transparent border-2 border-neon-blue text-neon-blue font-bold text-xl overflow-hidden transition-all hover:text-black"
          >
            <div className="absolute inset-0 w-0 bg-neon-blue transition-all duration-[250ms] ease-out group-hover:w-full opacity-100"></div>
            <span className="relative z-10 flex items-center gap-3">
               INITIALIZE RIDER LINK (GOOGLE)
            </span>
          </button>
        )}
      </div>
      
      <footer className="absolute bottom-4 text-gray-500 text-sm font-mono">
        v0.9.1-ALPHA // USE ARROW KEYS TO NAVIGATE
      </footer>
    </main>
  );
}
