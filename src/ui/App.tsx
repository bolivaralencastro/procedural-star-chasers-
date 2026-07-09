import { Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { AudioService } from '../game/audio/audio.service';
import { ScreenWakeLockService } from '../game/services/screen-wake-lock.service';
import { StarChasers, type StarChasersApi } from './StarChasers';
import { AboutDialog } from './AboutDialog';

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function App() {
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(new Date());
  const [aboutOpen, setAboutOpen] = createSignal(false);

  let starChasersApi: StarChasersApi | undefined;

  const formattedTime = createMemo(() => formatTime(currentTime()));
  const formattedDate = createMemo(() => formatDate(currentTime()));

  const checkMobile = () => {
    const mobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth < 800 && 'ontouchstart' in window);
    setIsMobile(mobile);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const openAbout = () => {
    setAboutOpen(true);
    starChasersApi?.inputDisabled.set(true);
  };

  const closeAbout = () => {
    setAboutOpen(false);
    starChasersApi?.inputDisabled.set(false);
  };

  onMount(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const clockInterval = window.setInterval(() => setCurrentTime(new Date()), 1000);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    onCleanup(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearInterval(clockInterval);
      window.removeEventListener('resize', checkMobile);
      AudioService.shared.cleanup();
      ScreenWakeLockService.shared.cleanup();
    });
  });

  return (
    <div class="relative w-screen h-screen bg-black">
      <StarChasers
        isFullscreen={isFullscreen}
        onToggleFullscreenRequest={toggleFullscreen}
        onOpenAboutRequest={openAbout}
        registerApi={api => (starChasersApi = api)}
      />

      <div class="pointer-events-none absolute left-4 top-4 z-40 rounded-2xl border border-white/10 bg-black/55 px-4 py-2 font-mono text-gray-200 shadow-xl backdrop-blur-md">
        <div class="text-base tracking-[0.18em]">{formattedTime()}</div>
        <div class="mt-1 text-[10px] uppercase tracking-[0.28em] text-gray-500">{formattedDate()}</div>
      </div>

      {/* Mobile Controls */}
      <Show when={isMobile()}>
        <div class="absolute right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] pointer-events-auto z-50">
          <button
            type="button"
            onClick={() => starChasersApi?.toggleMobileMenu()}
            class="mobile-menu flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-gray-200 shadow-lg hover:bg-white/10 transition-colors"
            title="Abrir menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </Show>

      {/* About Dialog */}
      <AboutDialog isOpen={aboutOpen} onClose={closeAbout} />
    </div>
  );
}
