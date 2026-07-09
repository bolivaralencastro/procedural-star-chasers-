import { signal } from '../core/reactive';
import { SettingsStore } from '../services/settings-store';
import { AudioEffects } from './audio-effects';
import {
  AudioLoader,
  LoopSoundName,
  PooledSoundName,
  SoundName,
} from './audio-loader';
import { AudioPlayback } from './audio-playback';

export type { LoopSoundName, PooledSoundName, SoundName } from './audio-loader';

export class AudioService {
  isMuted = signal(SettingsStore.get('muted', false));

  private audioContextUnlocked = false;
  private firstInteractionHandled = false;
  private interactionListenersRegistered = false;

  private readonly audioLoader: AudioLoader;
  private readonly playback: AudioPlayback;
  private readonly audioEffects: AudioEffects;

  constructor() {
    this.audioLoader = new AudioLoader();
    this.playback = new AudioPlayback(this.audioLoader);
    this.audioEffects = new AudioEffects(this.audioLoader, this.playback);
    this.registerInteractionUnlock();
  }

  handleFirstInteraction(): void {
    if (this.firstInteractionHandled) {
      return;
    }

    this.firstInteractionHandled = true;
    this.audioContextUnlocked = true;

    this.audioEffects.onAudioUnlocked(this.isMuted());
  }

  async toggleMute(): Promise<void> {
    if (!this.audioContextUnlocked) {
      this.handleFirstInteraction();
    }

    const newMutedState = !this.isMuted();
    this.isMuted.set(newMutedState);
    SettingsStore.set('muted', newMutedState);

    this.audioEffects.applyMuteState(newMutedState, this.audioContextUnlocked);
  }

  playSound(name: SoundName): void {
    this.playback.playSound(name, this.isMuted());
  }

  playPooledSound(name: PooledSoundName): void {
    this.playback.playPooledSound(name, this.isMuted());
  }

  updateGameSounds(
    isOrbiting: boolean,
    isHunting: boolean,
    isCoop: boolean,
    orbitingShipSpeed?: number,
  ): void {
    this.audioEffects.updateGameSounds({
      isOrbiting,
      isHunting,
      isCoop,
      orbitingShipSpeed,
      isMuted: this.isMuted(),
      audioUnlocked: this.audioContextUnlocked,
    });
  }

  updateBackgroundMusic(
    isHunting: boolean,
    isCoop: boolean,
    anyShipCelebrating: boolean,
  ): void {
    this.audioEffects.updateBackgroundMusic({
      isHunting,
      isCoop,
      anyShipCelebrating,
      isMuted: this.isMuted(),
      audioUnlocked: this.audioContextUnlocked,
    });
  }

  cleanup(): void {
    this.audioLoader.cleanup();
  }

  /** App-wide singleton — replaces Angular's providedIn: 'root'. */
  private static instance: AudioService | null = null;

  static get shared(): AudioService {
    return (AudioService.instance ??= new AudioService());
  }

  private registerInteractionUnlock(): void {
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
}
