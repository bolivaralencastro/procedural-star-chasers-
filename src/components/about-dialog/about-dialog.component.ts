import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinkedInShareService } from '../../services/linkedin-share.service';

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto"
        (click)="closeDialog($event)"
      >
        <div 
          class="bg-gray-900/95 border border-purple-500/30 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="sticky top-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-purple-500/30 p-6 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              About Procedural Star Chasers
            </h1>
            <button
              (click)="close()"
              class="text-gray-400 hover:text-white transition-colors p-2"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-8 space-y-8 text-gray-300">
            <!-- Concept Section -->
            <section>
              <h2 class="text-xl font-bold text-purple-400 mb-4">✨ The Concept</h2>
              <p class="leading-relaxed">
                In the infinite expanse of a procedurally-generated cosmos, three sentient vessels navigate a universe of perpetual motion. Each ship—Red, Green, Blue—possesses its own personality, aspirations, and philosophy.
              </p>
              <p class="leading-relaxed mt-3">
                <strong class="text-purple-300">Procedural Star Chasers</strong> is not just a game about collecting stars. It's a meditation on autonomy, emergence, and the delicate balance between individual ambition and collective survival.
              </p>
            </section>

            <!-- Artistic Vision -->
            <section>
              <h2 class="text-xl font-bold text-blue-400 mb-4">🎨 Artistic Vision</h2>
              <p class="leading-relaxed mb-3">
                Like Monument Valley, this experience embraces:
              </p>
              <ul class="space-y-2 ml-4">
                <li class="flex items-start">
                  <span class="text-blue-400 mr-3">→</span>
                  <span><strong>Impossible Geometries</strong> - The playfield bends and shifts, creating unexpected orbital patterns</span>
                </li>
                <li class="flex items-start">
                  <span class="text-blue-400 mr-3">→</span>
                  <span><strong>Minimal Aesthetic</strong> - A dark cosmos punctuated by purposeful visual elements</span>
                </li>
                <li class="flex items-start">
                  <span class="text-blue-400 mr-3">→</span>
                  <span><strong>Ambient Soundscape</strong> - Music and effects that evolve with the gameplay state</span>
                </li>
                <li class="flex items-start">
                  <span class="text-blue-400 mr-3">→</span>
                  <span><strong>Narrative Through Mechanics</strong> - Personalities emerge through actions and voices</span>
                </li>
                <li class="flex items-start">
                  <span class="text-blue-400 mr-3">→</span>
                  <span><strong>Meditative Gameplay</strong> - Always something to contemplate</span>
                </li>
              </ul>
            </section>

            <!-- Creator Section -->
            <section class="border-t border-gray-700 pt-8">
              <h2 class="text-xl font-bold text-cyan-400 mb-4">👨‍🎨 Created By</h2>
              <div class="space-y-3">
                <h3 class="text-lg font-bold text-white">Bolivar Alencastro</h3>
                <p class="leading-relaxed text-gray-400">
                  Product Designer, Digital Artist & Internet Enthusiast
                </p>
                <p class="leading-relaxed text-gray-400">
                  With a passion for creating immersive experiences and exploring the intersection of art, technology, and interactivity. Bolivar combines strategic design thinking with artistic vision to craft meaningful digital experiences.
                </p>
                <div class="flex flex-wrap gap-3 mt-4">
                  <a
                    href="https://www.bolivaralencastro.com.br/?ref=Star-Chasers&utm_source=site&utm_medium=divulgacao&utm_campaign=star-chasers&utm_term=sobre&utm_content=site"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/50"
                  >
                    Visit Portfolio →
                  </a>
                </div>
              </div>
            </section>

            <!-- Share Section -->
            <section class="border-t border-gray-700 pt-8">
              <h2 class="text-xl font-bold text-green-400 mb-4">🚀 Share This Experience</h2>
              <p class="leading-relaxed text-gray-400 mb-4">
                Love this game? Share it with your professional network and help others discover this unique interstellar experience.
              </p>
              <div class="flex flex-wrap gap-3">
                <button
                  (click)="shareOnLinkedIn()"
                  class="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/50 text-white"
                  title="Share on LinkedIn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                  </svg>
                  Share on LinkedIn
                </button>
                
                <button
                  (click)="copyShareLink()"
                  class="flex items-center gap-2 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-gray-500/30 text-white"
                  [title]="copyFeedback() ? 'Copied!' : 'Copy share link to clipboard'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  {{ copyFeedback() ? '✓ Copied!' : 'Copy Link' }}
                </button>
              </div>
            </section>

            <!-- Philosophy -->
            <section class="border-t border-gray-700 pt-8 pb-4">
              <p class="text-center italic text-gray-500 text-lg">
                "In the vast expanse of space, three ships discover that even in isolation, they're never truly alone."
              </p>
            </section>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      --scrollbar-thumb: #8b5cf6;
      --scrollbar-track: #1f2937;
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #a78bfa;
    }
  `]
})
export class AboutDialogComponent {
  isOpen = signal(false);
  copyFeedback = signal(false);

  private linkedInShareService = inject(LinkedInShareService);

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  shareOnLinkedIn() {
    this.linkedInShareService.shareOnLinkedIn();
  }

  async copyShareLink() {
    const success = await this.linkedInShareService.copyShareLink();
    if (success) {
      this.copyFeedback.set(true);
      setTimeout(() => this.copyFeedback.set(false), 2000);
    }
  }

  closeDialog(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
