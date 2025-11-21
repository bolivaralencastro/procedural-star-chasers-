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
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto backdrop-blur"
        (click)="closeDialog($event)"
      >
        <div
          class="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto text-gray-100"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-8 pt-8 flex justify-between items-start">
            <h1 class="text-2xl font-semibold text-gray-50">
              Sobre Procedural Star Chasers
            </h1>
            <button
              (click)="close()"
              class="text-gray-400 hover:text-gray-100 transition-colors p-2"
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-8 space-y-8 text-gray-200">
            <!-- Concept Section -->
            <section>
              <h2 class="text-xl font-semibold text-gray-100 mb-4">O Conceito</h2>
              <p class="leading-relaxed">
                Na imensidão de um cosmos gerado proceduralmente, três naves sencientes cruzam um universo de movimento constante. Cada uma — Vermelha, Verde e Azul — possui personalidade, aspirações e filosofia próprias.
              </p>
              <p class="leading-relaxed mt-3">
                <strong class="text-gray-100">Procedural Star Chasers</strong> não é apenas um jogo sobre coletar estrelas. É uma reflexão sobre autonomia, emergência e o delicado equilíbrio entre a ambição individual e a sobrevivência coletiva.
              </p>
            </section>

            <!-- Artistic Vision -->
            <section>
              <h2 class="text-xl font-semibold text-gray-100 mb-4">Visão Artística</h2>
              <p class="leading-relaxed mb-3">
                Assim como Monument Valley, esta experiência abraça:
              </p>
              <ul class="space-y-2 ml-4 list-disc list-inside text-gray-200">
                <li><strong>Geometrias Impossíveis</strong> — O campo de jogo se dobra e se move, criando órbitas inesperadas</li>
                <li><strong>Estética Minimalista</strong> — Um cosmos escuro pontuado por elementos visuais precisos</li>
                <li><strong>Paisagem Sonora Ambiente</strong> — Música e efeitos que evoluem conforme o estado do jogo</li>
                <li><strong>Narrativa pela Mecânica</strong> — Personalidades emergem pelas ações e pelas vozes</li>
                <li><strong>Jogabilidade Meditativa</strong> — Sempre há algo a contemplar</li>
              </ul>
            </section>

            <!-- Creator Section -->
            <section class="border-t border-white/10 pt-8">
              <h2 class="text-xl font-semibold text-gray-100 mb-4">Criado por</h2>
              <div class="space-y-3">
                <h3 class="text-lg font-semibold text-gray-50">Bolivar Alencastro</h3>
                <p class="leading-relaxed text-gray-300">
                  Product Designer, Artista Digital e entusiasta da Internet
                </p>
                <p class="leading-relaxed text-gray-300">
                  Apaixonado por criar experiências imersivas e explorar a interseção entre arte, tecnologia e interatividade. Bolivar combina pensamento estratégico de design com visão artística para compor experiências digitais significativas.
                </p>
                <div class="flex flex-wrap gap-3 mt-4">
                  <a
                    href="https://www.bolivaralencastro.com.br/?ref=Star-Chasers&utm_source=site&utm_medium=divulgacao&utm_campaign=star-chasers&utm_term=sobre&utm_content=site"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block px-6 py-2 rounded-lg font-semibold transition-all bg-white/10 hover:bg-white/20 text-gray-100 border border-white/20"
                  >
                    Visitar portfólio
                  </a>
                </div>
              </div>
            </section>

            <!-- Share Section -->
            <section class="border-t border-white/10 pt-8">
              <h2 class="text-xl font-semibold text-gray-100 mb-4">Compartilhe</h2>
              <p class="leading-relaxed text-gray-300 mb-4">
                Curtiu o jogo? Compartilhe com sua rede e ajude outras pessoas a descobrirem esta experiência interestelar.
              </p>
              <div class="flex flex-wrap gap-3">
                <button
                  (click)="shareOnLinkedIn()"
                  class="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all bg-white/10 hover:bg-white/20 text-gray-50 border border-white/20"
                  title="Compartilhar no LinkedIn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                  </svg>
                  Compartilhar no LinkedIn
                </button>

                <button
                  (click)="copyShareLink()"
                  class="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all bg-white/5 hover:bg-white/15 text-gray-50 border border-white/10"
                  [title]="copyFeedback() ? 'Link copiado!' : 'Copiar link para a área de transferência'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  {{ copyFeedback() ? 'Link copiado!' : 'Copiar link' }}
                </button>
              </div>
            </section>

            <!-- Philosophy -->
            <section class="border-t border-white/10 pt-8 pb-4">
              <p class="text-center italic text-gray-300 text-lg">
                "Na vastidão do espaço, três naves descobrem que, mesmo na solidão, nunca estão realmente sozinhas."
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
