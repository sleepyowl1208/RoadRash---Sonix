

export enum GameState {
  MENU,
  GARAGE, // New GenAI feature
  RACING,
  PAUSED,
  GAME_OVER,
  VICTORY,
  BUSTED
}

export enum Weather {
  SUNNY = 'SUNNY',
  RAIN = 'RAIN',
  SNOW = 'SNOW'
}

export enum EnvironmentType {
  OCEAN = 'OCEAN',
  MOUNTAIN = 'MOUNTAIN',
  CITY = 'CITY'
}

export interface Player {
  x: number;
  z: number;
  speed: number;
  maxSpeed: number;
  health: number;
  fuel: number;
  score: number;
  gear: number;
  rpm: number;
  isAttacking: boolean;
  attackType: 'KICK' | 'PUNCH' | 'NONE';
  lean: number;
  // Customization
  customImage?: string; // Data URL from GenAI
}

export interface Rival {
  id: string;
  name: string;
  x: number;
  z: number;
  speed: number;
  dx: number;
  type: 'RIVAL' | 'POLICE';
  state: 'CHASING' | 'ATTACKING' | 'CRASHED' | 'STUNNED';
  aiState?: string;
  health: number;
  personality: string;
  color: number;
  lean: number;
}

export interface FuelPickup {
  id: string;
  x: number;
  z: number;
  active: boolean;
}

export interface Commentary {
  text: string;
  speaker: 'System' | 'Rival' | 'Announcer' | 'Police';
  timestamp: number;
}

export interface GenAIRequest {
  prompt: string;
  style: 'REALISTIC' | 'CYBERPUNK' | 'ANIME';
}

export interface RaceState {
  player: Player;
  rivals: Rival[];
  gameState: GameState;
  timestamp: number;
}

export interface AIEnvironmentResponse {
  commentary?: Commentary;
  weather?: Weather;
  rivalUpdates?: Partial<Rival>[];
}
