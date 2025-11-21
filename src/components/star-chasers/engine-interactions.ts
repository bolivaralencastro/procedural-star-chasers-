import { Vector2D } from '../../models/vector2d';
import { ConstellationManager } from './constellation-manager';
import { EventHandlersManager } from './event-handlers-manager';
import { GAME_CONSTANTS } from './game-constants';
import { InputManager, ContextMenuState, MouseState } from './input-manager';
import { GameStateManager } from './game-state-manager';
import { ShipLaunchManager } from './ship-launch-manager';
import type { StarChasersEngine } from './star-chasers.engine';

export class EngineInteractions {
  private firstInteractionHandled = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private touchStartPosition: Vector2D | null = null;

  constructor(private readonly engine: StarChasersEngine) {}

  handleResize() {
    this.engine.updater.setupCanvas();
    this.engine.updater.createBackgroundStars(GAME_CONSTANTS.DEFAULT_BACKGROUND_STAR_COUNT);
  }

  handleMouseMove(event: MouseEvent) {
    this.firstInteractionHandled = EventHandlersManager.handleMouseMove(
      event,
      this.engine.getCanvasRef().nativeElement,
      this.engine.renderScale,
      this.engine.mouse,
      this.firstInteractionHandled,
      this.handleFirstInteraction.bind(this)
    );
  }

  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    if (key === 'f') {
      event.preventDefault();
      this.engine.deps.onToggleFullscreen();
      return;
    }

    if (key === 's') {
      event.preventDefault();
      this.engine.onToggleAudio(event);
      return;
    }

    if (key === 'm') {
      event.preventDefault();
      this.toggleMouseInteraction(event);
      return;
    }

    if (key === 'p') {
      event.preventDefault();
      this.toggleShipControl();
      return;
    }

    // if (key === 'c') {
    //   event.preventDefault();
    //   this.toggleConstellationMode();
    //   return;
    // }

    if (this.engine.controlledShipId === null) {
      return;
    }

    const controlKey = this.normalizeControlKey(event.key);
    if (!controlKey) {
      return;
    }

    if (controlKey === 'reload') {
      this.engine.updater.startManualReload();
    }

