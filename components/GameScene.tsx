
"use client";

import React, { useRef, useEffect, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Loader } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Player, Rival, GameState, Commentary, Weather, FuelPickup } from '../types';
import { PHYSICS, ROAD_WIDTH, CAMERA_HEIGHT, CAMERA_DEPTH, COLORS } from '../constants';
import { PhysicsEngine } from '../game/PhysicsEngine';
import { PoliceAI } from '../game/PoliceAI';
import { AudioManager } from '../game/AudioManager';

// --- SMOOTH NEON ROAD ---
const NeonRoadMaterial = ({ playerZ, speed, isRaining }: { playerZ: number, speed: number, isRaining: boolean }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        shaderRef.current.uniforms.uOffset.value = -playerZ * 0.05; 
        shaderRef.current.uniforms.uSpeed.value = speed;
    }
  });

  return (
    <shaderMaterial
      ref={shaderRef}
      transparent
      uniforms={{
         uTime: { value: 0 },
         uColor: { value: new THREE.Color("#050505") }, 
         uGridColor: { value: new THREE.Color("#00ffff") }, 
         uOffset: { value: 0.0 },
         uSpeed: { value: 0.0 },
         uWetness: { value: isRaining ? 1.0 : 0.0 }
      }}
      vertexShader={`
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `}
      fragmentShader={`
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uGridColor;
        uniform float uOffset;
        uniform float uWetness;
        varying vec2 vUv;
        varying float vDepth;
        
        void main() {
          vec2 uv = vUv;
          uv.y += uOffset; 

          // Grid with Anti-aliased edges
          float lineThickness = 0.02;
          float vert = abs(fract(uv.x * 4.0) - 0.5);
          float horiz = abs(fract(uv.y * 10.0) - 0.5); 
          
          float grid = 0.0;
          // Smoothstep for anti-aliasing to prevent flickering lines at distance
          float aa = 0.01;
          if (vert < lineThickness) grid = smoothstep(lineThickness, lineThickness - aa, vert) * 0.2;
          if (horiz < lineThickness) grid = max(grid, smoothstep(lineThickness, lineThickness - aa, horiz) * 0.2);
          
          // Edges
          float edgeGlow = smoothstep(0.4, 0.49, abs(uv.x - 0.5)) * 3.0;

          // Road Noise / Asphalt Texture
          float noise = fract(sin(dot(uv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 roadColor = uColor + vec3(noise * 0.03); // Reduced noise intensity

          // Reflections (Wet)
          if (uWetness > 0.5) {
             float reflectNoise = sin(uv.y * 20.0 + uTime * 2.0) * cos(uv.x * 10.0);
             roadColor += vec3(0.1, 0.2, 0.3) * step(0.8, reflectNoise);
          }

          vec3 finalColor = roadColor + (uGridColor * grid) + (vec3(0.0, 0.8, 1.0) * edgeGlow);
          
          // Fog with smooth falloff
          float fogFactor = smoothstep(50.0, 800.0, vDepth);
          finalColor = mix(finalColor, vec3(0.05, 0.05, 0.1), fogFactor);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `}
    />
  );
};

// --- CYBERPUNK CITY ---
const CyberCity = ({ playerZ }: { playerZ: number }) => {
    // Generate static buildings that repeat
    const buildings = useMemo(() => {
        const arr = [];
        const count = 40;
        const spacing = 60;
        for (let i = -10; i < count; i++) {
            const z = -i * spacing; 
            const side = i % 2 === 0 ? 1 : -1;
            // Place buildings far to the sides (40-100 units)
            const x = side * (40 + Math.random() * 60);
            const height = 40 + Math.random() * 120;
            const width = 10 + Math.random() * 20;
            const color = COLORS.NEON_BUILDINGS[Math.floor(Math.random() * COLORS.NEON_BUILDINGS.length)];
            arr.push({ x, z, height, width, color });
        }
        return arr;
    }, []);

    const SEGMENT_SIZE = 40 * 60; // Loop size

    return (
        <group>
             {buildings.map((b, i) => {
                 // Simple infinite scrolling effect relative to camera
                 let z = b.z + playerZ;
                 // Keep them ahead
                 while (z > 200) z -= SEGMENT_SIZE;
                 while (z < -800) z += SEGMENT_SIZE;

                 return (
                     <group key={i} position={[b.x, b.height/2 - 10, z]}>
                         {/* Building Body */}
                         <mesh>
                             <boxGeometry args={[b.width, b.height, b.width]} />
                             <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} />
                         </mesh>
                         {/* Neon Edges */}
                         <mesh>
                            <boxGeometry args={[b.width * 1.02, b.height * 1.01, b.width * 1.02]} />
                            <meshBasicMaterial color={b.color} wireframe />
                         </mesh>
                         {/* Window Lights */}
                         <pointLight color={b.color} distance={80} intensity={1.5} decay={2} />
                     </group>
                 )
             })}
        </group>
    );
};


