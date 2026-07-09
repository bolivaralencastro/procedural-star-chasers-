import { For, Show, onCleanup, onMount, type Accessor } from 'solid-js';
import { StarChasersEngine } from '../game/core/star-chasers.engine';
import { AudioService } from '../game/audio/audio.service';
import { ScreenWakeLockService } from '../game/services/screen-wake-lock.service';
import { RadioChatterService } from '../game/services/radio-chatter.service';
import { ConstellationService } from '../game/services/constellation.service';
import { createFrameTick, fromGameSignal } from './game-bridge';

export interface StarChasersApi {
  toggleMobileMenu: () => void;
  inputDisabled: StarChasersEngine['inputDisabled'];
}

interface StarChasersProps {
  isFullscreen: Accessor<boolean>;
  onToggleFullscreenRequest: () => void;
  onOpenAboutRequest: () => void;
  /** Hands the parent an imperative handle (mobile menu, input lock). */
  registerApi?: (api: StarChasersApi) => void;
}

export function StarChasers(props: StarChasersProps) {
  let canvasEl!: HTMLCanvasElement;
  let contextMenuEl: HTMLDivElement | undefined;

  const { tick, bump } = createFrameTick();

  const engine = new StarChasersEngine({
    audioService: AudioService.shared,
    wakeLockService: ScreenWakeLockService.shared,
    radioService: RadioChatterService.shared,
    constellationService: ConstellationService.shared,
    notifyUi: bump,
    onToggleFullscreen: () => props.onToggleFullscreenRequest(),
    onOpenAbout: () => props.onOpenAboutRequest(),
  });

  const isMobile = fromGameSignal(engine.isMobile);
  const mobileMenuVisible = fromGameSignal(engine.mobileMenuVisible);
  const mouseInteractionEnabled = fromGameSignal(engine.mouseInteractionEnabled);
  const isMuted = fromGameSignal(AudioService.shared.isMuted);
  const wakeLockEnabled = fromGameSignal(ScreenWakeLockService.shared.getIsEnabled());

  props.registerApi?.({
    toggleMobileMenu: () => engine.toggleMobileMenu(),
    inputDisabled: engine.inputDisabled,
  });

  // Frame-driven reads of live engine state (equivalent of the old getters
  // polled by Angular's per-frame detectChanges).
  const ships = () => (tick(), engine.ships);
  const asteroids = () => (tick(), engine.asteroids);
  const contextMenu = () => (tick(), engine.contextMenu);
  const targetStar = () => (tick(), engine.targetStar);
  const worldWidth = () => (tick(), engine.worldWidth);
  const worldHeight = () => (tick(), engine.worldHeight);
  const viewportWidth = () => (tick(), engine.viewportWidth);
  const viewportHeight = () => (tick(), engine.viewportHeight);
  const cameraPosition = () => (tick(), engine.cameraPosition);
  const focusedShipId = () => (tick(), engine.focusedShipId);
  const followShipId = () => (tick(), engine.followShipId);
  const followedShipCodename = () => (tick(), engine.getFollowedShip()?.codename ?? 'Ship');

  const onMinimapPointer = (event: MouseEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target || engine.worldWidth === 0 || engine.worldHeight === 0) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width;
    const ratioY = (event.clientY - rect.top) / rect.height;
    const worldX = ratioX * engine.worldWidth;
    const worldY = ratioY * engine.worldHeight;

    const clickedShip = engine.ships.find(ship => {
      const shipX = (ship.position.x / engine.worldWidth) * rect.width;
      const shipY = (ship.position.y / engine.worldHeight) * rect.height;
      const dx = event.clientX - (rect.left + shipX);
      const dy = event.clientY - (rect.top + shipY);
      return Math.sqrt(dx * dx + dy * dy) < 10;
    });

    if (clickedShip) {
      engine.followShip(clickedShip.id);
      engine.updater.updateCamera(true);
      return;
    }

    engine.followShip(null);
    engine.moveCameraTo(worldX, worldY);
  };

  onMount(() => {
    engine.attachView(() => canvasEl, () => contextMenuEl);
    engine.initialize();

    // Document/window listeners (equivalent of Angular's HostListeners)
    const onResize = () => engine.handleResize();
    const onMouseMove = (e: MouseEvent) => engine.handleMouseMove(e);
    const onKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e);
    const onKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e);
    const onTouchMove = (e: TouchEvent) => engine.handleTouchMove(e);
    const onMouseDown = (e: MouseEvent) => engine.handleMouseDown(e);
    const onTouchStart = (e: TouchEvent) => engine.handleTouchStart(e);
    const onPointerEnd = () => engine.handlePointerEnd();

    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('mouseup', onPointerEnd);
    document.addEventListener('touchend', onPointerEnd);

    onCleanup(() => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('mouseup', onPointerEnd);
      document.removeEventListener('touchend', onPointerEnd);
      engine.destroy();
    });
  });

  const menuEntryClass = 'py-2 px-4 cursor-pointer hover:bg-white/10 transition-colors border-t border-white/10';

  const ShipStats = () => (
    <div class="px-4 py-3 border-t border-white/10">
      <h4 class="text-xs text-gray-400 mb-2 uppercase tracking-wider">Ship Stats</h4>
      <div class="space-y-2">
        <For each={ships()}>
          {ship => (
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style={{ 'background-color': ship.hexColor }}></span>
                <span class="font-semibold">{ship.codename}</span>
              </div>
              <div class="flex items-center gap-3 text-gray-300">
                <span>★ {ship.score}</span>
                <span>☄ {ship.asteroidsDestroyed}</span>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );

  return (
    <div class="relative w-full h-full" onContextMenu={event => engine.onContextMenu(event)}>
      <canvas
        ref={canvasEl}
        class="w-full h-full block cursor-none"
        classList={{ 'pointer-events-none': contextMenu().visible && !isMobile() }}
      ></canvas>

      <Show when={contextMenu().visible}>
        <div
          ref={contextMenuEl}
          class="absolute bg-black/60 backdrop-blur-md border border-white/10 rounded-md shadow-2xl text-gray-200 font-mono text-sm z-50 overflow-hidden w-52 context-menu pointer-events-auto"
          style={{ left: `${contextMenu().x}px`, top: `${contextMenu().y}px` }}
        >
          <div class="py-2 px-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={e => engine.onOpenAbout(e)}>
            Sobre
          </div>

          <div class={menuEntryClass} onClick={e => engine.toggleMouseInteraction(e)}>
            {mouseInteractionEnabled() ? 'Disable Mouse' : 'Enable Mouse'} (M)
          </div>

          <div class={menuEntryClass} onClick={e => engine.onToggleAudio(e)}>
            {isMuted() ? 'Unmute Audio' : 'Mute Audio'} (S)
          </div>

          <div class={menuEntryClass} onClick={e => engine.onToggleFullscreen(e)}>
            {props.isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen'} (F)
          </div>

          <Show when={isMobile()}>
            <div class={menuEntryClass} onClick={e => engine.onToggleWakeLock(e)}>
              {wakeLockEnabled() ? 'Disable Wake Lock' : 'Enable Wake Lock'}
            </div>
          </Show>

          <ShipStats />
        </div>
      </Show>

      <Show when={!isMobile()}>
        <div class="absolute right-4 top-4 z-40 w-56 pointer-events-auto">
          <div class="rounded-2xl border border-white/10 bg-black/65 p-3 text-[11px] text-gray-200 shadow-2xl backdrop-blur-md">
            <div class="flex items-center justify-between">
              <div>
                <div class="uppercase tracking-[0.2em] text-gray-500">Navigator</div>
                <div class="mt-1 text-xs text-gray-300">
                  <Show when={followShipId() !== null} fallback="Free camera">
                    Following {followedShipCodename()}
                  </Show>
                </div>
              </div>
              <button
                type="button"
                class="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10"
                onClick={() => engine.followShip(null)}
              >
                Free
              </button>
            </div>

            <div
              class="relative mt-3 aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/80"
              onClick={onMinimapPointer}
            >
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12),transparent_55%)]"></div>

              <For each={ships()}>
                {ship => (
                  <div
                    class="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/70"
                    style={{
                      left: `${(ship.position.x / worldWidth()) * 100}%`,
                      top: `${(ship.position.y / worldHeight()) * 100}%`,
                      'background-color': ship.hexColor,
                    }}
                    classList={{
                      'ring-2': ship.id === focusedShipId(),
                      'ring-white': ship.id === focusedShipId(),
                      'scale-125': ship.id === followShipId(),
                    }}
                  ></div>
                )}
              </For>

              <Show when={targetStar().exists}>
                <div
                  class="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.8)]"
                  style={{
                    left: `${(targetStar().position.x / worldWidth()) * 100}%`,
                    top: `${(targetStar().position.y / worldHeight()) * 100}%`,
                  }}
                ></div>
              </Show>

              <For each={asteroids()}>
                {asteroid => (
                  <div
                    class="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400/80"
                    style={{
                      left: `${(asteroid.position.x / worldWidth()) * 100}%`,
                      top: `${(asteroid.position.y / worldHeight()) * 100}%`,
                    }}
                  ></div>
                )}
              </For>

              <div
                class="absolute border border-cyan-300/80 bg-cyan-300/10"
                style={{
                  left: `${(cameraPosition().x / worldWidth()) * 100}%`,
                  top: `${(cameraPosition().y / worldHeight()) * 100}%`,
                  width: `${(viewportWidth() / worldWidth()) * 100}%`,
                  height: `${(viewportHeight() / worldHeight()) * 100}%`,
                }}
              ></div>
            </div>

            <div class="mt-2 flex items-center justify-between text-[10px] text-gray-500">
              <span>Click map to jump</span>
              <span>Tab / 1 2 3 / 0</span>
            </div>
            <div class="mt-1 text-[10px] text-gray-500">Arrow keys pan when no ship is selected.</div>
          </div>
        </div>
      </Show>

      {/* Mobile Floating Menu */}
      <Show when={isMobile()}>
        <div class="absolute right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-40 mobile-menu">
          <Show when={mobileMenuVisible()}>
            <div class="absolute bottom-16 right-0 bg-black/70 backdrop-blur-md border border-white/10 rounded-md shadow-2xl text-gray-200 font-mono text-sm z-50 overflow-hidden w-52 mobile-menu">
              <div class="px-4 py-2 text-xs text-gray-400 border-b border-white/10">
                Controles por cursor estão desativados no mobile.
              </div>

              <div class="py-2 px-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={e => engine.onOpenAbout(e)}>
                Sobre
              </div>

              <div class={menuEntryClass} onClick={e => engine.onToggleAudio(e)}>
                {isMuted() ? 'Unmute Audio' : 'Mute Audio'}
              </div>

              <div class={menuEntryClass} onClick={e => engine.onToggleFullscreen(e)}>
                {props.isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              </div>

              <div class={menuEntryClass} onClick={e => engine.onToggleWakeLock(e)}>
                {wakeLockEnabled() ? 'Disable Wake Lock' : 'Enable Wake Lock'}
              </div>

              <ShipStats />
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