    this.engine.activeControlKeys.add(controlKey);
    event.preventDefault();
  }

  handleKeyUp(event: KeyboardEvent) {
    const key = this.normalizeControlKey(event.key);
    if (key) {
      this.engine.activeControlKeys.delete(key);
    }
  }

  handleTouchMove(event: TouchEvent) {
    this.longPressTimer = EventHandlersManager.handleTouchMove(
      event,
      this.engine.getCanvasRef().nativeElement,
      this.engine.renderScale,
      this.engine.mouse,
      this.touchStartPosition,
      this.longPressTimer,
      () => this.clearLongPressTimer()
    );
  }

  handleMouseDown(event: MouseEvent) {
    if (this.engine.inputDisabled()) {
      return;
    }

    const result = EventHandlersManager.handleMouseDown(event, {
      contextMenu: this.engine.contextMenu,
      contextMenuElement: this.engine.getContextMenuRef?.()?.nativeElement,
      mouseInteractionEnabled: this.engine.mouseInteractionEnabled(),
      wormhole: this.engine.wormhole,
      mouse: this.engine.mouse,
      onFirstInteraction: this.handleFirstInteraction.bind(this),
      onShowContextMenu: (x, y) => this.showContextMenu(x, y),
      onCloseContextMenu: () => {
        this.engine.contextMenu.visible = false;
        this.engine.deps.cdr.detectChanges();
      },
      onCreateWormhole: () => this.engine.updater.createWormhole(),
    });

    this.engine.contextMenu = result.contextMenu;
    this.engine.mouse.isDown = result.mouseIsDown;
  }

  handleTouchStart(event: TouchEvent) {
    if (this.engine.inputDisabled()) {
      return;
    }

    const result = EventHandlersManager.handleTouchStart(event, {
      canvas: this.engine.getCanvasRef().nativeElement,
      renderScale: this.engine.renderScale,
      isMobile: this.engine.isMobile(),
      mobileMenuVisible: this.engine.mobileMenuVisible(),
      contextMenu: this.engine.contextMenu,
      mouseInteractionEnabled: this.engine.mouseInteractionEnabled(),
      mouse: this.engine.mouse,
      wormhole: this.engine.wormhole,
      onFirstInteraction: this.handleFirstInteraction.bind(this),
      onCloseContextMenu: () => {
        this.engine.contextMenu.visible = false;
        this.engine.deps.cdr.detectChanges();
      },
      onCloseMobileMenu: () => {
        this.engine.mobileMenuVisible.set(false);
        this.engine.deps.cdr.detectChanges();
      },
      onShowContextMenu: (x, y) => this.showContextMenu(x, y),
      onCreateWormhole: () => this.engine.updater.createWormhole(),
      onShipTap: () => this.handleShipTap(),
    });

    this.engine.contextMenu = result.contextMenu;
    this.engine.mobileMenuVisible.set(result.mobileMenuVisible);
    this.engine.mouse.isDown = result.mouseIsDown;
    this.longPressTimer = result.longPressTimer;
    this.touchStartPosition = result.touchStartPosition;
  }

  handlePointerEnd() {
    this.clearLongPressTimer();

    if (this.engine.mouse.isDown && this.engine.mouseInteractionEnabled()) {
      ShipLaunchManager.launchOrbitingShips(this.engine.ships, this.engine.mouse, {
        playLaunchSound: () => this.engine.deps.audioService.playSound('launch'),
        triggerLaunchChatter: this.engine.updater.triggerLaunchChatter.bind(this.engine.updater),
      });
    }
    this.engine.mouse.isDown = false;
  }

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.showContextMenu(event.clientX, event.clientY);
  }

  toggleMouseInteraction(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.engine.mouseInteractionEnabled.update(v => !v);
    this.engine.contextMenu.visible = false;
    this.engine.deps.cdr.detectChanges();
  }

  onToggleAudio(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.engine.deps.audioService.toggleMute();
    this.engine.contextMenu.visible = false;
    this.engine.deps.cdr.detectChanges();
  }

  onToggleFullscreen(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.engine.deps.onToggleFullscreen();
    this.engine.contextMenu.visible = false;
    this.engine.deps.cdr.detectChanges();
  }

  onToggleWakeLock(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.engine.deps.wakeLockService.toggleWakeLock();
    this.engine.contextMenu.visible = false;
    this.engine.deps.cdr.detectChanges();
  }

  onOpenAbout(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.engine.deps.onOpenAbout();
    this.engine.contextMenu.visible = false;
    this.engine.mobileMenuVisible.set(false);
    this.engine.deps.cdr.detectChanges();
  }

  toggleMobileMenu() {
    this.engine.mobileMenuVisible.update(v => !v);
    this.engine.contextMenu.visible = false;
    this.engine.deps.cdr.detectChanges();
  }

  toggleConstellationMode() {
    this.engine.constellationMode = !this.engine.constellationMode;
    this.engine.mouseInteractionEnabled.set(!this.engine.constellationMode);

    if (!this.engine.constellationMode) {
      GameStateManager.resetConstellationMode(this.engine.ships, this.engine.formationAssignments);
      return;
    }

    this.engine.contextMenu.visible = false;
    this.engine.deps.cdr.detectChanges();
    ConstellationManager.assignConstellationFormation(
      this.engine.ships,
      this.engine.targetStar,
      this.engine.formationAssignments,
      this.engine.worldWidth,
      this.engine.worldHeight,
      { x: this.engine.mouse.pos.x, y: this.engine.mouse.pos.y },
      this.engine.deps.constellationService
    );
  }

  getMouse(): MouseState {
    return this.engine.mouse;
  }

  cleanup() {
    this.clearLongPressTimer();
  }

  private handleShipTap() {
    InputManager.handleShipTap(
      this.engine.mouse.pos,
      this.engine.ships,
      this.engine.renderScale,
      (position: Vector2D) => {
        this.engine.updater.createStarExplosion(position, 5);
        this.engine.deps.audioService.playSound('launch');
      }
    );
  }

  private normalizeControlKey(key: string) {
    return InputManager.normalizeControlKey(key);
  }

  private handleFirstInteraction() {
    if (this.firstInteractionHandled) {
      return;
    }
    this.engine.deps.audioService.handleFirstInteraction();
    this.firstInteractionHandled = true;
  }

  private toggleShipControl() {
    const result = InputManager.toggleShipControl(
      this.engine.ships,
      this.engine.controlledShipId,
      this.engine.activeControlKeys,
      this.engine.mouseInteractionEnabled,
      this.engine.mouseInteractionBeforeControl
    );
    this.engine.controlledShipId = result.controlledShipId;
    this.engine.mouseInteractionBeforeControl = result.mouseInteractionBeforeControl;
    this.updateCursorVisibility();
  }

  private updateCursorVisibility() {
    if (!this.engine.getCanvasRef()) {
      return;
    }
    InputManager.updateCursorVisibility(this.engine.getCanvasRef().nativeElement, this.engine.controlledShipId);
  }

  private showContextMenu(clientX: number, clientY: number): ContextMenuState {
    const rect = this.engine.getCanvasRef().nativeElement.getBoundingClientRect();
    this.engine.contextMenu = InputManager.showContextMenu(clientX, clientY, rect, this.engine.contextMenu);
    this.engine.deps.cdr.detectChanges();
    return this.engine.contextMenu;
  }

  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    this.longPressTimer = null;
  }
}
