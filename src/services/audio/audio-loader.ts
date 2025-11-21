import { Injectable } from '@angular/core';

export type SoundName =
  | 'launch'
  | 'capture'
  | 'celebrate'
  | 'blink'
  | 'rescue'
  | 'paralyzed'
  | 'reload'
  | 'empty'
  | 'wormhole_open'
  | 'wormhole_close'
  | 'star_spawn'
  | 'warp'
  | 'supernova'
  | 'alert';

export type PooledSoundName = 'explosion' | 'fire';
export type LoopSoundName =
  | 'engine'
  | 'orbit'
  | 'background_music'
  | 'normal_mode'
  | 'hunting_theme'
  | 'cooperative_theme'
  | 'victory_theme';

export type SoundAssetName = SoundName | PooledSoundName | LoopSoundName;

export interface SoundAsset {
  name: SoundAssetName;
  path: string;
  type: 'oneshot' | 'pool' | 'loop';
  poolSize?: number;
  initialVolume: number;
}

export const SOUND_ASSETS: SoundAsset[] = [
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
  { name: 'star_spawn', path: 'blink.mp3', type: 'oneshot', initialVolume: 0.5 },
  { name: 'warp', path: 'whoosh.wav', type: 'oneshot', initialVolume: 0.5 },
  { name: 'supernova', path: 'explosion.mp3', type: 'oneshot', initialVolume: 0.5 },
  { name: 'alert', path: 'paralyzed.wav', type: 'oneshot', initialVolume: 0.3 },
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
  providedIn: 'root',
})
export class AudioLoader {
  private sounds = new Map<SoundAssetName, HTMLAudioElement>();
  private soundPools = new Map<PooledSoundName, { pool: HTMLAudioElement[]; index: number }>();

  constructor() {
    this.loadSounds();
  }

  getSound(name: SoundAssetName): HTMLAudioElement | undefined {
    return this.sounds.get(name);
  }

  getNextPooledSound(name: PooledSoundName): HTMLAudioElement | undefined {
    const poolData = this.soundPools.get(name);
    if (!poolData) {
      return undefined;
    }
    const sound = poolData.pool[poolData.index];
    poolData.index = (poolData.index + 1) % poolData.pool.length;
    return sound;
  }

  getAsset(name: SoundAssetName): SoundAsset | undefined {
    return SOUND_ASSETS.find(asset => asset.name === name);
  }

  cleanup(): void {
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

  private loadSounds(): void {
    SOUND_ASSETS.forEach(asset => {
      const soundUrl = this.getSoundUrl(asset.path);

      if (asset.type === 'oneshot' || asset.type === 'loop') {
        const audio = new Audio(soundUrl);
        audio.preload = 'auto';
        audio.volume = asset.initialVolume;
        if (asset.type === 'loop') {
          audio.loop = true;
        }
        this.sounds.set(asset.name, audio);
      } else if (asset.type === 'pool') {
        const pool: HTMLAudioElement[] = [];
        for (let i = 0; i < (asset.poolSize || 5); i++) {
          const audio = new Audio(soundUrl);
          audio.preload = 'auto';
          audio.volume = asset.initialVolume;
          pool.push(audio);
        }
        this.soundPools.set(asset.name as PooledSoundName, { pool, index: 0 });
      }
    });
  }

  private getSoundUrl(relativePath: string): string {
    return `assets/sounds/${relativePath}`;
  }
}
