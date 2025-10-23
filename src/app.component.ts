import { Component, ChangeDetectionStrategy, signal, inject, PLATFORM_ID, afterNextRender, OnDestroy, ViewChild, ElementRef, computed } from '@angular/core';
import { StarChasersComponent } from './components/star-chasers/star-chasers.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface Score {
  color: 'Red' | 'Green' | 'Blue';
  value: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StarChasersComponent, CommonModule],
})
export class AppComponent implements OnDestroy {
  isFullscreen = signal(false);
  isAudioMuted = signal(true);
  
  @ViewChild('audioPlayer') private audioPlayerRef!: ElementRef<HTMLAudioElement>;
  private platformId = inject(PLATFORM_ID);
  
  private clockIntervalId?: number;
  currentTime = signal(new Date());

  timeDigits = computed(() => this.formatTime(this.currentTime()).split(''));
  dateDigits = computed(() => this.formatDate(this.currentTime()).split(''));

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.addEventListener('fullscreenchange', this.onFullscreenChange);
        this.clockIntervalId = window.setInterval(() => {
          this.currentTime.set(new Date());
        }, 1000);
      }
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      if (this.clockIntervalId) {
        clearInterval(this.clockIntervalId);
      }
    }
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private onFullscreenChange = () => {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  toggleFullscreen(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }

  async toggleAudio(): Promise<void> {
    if (!this.audioPlayerRef) return;
    const audio = this.audioPlayerRef.nativeElement;

    // First interaction: audio is paused. We need to play it and unmute.
    if (audio.paused) {
      try {
        audio.volume = 0.3;
        await audio.play();
        this.isAudioMuted.set(false); // We want it unmuted now
        audio.muted = false;
      } catch (e) {
        console.error("Audio playback failed. User interaction might be required.", e);
        // If play fails, do nothing and keep it muted.
        this.isAudioMuted.set(true);
      }
      return;
    }

    // Subsequent interactions: audio is playing, just toggle mute.
    const newMutedState = !this.isAudioMuted();
    this.isAudioMuted.set(newMutedState);
    audio.muted = newMutedState;
  }
}