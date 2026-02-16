
export const ROAD_WIDTH = 24;
export const SEGMENT_LENGTH = 200;
export const DRAW_DISTANCE = 800; 
export const CAMERA_HEIGHT = 1.6;
export const CAMERA_DEPTH = 4.0;
export const INITIAL_RIVALS_COUNT = 5;

// REALISTIC MOTORCYCLE SPECS (approx 1000cc Sportbike)
export const PHYSICS = {
  // Engine
  MAX_RPM: 14000,
  IDLE_RPM: 1200,
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
  MAX_SPEED: 95.0,        // m/s (~210 mph)
  LATERAL_SPEED: 18.0,    // m/s
  MAX_LEAN: 0.95,          // Radians (~55 degrees)
  
  // Gameplay & Weather Modifiers
  GRIP_SUNNY: 1.0,
  GRIP_RAIN: 0.65,
  GRIP_SNOW: 0.45,
  DRAG_RAIN_MOD: 1.05,
  
  COMBAT_IMPULSE: 8.0,
  COLLISION_BOUNCE: 0.6,
  COMBAT_COOLDOWN: 500,
  
  // Legacy mappings for AI
  ACCELERATION: 15.0,
  BRAKING: 25.0,
  DRAG: 2.0,
  OFF_ROAD_DRAG: 60.0
};

export const COLORS = {
  SKY_TOP: '#0f172a',      
  SKY_BOTTOM: '#334155',   
  ASPHALT: '#1e1e1e',
  ASPHALT_WET: '#0a0a0a',
  ASPHALT_SNOW: '#e2e8f0',
  GRASS: '#14532d',
  DIRT: '#451a03',
  LANE_MARKER: '#f8fafc',
  FOG_SUNNY: '#e0f2fe',
  FOG_RAIN: '#64748b'
};

export const ASSETS = {
  // In a real app, these would be URLs to .glb files in public/
  BIKE_MODEL: '/models/sportbike.glb',
  RIDER_MODEL: '/models/rider.glb',
  POLICE_MODEL: '/models/police_bike.glb',
  ENV_TEXTURES: {
    ASPHALT_NRM: '/textures/asphalt_normal.jpg',
    ASPHALT_ROUGH: '/textures/asphalt_rough.jpg',
  }
};

export const TRAFFIC_COUNT = 20;
export const POLICE_COUNT = 3;