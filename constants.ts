
export const ROAD_WIDTH = 24;
export const SEGMENT_LENGTH = 200;
export const DRAW_DISTANCE = 600; 
export const CAMERA_HEIGHT = 1.8;
export const CAMERA_DEPTH = 4.5;
export const INITIAL_RIVALS_COUNT = 5;

// REALISTIC MOTORCYCLE SPECS (approx 1000cc Sportbike)
export const PHYSICS = {
  // Engine
  MAX_RPM: 13000,
  IDLE_RPM: 1500,
  GEAR_RATIOS: [3.2, 2.4, 1.9, 1.6, 1.4, 1.2], // 1st to 6th
  FINAL_DRIVE: 3.5,
  TORQUE_CURVE: [20, 50, 85, 110, 105, 90, 70], // Torque at [1k, 3k, 5k, 8k, 10k, 12k, 13k] RPM
  
  // Forces
  MASS: 220, // kg (Bike + Rider)
  ENGINE_BRAKING: 15.0, // N
  BRAKING_POWER: 12000, // N (Dual disc)
  DRAG_COEFF: 0.35, // Aerodynamic drag
  FRONTAL_AREA: 0.5, // m^2
  ROLLING_RESISTANCE: 0.02,

  // Limits
  MAX_SPEED: 85.0,        // m/s (~190 mph)
  LATERAL_SPEED: 15.0,    // m/s
  MAX_LEAN: 0.9,          // Radians (~50 degrees)
  
  // Gameplay
  GRIP_WET_MULTIPLIER: 0.6,
  COMBAT_IMPULSE: 6.0,
  COLLISION_BOUNCE: 0.5,
  COMBAT_COOLDOWN: 500,
  
  // Simplified Physics
  ACCELERATION: 15.0,
  BRAKING: 25.0,
  DRAG: 2.0,
  OFF_ROAD_DRAG: 40.0
};

export const COLORS = {
  SKY_TOP: '#3a5a7a',      // Realistic deep blue/grey
  SKY_BOTTOM: '#c4b5a0',   // Hazy horizon
  ASPHALT: '#222222',
  ASPHALT_WET: '#050505',
  GRASS: '#344b28',        // Muted organic green
  DIRT: '#5a4d3a',
  FOG_RAIN: '#556677',
  FOG_SUNNY: '#c4b5a0',
  LANE_MARKER: '#aaaaaa'
};

export const TRAFFIC_COUNT = 15;
export const POLICE_COUNT = 3;