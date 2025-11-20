import { Injectable } from '@angular/core';
import { AudioLoader, LoopSoundName } from './audio-loader';
import { AudioPlayback } from './audio-playback';

interface GameSoundParams {
  isOrbiting: boolean;
  isHunting: boolean;
  isCoop: boolean;
  orbitingShipSpeed?: number;
  isMuted: boolean;
  audioUnlocked: boolean;
}

interface BackgroundMusicParams {
  isHunting: boolean;
  isCoop: boolean;
  anyShipCelebrating: boolean;
  isMuted: boolean;
  audioUnlocked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AudioEffects {
  private currentBackgroundTrack: LoopSoundName | null = null;
  private lastBackgroundPlayAttempt = 0;

  constructor(
    private readonly audioLoader: AudioLoader,
    private readonly playback: AudioPlayback,
  ) {}

  onAudioUnlocked(isMuted: boolean): void {
    if (this.currentBackgroundTrack && !isMuted) {
      this.attemptToPlayCurrentBackgroundTrack();
    }
  }

  applyMuteState(isMuted: boolean, audioUnlocked: boolean): void {
    if (isMuted) {
      this.pauseCurrentBackground();
      this.playback.stopLoop('engine');
      this.playback.stopLoop('orbit');
      return;
    }

    if (audioUnlocked) {
      this.attemptToPlayCurrentBackgroundTrack();
    }
  }

  updateGameSounds(params: GameSoundParams): void {
    if (!params.audioUnlocked) {
      return;
    }

    if (params.isMuted) {
      this.playback.stopLoop('engine');
      this.playback.stopLoop('orbit');
      return;
    }

    this.updateEngineLoop(params);
    this.updateOrbitLoop(params);
  }

  updateBackgroundMusic(params: BackgroundMusicParams): void {
    const targetTrack: LoopSoundName = 'normal_mode';

    if (this.currentBackgroundTrack === targetTrack) {
      if (params.audioUnlocked && !params.isMuted) {
        const sound = this.audioLoader.getSound(targetTrack);
        if (
          sound &&
          sound.paused &&
          !this.playback.isBroken(targetTrack) &&
          Date.now() - this.lastBackgroundPlayAttempt > 3000
        ) {
          this.attemptToPlayCurrentBackgroundTrack();
        }
      }
      return;
    }

    this.pauseCurrentBackground();
    this.currentBackgroundTrack = targetTrack;

    if (params.audioUnlocked && !params.isMuted) {
      this.attemptToPlayCurrentBackgroundTrack();
    }
  }

  private updateEngineLoop(params: GameSoundParams): void {
    if (this.playback.isBroken('engine')) {
      return;
    }

    const engineSound = this.audioLoader.getSound('engine');
    if (!engineSound) {
      return;
    }

    let targetEngineVolume = 0;
    let targetPlaybackRate = 1.0;

    if (params.isHunting || params.isCoop) {
      targetEngineVolume = 0.3;
      targetPlaybackRate = 1.4;
    } else if (!params.isOrbiting) {
      targetEngineVolume = 0.15;
      targetPlaybackRate = 1.0;
    }

    if (targetEngineVolume > 0) {
      this.playback.playLoop('engine');
    }

    engineSound.volume = this.lerp(engineSound.volume, targetEngineVolume, 0.1);
    engineSound.playbackRate = this.lerp(engineSound.playbackRate, targetPlaybackRate, 0.1);

    if (engineSound.volume < 0.01 && !engineSound.paused) {
      engineSound.pause();
    }
  }

  private updateOrbitLoop(params: GameSoundParams): void {
    if (this.playback.isBroken('orbit')) {
      return;
    }

    const orbitSound = this.audioLoader.getSound('orbit');
    if (!orbitSound) {
      return;
    }

    const targetOrbitVolume = params.isOrbiting ? 0.8 : 0;

    if (params.isOrbiting) {
      this.playback.playLoop('orbit');
    }

    if (params.isOrbiting && params.orbitingShipSpeed !== undefined) {
      orbitSound.playbackRate = Math.max(0.5, Math.min(2.0, 1 + params.orbitingShipSpeed / 0.3));
    }

    orbitSound.volume = this.lerp(orbitSound.volume, targetOrbitVolume, 0.1);

    if (!params.isOrbiting && orbitSound.volume < 0.01 && !orbitSound.paused) {
      orbitSound.pause();
      orbitSound.currentTime = 0;
    }
  }

  private pauseCurrentBackground(): void {
    if (!this.currentBackgroundTrack) {
      return;
    }
    const currentTrack = this.audioLoader.getSound(this.currentBackgroundTrack);
    if (currentTrack && !currentTrack.paused) {
      currentTrack.pause();
      currentTrack.currentTime = 0;
    }
  }

  private attemptToPlayCurrentBackgroundTrack(): void {
    if (!this.currentBackgroundTrack) {
      return;
    }
    this.lastBackgroundPlayAttempt = Date.now();
    this.playback.playLoop(this.currentBackgroundTrack);
  }

  private lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
  }
}