// --- RIDER / BIKE ---
const CyberBike = ({ color, isPolice, lean, isAttacking, textureUrl }: { color: any, isPolice: boolean, lean: number, isAttacking: boolean, textureUrl?: string }) => {
    const group = useRef<THREE.Group>(null);
    const lightLeft = useRef<THREE.PointLight>(null);
    const lightRight = useRef<THREE.PointLight>(null);

    useFrame((state, delta) => {
        if(group.current) {
            group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, lean, 8, delta);
            if (isAttacking) {
                group.current.position.x = Math.sin(state.clock.elapsedTime * 25) * 0.2;
            } else {
                group.current.position.x = 0;
            }
        }
        if (isPolice && lightLeft.current && lightRight.current) {
            const time = state.clock.elapsedTime * 15; 
            lightLeft.current.intensity = Math.sin(time) > 0 ? 8 : 0;
            lightRight.current.intensity = Math.cos(time) > 0 ? 8 : 0;
        }
    });

    const bodyColor = isPolice ? "#ffffff" : "#111111";
    const accentColor = isPolice ? "#0000ff" : color;

    return (
        <group ref={group}>
            {/* Wheels (Tron Style) */}
            <mesh position={[0, 0.35, -0.7]} rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.35, 0.08, 16, 32]} />
                <meshStandardMaterial color="#000" emissive={accentColor} emissiveIntensity={2} />
            </mesh>
            <mesh position={[0, 0.35, 0.7]} rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.35, 0.08, 16, 32]} />
                <meshStandardMaterial color="#000" emissive={accentColor} emissiveIntensity={2} />
            </mesh>
            {/* Chassis */}
            <mesh position={[0, 0.6, 0]}>
                <boxGeometry args={[0.4, 0.4, 1.4]} />
                <meshStandardMaterial color={bodyColor} roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Rider */}
            <group position={[0, 0.9, -0.1]}>
                <mesh rotation={[0.4, 0, 0]}>
                    <boxGeometry args={[0.45, 0.6, 0.25]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[0, 0.5, 0.1]} rotation={[0.2, 0, 0]}>
                    <sphereGeometry args={[0.18, 32, 32]} />
                    {textureUrl ? (
                        <meshBasicMaterial color="#fff" /> 
                    ) : (
                        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.1} />
                    )}
                </mesh>
            </group>
            {/* Police Extras */}
            {isPolice && (
                <group position={[0, 1.0, -0.5]}>
                    <mesh position={[-0.25, 0, 0]}>
                        <boxGeometry args={[0.2, 0.1, 0.1]} />
                        <meshBasicMaterial color="red" toneMapped={false} />
                        <pointLight ref={lightLeft} color="red" distance={15} decay={2} />
                    </mesh>
                    <mesh position={[0.25, 0, 0]}>
                        <boxGeometry args={[0.2, 0.1, 0.1]} />
                        <meshBasicMaterial color="blue" toneMapped={false} />
                        <pointLight ref={lightRight} color="blue" distance={15} decay={2} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

// --- GAME CONTROLLER ---

interface GameSceneProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setCommentary: (c: Commentary) => void;
  setPlayerStats: (p: Player) => void;
  rivals: Rival[];
  setRivals: React.Dispatch<React.SetStateAction<Rival[]>>;
  setEndGameSummary: (s: string) => void;
  playerImage?: string;
}

const GameController = ({ 
    gameState, setGameState, setPlayerStats, rivals, setRivals, setEndGameSummary, playerImage
}: GameSceneProps) => {
    const { camera } = useThree();
    const playerRef = useRef<Player>({ 
        x: 0, z: 0, speed: 0, maxSpeed: PHYSICS.MAX_SPEED, 
        health: 100, fuel: 100, score: 0, gear: 0, rpm: 1000, 
        isAttacking: false, attackType: 'NONE', lean: 0
    });
    
    const physics = useRef(new PhysicsEngine());
    const ai = useRef(new PoliceAI());
    const audio = AudioManager.getInstance();
    const fuelItems = useRef<FuelPickup[]>([]);
    const lastFuelZ = useRef(0);
    const rivalsRef = useRef(rivals);
    const inputs = useRef({ up: false, down: false, left: false, right: false, attack: false });
    const frameCount = useRef(0);

    useEffect(() => { rivalsRef.current = rivals; }, [rivals]);

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            if(e.code === 'ArrowUp' || e.code === 'KeyW') inputs.current.up = true;
            if(e.code === 'ArrowDown' || e.code === 'KeyS') inputs.current.down = true;
            if(e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.current.left = true;
            if(e.code === 'ArrowRight' || e.code === 'KeyD') inputs.current.right = true;
            if(e.code === 'Space') inputs.current.attack = true;
            if(e.code === 'Escape') setGameState(gameState === GameState.RACING ? GameState.PAUSED : GameState.RACING);
        };
        const onUp = (e: KeyboardEvent) => {
            if(e.code === 'ArrowUp' || e.code === 'KeyW') inputs.current.up = false;
            if(e.code === 'ArrowDown' || e.code === 'KeyS') inputs.current.down = false;
            if(e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.current.left = false;
            if(e.code === 'ArrowRight' || e.code === 'KeyD') inputs.current.right = false;
            if(e.code === 'Space') inputs.current.attack = false;
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            audio.stop();
        };
    }, [gameState]);

    useEffect(() => {
        if (gameState === GameState.RACING) {
             if (playerRef.current.health <= 0 || playerRef.current.fuel <= 0 || playerRef.current.score >= PHYSICS.VICTORY_DISTANCE) {
                playerRef.current = { 
                    x: 0, z: 0, speed: 0, maxSpeed: PHYSICS.MAX_SPEED, 
                    health: 100, fuel: 100, score: 0, gear: 0, rpm: 1000, 
                    isAttacking: false, attackType: 'NONE', lean: 0
                };
                fuelItems.current = [];
                lastFuelZ.current = 0;
                camera.position.set(0, CAMERA_HEIGHT, CAMERA_DEPTH);
                audio.start();
             } else {
                 audio.start();
             }
        } else {
            audio.stop();
        }
    }, [gameState]);

    useFrame((state, delta) => {
        if (gameState !== GameState.RACING) return;
        const dt = Math.min(delta, 0.1);
        const p = playerRef.current;

        physics.current.updatePlayer(p, inputs.current, dt, Weather.SUNNY);

        if (p.speed > 5) {
            p.fuel -= PHYSICS.FUEL_BURN_RATE * dt;
        }
        
        // Spawn more frequently (every 300 units)
        if (Math.abs(p.z - lastFuelZ.current) > 300) {
            fuelItems.current.push({
                id: Math.random().toString(),
                x: (Math.random() - 0.5) * (ROAD_WIDTH - 4),
                z: p.z - 800,
                active: true
            });
            lastFuelZ.current = p.z;
            fuelItems.current = fuelItems.current.filter(f => f.z < p.z + 100 && f.active);
        }

        fuelItems.current.forEach(f => {
            if (f.active) {
                const dz = Math.abs(f.z - p.z);
                const dx = Math.abs(f.x - p.x);
                if (dz < 5 && dx < 2.5) {
                    f.active = false;
                    p.fuel = Math.min(100, p.fuel + 35);
                    audio.playPickup();
                }
            }
        });

        let policeProximity = 1000;
        
        rivalsRef.current.forEach(r => {
            if (r.name === 'Police') {
                ai.current.update(r, p.z, p.x, p.speed, dt);
                
                const dist = Math.sqrt(Math.pow(r.x - p.x, 2) + Math.pow(r.z - p.z, 2));
                policeProximity = Math.min(policeProximity, dist);

                if (Math.abs(r.z - p.z) < 2 && Math.abs(r.x - p.x) < 1.5) {
                    p.health -= 0.5;
                    if (Math.abs(r.dx) > 2) {
                        p.health -= 5;
                        audio.playCrash();
                    }
                }
            } else {
                r.z -= r.speed * dt;
                if (r.z > p.z + 100) r.z = p.z - 400;
            }

            if (p.isAttacking && Math.abs(r.z - p.z) < 2.5 && Math.abs(r.x - p.x) < 3.0) {
                r.dx += (r.x > p.x ? 1 : -1) * PHYSICS.COMBAT_IMPULSE;
                r.health -= 20;
                audio.playCrash();
            }
        });

        p.score = Math.floor(Math.abs(p.z));
        
        if (p.fuel <= 0) {
            p.fuel = 0;
            p.speed *= 0.98;
            if (p.speed < 1) {
                 setGameState(GameState.GAME_OVER);
                 setEndGameSummary("OUT OF FUEL. STRANDED.");
            }
        }

        if (p.speed < 2.0 && policeProximity < 10 && p.health > 0) {
            setGameState(GameState.BUSTED);
            setEndGameSummary("ARRESTED BY HIGHWAY PATROL.");
        }

        if (p.score >= PHYSICS.VICTORY_DISTANCE) {
            setGameState(GameState.VICTORY);
            setEndGameSummary("SECTOR CLEARED. 2KM REACHED.");
        }

        if (p.health <= 0) {
            setGameState(GameState.GAME_OVER);
            setEndGameSummary("CRITICAL BIKE DAMAGE.");
        }

        const targetZ = p.z + CAMERA_DEPTH + (p.speed * 0.05);
        camera.position.z += (targetZ - camera.position.z) * 5 * dt;
        camera.position.x += (p.x * 0.7 - camera.position.x) * 3 * dt;
        camera.lookAt(p.x * 0.3, 1.2, p.z - 50);

        audio.updateEngine(p.rpm, p.speed);
        audio.updateSiren(policeProximity);

        frameCount.current++;
        if (frameCount.current % 3 === 0) setPlayerStats({...p});
    });

    return (
        <>
            <group position={[playerRef.current.x, 0, playerRef.current.z]}>
                <CyberBike 
                    color="#00ff00" 
                    isPolice={false} 
                    lean={playerRef.current.lean} 
                    isAttacking={playerRef.current.isAttacking} 
                    textureUrl={playerImage}
                />
            </group>

            {rivalsRef.current.map(r => (
                <group key={r.id} position={[r.x, 0, r.z]}>
                    <CyberBike 
                        color={r.color === 0xffffff ? "blue" : "red"} 
                        isPolice={r.name === 'Police'} 
                        lean={r.lean} 
                        isAttacking={false} 
                    />
                </group>
            ))}

            {fuelItems.current.map(f => f.active && (
                <group key={f.id} position={[f.x, 0.5, f.z]}>
                    <mesh rotation={[0, frameCount.current * 0.05, 0]}>
                        <cylinderGeometry args={[0.4, 0.4, 1.2, 8]} />
                        <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={3} />
                    </mesh>
                    <pointLight color="orange" distance={8} intensity={2} />
                    <group position={[0, 1.2, 0]}>
                        <mesh>
                             <planeGeometry args={[1, 0.3]} />
                             <meshBasicMaterial color="black" />
                        </mesh>
                    </group>
                </group>
            ))}
            
            <CyberCity playerZ={playerRef.current.z} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, playerRef.current.z]}>
                <planeGeometry args={[ROAD_WIDTH * 3, 800]} />
                <NeonRoadMaterial playerZ={playerRef.current.z} speed={playerRef.current.speed} isRaining={false} />
            </mesh>
            <gridHelper position={[0, -2, playerRef.current.z]} args={[2000, 100, 0x111111, 0x000000]} />
        </>
    );
};

