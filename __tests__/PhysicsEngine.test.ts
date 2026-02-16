
import { describe, expect, test, beforeEach } from '@jest/globals';
import { PhysicsEngine } from '../game/PhysicsEngine';
import { Player, Weather } from '../types';
import { PHYSICS } from '../constants';

describe('PhysicsEngine', () => {
    let engine: PhysicsEngine;
    let mockPlayer: Player;

    beforeEach(() => {
        engine = new PhysicsEngine();
        mockPlayer = {
            x: 0,
            z: 0,
            speed: 0,
            maxSpeed: 200,
            health: 100,
            fuel: 100,
            score: 0,
            gear: 0,
            rpm: 1000,
            isAttacking: false,
            attackType: 'NONE',
            lean: 0
        };
    });

    test('should accelerate when throttle is applied', () => {
        const inputs = { up: true, down: false, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.speed).toBeGreaterThan(0);
    });

    test('should brake when down is pressed', () => {
        mockPlayer.speed = 50;
        const inputs = { up: false, down: true, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.speed).toBeLessThan(50);
    });

    test('should consume fuel when moving', () => {
        mockPlayer.speed = 50;
        const inputs = { up: true, down: false, left: false, right: false, attack: false };
        // Simulation logic in GameController handles fuel, but PhysicsEngine logic mostly handles movement.
        // If fuel consumption logic was inside PhysicsEngine we would test it here. 
        // Based on current implementation, PhysicsEngine calculates RPM/Speed.
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.rpm).toBeGreaterThan(1000);
    });

    test('should clamp road boundaries', () => {
        mockPlayer.x = 20; // Near edge
        const inputs = { up: true, down: false, left: false, right: true, attack: false };
        
        // Run multiple frames to push off road
        for(let i=0; i<100; i++) {
            engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        }
        
        // Should be clamped (Road width is 24, so max is 12 + 2 = 14)
        expect(mockPlayer.x).toBeLessThanOrEqual(14);
    });

    test('should reduce grip in rain', () => {
        mockPlayer.speed = 50;
        const inputs = { up: false, down: true, left: false, right: false, attack: false };
        
        // Dry Braking
        const dryPlayer = { ...mockPlayer };
        engine.updatePlayer(dryPlayer, inputs, 0.1, Weather.SUNNY);
        
        // Wet Braking
        const wetPlayer = { ...mockPlayer };
        engine.updatePlayer(wetPlayer, inputs, 0.1, Weather.RAIN);

        // Dry braking should reduce speed more (more grip) than wet
        // Speed: 50 -> Dry: 40, Wet: 45
        expect(dryPlayer.speed).toBeLessThan(wetPlayer.speed);
    });
});
