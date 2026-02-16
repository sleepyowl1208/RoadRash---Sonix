
export const ROAD_WIDTH = 24;
export const SEGMENT_LENGTH = 200;
export const DRAW_DISTANCE = 800; 
export const CAMERA_HEIGHT = 1.8; 
export const CAMERA_DEPTH = 4.5;
export const INITIAL_RIVALS_COUNT = 5;

// REALISTIC MOTORCYCLE SPECS (1000cc Cyber-Sportbike)
export const PHYSICS = {
  // Engine
  MAX_RPM: 13000,
  IDLE_RPM: 1000,
  GEAR_RATIOS: [3.2, 2.2, 1.7, 1.4, 1.2, 1.0], 
  FINAL_DRIVE: 3.4,
  TORQUE_CURVE: [30, 70, 95, 110, 115, 110, 90], 
  
  // Forces
  MASS: 240, 
  ENGINE_BRAKING: 20.0, 
  BRAKING_POWER: 14000, 
  DRAG_COEFF: 0.32, 
  FRONTAL_AREA: 0.55, 
  ROLLING_RESISTANCE: 0.015,

  // Simplified Physics for GameEngine compatibility
  ACCELERATION: 20.0,
  BRAKING: 40.0,
  DRAG: 0.2,
  OFF_ROAD_DRAG: 30.0,

  // Limits
  MAX_SPEED: 90.0,        
  LATERAL_SPEED: 16.0,    
  MAX_LEAN: 0.85,          
  
  // Gameplay
  FUEL_BURN_RATE: 2.5, // Reduced from 4.5 to make it fair
  COMBAT_IMPULSE: 12.0, 
  COMBAT_COOLDOWN: 400,
  VICTORY_DISTANCE: 2000, // 2km Target
  
  // AI
  POLICE_AGRESSION: 1.5
};

export const COLORS = {
  SKY_TOP: '#050510',      
  SKY_BOTTOM: '#1a1a2e',   
  ASPHALT: '#111111',
  ASPHALT_WET: '#000000',
  LANE_MARKER: '#00ffff', 
  FOG_SUNNY: '#050510',
  FOG_RAIN: '#0a0a10',
  GRASS: '#0f380f',
  NEON_BUILDINGS: ['#00ffff', '#ff00ff', '#00ff00', '#ffff00']
};

export const ASSETS = {
  BIKE_MODEL: '/models/sportbike.glb',
};
