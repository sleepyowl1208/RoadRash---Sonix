
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { PoliceAI } from '../game/PoliceAI';
import { Rival } from '../types';

// Mock THREE.MathUtils inside the test file since we might run in a Node env without full Three.js context
jest.mock('three', () => ({
  MathUtils: {
    clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(val, max)),
    damp: (current: number, target: number, lambda: number, dt: number) => {
        const t = 1 - Math.exp(-lambda * dt);
        return current + (target - current) * t;
    }
  }
}));

describe('PoliceAI', () => {
    let ai: PoliceAI;
    let mockPolice: Rival;

    beforeEach(() => {
        ai = new PoliceAI();
        mockPolice = {
            id: 'cop1',
            name: 'Police',
            x: 0,
            z: 0,
            speed: 50,
            dx: 0,
            type: 'POLICE',
            state: 'CHASING',
            aiState: 'FOLLOW',
            health: 100,
            personality: 'Aggressive',
            color: 0xffffff,
            lean: 0
        };
    });

    test('should rubber-band (speed up) when far behind player', () => {
        const playerZ = -100; // Player is at -100
        mockPolice.z = 0; // Police is at 0 (100 units behind)
        mockPolice.speed = 50;
        const playerSpeed = 80;

        ai.update(mockPolice, playerZ, 0, playerSpeed, 0.1);

        // Police should accelerate significantly to catch up
        expect(mockPolice.speed).toBeGreaterThan(80);
    });

    test('should slow down when ahead of player (Blocking behavior)', () => {
        const playerZ = 0;
        mockPolice.z = -50; // Police is 50 units ahead (negative Z is forward)
        const playerSpeed = 80;
        mockPolice.speed = 100;

        ai.update(mockPolice, playerZ, 0, playerSpeed, 0.1);

        // Should slow down to block
        expect(mockPolice.speed).toBeLessThan(100);
    });

    test('should transition to CLOSE_DISTANCE when near player', () => {
        mockPolice.aiState = 'FOLLOW';
        const playerZ = -100;
        mockPolice.z = -70; // 30 units behind
        
        ai.update(mockPolice, playerZ, 0, 50, 0.1);
        
        expect(mockPolice.aiState).toBe('CLOSE_DISTANCE');
    });

    test('should transition to RAM when very close', () => {
        mockPolice.aiState = 'CLOSE_DISTANCE';
        const playerZ = -100;
        mockPolice.z = -98; // 2 units difference
        
        ai.update(mockPolice, playerZ, 0, 50, 0.1);
        
        expect(mockPolice.aiState).toBe('RAM');
    });

    test('should steer towards player', () => {
        const playerX = 5;
        mockPolice.x = 0;
        mockPolice.dx = 0;

        ai.update(mockPolice, 0, playerX, 50, 0.1);

        // Should have positive horizontal velocity (moving right towards player)
        expect(mockPolice.dx).toBeGreaterThan(0);
    });

    test('should respawn/reset if left too far behind', () => {
        const playerZ = -1000;
        mockPolice.z = 0; // 1000 units behind
        
        ai.update(mockPolice, playerZ, 0, 80, 0.1);

        // Should teleport near player
        expect(mockPolice.z).toBeLessThan(-900);
    });
});
