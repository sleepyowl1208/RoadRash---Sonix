
import { PHYSICS, ROAD_WIDTH } from '../constants';
import { Player, Weather } from '../types';

export class PhysicsEngine {
  
  private interpolateTorque(rpm: number): number {
    // Normalize RPM to curve indices
    const curve = PHYSICS.TORQUE_CURVE;
    const stepSize = PHYSICS.MAX_RPM / (curve.length - 1);
    const index = Math.min(Math.floor(rpm / stepSize), curve.length - 2);
    const t = (rpm % stepSize) / stepSize;
    
    // Linear Interpolation
    const t1 = curve[index];
    const t2 = curve[index + 1];
    return t1 + (t2 - t1) * t;
  }

  updatePlayer(player: Player, inputs: any, dt: number, weather: Weather) {
    const grip = weather === Weather.RAIN ? PHYSICS.GRIP_WET_MULTIPLIER : 1.0;

    // --- 1. ENGINE & TRANSMISSION ---
    // Calculate RPM based on current speed and gear
    // speed (m/s) -> wheel rotation -> gearbox -> engine rpm
    // Simplified: RPM = Speed * GearFactor
    const gearRatio = PHYSICS.GEAR_RATIOS[Math.min(player.gear, PHYSICS.GEAR_RATIOS.length - 1)];
    
    // Calculate Theoretical RPM at this speed
    let targetRPM = (player.speed * gearRatio * PHYSICS.FINAL_DRIVE * 60) / (2 * Math.PI * 0.3); // 0.3m wheel radius
    targetRPM = Math.max(PHYSICS.IDLE_RPM, targetRPM);

    // Auto-shifting (Simple)
    if (targetRPM > PHYSICS.MAX_RPM * 0.95 && player.gear < 5) {
        player.gear++;
        targetRPM /= 1.3; // Drop RPM
    } else if (targetRPM < PHYSICS.IDLE_RPM * 1.5 && player.gear > 0) {
        player.gear--;
        targetRPM *= 1.3; // Spike RPM
    }
    
    player.rpm = Math.min(PHYSICS.MAX_RPM, targetRPM);

    // --- 2. FORCES ---
    let force = 0;

    // A. Engine Power (Throttle)
    if (inputs.up) {
        const torque = this.interpolateTorque(player.rpm);
        // Force = Torque / WheelRadius * GearRatio * Efficiency
        const engineForce = (torque * gearRatio * PHYSICS.FINAL_DRIVE) / 0.3;
        force += engineForce * grip; // Loss of traction
    } else {
        // Engine Braking
        force -= PHYSICS.ENGINE_BRAKING * gearRatio;
    }

    // B. Braking
    if (inputs.down) {
        // Non-linear brake curve (initial bite -> max power)
        force -= PHYSICS.BRAKING_POWER * grip; 
    }

    // C. Aerodynamic Drag (Quadratic: Fd = 0.5 * rho * v^2 * Cd * A)
    // Air density rho approx 1.2 kg/m^3
    const airDrag = 0.5 * 1.2 * (player.speed * player.speed) * PHYSICS.DRAG_COEFF * PHYSICS.FRONTAL_AREA;
    force -= airDrag;

    // D. Rolling Resistance
    force -= PHYSICS.ROLLING_RESISTANCE * PHYSICS.MASS * 9.81;

    // E. Off-road penalty
    if (Math.abs(player.x) > ROAD_WIDTH / 2 - 1) {
      force -= 5000; // Massive bogging down
    }

    // --- 3. INTEGRATION (F=ma) ---
    const acceleration = force / PHYSICS.MASS;
    player.speed += acceleration * dt;
    player.speed = Math.max(0, player.speed); // No reverse

    // --- 4. STEERING PHYSICS (Counter-steering) ---
    let steerInput = 0;
    if (inputs.left) steerInput = 1;
    if (inputs.right) steerInput = -1;

    // Stability increases with speed (Gyroscopic effect)
    // Hard to turn at high speed, twitchy at low speed
    const stabilityFactor = Math.min(1.0, player.speed / 20.0); 
    const agility = 1.0 - (stabilityFactor * 0.5); // Becomes 0.5 at high speed

    const lateralVel = steerInput * PHYSICS.LATERAL_SPEED * agility * grip;
    player.x += lateralVel * dt;
    
    // Clamp Road
    player.x = Math.max(-ROAD_WIDTH/2 - 3, Math.min(ROAD_WIDTH/2 + 3, player.x));

    // Update Distance
    player.z -= player.speed * dt;

    // Lean Angle Calculation for rendering
    // Lean = atan(v^2 / (r * g)) simplified
    const targetLean = steerInput * PHYSICS.MAX_LEAN * (0.5 + stabilityFactor * 0.5);
    
    // Smooth lean transition
    const currentLean = (player as any).lean || 0;
    const newLean = currentLean + (targetLean - currentLean) * 8.0 * dt;
    
    // High speed wobble
    const wobble = (player.speed > 70) ? (Math.random() - 0.5) * 0.05 : 0;

    return { lean: newLean, wobble };
  }

  resolveCollision(entityA: any, entityB: any) {
    const dx = entityA.x - entityB.x;
    const dz = entityA.z - entityB.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const minDist = 1.0; 

    if (dist < minDist) {
      const force = (minDist - dist) * 0.8; // Stiffer bounce
      const nx = dx / dist;
      
      entityA.x += nx * force;
      entityB.x -= nx * force;
      
      // Momentum loss
      entityA.speed *= 0.95;
      
      return true;
    }
    return false;
  }
}
