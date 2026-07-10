import { signal } from './reactive';
import { AudioService } from '../audio/audio.service';
import { ScreenWakeLockService } from '../services/screen-wake-lock.service';
import { RadioChatterService, RadioContext } from '../services/radio-chatter.service';
import { LogbookService } from '../services/logbook-store';
import { Vector2D } from '../entities/vector2d';
import { ConstellationService } from '../services/constellation.service';
import { Ship } from '../entities/ship';
import {
  ControlKey,
  Asteroid,
  Projectile,
  BackgroundStar,
  TargetStar,
  Particle,
  RadioBubble,
  Nebula,
  WormholePair,
} from '../entities/game-entities';
import { ContextMenuState, MouseState } from '../input/input-manager';
import { GAME_CONSTANTS } from './game-constants';
import { EngineInteractions } from './engine-interactions';
import { EngineUpdater } from './engine-updater';
import { PerfMonitor } from './perf-monitor';

export interface StarChasersEngineDeps {
  audioService: AudioService;
  wakeLockService: ScreenWakeLockService;
  radioService: RadioChatterService;
  constellationService: ConstellationService;
  logbook: LogbookService;
  /** Asks the host UI to re-render after engine state changes. */
  notifyUi: () => void;
  onToggleFullscreen: () => void;
  onOpenAbout: () => void;
}

export class StarChasersEngine {
  public getCanvas!: () => HTMLCanvasElement;
  public getContextMenuEl?: () => HTMLDivElement | undefined;
  public ctx!: CanvasRenderingContext2D;
  private currentCanvasElement?: HTMLCanvasElement;
  private animationFrameId?: number;

  public ships: Ship[] = [];
  public backgroundStars: BackgroundStar[] = [];
  public starParticles: Particle[] = [];
  public explosionParticles: Particle[] = [];
  public nebulas: Nebula[] = [];
  public asteroids: Asteroid[] = [];
  public projectiles: Projectile[] = [];
  public wormhole: WormholePair | null = null;

  public gameMode: 'normal' | 'asteroid_event' = 'normal';
  public eventTriggerScore = 1;
  public readonly EVENT_CHECK_INTERVAL = GAME_CONSTANTS.EVENT_CHECK_INTERVAL;

  public targetStar: TargetStar = {
    position: new Vector2D(),
    velocity: new Vector2D(),
    acceleration: new Vector2D(),
    radius: GAME_CONSTANTS.TARGET_STAR_RADIUS,
    exists: false,
    isDespawning: false,
    pulseAngle: 0,
    opacity: 0,
    spawnTime: 0,
    lifetime: 0,
  };
  public nextStarSpawnTime: number = 0;
  public readonly TAIL_LENGTH = GAME_CONSTANTS.TAIL_LENGTH;
  public readonly SPEED_INCREMENT_PER_STAR = GAME_CONSTANTS.SPEED_INCREMENT_PER_STAR;
  public readonly MAX_SPEED_BONUS = GAME_CONSTANTS.MAX_SPEED_BONUS;

  public mouse: MouseState = {
    pos: new Vector2D(-100, -100),
    screenPos: new Vector2D(-100, -100),
    isDown: false,
    orbitRadius: GAME_CONSTANTS.MOUSE_ORBIT_RADIUS,
  };

  public contextMenu: ContextMenuState = { visible: false, x: 0, y: 0 };
  public mobileMenuVisible = signal(false);
  public mouseInteractionEnabled = signal(true);
  public inputDisabled = signal(false);
  public isMobile = signal(false);

  public controlledShipId: number | null = null;
  public activeControlKeys = new Set<ControlKey>();
  public mouseInteractionBeforeControl = true;

  public radioBubbles: RadioBubble[] = [];
  public globalChatterCooldownUntil = 0;
  public starCaptureLockUntil = 0;
  public proximityCooldowns = new Map<string, number>();
  public shipChatterAvailableAt = new Map<number, number>();
  public philosophicalChatterNextTime = 0;
  public readonly SHIP_CHATTER_DELAY_RANGE = GAME_CONSTANTS.SHIP_CHATTER_DELAY_RANGE;

  public constellationMode = false;
  public formationAssignments = new Map<number, Vector2D>();

  public renderScale = 1.0;
  public worldWidth = 0;
  public worldHeight = 0;
  public viewportWidth = 0;
  public viewportHeight = 0;
  public cameraPosition = new Vector2D();
  public followShipId: number | null = null;
  public focusedShipId = 0;
  public cameraControlKeys = new Set<'up' | 'down' | 'left' | 'right'>();

  // Idle auto-director: after a spell without input, the free camera gently
  // drifts to follow the action so the toy is worth watching passively.
  public lastInteractionAt = Date.now();
  public directorActive = false;
  public directorTargetId: number | null = null;
  public directorRetargetAt = 0;

  /** Marks fresh user input; suspends the auto-director. */
  noteInteraction() {
    this.lastInteractionAt = Date.now();
  }

  public readonly updater = new EngineUpdater(this);
  private readonly interactions = new EngineInteractions(this);

  constructor(public readonly deps: StarChasersEngineDeps) {}

