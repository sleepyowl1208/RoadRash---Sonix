
import React, { useState, useEffect } from 'react';
import GameScene from './components/GameScene';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';
import { GameState, Player, Commentary, Rival } from './types';
import { AudioManager } from './game/AudioManager';
import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  
  // HUD State (React State - updates slower)
  const [playerStats, setPlayerStats] = useState<Player>({ 
    x: 0, z: 0, speed: 0, maxSpeed: 240, 
    health: 100, fuel: 100, score: 0, gear: 0, rpm: 0, 
    isAttacking: false, attackType: 'NONE', lean: 0
  });

  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [endGameSummary, setEndGameSummary] = useState<string>('');

  useEffect(() => {
    if (commentary) {
        const timer = setTimeout(() => setCommentary(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [commentary]);

  // Save Score Logic
  useEffect(() => {
      if ((gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && user && db) {
          const saveScore = async () => {
              try {
                  const scoreRef = doc(db, "scores", user.uid);
                  await setDoc(scoreRef, {
                      username: user.displayName,
                      score: Math.floor(playerStats.score),
                      lastPlayed: new Date(),
                      totalRaces: increment(1)
                  }, { merge: true });
              } catch (e) {
                  console.error("Score save failed", e);
              }
          }
          saveScore();
      }
  }, [gameState, user]);

  const startGame = () => {
    setEndGameSummary('');
    AudioManager.getInstance().start();

    // Initialize Rivals
    const initialRivals: Rival[] = [
        {
            id: 'police_1',
            name: 'Police',
            x: -5,
            z: 80, // Starts behind
            speed: 80, 
            dx: 0,
            type: 'POLICE',
            state: 'CHASING',
            health: 200,
            personality: 'Relentless',
            color: 0xffffff,
            lean: 0
        },
        {
            id: 'rival_1',
            name: 'Viper',
            x: 3,
            z: -40, // Starts ahead
            speed: 60,
            dx: 0,
            type: 'RIVAL',
            state: 'CHASING',
            health: 100,
            personality: 'Aggressive',
            color: 0xffff00,
            lean: 0
        }
    ];

    setRivals(initialRivals);
    setGameState(GameState.RACING);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#050505]">
      {/* 3D Scene handles Physics & Rendering */}
      <GameScene 
        gameState={gameState} 
        setGameState={setGameState} 
        setCommentary={setCommentary}
        setPlayerStats={setPlayerStats}
        rivals={rivals}
        setRivals={setRivals}
        setEndGameSummary={setEndGameSummary}
      />
      
      {/* 2D HUD Layer */}
      <HUD 
        player={playerStats} 
        commentary={commentary} 
        gameState={gameState}
      />
      
      {/* Menus */}
      <MainMenu 
        gameState={gameState} 
        startGame={startGame}
        summary={endGameSummary}
      />
    </div>
  );
};

export default App;