const GameScene: React.FC<GameSceneProps> = (props) => {
  return (
    <>
      <div className="absolute inset-0 bg-black" aria-label="3D Game Scene">
          <Canvas 
              shadows 
              dpr={[1, 1.5]}
              gl={{ 
                  antialias: false, 
                  toneMapping: THREE.ReinhardToneMapping, 
                  toneMappingExposure: 1.2 
              }}
          >
              <PerspectiveCamera makeDefault position={[0, CAMERA_HEIGHT, CAMERA_DEPTH]} near={0.1} far={2000} />
              <Suspense fallback={null}>
                  <GameController {...props} />
                  
                  <color attach="background" args={['#050510']} />
                  <fog attach="fog" args={['#050510', 30, 800]} />
                  
                  <ambientLight intensity={0.2} />
                  <pointLight position={[20, 50, -50]} intensity={0.8} color="#00ffff" />
                  <pointLight position={[-20, 50, -50]} intensity={0.8} color="#ff00ff" />

                  <EffectComposer enableNormalPass={false}>
                      <Bloom 
                        luminanceThreshold={0.15} 
                        intensity={0.8} 
                        radius={0.6} 
                        mipmapBlur 
                      />
                      <Noise opacity={0.02} />
                      <Vignette darkness={0.6} />
                      <ChromaticAberration offset={[0.001, 0.001]} />
                  </EffectComposer>
                  
                  <Stars count={2000} fade speed={1} />
              </Suspense>
          </Canvas>
      </div>
      <Loader />
    </>
  );
};

export default GameScene;
