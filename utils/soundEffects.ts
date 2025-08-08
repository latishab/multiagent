class SoundEffectsManager {
  private static instance: SoundEffectsManager;
  private audioContext: AudioContext | null = null;
  private clickSound: HTMLAudioElement | null = null;
  private audioPool: HTMLAudioElement[] = [];
  private currentAudioIndex: number = 0;
  private isMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private volume: number = 0.5;
  private sfxVolume: number = 0.5;

  private constructor() {
    this.initAudio();
  }

  public static getInstance(): SoundEffectsManager {
    if (!SoundEffectsManager.instance) {
      SoundEffectsManager.instance = new SoundEffectsManager();
    }
    return SoundEffectsManager.instance;
  }

  private initAudio() {
    if (typeof window !== 'undefined') {
      this.clickSound = new Audio('/assets/sound_effects/click.mp3');
      this.clickSound.preload = 'auto';
      this.clickSound.volume = this.volume;
      
      // Preload the audio by loading it immediately
      this.clickSound.load();
      
      // Create multiple audio instances for rapid clicking
      this.createAudioPool();
    }
  }

  private createAudioPool() {
    // Create multiple audio instances to handle rapid clicking
    this.audioPool = [];
    for (let i = 0; i < 3; i++) {
      const audio = new Audio('/assets/sound_effects/click.mp3');
      audio.preload = 'auto';
      audio.volume = this.volume;
      audio.load();
      this.audioPool.push(audio);
    }
    this.currentAudioIndex = 0;
  }

  public playClick() {
    if (this.isMuted || this.isSfxMuted) return;
    
    try {
      // Use audio pool for better responsiveness
      if (this.audioPool.length > 0) {
        const audio = this.audioPool[this.currentAudioIndex];
        audio.currentTime = 0;
        audio.volume = this.sfxVolume;
        audio.play().catch(error => {
          console.error('Error playing click sound:', error);
        });
        
        // Cycle through the audio pool
        this.currentAudioIndex = (this.currentAudioIndex + 1) % this.audioPool.length;
      } else if (this.clickSound) {
        // Fallback to single audio instance
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(error => {
          console.error('Error playing click sound:', error);
        });
      }
    } catch (error) {
      console.error('Error playing click sound:', error);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setSfxMuted(sfxMuted: boolean) {
    this.isSfxMuted = sfxMuted;
  }

  public setVolume(volume: number) {
    this.volume = volume;
    // This is for music volume, not SFX
  }

  public setSfxVolume(sfxVolume: number) {
    this.sfxVolume = sfxVolume;
    if (this.clickSound) {
      this.clickSound.volume = sfxVolume;
    }
    this.audioPool.forEach(audio => {
      audio.volume = sfxVolume;
    });
  }

  public getVolume(): number {
    return this.volume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public isMutedState(): boolean {
    return this.isMuted;
  }

  public isSfxMutedState(): boolean {
    return this.isSfxMuted;
  }
}

export const soundEffects = SoundEffectsManager.getInstance(); 