
import { PHYSICS, ROAD_WIDTH } from '../constants';
import { Player, Weather } from '../types';

export class PhysicsEngine {
  
  private interpolateTorque(rpm: number): number {
    const curve = PHYSICS.TORQUE_CURVE;
    const stepSize = PHYSICS.MAX_RPM / (curve.length - 1);
    const index = Math.min(Math.floor(rpm / stepSize), curve.length - 2);
    const t = (rpm % stepSize) / stepSize;
    const t1 = curve[index];
    const t2 = curve[index + 1];
    return t1 + (t2 - t1) * t;
  }

  updatePlayer(player: Player, inputs: any, dt: number, weather: Weather) {
    // 1. Weather Physics Modifiers
    let grip = PHYSICS.GRIP_SUNNY;
    let dragMod = 1.0;

    if (weather === Weather.RAIN) {
        grip = PHYSICS.GRIP_RAIN;
        dragMod = PHYSICS.DRAG_RAIN_MOD;
    } else if (weather === Weather.SNOW) {
        grip = PHYSICS.GRIP_SNOW;
        dragMod = 1.1; // Thicker air/snow resistance
    }

    // --- ENGINE & TRANSMISSION ---
    const gearRatio = PHYSICS.GEAR_RATIOS[Math.min(player.gear, PHYSICS.GEAR_RATIOS.length - 1)];
    let targetRPM = (player.speed * gearRatio * PHYSICS.FINAL_DRIVE * 60) / (2 * Math.PI * 0.3);
    targetRPM = Math.max(PHYSICS.IDLE_RPM, targetRPM);

    // Auto-shifting
    if (targetRPM > PHYSICS.MAX_RPM * 0.96 && player.gear < 5) {
        player.gear++;
        targetRPM /= 1.3; 
    } else if (targetRPM < PHYSICS.IDLE_RPM * 1.5 && player.gear > 0) {
        player.gear--;
        targetRPM *= 1.3; 
    }
    player.rpm = Math.min(PHYSICS.MAX_RPM, targetRPM);

    // --- FORCES ---
    let force = 0;

    // Throttle
    if (inputs.up) {
        const torque = this.interpolateTorque(player.rpm);
        const engineForce = (torque * gearRatio * PHYSICS.FINAL_DRIVE) / 0.3;
        // Traction control simulation: excess power slips on low grip
        const maxTraction = PHYSICS.MASS * 9.81 * grip * 0.8; 
        force += Math.min(engineForce, maxTraction); 
    } else {
        force -= PHYSICS.ENGINE_BRAKING * gearRatio;
    }

    // Braking (ABS logic simulated by clamping)
    if (inputs.down) {
        const maxBraking = PHYSICS.BRAKING_POWER * grip;
        force -= maxBraking; 
    }

    // Aerodynamic Drag
    const airDrag = 0.5 * 1.2 * (player.speed * player.speed) * PHYSICS.DRAG_COEFF * PHYSICS.FRONTAL_AREA * dragMod;
    force -= airDrag;

    // Rolling Resistance
    force -= PHYSICS.ROLLING_RESISTANCE * PHYSICS.MASS * 9.81;

    // Off-road penalty
    if (Math.abs(player.x) > ROAD_WIDTH / 2 - 1) {
      force -= 5000 * (1/grip); // Worse offroad in rain/snow
    }

    // --- INTEGRATION ---
    const acceleration = force / PHYSICS.MASS;
    player.speed += acceleration * dt;
    player.speed = Math.max(0, player.speed);

    // --- STEERING ---
    let steerInput = 0;
    // FIXED: Left is negative X, Right is positive X in Three.js default coordinate system logic for this camera setup
    if (inputs.left) steerInput = -1; 
    if (inputs.right) steerInput = 1;

    const stabilityFactor = Math.min(1.0, player.speed / 25.0); 
    const agility = 1.0 - (stabilityFactor * 0.4); 

    // Grip affects turning radius
    const lateralVel = steerInput * PHYSICS.LATERAL_SPEED * agility * grip;
    
    // Slip effect at high speed/low grip
    let slip = 0;
    if (Math.abs(steerInput) > 0 && player.speed > 50) {
         slip = (1 - grip) * (Math.random() - 0.5) * 0.5;
    }

    player.x += (lateralVel + slip) * dt;
    player.x = Math.max(-ROAD_WIDTH/2 - 3, Math.min(ROAD_WIDTH/2 + 3, player.x));
    player.z -= player.speed * dt;

    // Lean Calculation
    // Negative lean for right turn (visual preference)
    const targetLean = -steerInput * PHYSICS.MAX_LEAN * (0.6 + stabilityFactor * 0.4);
    const currentLean = player.lean || 0;
    // Slower lean in slippery conditions (caution)
    const leanSpeed = 8.0 * grip; 
    player.lean = currentLean + (targetLean - currentLean) * leanSpeed * dt;
    
    const wobble = (player.speed > 75) ? (Math.random() - 0.5) * 0.03 : 0;

    return { lean: player.lean, wobble };
  }

  resolveCollision(entityA: any, entityB: any) {
    const dx = entityA.x - entityB.x;
    const dz = entityA.z - entityB.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const minDist = 1.0; 

    if (dist < minDist) {
      const force = (minDist - dist) * PHYSICS.COLLISION_BOUNCE;
      const nx = dx / dist;
      
      entityA.x += nx * force;
      entityB.x -= nx * force;
      entityA.speed *= 0.98;
      
      return true;
    }
    return false;
  }
}
