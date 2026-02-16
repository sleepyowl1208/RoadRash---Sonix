
"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Player, Rival, GameState, Commentary, Weather } from '../types';
import { COLORS, ROAD_WIDTH, PHYSICS, DRAW_DISTANCE, CAMERA_HEIGHT, CAMERA_DEPTH, SEGMENT_LENGTH } from '../constants';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setCommentary: (c: Commentary) => void;
  setPlayerStats: (p: Player) => void;
  rivals: Rival[];
  setRivals: React.Dispatch<React.SetStateAction<Rival[]>>;
  setEndGameSummary: (s: string) => void;
}

// --- PROCEDURAL ASSET GENERATION ---

// 1. Realistic Road Texture with Wetness support
const createRoadMaterial = (isWet: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  
  // Base Asphalt
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Noise/Gravel
  for (let i = 0; i < 200000; i++) {
    const v = Math.random() * 50;
    ctx.fillStyle = `rgba(${v+20},${v+20},${v+20},0.1)`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }

  // Cracks
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 1024, Math.random() * 1024);
      ctx.lineTo(Math.random() * 1024, Math.random() * 1024);
      ctx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 4);
  map.anisotropy = 16;

  return new THREE.MeshStandardMaterial({ 
    map: map,
    roughness: isWet ? 0.05 : 0.8, // Wet = Smooth/Reflective
    metalness: isWet ? 0.2 : 0.0,
    color: 0xffffff
  });
};

// 2. Articulated Biker Model (For Animation)
const createArticulatedBiker = (color: number, isPolice: boolean) => {
    const group = new THREE.Group();
    
    // -- Bike Body --
    const bikeGroup = new THREE.Group();
    
    // Main Body (Fairing)
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.6, 1.6);
    // Taper the front
    const positionAttribute = bodyGeo.attributes.position;
    for ( let i = 0; i < positionAttribute.count; i ++ ) {
        const z = positionAttribute.getZ( i );
        if ( z > 0.5 ) {
             const x = positionAttribute.getX(i);
             // Pinch front x
             positionAttribute.setX( i, x * 0.5 );
             // Lower front y
             const y = positionAttribute.getY(i);
             positionAttribute.setY( i, y * 0.8 );
        }
    }
    bodyGeo.computeVertexNormals();

    const paintMat = new THREE.MeshStandardMaterial({ 
        color: isPolice ? 0xffffff : color, 
        roughness: 0.2, 
        metalness: 0.6,
        envMapIntensity: 1.5
    });
    
    const body = new THREE.Mesh(bodyGeo, paintMat);
    body.position.y = 0.5;
    body.castShadow = true;
    bikeGroup.add(body);

    if (isPolice) {
        const stripeGeo = new THREE.BoxGeometry(0.62, 0.4, 0.8);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 0.5, 0);
        bikeGroup.add(stripe);

        // Siren Lights
        const barGeo = new THREE.BoxGeometry(0.5, 0.1, 0.15);
        const bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        bar.position.set(0, 0.85, -0.6);
        bikeGroup.add(bar);
        
        const rL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        rL.position.set(-0.2, 0.85, -0.6);
        rL.name = 'siren_red';
        bikeGroup.add(rL);
        const bL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.1), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        bL.position.set(0.2, 0.85, -0.6);
        bL.name = 'siren_blue';
        bikeGroup.add(bL);
    }

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    const fWheel = new THREE.Mesh(wheelGeo, wheelMat);
    fWheel.rotation.z = Math.PI/2;
    fWheel.position.set(0, 0.35, 0.7);
    fWheel.castShadow = true;
    bikeGroup.add(fWheel);

    const bWheel = new THREE.Mesh(wheelGeo, wheelMat);
    bWheel.rotation.z = Math.PI/2;
    bWheel.position.set(0, 0.35, -0.7);
    bWheel.castShadow = true;
    bikeGroup.add(bWheel);

    // Windshield
    const windGeo = new THREE.BoxGeometry(0.4, 0.3, 0.4);
    const windMat = new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.7, 
        roughness: 0,
        metalness: 1
    });
    const wind = new THREE.Mesh(windGeo, windMat);
    wind.position.set(0, 0.8, 0.4);
    wind.rotation.x = -0.5;
    bikeGroup.add(wind);

    group.add(bikeGroup);

    // -- Rider --
    const riderGroup = new THREE.Group();
    riderGroup.position.set(0, 0.6, -0.2);

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    
    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), leatherMat);
    torso.position.y = 0.4;
    torso.rotation.x = 0.5; // Lean forward
    riderGroup.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: isPolice ? 0xffffff : color, roughness: 0.3, metalness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), headMat);
    head.position.set(0, 0.8, 0.1);
    riderGroup.add(head);

    // Arms (Pivots)
    const armGeo = new THREE.CapsuleGeometry(0.06, 0.4, 4, 8);
    
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.25, 0.55, 0.05);
    const leftArm = new THREE.Mesh(armGeo, leatherMat);
    leftArm.position.y = -0.2;
    leftArm.rotation.x = -1.0; // Reach for handlebars
    leftArmPivot.add(leftArm);
    riderGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.25, 0.55, 0.05);
    const rightArm = new THREE.Mesh(armGeo, leatherMat);
    rightArm.position.y = -0.2;
    rightArm.rotation.x = -1.0;
    rightArmPivot.add(rightArm);
    riderGroup.add(rightArmPivot);

    // Legs (Pivots)
    const legGeo = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
    const jeanMat = new THREE.MeshStandardMaterial({ color: isPolice ? 0x000033 : 0x222222, roughness: 0.9 });

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.15, 0.2, -0.1);
    const leftLeg = new THREE.Mesh(legGeo, jeanMat);
    leftLeg.position.y = -0.25;
    leftLeg.position.z = 0.1;
    leftLeg.rotation.x = -1.0; // Sitting knee bent
    leftLeg.rotation.z = 0.2; // Knee out
    leftLegPivot.add(leftLeg);
    riderGroup.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.15, 0.2, -0.1);
    const rightLeg = new THREE.Mesh(legGeo, jeanMat);
    rightLeg.position.y = -0.25;
    rightLeg.position.z = 0.1;
    rightLeg.rotation.x = -1.0;
    rightLeg.rotation.z = -0.2;
    rightLegPivot.add(rightLeg);
    riderGroup.add(rightLegPivot);

    group.add(riderGroup);

    // Expose parts for animation
    group.userData = {
        leftArm: leftArmPivot,
        rightArm: rightArmPivot,
        leftLeg: leftLegPivot,
        rightLeg: rightLegPivot,
        bike: bikeGroup,
        rider: riderGroup
    };

    return group;
}

