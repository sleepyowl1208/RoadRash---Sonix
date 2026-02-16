
import { Rival } from '../types';
import { PHYSICS, ROAD_WIDTH } from '../constants';
import * as THREE from 'three';

type PoliceState = 'FOLLOW' | 'CLOSE_DISTANCE' | 'BLOCK' | 'RAM' | 'RESET';

export class PoliceAI {
  update(rival: Rival, playerZ: number, playerX: number, playerSpeed: number, dt: number) {
    const distanceZ = rival.z - playerZ; // +ve means behind, -ve means ahead
    
    if (!rival.aiState) rival.aiState = 'FOLLOW';
    let state = rival.aiState as PoliceState;

    // 1. RUBBER BANDING SPEED CONTROL
    // If police is behind, they are faster than player. If ahead, they slow down to block.
    let targetSpeed = playerSpeed;

    if (distanceZ > 20) {
        // Far behind -> Super boost
        targetSpeed = playerSpeed * 1.3 + 10; 
    } else if (distanceZ < -10) {
        // Ahead -> Slow down to block
        targetSpeed = playerSpeed * 0.8;
    } else {
        // Combat Zone -> Match speed + slight advantage
        targetSpeed = playerSpeed + 5;
    }

    // Apply speed smoothing
    rival.speed += (targetSpeed - rival.speed) * 2.0 * dt;
    rival.speed = Math.min(rival.speed, PHYSICS.MAX_SPEED * 1.5); // Cap absolute max

    // 2. STATE MACHINE
    switch (state) {
        case 'FOLLOW':
            if (distanceZ < 40) rival.aiState = 'CLOSE_DISTANCE';
            // Lane matching from distance
            this.smoothSteer(rival, playerX, dt * 1.5);
            break;

        case 'CLOSE_DISTANCE':
            // Get right up to the player
            this.smoothSteer(rival, playerX, dt * 3.0); 
            if (Math.abs(distanceZ) < 5) rival.aiState = 'RAM';
            if (distanceZ < -5) rival.aiState = 'BLOCK'; // Overshot, now block
            break;

        case 'RAM':
            // Aggressive side swipe
            const xDiff = playerX - rival.x;
            if (Math.abs(xDiff) < 3.0) {
                rival.dx += (xDiff > 0 ? 1 : -1) * 15.0 * dt; // Violent impulse
            }
            // If failed and fell behind
            if (distanceZ > 10) rival.aiState = 'FOLLOW';
            break;

        case 'BLOCK':
            // Stay in front of player
            const blockX = playerX; 
            this.smoothSteer(rival, blockX, dt * 4.0); // Responsive steering
            
            // If player passes
            if (distanceZ > 5) rival.aiState = 'RAM';
            break;
    }

    // 3. PHYSICS & BOUNDARIES
    rival.x += rival.dx * dt;
    // Friction on lateral movement
    rival.dx *= 0.9; 

    // Clamp Road
    if (rival.x < -ROAD_WIDTH/2) { rival.x = -ROAD_WIDTH/2; rival.dx = 0; }
    if (rival.x > ROAD_WIDTH/2) { rival.x = ROAD_WIDTH/2; rival.dx = 0; }
    
    // Move Z
    rival.z -= rival.speed * dt;

    // 4. VISUALS (Fix Lying Down Bug)
    // Clamp visual lean to ~45 degrees (0.8 radians)
    const maxLean = 0.8;
    const targetLean = -rival.dx * 0.5; // Reduced sensitivity
    rival.lean = THREE.MathUtils.clamp(targetLean, -maxLean, maxLean);

    // 5. RESPAWN IF LOST
    if (distanceZ > 400) {
         rival.z = playerZ + 100; // Teleport behind
         rival.x = -playerX; // Opposite side
         rival.speed = playerSpeed * 1.5;
         rival.aiState = 'FOLLOW';
    }
  }

  private smoothSteer(rival: Rival, targetX: number, agility: number) {
     const diff = targetX - rival.x;
     // Add velocity towards target
     rival.dx += diff * agility * 0.1;
  }
}
