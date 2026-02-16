
"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Player, Rival, GameState, Commentary, Weather } from '../types';
import { CAMERA_HEIGHT, CAMERA_DEPTH, PHYSICS, ROAD_WIDTH } from '../constants';
import { PhysicsEngine } from '../game/PhysicsEngine';
import { PoliceAI } from '../game/PoliceAI';
import { AudioManager } from '../game/AudioManager';
import { EnvironmentManager } from '../game/EnvironmentManager';

// Procedural Mesh Factories (Lightweight)
const createBikeMesh = (color: number, isPolice: boolean) => {
    const group = new THREE.Group();
    // Simplified Low-Poly Bike for performance
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.8), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);
    
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.2), wheelMat);
    w1.rotation.z = Math.PI/2; w1.position.set(0,0.35,0.7); group.add(w1);
    const w2 = w1.clone(); w2.position.set(0,0.35,-0.7); group.add(w2);
    
    const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rider.position.set(0, 1.0, -0.2);
    rider.rotation.x = -0.5;
    group.add(rider);

    if(isPolice) {
        const sirenL = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.1,0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        sirenL.position.set(-0.2, 0.9, -0.6); sirenL.name = "sirenR"; group.add(sirenL);
        const sirenR = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.1,0.1), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        sirenR.position.set(0.2, 0.9, -0.6); sirenR.name = "sirenB"; group.add(sirenR);
    }
    return group;
};

interface GameSceneProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setCommentary: (c: Commentary) => void;
  setPlayerStats: (p: Player) => void;
  rivals: Rival[];
  setRivals: React.Dispatch<React.SetStateAction<Rival[]>>;
  setEndGameSummary: (s: string) => void;
}

