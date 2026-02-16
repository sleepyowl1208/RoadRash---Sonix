"use client";

import React, { useRef, useEffect, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Environment, 
  PerspectiveCamera, 
  Stars,
  Loader,
  Cloud,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Player, Rival, GameState, Commentary, Weather } from '../types';
import { PHYSICS, ROAD_WIDTH, CAMERA_HEIGHT, CAMERA_DEPTH } from '../constants';
import { PhysicsEngine } from '../game/PhysicsEngine';
import { PoliceAI } from '../game/PoliceAI';
import { AudioManager } from '../game/AudioManager';

// --- MATERIALS & SHADERS ---

const RoadMaterial = ({ weather, playerZ, speed }: { weather: Weather, playerZ: number, speed: number }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
     uTime: { value: 0 },
     uWeather: { value: 0 }, 
     uColor: { value: new THREE.Color("#080808") }, 
     uLineColor: { value: new THREE.Color("#444444") },
     uOffset: { value: 0.0 },
     uSpeed: { value: 0.0 }
  }), []);

  useFrame((state) => {
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        shaderRef.current.uniforms.uWeather.value = weather === Weather.RAIN ? 1 : weather === Weather.SNOW ? 2 : 0;
        // Player moves negative Z, so we subtract to scroll texture forward
        shaderRef.current.uniforms.uOffset.value = -playerZ * 0.05; 
        shaderRef.current.uniforms.uSpeed.value = speed;
    }
  });

  return (
    <shaderMaterial
      ref={shaderRef}
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform float uTime;
        uniform float uWeather; 
        uniform vec3 uColor;
        uniform vec3 uLineColor;
        uniform float uOffset;
        varying vec2 vUv;
        
        float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

        void main() {
          vec2 uv = vUv;
          uv.y += uOffset; // Scroll

          vec3 color = uColor;
          
          // Noise / Grain
          float noise = hash(uv * 100.0); 
          color += vec3(noise * 0.05);

          // Center Lines (Dashed)
          float dash = sin(uv.y * 40.0);
          if (abs(uv.x - 0.5) < 0.01 && dash > 0.0) {
             color = uLineColor * 2.0; 
          }
          
          // Edge Lines (Neon)
          if (abs(uv.x - 0.5) > 0.45 && abs(uv.x - 0.5) < 0.47) {
             color = vec3(0.0, 0.8, 1.0) * 1.5; 
          }

          // Rain Reflection
          if (uWeather == 1.0) {
             color *= 0.5; 
             float puddle = hash(uv * 5.0);
             if (puddle > 0.6) color += 0.2; 
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `}
    />
  );
};

// --- SCENERY ---

const CyberBuilding = ({ seed }: { seed: number }) => {
    const rand = (offset: number) => Math.abs(Math.sin(seed + offset));
    const height = 20 + rand(1) * 80;
    const width = 10 + rand(2) * 10;
    const depth = 10 + rand(3) * 10;
    const neonColor = rand(4) > 0.5 ? "magenta" : "cyan";

    return (
        <group position={[0, height / 2, 0]}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[width/2 + 0.1, 0, 0]}>
                <boxGeometry args={[0.2, height * 0.9, 0.5]} />
                <meshBasicMaterial color={neonColor} toneMapped={false} />
            </mesh>
             <mesh position={[0, 0, depth/2 + 0.1]}>
                <planeGeometry args={[width * 0.6, height * 0.8]} />
                <meshBasicMaterial color="#000" />
            </mesh>
        </group>
    );
};

const SceneryManager = ({ playerZ }: { playerZ: number }) => {
    // Static array of building data
    const buildings = useMemo(() => {
        const arr = [];
        const gap = 100; 
        const count = 40; 
        for (let i = -5; i < count; i++) {
            arr.push({ x: -50 - Math.random() * 20, zOffset: i * gap, seed: i * 135 });
            arr.push({ x: 50 + Math.random() * 20, zOffset: i * gap, seed: i * 921 });
        }
        return arr;
    }, []);

    // Loop logic period
    const PERIOD = 3000; 

    return (
        <group>
            {buildings.map((b, i) => {
                // Calculate position relative to player loop
                // We want the buildings to tile infinitely as player moves -Z
                
                // Get the base world Z of this building relative to 0
                const baseZ = b.zOffset;
                
                // Determine how many periods we have moved
                const currentPeriod = Math.floor(Math.abs(playerZ) / PERIOD);
                
                // Calculate z position. 
                // We shift the whole block of buildings to stay around the player
                let renderZ = baseZ - (Math.floor((playerZ - baseZ) / PERIOD) * PERIOD);
                
                // Fine tune to keep them appearing in front and disappearing behind
                // If player is at -1000. Building at -100.
                // We want buildings to be in range [playerZ - 800, playerZ + 200]
                
                // Simple tiling:
                // Relative Z from player
                let relZ = (b.zOffset - playerZ) % PERIOD;
                if (relZ < 0) relZ += PERIOD;
                if (relZ > PERIOD/2) relZ -= PERIOD;
                
                const finalZ = playerZ + relZ;

                // Optimization: Don't render if too far
                if (Math.abs(finalZ - playerZ) > 600) return null;

                return (
                    <group key={i} position={[b.x, 0, finalZ]}>
                         <CyberBuilding seed={b.seed} />
                    </group>
                );
            })}
        </group>
    );
};

// --- BIKES ---

const BikeModel = ({ color, isPolice, lean }: { color: any, isPolice: boolean, lean: number }) => {
    const chassis = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if(chassis.current) {
            // Visual lean smoothing
            chassis.current.rotation.z = THREE.MathUtils.damp(chassis.current.rotation.z, lean, 15, delta);
        }
    });

    return (
        <group ref={chassis}>
            {/* Body */}
            <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[0.5, 0.6, 1.5]} />
                <meshStandardMaterial color={isPolice ? "white" : color} roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Wheels */}
            <mesh position={[0, 0.35, 0.8]} rotation={[0,0,Math.PI/2]} castShadow>
                <cylinderGeometry args={[0.35, 0.35, 0.2]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0, 0.35, -0.8]} rotation={[0,0,Math.PI/2]} castShadow>
                <cylinderGeometry args={[0.35, 0.35, 0.2]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Rider */}
            <mesh position={[0, 1.0, -0.2]} rotation={[0.4, 0, 0]}>
                <capsuleGeometry args={[0.25, 0.6]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, 1.45, 0]}>
                 <sphereGeometry args={[0.18]} />
                 <meshStandardMaterial color={isPolice ? "white" : color} />
            </mesh>
            {isPolice && (
                <pointLight position={[0, 1.5, -0.5]} color="blue" distance={10} intensity={5} decay={2} />
            )}
             <pointLight position={[0, 0.5, -1.0]} color="red" distance={2} intensity={2} />
        </group>
    )
}

// --- GAME LOGIC ---

interface GameSceneProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setCommentary: (c: Commentary) => void;
  setPlayerStats: (p: Player) => void;
  rivals: Rival[];
  setRivals: React.Dispatch<React.SetStateAction<Rival[]>>;
  setEndGameSummary: (s: string) => void;
}

const GameController = ({ 
    gameState, setGameState, setPlayerStats, rivals, setRivals, setEndGameSummary 
}: GameSceneProps) => {
    const { camera } = useThree();
    
    // Mutable Physics State (Ref based for performance)
    const playerRef = useRef<Player>({ 
        x: 0, z: 0, speed: 0, maxSpeed: PHYSICS.MAX_SPEED, 
        health: 100, fuel: 100, score: 0, gear: 0, rpm: 1200, 
        isAttacking: false, attackType: 'NONE', lean: 0
    });

    const rivalsRef = useRef(rivals);
    const inputs = useRef({ up: false, down: false, left: false, right: false });
    const physics = useRef(new PhysicsEngine());
    const ai = useRef(new PoliceAI());
    const audio = AudioManager.getInstance();
    const frameCount = useRef(0);

    // Sync Rivals State from props
    useEffect(() => { rivalsRef.current = rivals; }, [rivals]);

    // Input Listeners
    useEffect(() => {
        const handleKey = (e: KeyboardEvent, isDown: boolean) => {
            if(e.code === 'ArrowUp' || e.code === 'KeyW') inputs.current.up = isDown;
            if(e.code === 'ArrowDown' || e.code === 'KeyS') inputs.current.down = isDown;
            if(e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.current.left = isDown;
            if(e.code === 'ArrowRight' || e.code === 'KeyD') inputs.current.right = isDown;
        };
        const down = (e: KeyboardEvent) => handleKey(e, true);
        const up = (e: KeyboardEvent) => handleKey(e, false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            audio.stop();
        }
    }, []);

    // Reset on Start
    useEffect(() => {
        if (gameState === GameState.RACING) {
            playerRef.current = { 
                x: 0, z: 0, speed: 0, maxSpeed: PHYSICS.MAX_SPEED, 
                health: 100, fuel: 100, score: 0, gear: 0, rpm: 1200, 
                isAttacking: false, attackType: 'NONE', lean: 0
            };
            // Reset camera
            camera.position.set(0, CAMERA_HEIGHT, CAMERA_DEPTH);
        }
    }, [gameState]);

    // MAIN GAME LOOP
    useFrame((state, delta) => {
        if (gameState !== GameState.RACING) return;
        
        const dt = Math.min(delta, 0.1);
        const p = playerRef.current;
        
        // 1. Update Player Physics
        // PhysicsEngine updates p.x, p.z, p.speed in place
        physics.current.updatePlayer(p, inputs.current, dt, Weather.SUNNY);
        
        p.score = Math.abs(p.z);
        
        // 2. Rivals
        rivalsRef.current.forEach(r => {
             if (r.name === 'Police') {
                 ai.current.update(r, p.z, p.x, p.speed, dt);
             } else {
                 // Basic racer logic
                 r.z -= r.speed * dt;
                 // Keep them engaged
                 if (r.z > p.z + 100) r.z = p.z - 200;
             }
             
             // Simple collision
             if (Math.abs(r.z - p.z) < 2 && Math.abs(r.x - p.x) < 1) {
                 physics.current.resolveCollision(p, r);
                 p.health -= 1;
             }
        });

        // 3. Audio
        audio.updateEngine(p.rpm, p.speed);

        // 4. Camera Follow
        // CRITICAL: Camera Z must be relative to Player Z
        const targetZ = p.z + CAMERA_DEPTH + (p.speed * 0.1); // Pull back slightly with speed
        const targetX = p.x * 0.8;
        const targetY = CAMERA_HEIGHT + (p.speed / 100) * 0.5;

        // Soft follow
        camera.position.z += (targetZ - camera.position.z) * 10 * dt;
        camera.position.x += (targetX - camera.position.x) * 5 * dt;
        camera.position.y += (targetY - camera.position.y) * 5 * dt;
        
        // Look ahead
        camera.lookAt(p.x * 0.5, 1.0, p.z - 50);

        // 5. Game Over
        if (p.fuel <= 0) p.speed *= 0.98; // Stall
        if (p.health <= 0) {
            setGameState(GameState.GAME_OVER);
            setEndGameSummary("CRASHED");
            audio.stop();
        }

        // 6. Sync UI (Throttled)
        frameCount.current += 1;
        if (frameCount.current % 3 === 0) {
            setPlayerStats({ ...p });
        }
    });

    return (
        <>
            {/* Player */}
            <group position={[playerRef.current.x, 0, playerRef.current.z]}>
                <BikeModel color="red" isPolice={false} lean={playerRef.current.lean} />
                <pointLight position={[0, 2, -5]} intensity={5} color="white" distance={50} />
            </group>

            {/* Rivals */}
            {rivalsRef.current.map(r => (
                <group key={r.id} position={[r.x, 0, r.z]}>
                    <BikeModel color={new THREE.Color(r.color)} isPolice={r.name === 'Police'} lean={r.lean} />
                </group>
            ))}

            <SceneryManager playerZ={playerRef.current.z} />

            {/* Road */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, playerRef.current.z]} receiveShadow>
                <planeGeometry args={[ROAD_WIDTH, 800]} />
                <RoadMaterial weather={Weather.SUNNY} playerZ={playerRef.current.z} speed={playerRef.current.speed} />
            </mesh>
            
            {/* Floor */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, playerRef.current.z]}>
                <planeGeometry args={[1000, 1000]} />
                <meshBasicMaterial color="#050505" />
            </mesh>
        </>
    );
};

// --- MAIN COMPONENT ---

const GameScene: React.FC<GameSceneProps> = (props) => {
  return (
    <>
      <div className="absolute inset-0 bg-black">
          <Canvas 
              shadows 
              dpr={[1, 1.5]}
              gl={{ 
                  antialias: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
              }}
          >
              <PerspectiveCamera makeDefault position={[0, CAMERA_HEIGHT, CAMERA_DEPTH]} near={0.1} far={1000} />
              <Suspense fallback={null}>
                  <GameController {...props} />
                  <EffectComposer enableNormalPass={false}>
                      <Bloom luminanceThreshold={0.5} intensity={1.5} radius={0.5} mipmapBlur />
                      <Vignette eskil={false} offset={0.1} darkness={0.6} />
                      <ToneMapping />
                      <ChromaticAberration offset={[0.002, 0.002]} />
                      <Noise opacity={0.05} />
                  </EffectComposer>
                  
                  <Environment preset="city" background={false} />
                  <ambientLight intensity={0.5} />
                  <Stars />
                  <fog attach="fog" args={['#050505', 20, 600]} />
              </Suspense>
          </Canvas>
      </div>
      <Loader />
    </>
  );
};

export default GameScene;
