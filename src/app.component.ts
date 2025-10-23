import { Component, ChangeDetectionStrategy, signal, inject, PLATFORM_ID, afterNextRender, OnDestroy, computed } from '@angular/core';
import { StarChasersComponent } from './components/star-chasers/star-chasers.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AudioService } from './services/audio.service';
import { ScreenWakeLockService } from './services/screen-wake-lock.service';

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
  isWakeLockEnabled = signal(false);
  
  private platformId = inject(PLATFORM_ID);
  private audioService = inject(AudioService);
  private screenWakeLockService = inject(ScreenWakeLockService);
  
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
        
        // Initialize wake lock state
        this.isWakeLockEnabled.set(this.screenWakeLockService.getIsEnabled()());
        this.screenWakeLockService.getIsEnabled().subscribe(enabled => {
          this.isWakeLockEnabled.set(enabled);
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('fullscreenchange', this.onFullscreenChange);
      if (this.clockIntervalId) {
        clearInterval(this.clockIntervalId);
      }
      this.audioService.cleanup();
      this.screenWakeLockService.cleanup();
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

  toggleAudio(): void {
    this.audioService.toggleMute();
  }

  toggleWakeLock(): void {
    this.screenWakeLockService.toggleWakeLock();
  }
}
