
import { PHYSICS, ROAD_WIDTH } from '../constants';
import { Player, Weather } from '../types';

export class PhysicsEngine {
  
  // Linear interpolation for torque to create smooth power delivery
  private getTorque(rpm: number): number {
    const curve = PHYSICS.TORQUE_CURVE;
    const step = PHYSICS.MAX_RPM / (curve.length - 1);
    const idx = Math.min(Math.floor(rpm / step), curve.length - 2);
    const t = (rpm % step) / step;
    return curve[idx] + (curve[idx + 1] - curve[idx]) * t;
  }

  updatePlayer(player: Player, inputs: any, dt: number, weather: Weather) {
    // 1. Grip & Drag Modifiers
    let grip = weather === Weather.RAIN ? 0.7 : 1.0;
    
    // 2. Engine Logic (Uniform Acceleration focus)
    // We smooth the RPM change to prevent jerky sounds/movements
    const gearRatio = PHYSICS.GEAR_RATIOS[player.gear] || 1.0;
    
    // Throttle Input
    let driveForce = 0;
    if (inputs.up && player.fuel > 0) {
        const torque = this.getTorque(player.rpm);
        // F = (Torque * Gear * Final) / Radius
        driveForce = (torque * gearRatio * PHYSICS.FINAL_DRIVE) / 0.3; 
    } else {
        // Engine Braking
        driveForce = -PHYSICS.ENGINE_BRAKING * gearRatio * 2;
    }

    // Braking
    if (inputs.down) {
        driveForce -= PHYSICS.BRAKING_POWER * grip;
    }

    // Aerodynamic Drag (Quadratic)
    const drag = 0.5 * 1.225 * PHYSICS.DRAG_COEFF * PHYSICS.FRONTAL_AREA * (player.speed * player.speed);
    
    // Net Force
    const netForce = driveForce - drag - (PHYSICS.ROLLING_RESISTANCE * PHYSICS.MASS * 9.8);
    const acceleration = netForce / PHYSICS.MASS;

    // Apply Velocity
    player.speed += acceleration * dt;
    player.speed = Math.max(0, Math.min(player.speed, PHYSICS.MAX_SPEED));

    // RPM Calculation (Tied to speed for simulation)
    const speedPerRPM = (0.3 * 2 * Math.PI) / (gearRatio * PHYSICS.FINAL_DRIVE * 60);
    // Calculated RPM based on wheel speed
    let calculatedRPM = (player.speed / speedPerRPM);
    
    // Clutch/Transmission Logic (Auto-shift for smoothness)
    // Uniform acceleration requires smooth shifting
    if (calculatedRPM > PHYSICS.MAX_RPM * 0.95 && player.gear < PHYSICS.GEAR_RATIOS.length - 1) {
        player.gear++;
        calculatedRPM *= (PHYSICS.GEAR_RATIOS[player.gear] / PHYSICS.GEAR_RATIOS[player.gear-1]);
    } else if (calculatedRPM < PHYSICS.IDLE_RPM * 1.5 && player.gear > 0) {
        player.gear--;
        calculatedRPM /= (PHYSICS.GEAR_RATIOS[player.gear] / PHYSICS.GEAR_RATIOS[player.gear+1]);
    }
    
    // Smooth RPM display
    player.rpm += (Math.max(PHYSICS.IDLE_RPM, calculatedRPM) - player.rpm) * 10 * dt;

    // 3. Steering (Responsive but Weighted)
    let steer = 0;
    if (inputs.left) steer = -1;
    if (inputs.right) steer = 1;

    // Speed Factor: Harder to turn at high speed, but we want it responsive
    // A curve that maintains authority but adds inertia
    const speedFactor = Math.min(1.0, player.speed / 10.0); // 0 to 1 based on speed
    
    const targetDx = steer * PHYSICS.LATERAL_SPEED * grip;
    
    // Move x towards target velocity (Inertia)
    // Higher value = snappier handling
    const handling = 4.0; 
    
    // Current lateral move check
    let currentDx = 0; // We don't track dx in player struct explicitly for persistent inertia, 
                       // but we can approximate "change in X" intent
    
    const moveX = targetDx * speedFactor * dt;
    player.x += moveX;
    
    // Clamp Road
    player.x = Math.max(-ROAD_WIDTH/2 - 2, Math.min(ROAD_WIDTH/2 + 2, player.x));
    player.z -= player.speed * dt;

    // 4. Lean Visuals (Smoothed)
    const targetLean = -steer * PHYSICS.MAX_LEAN * speedFactor;
    player.lean += (targetLean - player.lean) * 8.0 * dt;

    return { lean: player.lean, wobble: 0 };
  }
}