const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  setCommentary, 
  setPlayerStats, 
  rivals, 
  setRivals,
  setEndGameSummary
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // -- STATE REFS --
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const roadMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  
  // Physics State
  const speedRef = useRef(0);
  const playerZRef = useRef(0); // World Z
  const playerXRef = useRef(0); // Lateral
  const playerDxRef = useRef(0); // Lateral Velocity
  const playerLeanRef = useRef(0);
  const rpmRef = useRef(0);
  const healthRef = useRef(100);
  const scoreRef = useRef(0);
  const fuelRef = useRef(100);

  // Combat State
  const combatStateRef = useRef({
      isAttacking: false,
      type: 'NONE' as 'KICK' | 'PUNCH' | 'NONE',
      cooldown: 0,
      animTimer: 0
  });

  // Rivals Map (Mesh + Logic)
  const rivalMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

  // Input
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Weather
  const weatherRef = useRef<Weather>(Weather.SUNNY);
  const rainSystemRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Reset Physics
    speedRef.current = 0;
    playerZRef.current = 0;
    playerXRef.current = 0;
    healthRef.current = 100;
    scoreRef.current = 0;
    fuelRef.current = 100;

    // --- SCENE & RENDERING ---
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.SKY_TOP);
    scene.fog = new THREE.Fog(COLORS.FOG_SUNNY, 50, DRAW_DISTANCE);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DEPTH);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    mountRef.current.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffdfba, 1.2);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50; 
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50; 
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);

    // --- ENVIRONMENT ---
    // Dynamic Road Material
    const roadMat = createRoadMaterial(false);
    roadMatRef.current = roadMat;

    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
    const roadMesh1 = new THREE.Mesh(roadGeo, roadMat);
    roadMesh1.rotation.x = -Math.PI/2;
    roadMesh1.receiveShadow = true;
    scene.add(roadMesh1);
    
    const roadMesh2 = new THREE.Mesh(roadGeo, roadMat);
    roadMesh2.rotation.x = -Math.PI/2;
    roadMesh2.position.z = -SEGMENT_LENGTH;
    roadMesh2.receiveShadow = true;
    scene.add(roadMesh2);

    // Terrain
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, 32, 32);
    // Deform terrain slightly
    const pos = terrainGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
        pos.setZ(i, (Math.random() - 0.5) * 5); // Rough ground
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ color: COLORS.GRASS, roughness: 1 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI/2;
    terrain.position.y = -0.5;
    scene.add(terrain);

    // Rain System
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 15000;
    const rainPos = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount*3; i++) {
        rainPos[i] = (Math.random() - 0.5) * 400;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true, opacity: 0.6 });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = false;
    scene.add(rainSystem);
    rainSystemRef.current = rainSystem;

    // --- PLAYER ---
    const playerGroup = createArticulatedBiker(0xe74c3c, false);
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    // --- RIVALS INIT ---
    rivals.forEach(rival => {
        const mesh = createArticulatedBiker(
            rival.name === "Police" ? 0xffffff : rival.color, 
            rival.name === "Police"
        );
        mesh.position.set(rival.x, 0, -20); // Spawn ahead initially
        scene.add(mesh);
        rivalMeshesRef.current.set(rival.id, mesh);
    });

    // --- INPUT ---
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
        const dt = clock.getDelta();
        const time = clock.getElapsedTime();

        if (gameState === GameState.RACING) {
            
            // 1. DYNAMIC ENVIRONMENT LOGIC
            // Simulate weather changing over time (or triggered)
            if (time > 10 && time < 30) {
                 weatherRef.current = Weather.RAIN;
            } else {
                 weatherRef.current = Weather.SUNNY;
            }
            
            // Apply Weather Visuals
            if (weatherRef.current === Weather.RAIN) {
                if (!rainSystem.visible) {
                     rainSystem.visible = true;
                     scene.fog = new THREE.Fog(COLORS.FOG_RAIN, 10, 200);
                     if (roadMatRef.current) {
                         roadMatRef.current.roughness = 0.1; // Wet road
                         roadMatRef.current.color.setHex(0xaaaaaa);
                     }
                     sunLight.intensity = 0.5;
                }
                // Animate Rain
                const positions = rainSystem.geometry.attributes.position.array as Float32Array;
                for(let i=1; i<positions.length; i+=3) {
                    positions[i] -= 2; // Fall down
                    if (positions[i] < 0) positions[i] = 50;
                }
                rainSystem.geometry.attributes.position.needsUpdate = true;
                // Follow player
                rainSystem.position.set(playerXRef.current, 0, playerZRef.current);

            } else {
                if (rainSystem.visible) {
                    rainSystem.visible = false;
                    scene.fog = new THREE.Fog(COLORS.FOG_SUNNY, 50, DRAW_DISTANCE);
                    if (roadMatRef.current) roadMatRef.current.roughness = 0.8;
                    sunLight.intensity = 1.2;
                }
            }

            // 2. PHYSICS ENGINE (PLAYER)
            // Acceleration
            if (keysRef.current['ArrowUp']) speedRef.current += PHYSICS.ACCELERATION * dt;
            else if (keysRef.current['ArrowDown']) speedRef.current -= PHYSICS.BRAKING * dt;
            else speedRef.current -= PHYSICS.DRAG * dt;

            // Off-road drag
            if (Math.abs(playerXRef.current) > ROAD_WIDTH/2 - 2) {
                speedRef.current -= PHYSICS.OFF_ROAD_DRAG * dt;
            }

            speedRef.current = Math.max(0, Math.min(speedRef.current, PHYSICS.MAX_SPEED));
            
            // Steering
            if (keysRef.current['ArrowLeft']) playerDxRef.current -= 0.01;
            else if (keysRef.current['ArrowRight']) playerDxRef.current += 0.01;
            else playerDxRef.current *= 0.9; // Lateral friction

            playerDxRef.current = Math.max(-PHYSICS.LATERAL_SPEED, Math.min(PHYSICS.LATERAL_SPEED, playerDxRef.current));
            playerXRef.current += playerDxRef.current * (speedRef.current / PHYSICS.MAX_SPEED + 0.2);
            playerZRef.current -= speedRef.current; // Moving negative Z

            // RPM sim
            rpmRef.current = (speedRef.current / PHYSICS.MAX_SPEED) * 0.8 + (Math.random() * 0.1);

            // 3. COMBAT INPUT
            const combat = combatStateRef.current;
            combat.cooldown = Math.max(0, combat.cooldown - dt * 1000);
            
            if (combat.cooldown <= 0 && !combat.isAttacking) {
                if (keysRef.current['KeyK']) { // Kick
                    combat.isAttacking = true;
                    combat.type = 'KICK';
                    combat.animTimer = 0.4; // Duration
                    combat.cooldown = PHYSICS.COMBAT_COOLDOWN;
                } else if (keysRef.current['Space']) { // Punch/Weapon
                    combat.isAttacking = true;
                    combat.type = 'PUNCH';
                    combat.animTimer = 0.3;
                    combat.cooldown = PHYSICS.COMBAT_COOLDOWN;
                }
            }

            if (combat.isAttacking) {
                combat.animTimer -= dt;
                if (combat.animTimer <= 0) {
                    combat.isAttacking = false;
                    combat.type = 'NONE';
                }
            }

            // 4. ANIMATION & RENDER (PLAYER)
            if (playerMeshRef.current) {
                playerMeshRef.current.position.set(playerXRef.current, 0, playerZRef.current);
                
                // Lean into turns
                const targetLean = -playerDxRef.current * 3;
                playerLeanRef.current += (targetLean - playerLeanRef.current) * 0.1;
                playerMeshRef.current.userData.bike.rotation.z = playerLeanRef.current;
                playerMeshRef.current.userData.rider.rotation.z = playerLeanRef.current;

                // Vibration
                playerMeshRef.current.userData.bike.position.y = Math.sin(time * 50) * 0.01;

                // Combat Animations
                const rider = playerMeshRef.current.userData;
                // Reset limbs
                rider.rightLeg.rotation.y = 0;
                rider.leftLeg.rotation.y = 0;
                rider.rightArm.rotation.z = 0;
                rider.leftArm.rotation.z = 0;

                if (combat.isAttacking) {
                    const progress = Math.sin(combat.animTimer * Math.PI * 5); // Rapid swing
                    if (combat.type === 'KICK') {
                         // Decide direction based on nearest rival? For now default right, or check input
                         // Simple logic: Kick to the side moving towards or default right
                         const side = playerDxRef.current > 0 ? -1 : 1; 
                         if (side === 1) rider.rightLeg.rotation.y = -1.5 * Math.abs(progress);
                         else rider.leftLeg.rotation.y = 1.5 * Math.abs(progress);
                    } else if (combat.type === 'PUNCH') {
                         const side = playerDxRef.current > 0 ? -1 : 1;
                         if (side === 1) rider.rightArm.rotation.z = -1.0 * Math.abs(progress);
                         else rider.leftArm.rotation.z = 1.0 * Math.abs(progress);
                    }
                }
            }

            // 5. RIVALS LOGIC (SIDE-BY-SIDE CHASE)
            rivals.forEach((rival, idx) => {
                const mesh = rivalMeshesRef.current.get(rival.id);
                if (!mesh) return;

                // AI Logic: Chase Player Z
                // Target Z is player Z + some offset (chase pack)
                const zDiff = rival.z - playerZRef.current;
                
                // Speed matching
                let targetSpeed = speedRef.current;
                if (zDiff > 5) targetSpeed *= 0.9; // Too far ahead, slow down
                else if (zDiff < -5) targetSpeed *= 1.1; // Behind, speed up
                
                // Catchup logic
                if (targetSpeed < 0.1) targetSpeed = 0.5; // Always moving
                
                // Smooth speed update
                rival.speed += (targetSpeed - rival.speed) * 0.05;
                
                // Lateral movement (Attack logic)
                const xDiff = rival.x - playerXRef.current;
                const dist = Math.abs(xDiff);
                
                // If close in Z and X, try to swipe or avoid
                if (Math.abs(zDiff) < 3) {
                    if (rival.name === 'Police') {
                        // Police ram behavior
                        if (dist > 1.5) rival.dx = (xDiff > 0 ? -1 : 1) * 0.05; // Steer into player
                    } else {
                        // Rival race logic: try to pass or block
                        if (dist < 1.0) rival.dx = (xDiff > 0 ? 1 : -1) * 0.05; // Avoid collision if too close
                        else rival.dx = (Math.random() - 0.5) * 0.05;
                    }
                } else {
                     // Center lane logic
                     rival.dx = (0 - rival.x) * 0.01;
                }
                
                // Apply physics
                rival.x += rival.dx;
                rival.x = Math.max(-ROAD_WIDTH/2, Math.min(ROAD_WIDTH/2, rival.x));
                rival.z -= rival.speed;

                // Update Mesh
                mesh.position.set(rival.x, 0, rival.z);
                mesh.userData.bike.rotation.z = -rival.dx * 3;
                
                // Police Siren Animation
                if (rival.name === 'Police') {
                    const isRed = Math.floor(time * 10) % 2 === 0;
                    const rL = mesh.userData.bike.getObjectByName('siren_red') as THREE.Mesh;
                    const bL = mesh.userData.bike.getObjectByName('siren_blue') as THREE.Mesh;
                    if (rL && bL) {
                        (rL.material as THREE.MeshBasicMaterial).color.setHex(isRed ? 0xff0000 : 0x330000);
                        (bL.material as THREE.MeshBasicMaterial).color.setHex(isRed ? 0x000033 : 0x0000ff);
                    }
                    // Light cast on road
                    // (Simplified: could add PointLight here but expensive for multiple cops)
                }

                // COLLISION / COMBAT HIT CHECK
                if (Math.abs(zDiff) < 1.5 && Math.abs(xDiff) < 2.0) {
                    // 1. Player Attack Hit
                    if (combat.isAttacking && combat.animTimer > 0.1) {
                         // Direction check: Am I attacking towards them?
                         const attackDir = playerDxRef.current > 0 ? -1 : 1; // Approx
                         const rivalDir = xDiff > 0 ? 1 : -1;
                         
                         // Simple check: is rival on the side I'm leaning/moving?
                         // Apply Impulse
                         rival.dx += (xDiff > 0 ? 1 : -1) * PHYSICS.COMBAT_IMPULSE;
                         rival.health -= 10;
                         
                         setCommentary({ text: "SOLID HIT!", speaker: "System", timestamp: Date.now() });
                         combat.isAttacking = false; // Consume attack
                    }
                    
                    // 2. Body Slam (Passive)
                    if (Math.abs(xDiff) < 0.8) {
                         const force = 0.05;
                         playerDxRef.current -= (xDiff > 0 ? -1 : 1) * force;
                         rival.dx += (xDiff > 0 ? -1 : 1) * force;
                         healthRef.current -= 1;
                         // Sparks?
                    }
                }
            });

            // 6. CAMERA FOLLOW
            if (cameraRef.current) {
                const cam = cameraRef.current;
                // Chase
                const targetZ = playerZRef.current + CAMERA_DEPTH + (speedRef.current * 1.0);
                cam.position.z += (targetZ - cam.position.z) * 0.1;
                cam.position.x += (playerXRef.current * 0.8 - cam.position.x) * 0.1;
                
                // Shake
                const shake = (speedRef.current / PHYSICS.MAX_SPEED) * 0.05;
                cam.position.y = CAMERA_HEIGHT + (Math.random()-0.5)*shake;
                
                cam.lookAt(playerXRef.current * 0.5, 0.5, playerZRef.current - 10);
            }

            // 7. ENDLESS ROAD SCROLL
            // Reset road segments to player Z to create infinite illusion without giant coordinates?
            // Actually with 32-bit float, we are fine for a normal race duration. 
            // Just move the second road segment
            if (playerZRef.current < roadMesh1.position.z - SEGMENT_LENGTH) {
                roadMesh1.position.z -= SEGMENT_LENGTH * 2;
            }
            if (playerZRef.current < roadMesh2.position.z - SEGMENT_LENGTH) {
                roadMesh2.position.z -= SEGMENT_LENGTH * 2;
            }

            // HUD Sync
            if (animId % 5 === 0) {
                setPlayerStats({
                    x: playerXRef.current,
                    z: playerZRef.current,
                    speed: Math.floor(speedRef.current * 40),
                    maxSpeed: 180,
                    health: healthRef.current,
                    score: scoreRef.current,
                    fuel: fuelRef.current,
                    gear: Math.floor(speedRef.current),
                    rpm: rpmRef.current,
                    isAttacking: combat.isAttacking,
                    attackType: combat.type,
                    lean: playerLeanRef.current
                });
            }

            if (healthRef.current <= 0) {
                setGameState(GameState.GAME_OVER);
                setEndGameSummary("WRECKED");
            }

        } else {
             // Menu Orbit
             if(cameraRef.current) {
                cameraRef.current.position.x = Math.sin(time*0.5) * 5;
                cameraRef.current.position.z = Math.cos(time*0.5) * 5;
                cameraRef.current.lookAt(0,0,0);
             }
        }

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
        if(cameraRef.current && renderer) {
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animId);
        if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };
  }, [gameState, rivals]);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 w-full h-full bg-black"
      aria-label="Realistic 3D Racing" 
    />
  );
};

export default GameEngine;
