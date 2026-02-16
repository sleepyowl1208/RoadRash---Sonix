
export enum GameState {
  MENU,
  RACING,
  GAME_OVER,
  VICTORY
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
  z: number; // World distance
  speed: number;
  maxSpeed: number;
  health: number;
  fuel: number; // 0 to 100
  score: number;
  gear: number;
  rpm: number; // 0 to 1
  isAttacking: boolean;
  attackType: 'KICK' | 'PUNCH' | 'NONE';
  lean: number;
}

export interface Rival {
  id: string;
  name: string;
  x: number;
  z: number;
  speed: number;
  dx: number; // Lateral velocity
  type: 'RIVAL' | 'POLICE';
  state: 'CHASING' | 'ATTACKING' | 'CRASHED' | 'STUNNED';
  aiState?: string;
  health: number;
  personality: string;
  color: number;
  lean: number;
}

export interface Commentary {
  text: string;
  speaker: 'System' | 'Rival' | 'Announcer';
  timestamp: number;
}

export interface AIEnvironmentResponse {
  commentary?: string;
  rival_actions?: any[];
  environment_effect?: string;
  dynamic_difficulty_adjustment?: number;
}

export interface RaceState {
  player: Player;
  rivals: Rival[];
  gameState: GameState;
  weather: Weather;
  environment: EnvironmentType;
  timestamp: number;
}
