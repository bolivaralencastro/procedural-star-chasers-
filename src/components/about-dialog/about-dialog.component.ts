import { Component, signal, ChangeDetectionStrategy, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WritableSignal } from '@angular/core';

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <!-- Overlay backdrop -->
      <div
        class="fixed inset-0 z-40 pointer-events-auto"
        (click)="closeDialog($event)"
      ></div>
      <!-- Dialog container -->
      <div
        class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
      >
        <div
          class="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 max-w-2xl w-full max-h-[85vh] overflow-y-auto no-scrollbar text-gray-200 pointer-events-auto flex flex-col ring-1 ring-white/5"
        >
          <!-- Header -->
          <div class="px-8 pt-8 pb-2 flex justify-between items-start flex-shrink-0">
            <h1 class="text-2xl font-light tracking-wide text-white">
              Sobre <span class="font-semibold">Procedural Star Chasers</span>
            </h1>
            <button
              (click)="close()"
              class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-8 pb-8 pt-2 space-y-8 text-gray-200 flex-1">
            <!-- Concept Section -->
            <section>
              <p class="leading-relaxed text-gray-300">
                Na imensidão de um cosmos gerado proceduralmente, três naves sencientes cruzam um universo de movimento constante. Cada uma — Vermelha, Verde e Azul — possui personalidade, aspirações e filosofia próprias.
              </p>
              <p class="leading-relaxed mt-3 text-gray-300">
                <strong class="text-gray-100">Procedural Star Chasers</strong> é uma experiência imersiva e reflexiva. É uma contemplação sobre autonomia, emergência e o delicado equilíbrio entre a ambição individual e a sobrevivência coletiva.
              </p>
            </section>

            <!-- Creator Section -->
            <section class="border-t border-white/10 pt-8">
              <h2 class="text-xl font-semibold text-gray-100 mb-4">Criado por Bolívar Alencastro</h2>
              <div class="flex gap-6 items-start">
                <img 
                  src="assets/criador-bolivar-alencastro-product-designer.webp" 
                  alt="Bolivar Alencastro" 
                  class="w-40 h-40 rounded-2xl object-cover border border-white/10 shadow-lg flex-shrink-0"
                >
                <div class="space-y-3">
                  <p class="leading-relaxed text-gray-300">
                    Product Designer, Artista Digital e entusiasta da Internet. Apaixonado por criar experiências imersivas e explorar a interseção entre arte, tecnologia e interatividade. Bolivar combina pensamento estratégico de design com visão artística para compor experiências digitais significativas.
                    <br>
                    <a
                      href="https://www.bolivaralencastro.com.br/?ref=Star-Chasers&utm_source=site&utm_medium=divulgacao&utm_campaign=star-chasers&utm_term=sobre&utm_content=site"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-white hover:text-gray-300 font-medium transition-colors mt-2"
                    >
                      Visitar portfólio 
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                    </a>
                  </p>
                </div>
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
    /* Hide scrollbar for Chrome, Safari and Opera */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    /* Hide scrollbar for IE, Edge and Firefox */
    .no-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `]
})
export class AboutDialogComponent implements OnDestroy {
  isOpen = signal(false);

  @Input() inputDisabled?: WritableSignal<boolean>;

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  };

  open() {
    this.isOpen.set(true);
    if (this.inputDisabled) {
      this.inputDisabled.set(true);
    }
    document.addEventListener('keydown', this.handleKeyDown);
  }

  close() {
    this.isOpen.set(false);
    if (this.inputDisabled) {
      this.inputDisabled.set(false);
    }
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  closeDialog(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}
