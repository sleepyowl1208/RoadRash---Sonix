
import { Howl, Howler } from 'howler';

export class AudioManager {
  private static instance: AudioManager;
  private engine: Howl | null = null;
  private siren: Howl | null = null;
  private impact: Howl | null = null;
  private bgm: Howl | null = null;
  
  private engineId: number = 0;
  private sirenId: number = 0;
  private bgmId: number = 0;
  private isInitialized: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
        this.loadSounds();
    }
  }

  public static getInstance(): AudioManager {
      if (!AudioManager.instance) {
          AudioManager.instance = new AudioManager();
      }
      return AudioManager.instance;
  }

  private loadSounds() {
    try {
        // Ducati Style High-Rev Engine
        this.engine = new Howl({
          src: ['https://assets.mixkit.co/active_storage/sfx/2592/2592-preview.m4a'], 
          loop: true,
          volume: 0.2, 
          rate: 1.0,
          html5: false,
          preload: true
        });

        // Piercing Police Siren
        this.siren = new Howl({
          src: ['https://assets.mixkit.co/active_storage/sfx/2972/2972-preview.m4a'], 
          loop: true,
          volume: 0.0,
          preload: true
        });

        // Heavy Metal/Crunch Impact
        this.impact = new Howl({
          src: ['https://assets.mixkit.co/active_storage/sfx/2048/2048-preview.m4a'],
          volume: 0.8,
          preload: true
        });

        // High Octane BGM
        this.bgm = new Howl({
            src: ['https://assets.mixkit.co/active_storage/sfx/228/228-preview.m4a'], 
            loop: true,
            volume: 0.4, 
            preload: true
        });
        
        this.isInitialized = true;
    } catch (e) {
        console.warn("Audio failed to load", e);
    }
  }

  start() {
    if (typeof window === 'undefined') return;
    
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
    }
    
    if (this.engine && !this.engine.playing(this.engineId)) {
        this.engineId = this.engine.play();
        this.engine.fade(0, 0.3, 1000, this.engineId);
    }
    
    if (this.bgm && !this.bgm.playing(this.bgmId)) {
        this.bgmId = this.bgm.play();
        this.bgm.fade(0, 0.4, 2000, this.bgmId);
    }

    if (this.siren && !this.siren.playing(this.sirenId)) {
        this.sirenId = this.siren.play();
    }
  }

  stop() {
    this.engine?.stop();
    this.siren?.stop();
    this.bgm?.stop();
  }

  // Adjusted to accept raw input for aggressive revving
  updateEngine(rpm: number, speed: number) {
    if (!this.engine) return;

    // Ducati V4 Simulation
    // If RPM is spiking (acceleration), pitch goes way up
    const normalizedRPM = Math.max(0, (rpm - 1000) / 13000);
    
    // Base pitch on speed but emphasize RPM for the "gear whine" effect
    const rate = 0.5 + (normalizedRPM * 2.0); 
    
    this.engine.rate(rate, this.engineId);
    
    // Louder at high RPM
    const vol = 0.2 + (normalizedRPM * 0.3);
    this.engine.volume(vol, this.engineId);
  }

  updateSiren(distance: number) {
    if (!this.siren) return;
    const maxDist = 150;
    let vol = 0;
    if (distance < maxDist) {
        const proximity = 1 - (distance / maxDist);
        vol = proximity * proximity * 0.8; 
    }
    this.siren.volume(vol, this.sirenId);
    this.siren.rate(1.0 + (vol * 0.1), this.sirenId);
  }

  playCrash() {
    this.impact?.play();
  }
}