const GameScene: React.FC<GameSceneProps> = ({ 
    gameState, setGameState, setPlayerStats, rivals, setCommentary 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Logic Refs
  const physicsRef = useRef<PhysicsEngine>(new PhysicsEngine());
  const aiRef = useRef<PoliceAI>(new PoliceAI());
  const audioRef = useRef<AudioManager | null>(null);
  const isMounted = useRef(true);
  
  // Game State Refs (Mutable for loop)
  const playerRef = useRef<Player>({ 
      x: 0, z: 0, speed: 0, maxSpeed: PHYSICS.MAX_SPEED, 
      health: 100, score: 0, gear: 0, rpm: 1500, isAttacking: false, attackType: 'NONE' 
  });
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  const weatherRef = useRef<Weather>(Weather.SUNNY);
  
  // Three JS Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const rivalsMeshMap = useRef<Map<string, THREE.Group>>(new Map());
  const envRef = useRef<EnvironmentManager | null>(null);

  // Input Handling
  useEffect(() => {
    const onKD = (e: KeyboardEvent) => {
        if(e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = true;
        if(e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = true;
        if(e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = true;
        if(e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = true;
    };
    const onKU = (e: KeyboardEvent) => {
        if(e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = false;
        if(e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = false;
        if(e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = false;
        if(e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = false;
    };
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    return () => {
        window.removeEventListener('keydown', onKD);
        window.removeEventListener('keyup', onKU);
    }
  }, []);

  // Init Engine
  useEffect(() => {
    if (!mountRef.current) return;
    isMounted.current = true;

    // 1. Setup Scene
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Managers
    const env = new EnvironmentManager(scene);
    envRef.current = env;
    
    // Audio - Initialize safely
    try {
        if (!audioRef.current) {
            audioRef.current = new AudioManager();
        }
    } catch(e) {
        console.error("Audio init failed", e);
    }

    // 3. Player
    const pMesh = createBikeMesh(0xe74c3c, false);
    scene.add(pMesh);
    playerMeshRef.current = pMesh;

    // 4. Rivals (Pool)
    // Clear existing meshes if re-running
    rivalsMeshMap.current.forEach(mesh => scene.remove(mesh));
    rivalsMeshMap.current.clear();

    rivals.forEach(r => {
        const rMesh = createBikeMesh(r.color, r.name === 'Police');
        // Spawn BEHIND
        r.z = 50; 
        rMesh.position.set(r.x, 0, r.z);
        scene.add(rMesh);
        rivalsMeshMap.current.set(r.id, rMesh);
    });

    // 5. Traffic (Instanced)
    const trafficCount = 20;
    const trafficGeo = new THREE.BoxGeometry(1.5, 1.2, 3.5);
    const trafficMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const trafficMesh = new THREE.InstancedMesh(trafficGeo, trafficMat, trafficCount);
    const trafficData = new Float32Array(trafficCount * 4); // x, z, speed, active
    for(let i=0; i<trafficCount; i++) {
        const dummy = new THREE.Object3D();
        dummy.position.set((Math.random()-0.5)*ROAD_WIDTH, 0.6, -Math.random()*1000);
        dummy.updateMatrix();
        trafficMesh.setMatrixAt(i, dummy.matrix);
        trafficData[i*4] = dummy.position.x;
        trafficData[i*4+1] = dummy.position.z;
        trafficData[i*4+2] = 20 + Math.random() * 20; // Slower speed
    }
    scene.add(trafficMesh);

    // --- GAME LOOP ---
    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
        if (!isMounted.current) return;

        const dt = Math.min(clock.getDelta(), 0.1);
        const time = clock.getElapsedTime();

        if (gameState === GameState.RACING) {
            // A. Physics
            const p = playerRef.current;
            const physRes = physicsRef.current.updatePlayer(p, inputRef.current, dt, weatherRef.current);
            (p as any).lean = physRes.lean; // Store lean state

            // B. Environment
            env.update(p.z, weatherRef.current === Weather.RAIN);

            // C. Player Visuals
            if (playerMeshRef.current) {
                playerMeshRef.current.position.set(p.x, 0, p.z);
                playerMeshRef.current.rotation.z = physRes.lean + physRes.wobble;
                playerMeshRef.current.position.y = Math.sin(time*30)*0.01; // Engine vibe
            }

            // D. Camera
            // Smooth follow
            const targetZ = p.z + CAMERA_DEPTH + (p.speed * 0.05); // Pull back speed
            camera.position.z += (targetZ - camera.position.z) * 5.0 * dt;
            camera.position.x += (p.x * 0.8 - camera.position.x) * 3.0 * dt;
            camera.position.y = CAMERA_HEIGHT + Math.sin(time * 10) * 0.02; // Vertical bob
            
            // Shake
            const shakeAmt = (p.speed / PHYSICS.MAX_SPEED) * 0.02;
            camera.position.x += (Math.random()-0.5)*shakeAmt;
            camera.position.y += (Math.random()-0.5)*shakeAmt;
            
            camera.lookAt(p.x * 0.3, 1.0, p.z - 20);

            // E. Rivals / Police AI
            let nearestSirenDist = 999;
            rivals.forEach(r => {
                const mesh = rivalsMeshMap.current.get(r.id);
                if (mesh) {
                    if (r.name === 'Police') {
                        // Police AI logic
                        aiRef.current.update(r, p.z, p.x, p.speed, dt);
                        
                        // Siren Lights
                        if (Math.floor(time * 8) % 2 === 0) {
                             const sR = mesh.getObjectByName('sirenR') as THREE.Mesh;
                             if(sR) (sR.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
                        } else {
                             const sR = mesh.getObjectByName('sirenR') as THREE.Mesh;
                             if(sR) (sR.material as THREE.MeshBasicMaterial).color.setHex(0x330000);
                        }

                        // Audio Distance check
                        const d = Math.abs(r.z - p.z);
                        if (d < nearestSirenDist) nearestSirenDist = d;
                    } else {
                        // Simple Racer Logic
                        r.z -= (r.speed || 50) * dt; 
                        // Keep them relevant if they fall too far behind
                        if (r.z > p.z + 100) r.z = p.z - 200;
                    }
                    
                    // Collision
                    if (Math.abs(r.z - p.z) < 2 && Math.abs(r.x - p.x) < 1) {
                        physicsRef.current.resolveCollision(p, r);
                        if(audioRef.current) audioRef.current.playCrash();
                        p.health -= 2;
                        // Shake camera hard
                        camera.position.y -= 0.2;
                    }

                    mesh.position.set(r.x, 0, r.z);
                    mesh.rotation.z = -(r.dx || 0) * 0.5; // Lean into turn
                }
            });

            // F. Traffic Update
            const dummy = new THREE.Object3D();
            for(let i=0; i<trafficCount; i++) {
                let tz = trafficData[i*4+1];
                const tx = trafficData[i*4];
                const tSpeed = trafficData[i*4+2];
                
                // Move traffic
                tz -= tSpeed * dt;
                
                // Loop around player
                if (tz > p.z + 50) tz = p.z - 600 - Math.random()*200;
                
                trafficData[i*4+1] = tz;
                
                dummy.position.set(tx, 0.6, tz);
                dummy.updateMatrix();
                trafficMesh.setMatrixAt(i, dummy.matrix);
                
                // Traffic Collision
                if (Math.abs(tz - p.z) < 3 && Math.abs(tx - p.x) < 1.5) {
                    p.health -= 10;
                    p.speed *= 0.5;
                    audioRef.current?.playCrash();
                    setCommentary({ text: "TRAFFIC COLLISION", speaker: "System", timestamp: Date.now() });
                }
            }
            trafficMesh.instanceMatrix.needsUpdate = true;

            // G. Audio Update
            if (audioRef.current) {
                audioRef.current.updateEngine(p.rpm, p.speed);
                audioRef.current.updateSiren(nearestSirenDist);
            }

            // Sync Stats
            if (Math.floor(time * 10) % 5 === 0) {
                setPlayerStats({ ...p });
            }

            if (p.health <= 0) {
                setGameState(GameState.GAME_OVER);
                audioRef.current?.stop();
            }
        }

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
    };
    animate();

    // Start Audio on first user interaction if menu handled it
    const startAudio = () => audioRef.current?.start();
    window.addEventListener('click', startAudio);

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        isMounted.current = false;
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('click', startAudio);
        cancelAnimationFrame(animId);
        if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
        try {
            renderer.dispose();
            scene.clear();
        } catch(e) { console.warn("Cleanup warning", e); }
        audioRef.current?.stop();
    };
  }, [gameState]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full bg-black" />;
};

export default GameScene;
