import { Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { AudioService } from '../game/audio/audio.service';
import { ScreenWakeLockService } from '../game/services/screen-wake-lock.service';
import { LogbookService } from '../game/services/logbook-store';
import { StarChasers, type StarChasersApi } from './StarChasers';
import { AboutDialog } from './AboutDialog';
import { LogbookPanel } from './LogbookPanel';
import { PerfOverlay } from './dev/PerfOverlay';

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
  const [logbookOpen, setLogbookOpen] = createSignal(false);

  let starChasersApi: StarChasersApi | undefined;
  const [perfApi, setPerfApi] = createSignal<StarChasersApi | undefined>();
  const debugPerf = new URLSearchParams(window.location.search).has('debug');

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

    // --- Logbook: watch-time accounting + aggregated persistence ---
    const logbook = LogbookService.shared;
    let lastWatchTick = Date.now();
    const watchInterval = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        logbook.addWatchTime(now - lastWatchTick);
      }
      lastWatchTick = now;
    }, 1000);
    const flushInterval = window.setInterval(() => logbook.flush(), 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') logbook.flush();
    };
    const onPageHide = () => logbook.flush();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    // 'H' toggles the diary, unless the user is typing (e.g. the signature field).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'h') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      setLogbookOpen(open => !open);
    };
    document.addEventListener('keydown', onKeyDown);

    onCleanup(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearInterval(clockInterval);
      clearInterval(watchInterval);
      clearInterval(flushInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('keydown', onKeyDown);
      logbook.flush();
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
        registerApi={api => {
          starChasersApi = api;
          if (debugPerf) setPerfApi(api);
        }}
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

      {/* Diário de bordo toggle (desktop) */}
      <Show when={!isMobile()}>
        <button
          type="button"
          onClick={() => setLogbookOpen(open => !open)}
          class="absolute left-4 bottom-4 z-40 pointer-events-auto rounded-full border border-white/10 bg-black/55 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-300 shadow-xl backdrop-blur-md hover:bg-white/10"
          title="Diário de bordo"
        >
          Diário de bordo (H)
        </button>
      </Show>

      {/* Diário de bordo panel */}
      <LogbookPanel isOpen={logbookOpen} onClose={() => setLogbookOpen(false)} />

      {/* About Dialog */}
      <AboutDialog isOpen={aboutOpen} onClose={closeAbout} />

      {/* Dev perf overlay (?debug=perf) */}
      <Show when={debugPerf && perfApi()}>
        <PerfOverlay perf={perfApi()!.perf} renderStats={perfApi()!.renderStats} />
      </Show>
    </div>
  );
}
