
import React, { useState, useEffect } from 'react';
import GameScene from './components/GameScene';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';
import { GameState, Player, Commentary, Rival } from './types';
import { INITIAL_RIVALS_COUNT } from './constants';
import { generateRivalProfile } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerStats, setPlayerStats] = useState<Player>({ 
    x: 0, z: 0, speed: 0, maxSpeed: 240, 
    health: 100, score: 0, gear: 0, rpm: 0, 
    isAttacking: false, attackType: 'NONE'
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

  const startGame = async () => {
    setEndGameSummary('');
    
    // Init Rivals with Police
    const initialRivals: Rival[] = [];
    
    // Add Police
    for(let i=0; i<2; i++) {
        initialRivals.push({
            id: `police_${i}`,
            name: 'Police',
            x: (i === 0 ? -5 : 5),
            z: 50, // Behind
            speed: 0,
            dx: 0,
            type: 'POLICE',
            state: 'CHASING',
            health: 200,
            personality: 'Relentless',
            color: 0xffffff
        });
    }

    // Add Racer
    initialRivals.push({
        id: 'racer_1',
        name: 'Viper',
        x: 0,
        z: -50, // Ahead
        speed: 40,
        dx: 0,
        type: 'RIVAL',
        state: 'CHASING',
        health: 100,
        personality: 'Aggressive',
        color: 0xffff00
    });

    setRivals(initialRivals);
    setGameState(GameState.RACING);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#050505]">
      <GameScene 
        gameState={gameState} 
        setGameState={setGameState} 
        setCommentary={setCommentary}
        setPlayerStats={setPlayerStats}
        rivals={rivals}
        setRivals={setRivals}
        setEndGameSummary={setEndGameSummary}
      />
      
      <HUD 
        player={playerStats} 
        commentary={commentary} 
        gameState={gameState}
      />
      
      <MainMenu 
        gameState={gameState} 
        startGame={startGame}
        summary={endGameSummary}
      />
    </div>
  );
};

export default App;
