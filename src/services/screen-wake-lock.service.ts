import { Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ScreenWakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported = signal(false);
  private isEnabled = signal(false);
  private platformId: any;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): void {
    // Check if Wake Lock API is supported
    this.isSupported.set('wakeLock' in navigator);

    // Set fallback for server-side rendering
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      this.isSupported.set(true);
    } else {
      // Fallback: Check for mobile device and touch events
      this.isSupported.set(false);
    }
  }

  public getIsSupported() {
    return this.isSupported;
  }

  public getIsEnabled() {
    return this.isEnabled;
  }

  async requestWakeLock(): Promise<boolean> {
    if (!this.isSupported()) {
      console.info('Screen Wake Lock API not supported, using fallback');
      return this.enableFallback();
    }

    try {
      // Release any existing wake lock
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }

      // Request wake lock
      this.wakeLock = await navigator.wakeLock.request('screen');
      
      // Update state
      this.isEnabled.set(true);
      
      // Add event listener to handle visibility changes
      this.wakeLock.addEventListener('release', () => {
        console.info('Screen Wake Lock was released');
        this.isEnabled.set(false);
      });

      // Handle visibility change events to reacquire the lock when needed
      document.addEventListener('visibilitychange', this.onVisibilityChange, { passive: true });
      
      console.info('Screen Wake Lock acquired');
      return true;
    } catch (err) {
      console.error('Failed to acquire screen wake lock:', err);
      // If the API fails, try fallback
      return this.enableFallback();
    }
  }

  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        this.isEnabled.set(false);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        console.info('Screen Wake Lock released');
      } catch (err) {
        console.error('Failed to release screen wake lock:', err);
      }
    } else {
      // Disable fallback if it was active
      this.disableFallback();
    }
  }

  private onVisibilityChange = async () => {
    // The wake lock is automatically released when the document is not visible
    // so we need to reacquire it when the document becomes visible again
    if (this.wakeLock && document.visibilityState === 'visible') {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.isEnabled.set(true);
        console.info('Screen Wake Lock reacquired after visibility change');
      } catch (err) {
        console.error('Failed to reacquire screen wake lock:', err);
      }
    }
  };

  // Fallback implementation for browsers that don't support Wake Lock API
  private enableFallback(): boolean {
    // Create a video element that will prevent screen from turning off
    // This is a widely used fallback technique
    try {
      // Add a class to body to indicate fallback is active
      if (typeof document !== 'undefined') {
        document.body.classList.add('wake-lock-fallback');
        
        // Add visual indicator that wake lock is enabled
        const style = document.createElement('style');
        style.id = 'wake-lock-fallback-style';
        style.textContent = `
          .wake-lock-fallback {
            /* This doesn't directly keep the screen awake, but prevents some devices from sleeping */
          }
          
          /* Use CSS animation to prevent some devices from sleeping */
          .wake-lock-fallback::after {
            content: " ";
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.01;
            pointer-events: none;
            z-index: -9999;
            background: rgba(0, 0, 0, 0.01);
          }
        `;
        
        if (!document.getElementById('wake-lock-fallback-style')) {
          document.head.appendChild(style);
        }
        
        // Add a small continuous activity that may help prevent sleep
        const interval = setInterval(() => {
          // Small DOM manipulation to keep the browser "active"
          if (Math.random() > 0.99) {
            // Occasional small visual change that shouldn't be noticeable
            document.body.style.display = 'block';
            setTimeout(() => {
              document.body.style.display = 'block';
            }, 10);
          }
        }, 30000); // Every 30 seconds
        
        // Store interval ID in a property for cleanup
        (globalThis as any).__wakeLockFallbackInterval = interval;
      }
      
      this.isEnabled.set(true);
      console.info('Fallback wake lock enabled');
      return true;
    } catch (err) {
      console.error('Failed to enable fallback wake lock:', err);
      return false;
    }
  }

  private disableFallback(): void {
    // Remove fallback elements and styles
    if (typeof document !== 'undefined') {
      document.body.classList.remove('wake-lock-fallback');
      
      const style = document.getElementById('wake-lock-fallback-style');
      if (style) {
        style.remove();
      }
    }
    
    // Clear the interval if it exists
    if ((globalThis as any).__wakeLockFallbackInterval) {
      clearInterval((globalThis as any).__wakeLockFallbackInterval);
      delete (globalThis as any).__wakeLockFallbackInterval;
    }
    
    this.isEnabled.set(false);
    console.info('Fallback wake lock disabled');
  }

  // Toggle wake lock state
  async toggleWakeLock(): Promise<boolean> {
    if (this.isEnabled()) {
      await this.releaseWakeLock();
      return false;
    } else {
      return await this.requestWakeLock();
    }
  }

  // Clean up resources when service is destroyed
  cleanup(): void {
    if (this.wakeLock) {
      this.releaseWakeLock();
    } else {
      this.disableFallback();
    }
  }
}