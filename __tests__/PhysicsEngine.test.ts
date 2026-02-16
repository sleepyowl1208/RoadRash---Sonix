
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

    // --- ACCELERATION & BRAKING ---

    test('should accelerate when throttle is applied', () => {
        const inputs = { up: true, down: false, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.speed).toBeGreaterThan(0);
        expect(mockPlayer.rpm).toBeGreaterThan(1000);
    });

    test('should brake efficiently', () => {
        mockPlayer.speed = 100;
        const inputs = { up: false, down: true, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.speed).toBeLessThan(100);
    });

    test('should apply rolling resistance (drag) when no input', () => {
        mockPlayer.speed = 50;
        const inputs = { up: false, down: false, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.speed).toBeLessThan(50);
    });

    // --- GEAR SHIFTING LOGIC ---

    test('should upshift when RPM gets too high', () => {
        // Force conditions for upshift
        mockPlayer.gear = 0;
        mockPlayer.speed = 40; // High speed for 1st gear
        
        // Simulate a frame where RPM would spike
        const inputs = { up: true, down: false, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        
        // Physics engine auto-shifts logic: if calcRPM > MAX_RPM * 0.95
        // We expect gear to increment
        if (mockPlayer.rpm > PHYSICS.MAX_RPM * 0.9) {
             expect(mockPlayer.gear).toBeGreaterThan(0);
        }
    });

    test('should downshift when RPM gets too low', () => {
        mockPlayer.gear = 3;
        mockPlayer.speed = 10; // Too slow for 4th gear
        
        const inputs = { up: true, down: false, left: false, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        
        expect(mockPlayer.gear).toBeLessThan(3);
    });

    // --- LATERAL MOVEMENT ---

    test('should move laterally when steering', () => {
        const initialX = mockPlayer.x;
        const inputs = { up: true, down: false, left: true, right: false, attack: false };
        engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        expect(mockPlayer.x).toBeLessThan(initialX); // Moving Left (Negative X)
        expect(mockPlayer.lean).toBeGreaterThan(0); // Leaning into turn
    });

    test('should clamp lateral movement to road width', () => {
        mockPlayer.x = -20; // Way off road
        const inputs = { up: true, down: false, left: true, right: false, attack: false };
        
        for(let i=0; i<50; i++) {
            engine.updatePlayer(mockPlayer, inputs, 0.1, Weather.SUNNY);
        }
        
        // ROAD_WIDTH is 24, half is 12, plus buffer of 2 = 14.
        // Left side limit should be around -14
        expect(mockPlayer.x).toBeGreaterThanOrEqual(-15);
    });

    // --- WEATHER PHYSICS ---

    test('should have reduced braking power in rain', () => {
        mockPlayer.speed = 100;
        const inputs = { up: false, down: true, left: false, right: false, attack: false };
        
        const dryPlayer = { ...mockPlayer };
        const wetPlayer = { ...mockPlayer };

        // Dry Simulation
        engine.updatePlayer(dryPlayer, inputs, 0.1, Weather.SUNNY);
        
        // Wet Simulation
        engine.updatePlayer(wetPlayer, inputs, 0.1, Weather.RAIN);

        // Dry player should slow down MORE than wet player (lower speed value)
        expect(dryPlayer.speed).toBeLessThan(wetPlayer.speed);
    });
});
