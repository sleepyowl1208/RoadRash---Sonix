
import { Howl, Howler } from 'howler';

export class AudioManager {
  private engine: Howl | null = null;
  private siren: Howl | null = null;
  private impact: Howl | null = null;
  private wind: Howl | null = null;
  
  private engineId: number = 0;
  private sirenId: number = 0;
  private windId: number = 0;

  constructor() {
    // Check if running in browser
    if (typeof window !== 'undefined') {
        this.loadSounds();
    }
  }

  private loadSounds() {
    try {
        this.engine = new Howl({
          src: ['https://assets.mixkit.co/active_storage/sfx/2592/2592-preview.m4a'], 
          loop: true,
          volume: 0.3,
          rate: 0.5,
          html5: false
        });

        this.siren = new Howl({
          src: ['https://assets.mixkit.co/active_storage/sfx/2972/2972-preview.m4a'], 
          loop: true,
          volume: 0.0,
        });

        this.impact = new Howl({
          src: ['https://assets.mixkit.co/active_storage/sfx/2048/2048-preview.m4a'],
          volume: 0.8
        });

        this.wind = new Howl({
            src: ['https://assets.mixkit.co/active_storage/sfx/1299/1299-preview.m4a'],
            loop: true,
            volume: 0
        });
    } catch (e) {
        console.warn("Audio failed to load", e);
    }
  }

  start() {
    if (typeof window === 'undefined') return;
    
    // Safely resume context
    if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(e => console.warn("Audio Context Resume failed", e));
    }
    
    if (this.engine && !this.engine.playing(this.engineId)) {
        this.engineId = this.engine.play();
    }
    if (this.wind && !this.wind.playing(this.windId)) {
        this.windId = this.wind.play();
    }
    if (this.siren && !this.siren.playing(this.sirenId)) {
        this.sirenId = this.siren.play();
    }
  }

  stop() {
    this.engine?.stop();
    this.siren?.stop();
    this.wind?.stop();
  }

  updateEngine(rpm: number, speed: number) {
    if (!this.engine || !this.wind) return;

    // Pitch engine based on RPM (1500 - 13000)
    // Map 1500 -> 0.5 rate, 13000 -> 2.0 rate
    const normalizedRPM = Math.max(0, (rpm - 1500) / 11500);
    const rate = 0.5 + (normalizedRPM * 1.5);
    this.engine.rate(rate, this.engineId);
    
    // Wind volume based on speed
    const windVol = Math.min(1.0, speed / 80);
    this.wind.volume(windVol * 0.6, this.windId);
  }

  updateSiren(distance: number) {
    if (!this.siren) return;
    const maxDist = 100;
    const vol = Math.max(0, 1 - (distance / maxDist)) * 0.5;
    this.siren.volume(vol, this.sirenId);
  }

  playCrash() {
    this.impact?.play();
  }
}
