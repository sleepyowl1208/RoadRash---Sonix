import { RaceState, AIEnvironmentResponse } from '../types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export class GameService {
  private static instance: GameService;
  
  private constructor() {}

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  /**
   * Syncs the race state with the Python Backend to get AI commentary and rival actions.
   */
  async syncRaceState(state: RaceState): Promise<AIEnvironmentResponse | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/race/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        console.error('Backend sync failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  }

  /**
   * Fallback local generator if backend is unreachable
   */
  getFallbackCommentary(event: string): string {
    const fallbacks: Record<string, string> = {
      start: "Engines Online. Survive.",
      crash: "Critical System Failure.",
      win: "Target Eliminated. You win.",
      hit: "Combat protocols engaged."
    };
    return fallbacks[event] || "Drive.";
  }
}

export const gameService = GameService.getInstance();