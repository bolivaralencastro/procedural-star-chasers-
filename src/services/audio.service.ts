import { Injectable, signal } from '@angular/core';

// Define sound types for better type checking
export type SoundName = 'launch' | 'capture' | 'celebrate' | 'blink' | 'rescue' | 
                 'paralyzed' | 'reload' | 'empty' | 'wormhole_open' | 'wormhole_close';
export type PooledSoundName = 'explosion' | 'fire';
export type LoopSoundName = 'engine' | 'orbit' | 'background_music' | 'normal_mode' | 'hunting_theme' | 'cooperative_theme' | 'victory_theme';

// Define the structure for sound assets
interface SoundAsset {
  name: SoundName | PooledSoundName | LoopSoundName;
  path: string;
  type: 'oneshot' | 'pool' | 'loop';
  poolSize?: number;
  initialVolume: number;
}

const SOUND_ASSETS: SoundAsset[] = [
  // One-shots
  { name: 'launch', path: 'whoosh.wav', type: 'oneshot', initialVolume: 0.5 },
  { name: 'capture', path: 'star-collect.wav', type: 'oneshot', initialVolume: 0.5 },
  { name: 'celebrate', path: 'celebrate.wav', type: 'oneshot', initialVolume: 0.5 },
  { name: 'blink', path: 'blink.mp3', type: 'oneshot', initialVolume: 0.5 },
  { name: 'rescue', path: 'rescue.wav', type: 'oneshot', initialVolume: 0.5 },
  { name: 'paralyzed', path: 'paralyzed.wav', type: 'oneshot', initialVolume: 0.3 },
  { name: 'reload', path: 'reload.wav', type: 'oneshot', initialVolume: 0.4 },
  { name: 'empty', path: 'empty-click.wav', type: 'oneshot', initialVolume: 0.3 },
  { name: 'wormhole_open', path: 'wormhole-open.wav', type: 'oneshot', initialVolume: 0.7 },
  { name: 'wormhole_close', path: 'wormhole-close.wav', type: 'oneshot', initialVolume: 0.7 },
  // Pools
  { name: 'explosion', path: 'explosion.mp3', type: 'pool', poolSize: 5, initialVolume: 0.4 },
  { name: 'fire', path: 'laser_shoot.wav', type: 'pool', poolSize: 5, initialVolume: 0.3 },
  // Loops - Background music tracks
  { name: 'normal_mode', path: 'deep_space.mp3', type: 'loop', initialVolume: 0.3 },
  { name: 'hunting_theme', path: 'hunting_theme.mp3', type: 'loop', initialVolume: 0.3 },
  { name: 'cooperative_theme', path: 'cooperative_theme.mp3', type: 'loop', initialVolume: 0.3 },
  { name: 'victory_theme', path: 'victory_theme.mp3', type: 'loop', initialVolume: 0.3 },
  // Other sound effects that might become loops
  { name: 'engine', path: 'engine_hum.wav', type: 'loop', initialVolume: 0 },
  { name: 'orbit', path: 'orbit_hum.mp3', type: 'loop', initialVolume: 0 },
];

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  isMuted = signal(false);

  private audioContextUnlocked = false;
  private sounds = new Map<string, HTMLAudioElement>();
  private soundPools = new Map<string, { pool: HTMLAudioElement[], index: number }>();
  private currentBackgroundTrack: LoopSoundName | null = null;
  private firstInteractionHandled = false; // Track if first user interaction happened
  private interactionListenersRegistered = false;

  constructor() {
    this.loadSounds();
    this.registerInteractionUnlock();
  }

  private loadSounds() {
    const soundPathPrefix = 'assets/sounds/'; // Organized path for future sound files
    SOUND_ASSETS.forEach(asset => {
      if (asset.type === 'oneshot' || asset.type === 'loop') {
        const audio = new Audio(soundPathPrefix + asset.path);
        audio.volume = asset.initialVolume;
        if (asset.type === 'loop') {
          audio.loop = true;
        }
        this.sounds.set(asset.name, audio);
      } else if (asset.type === 'pool') {
        const pool: HTMLAudioElement[] = [];
        for (let i = 0; i < (asset.poolSize || 5); i++) {
          const audio = new Audio(soundPathPrefix + asset.path);
          audio.volume = asset.initialVolume;
          pool.push(audio);
        }
        this.soundPools.set(asset.name, { pool, index: 0 });
      }
    });
  }

  private registerInteractionUnlock() {
    if (this.interactionListenersRegistered || typeof window === 'undefined') {
      return;
    }

    const unlockHandler = () => this.handleFirstInteraction();
    const unlockEvents: Array<keyof DocumentEventMap> = ['pointerdown', 'touchstart', 'keydown'];

    unlockEvents.forEach(eventName => {
      window.addEventListener(eventName, unlockHandler, { once: true });
    });

    this.interactionListenersRegistered = true;
  }

  private attemptToPlayCurrentBackgroundTrack() {
    if (!this.audioContextUnlocked || this.isMuted() || !this.currentBackgroundTrack) return;
    
    const trackToPlay = this.sounds.get(this.currentBackgroundTrack);
    if (trackToPlay) {
      // Attempt to play the current background track
      const playPromise = trackToPlay.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn(`Could not play background track ${this.currentBackgroundTrack}`, e);
        });
      }
    }
  }

  // Method to handle first user interaction to unlock audio
  public handleFirstInteraction() {
    if (this.firstInteractionHandled) return;

    this.firstInteractionHandled = true;
    this.audioContextUnlocked = true;

    // If we have a background track that should be playing, try to play it now
    if (this.currentBackgroundTrack && !this.isMuted()) {
      this.attemptToPlayCurrentBackgroundTrack();
    }
  }

  async toggleMute() {
    if (!this.audioContextUnlocked) {
      this.handleFirstInteraction();
    }
      
    const newMutedState = !this.isMuted();
    this.isMuted.set(newMutedState);

    // Stop any playing background tracks when muting
    if (newMutedState && this.currentBackgroundTrack) {
      const currentTrack = this.sounds.get(this.currentBackgroundTrack);
      if (currentTrack && !currentTrack.paused) {
        currentTrack.pause();
      }
    } else if (!newMutedState && this.currentBackgroundTrack) {
      // Resume the appropriate track when unmuting
      const trackToResume = this.sounds.get(this.currentBackgroundTrack);
      if (trackToResume) {
        // Attempt to play the track - may fail due to browser autoplay policies
        const playPromise = trackToResume.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn(`Background music autoplay prevented for ${this.currentBackgroundTrack}. User interaction required.`, e);
          });
        }
      }
    }
    
    // Mute/unmute all other looping sounds that might be playing (non-background music loops like engine, orbit)
    this.sounds.forEach((sound, name) => {
        const asset = SOUND_ASSETS.find(a => a.name === name);
        if (asset?.type === 'loop' && 
            name !== 'normal_mode' && 
            name !== 'hunting_theme' && 
            name !== 'cooperative_theme' && 
            name !== 'victory_theme') {
            sound.muted = newMutedState;
        }
    });
  }

  playSound(name: SoundName) {
    if (this.isMuted()) return;
    const sound = this.sounds.get(name);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => { /* ignore play interruption */ });
    }
  }

  playPooledSound(name: PooledSoundName) {
    if (this.isMuted()) return;
    const poolData = this.soundPools.get(name);
    if (poolData) {
      const sound = poolData.pool[poolData.index];
      sound.currentTime = 0;
      sound.play().catch(e => { /* ignore */ });
      poolData.index = (poolData.index + 1) % poolData.pool.length;
    }
  }

  updateGameSounds(isOrbiting: boolean, isHunting: boolean, isCoop: boolean, orbitingShipSpeed?: number) {
    if (!this.audioContextUnlocked) return;

    if (this.isMuted()) {
        this.stopLoop('engine');
        this.stopLoop('orbit');
        return;
    };
    
    // Engine loop
    const engineSound = this.sounds.get('engine');
    if(engineSound) {
        let targetEngineVolume = 0;
        let targetPlaybackRate = 1.0;
        if (isHunting || isCoop) {
            targetEngineVolume = 0.3;
            targetPlaybackRate = 1.4;
        } else if (!isOrbiting) { // Idle sound
            targetEngineVolume = 0.15;
            targetPlaybackRate = 1.0;
        }
        
        if (targetEngineVolume > 0 && engineSound.paused) {
            engineSound.play().catch(e => console.error("Engine sound failed to start", e));
        }
        engineSound.volume = this.lerp(engineSound.volume, targetEngineVolume, 0.1);
        engineSound.playbackRate = this.lerp(engineSound.playbackRate, targetPlaybackRate, 0.1);
        if(engineSound.volume < 0.01 && !engineSound.paused) {
            engineSound.pause();
        }
    }

    // Orbit loop
    const orbitSound = this.sounds.get('orbit');
    if(orbitSound) {
        let targetOrbitVolume = isOrbiting ? 0.6 : 0;
        if (isOrbiting && orbitSound.paused) {
            orbitSound.play().catch(e => console.error("Orbit sound failed to start", e));
        }
        if (isOrbiting && orbitingShipSpeed !== undefined) {
            orbitSound.playbackRate = 1 + (orbitingShipSpeed / 0.3);
        }
        
        orbitSound.volume = this.lerp(orbitSound.volume, targetOrbitVolume, 0.1);
        if (orbitSound.volume < 0.01 && !orbitSound.paused) {
            orbitSound.pause();
            orbitSound.currentTime = 0;
        }
    }
  }
  
  private stopLoop(name: LoopSoundName) {
      const sound = this.sounds.get(name);
      if(sound && !sound.paused) {
          sound.pause();
      }
  }

  private lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
  }

  // Method to change background music based on game state
  updateBackgroundMusic(isHunting: boolean, isCoop: boolean, anyShipCelebrating: boolean) {
    if (!this.audioContextUnlocked || this.isMuted()) return;

    let targetTrack: LoopSoundName | null = null;

    if (anyShipCelebrating) {
      targetTrack = 'victory_theme';
    } else if (isCoop) {
      targetTrack = 'cooperative_theme';
    } else if (isHunting) {
      targetTrack = 'hunting_theme';
    } else {
      targetTrack = 'normal_mode';
    }

    // If the track is already playing, don't do anything
    if (this.currentBackgroundTrack === targetTrack) {
      return;
    }

    // Stop current background track if any
    if (this.currentBackgroundTrack) {
      const currentTrack = this.sounds.get(this.currentBackgroundTrack);
      if (currentTrack && !currentTrack.paused) {
        currentTrack.pause();
        currentTrack.currentTime = 0;
      }
    }

    // Play new track if it's not null and different
    if (targetTrack) {
      const newTrack = this.sounds.get(targetTrack);
      if (newTrack) {
        newTrack.currentTime = 0;
        // Attempt to play the track - may fail due to browser autoplay policies
        const playPromise = newTrack.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            // If playback was prevented due to user interaction requirements, 
            // log it but don't show an error to user
            console.warn(`Background music autoplay prevented for ${targetTrack}. User interaction required.`, e);
            // Store the track so we can play it after user interaction
            this.currentBackgroundTrack = targetTrack;
          });
        }
      }
      this.currentBackgroundTrack = targetTrack;
    }
  }

  cleanup() {
    this.sounds.forEach(sound => {
        sound.pause();
        sound.src = '';
    });
    this.soundPools.forEach(poolData => {
        poolData.pool.forEach(sound => {
            sound.pause();
            sound.src = '';
        });
    });
  }
}
