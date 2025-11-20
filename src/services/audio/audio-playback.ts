import { Injectable } from '@angular/core';
import { AudioLoader, LoopSoundName, PooledSoundName, SoundAssetName, SoundName } from './audio-loader';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayback {
  private brokenSounds = new Set<SoundAssetName>();

  constructor(private readonly audioLoader: AudioLoader) {}

  isBroken(name: SoundAssetName): boolean {
    return this.brokenSounds.has(name);
  }

  playSound(name: SoundName, isMuted: boolean): void {
    if (isMuted || this.isBroken(name)) {
      return;
    }
    const sound = this.audioLoader.getSound(name);
    if (!sound) {
      return;
    }
    this.resetAndPlay(sound, name);
  }

  playPooledSound(name: PooledSoundName, isMuted: boolean): void {
    if (isMuted || this.isBroken(name)) {
      return;
    }
    const sound = this.audioLoader.getNextPooledSound(name);
    if (!sound) {
      return;
    }
    this.resetAndPlay(sound, name);
  }

  playLoop(name: LoopSoundName): HTMLAudioElement | undefined {
    if (this.isBroken(name)) {
      return undefined;
    }
    const loop = this.audioLoader.getSound(name);
    if (!loop) {
      return undefined;
    }
    if (loop.paused) {
      this.resetAndPlay(loop, name);
    }
    return loop;
  }

  stopLoop(name: LoopSoundName): void {
    const sound = this.audioLoader.getSound(name);
    if (sound && !sound.paused) {
      sound.pause();
    }
  }

  handlePlayError(name: SoundAssetName, error: unknown): void {
    if (error instanceof Error) {
      if (error.name === 'NotSupportedError') {
        if (!this.brokenSounds.has(name)) {
          console.warn(`Audio file for '${name}' is not supported or corrupted. Disabling this sound.`, error);
          this.brokenSounds.add(name);
        }
        return;
      }
      if (error.name === 'NotAllowedError') {
        console.warn(`Autoplay prevented for '${name}'. Waiting for user interaction.`);
        return;
      }
    }
    console.error(`Error playing sound '${name}':`, error);
  }

  private resetAndPlay(sound: HTMLAudioElement, name: SoundAssetName): void {
    sound.currentTime = 0;
    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => this.handlePlayError(name, error));
    }
  }
}
