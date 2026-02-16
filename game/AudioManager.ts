
import { Howl, Howler } from 'howler';

export class AudioManager {
  private static instance: AudioManager;
  private engine: Howl | null = null;
  private siren: Howl | null = null;
  private impact: Howl | null = null;
  private bgm: Howl | null = null;
  private pickup: Howl | null = null;
  
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
        // --- AUDIO ASSETS CONFIGURATION ---
        
        // 1. ENGINE SOUND (Looping Motorcycle Rumble)
        this.engine = new Howl({
          src: ['https://cdn.pixabay.com/audio/2024/01/16/audio_0c9b4e7a8e.mp3'], // <--- CHANGE ENGINE MP3 HERE
          loop: true,
          volume: 0.1, 
          rate: 1.0,
          html5: false,
          preload: true
        });

        // 2. POLICE SIREN (Looping Alarm)
        this.siren = new Howl({
          src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_c67160751b.mp3'], // <--- CHANGE SIREN MP3 HERE
          loop: true,
          volume: 0.0,
          preload: true
        });

        // 3. IMPACT / CRASH (One-shot)
        this.impact = new Howl({
          src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3'], // <--- CHANGE CRASH MP3 HERE
          volume: 0.6,
          preload: true
        });

        // 4. BACKGROUND MUSIC (Synthwave Loop)
        this.bgm = new Howl({
            src: ['https://cdn.pixabay.com/audio/2023/10/24/audio_343605e554.mp3'], // <--- CHANGE BGM MP3 HERE
            loop: true,
            volume: 0.3, 
            preload: true
        });

        // 5. FUEL PICKUP (UI Sound)
        this.pickup = new Howl({
            src: ['https://cdn.pixabay.com/audio/2022/03/24/audio_784f18d6a7.mp3'], // <--- CHANGE PICKUP MP3 HERE
            volume: 0.5,
            preload: true
        });
        
        this.isInitialized = true;
    } catch (e) {
        console.warn("Audio failed to load", e);
    }
  }

  start() {
    if (typeof window === 'undefined') return;
    
    // Ensure AudioContext is resumed (browser policy)
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
    }
    
    // Smooth fade-in for immersion
    if (this.engine && !this.engine.playing(this.engineId)) {
        this.engineId = this.engine.play();
        this.engine.fade(0, 0.2, 1000, this.engineId);
    }
    
    if (this.bgm && !this.bgm.playing(this.bgmId)) {
        this.bgmId = this.bgm.play();
        this.bgm.fade(0, 0.3, 2000, this.bgmId);
    }

    if (this.siren && !this.siren.playing(this.sirenId)) {
        this.sirenId = this.siren.play();
        this.siren.volume(0, this.sirenId); // Start silent
    }
  }

  stop() {
    this.engine?.stop();
    this.siren?.stop();
    this.bgm?.stop();
  }

  updateEngine(rpm: number, speed: number) {
    if (!this.engine) return;

    // Pitch modulation: 1000 RPM -> 0.5 rate, 13000 RPM -> 2.0 rate
    const normalizedRPM = Math.max(0, (rpm - 1000) / 13000);
    const rate = 0.5 + (normalizedRPM * 1.5); 
    
    this.engine.rate(rate, this.engineId);
    
    // Volume modulation based on speed/load
    const vol = 0.1 + (speed / 100) * 0.3;
    this.engine.volume(Math.min(0.5, vol), this.engineId);
  }

  updateSiren(distance: number) {
    if (!this.siren) return;
    const maxDist = 200;
    
    // Inverse distance attenuation
    let vol = 0;
    if (distance < maxDist) {
        const proximity = 1 - (distance / maxDist);
        vol = proximity * 0.6; // Max siren volume
    }
    this.siren.volume(vol, this.sirenId);
  }

  playCrash() {
    if (!this.impact) return;
    // Randomize playback rate slightly for variety
    this.impact.rate(0.9 + Math.random() * 0.2);
    this.impact.play();
  }

  playPickup() {
    this.pickup?.play();
  }
}
