
import { Rival } from '../types';
import { PHYSICS, ROAD_WIDTH } from '../constants';

type PoliceState = 'FOLLOW' | 'CLOSE_DISTANCE' | 'INTERCEPT' | 'SIDE_PRESSURE' | 'RESET';

export class PoliceAI {
  update(rival: Rival, playerZ: number, playerX: number, playerSpeed: number, dt: number) {
    const distanceZ = rival.z - playerZ; // Positive if behind (remember moving negative Z)
    // Actually in our coord system, player moves negative Z. So if rival.z > player.z, rival is BEHIND (closer to 0).
    // Let's normalize: Dist = rival.z - player.z.
    // If player is at -100, rival at -50. Dist = 50. Rival is behind.
    
    if (!rival.aiState) rival.aiState = 'FOLLOW';
    const state = rival.aiState as PoliceState;

    switch (state) {
        case 'FOLLOW':
            // Maintain distance 40-60 units behind
            const targetDist = 50;
            if (distanceZ > targetDist + 10) {
                 // Too far back, speed up
                 rival.speed += PHYSICS.ACCELERATION * dt;
            } else if (distanceZ < targetDist - 10) {
                 rival.speed -= PHYSICS.BRAKING * dt * 0.5;
            } else {
                 // Match speed roughly
                 rival.speed += (playerSpeed - rival.speed) * dt;
                 // Transition to attack randomly
                 if (Math.random() < 0.005) rival.aiState = 'CLOSE_DISTANCE';
            }
            // Match lane loosely
            this.smoothSteer(rival, playerX, dt * 0.5);
            break;

        case 'CLOSE_DISTANCE':
            // Accelerate to overtake/catch
            rival.speed = Math.min(PHYSICS.MAX_SPEED * 1.1, rival.speed + PHYSICS.ACCELERATION * dt);
            this.smoothSteer(rival, playerX, dt * 2.0); // Align with player

            // If close enough, switch to intercept
            if (distanceZ < 5 && distanceZ > -5) {
                rival.aiState = 'SIDE_PRESSURE';
            }
            break;

        case 'SIDE_PRESSURE':
            // Match speed exactly
            rival.speed += (playerSpeed - rival.speed) * 5.0 * dt;
            
            // Move towards player X to ram
            const xDir = playerX - rival.x;
            const ramSpeed = 3.0;
            rival.dx = (xDir > 0 ? 1 : -1) * ramSpeed;
            rival.x += rival.dx * dt;
            
            // If player pulls away or falls behind, reset
            if (Math.abs(distanceZ) > 15) rival.aiState = 'FOLLOW';
            break;

        case 'RESET':
            // Fall back
            rival.speed = playerSpeed * 0.8;
            if (distanceZ > 60) rival.aiState = 'FOLLOW';
            break;
    }

    // Clamp road
    rival.x = Math.max(-ROAD_WIDTH/2, Math.min(ROAD_WIDTH/2, rival.x));
    
    // Move Z
    rival.z -= rival.speed * dt;

    // Reset if too far ahead (glitch prevention) or way too far behind
    if (distanceZ > 150) {
         rival.z = playerZ + 80;
         rival.x = (Math.random() - 0.5) * ROAD_WIDTH;
         rival.speed = playerSpeed * 1.2;
         rival.aiState = 'CLOSE_DISTANCE';
    }
  }

  private smoothSteer(rival: Rival, targetX: number, agility: number) {
     rival.x += (targetX - rival.x) * agility;
     // Calculate DX for lean visual
     rival.dx = (targetX - rival.x) * agility * 10;
  }
}
