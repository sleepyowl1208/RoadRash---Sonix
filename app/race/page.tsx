
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import App from "@/App"; 

export default function RacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [preloading, setPreloading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // 10 Second Loader Simulation
  useEffect(() => {
    if (user) {
        const duration = 10000; // 10 seconds
        const interval = 100;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const pct = Math.min(100, (currentStep / steps) * 100);
            setProgress(pct);
            
            if (currentStep >= steps) {
                clearInterval(timer);
                setPreloading(false);
            }
        }, interval);

        return () => clearInterval(timer);
    }
  }, [user]);

  if (loading || !user) {
     return <div className="h-screen w-screen bg-black text-cyan-500 font-mono flex items-center justify-center">AUTHENTICATING...</div>;
  }

  if (preloading) {
      return (
        <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
            
            <div className="z-10 w-full max-w-md space-y-8 p-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter">
                        LOADING ASSETS
                    </h1>
                    <p className="text-cyan-500/60 font-mono text-xs tracking-[0.5em] animate-pulse">
                        ESTABLISHING NEURAL LINK...
                    </p>
                </div>

                {/* Cyberpunk Progress Bar */}
                <div className="relative h-4 bg-gray-900 border border-gray-800 skew-x-[-15deg]">
                    <div 
                        className="absolute top-0 left-0 h-full bg-cyan-500 shadow-[0_0_15px_cyan] transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Glitch lines */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px)] opacity-20" />
                </div>

                <div className="flex justify-between text-xs font-mono text-gray-500">
                    <span>SYSTEM_CHECK: OK</span>
                    <span>{Math.floor(progress)}%</span>
                </div>
            </div>
        </div>
      );
  }

  return <App />;
}