  attachView(getCanvas: () => HTMLCanvasElement, getContextMenuEl: () => HTMLDivElement | undefined) {
    this.getCanvas = getCanvas;
    this.getContextMenuEl = getContextMenuEl;
  }

  initialize() {
    this.updateCanvasContext();
    this.updater.initGame();
    this.gameLoop();
  }

  private updateCanvasContext() {
    const canvas = this.getCanvas();
    if (canvas !== this.currentCanvasElement) {
      this.currentCanvasElement = canvas;
      this.ctx = canvas.getContext('2d')!;
      this.updater.setupCanvas();
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.updater.dispose();
    this.interactions.cleanup();
    this.deps.audioService.updateGameSounds(false, false, false, undefined);
  }

  handleResize() {
    this.interactions.handleResize();
  }

  handleMouseMove(event: MouseEvent) {
    this.interactions.handleMouseMove(event);
  }

  handleKeyDown(event: KeyboardEvent) {
    this.interactions.handleKeyDown(event);
  }

  handleKeyUp(event: KeyboardEvent) {
    this.interactions.handleKeyUp(event);
  }

  handleTouchMove(event: TouchEvent) {
    this.interactions.handleTouchMove(event);
  }

  handleMouseDown(event: MouseEvent) {
    this.interactions.handleMouseDown(event);
  }

  handleTouchStart(event: TouchEvent) {
    this.interactions.handleTouchStart(event);
  }

  handlePointerEnd() {
    this.interactions.handlePointerEnd();
  }

  onContextMenu(event: MouseEvent) {
    this.interactions.onContextMenu(event);
  }

  toggleMouseInteraction(event: Event) {
    this.interactions.toggleMouseInteraction(event);
  }

  onToggleAudio(event: Event) {
    this.interactions.onToggleAudio(event);
  }

  onToggleFullscreen(event: Event) {
    this.interactions.onToggleFullscreen(event);
  }

  onToggleWakeLock(event: Event) {
    this.interactions.onToggleWakeLock(event);
  }

  onOpenAbout(event: Event) {
    this.interactions.onOpenAbout(event);
  }

  toggleMobileMenu() {
    this.interactions.toggleMobileMenu();
  }

  toggleConstellationMode() {
    this.interactions.toggleConstellationMode();
  }

  getMouse(): MouseState {
    return this.interactions.getMouse();
  }

  enqueueRadioMessage(ship: Ship, context: RadioContext): boolean {
    return this.updater.enqueueRadioMessage(ship, context);
  }

  getRandomActiveShip(): Ship {
    return this.updater.getRandomActiveShip();
  }

  getFocusedShip(): Ship | undefined {
    return this.ships.find(ship => ship.id === this.focusedShipId);
  }

  getFollowedShip(): Ship | undefined {
    if (this.followShipId === null) {
      return undefined;
    }
    return this.ships.find(ship => ship.id === this.followShipId);
  }

  cycleFocusedShip(): void {
    if (this.ships.length === 0) {
      return;
    }

    const currentIndex = this.ships.findIndex(ship => ship.id === this.focusedShipId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % this.ships.length : 0;
    this.focusedShipId = this.ships[nextIndex].id;
    this.followShipId = this.focusedShipId;
  }

  followShip(shipId: number | null): void {
    this.followShipId = shipId;
    if (shipId !== null) {
      this.focusedShipId = shipId;
    }
  }

  moveCameraTo(centerX: number, centerY: number): void {
    const maxX = Math.max(0, this.worldWidth - this.viewportWidth);
    const maxY = Math.max(0, this.worldHeight - this.viewportHeight);
    this.cameraPosition.x = Math.max(0, Math.min(maxX, centerX - this.viewportWidth / 2));
    this.cameraPosition.y = Math.max(0, Math.min(maxY, centerY - this.viewportHeight / 2));
  }

  // Fixed-timestep loop: physics always advances in 60 Hz ticks regardless of
  // display refresh rate (previously one update per rAF frame, which ran the
  // simulation 2x fast on 120 Hz screens). Rendering still happens every frame.
  private static readonly TICK_MS = 1000 / 60;
  private static readonly MAX_TICKS_PER_FRAME = 5; // avoid spiral of death after tab sleeps

  private lastFrameTime = 0;
  private tickAccumulator = 0;

  /** Frame-time sampler (read by the dev perf overlay). */
  public readonly perf = new PerfMonitor();
  /** Entities drawn vs. total this frame — populated by the renderer. */
  public renderStats = { drawn: 0, total: 0 };

  private gameLoop = (now: number = performance.now()) => {
    this.perf.frame(now);
    this.updateCanvasContext();

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
    }
    // Clamp long gaps (backgrounded tab) so we don't fast-forward the world
    this.tickAccumulator += Math.min(now - this.lastFrameTime, 250);
    this.lastFrameTime = now;

    let ticks = 0;
    while (this.tickAccumulator >= StarChasersEngine.TICK_MS && ticks < StarChasersEngine.MAX_TICKS_PER_FRAME) {
      this.updater.update();
      this.tickAccumulator -= StarChasersEngine.TICK_MS;
      ticks++;
    }
    if (ticks === StarChasersEngine.MAX_TICKS_PER_FRAME) {
      this.tickAccumulator = 0;
    }

    this.updater.draw();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
}
