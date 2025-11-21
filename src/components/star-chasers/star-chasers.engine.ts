import { ElementRef, ChangeDetectorRef, signal } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { ScreenWakeLockService } from '../../services/screen-wake-lock.service';
import { RadioChatterService, RadioContext } from '../../services/radio-chatter.service';
import { Vector2D } from '../../models/vector2d';
import { ConstellationService } from '../../services/constellation.service';
import { Ship } from '../../models/ship';
import {
  ControlKey,
  Asteroid,
  Projectile,
  BackgroundStar,
  TargetStar,
  Particle,
  ScoreTooltip,
  RadioBubble,
  Nebula,
  WormholePair,
} from '../../models/game-entities';
import { ContextMenuState, MouseState } from './input-manager';
import { GAME_CONSTANTS } from './game-constants';
import { EngineInteractions } from './engine-interactions';
import { EngineUpdater } from './engine-updater';

export interface StarChasersEngineDeps {
  audioService: AudioService;
  wakeLockService: ScreenWakeLockService;
  radioService: RadioChatterService;
  constellationService: ConstellationService;
  cdr: ChangeDetectorRef;
  onToggleFullscreen: () => void;
  onOpenAbout: () => void;
}

export class StarChasersEngine {
  public getCanvasRef!: () => ElementRef<HTMLCanvasElement>;
  public getContextMenuRef?: () => ElementRef<HTMLDivElement> | undefined;
  public ctx!: CanvasRenderingContext2D;
  private currentCanvasElement?: HTMLCanvasElement;
  private animationFrameId?: number;

  public ships: Ship[] = [];
  public backgroundStars: BackgroundStar[] = [];
  public starParticles: Particle[] = [];
  public explosionParticles: Particle[] = [];
  public scoreTooltips: ScoreTooltip[] = [];
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

  public readonly updater = new EngineUpdater(this);
  private readonly interactions = new EngineInteractions(this);

  constructor(public readonly deps: StarChasersEngineDeps) {}

  attachView(getCanvasRef: () => ElementRef<HTMLCanvasElement>, getContextMenuRef: () => ElementRef<HTMLDivElement> | undefined) {
    this.getCanvasRef = getCanvasRef;
    this.getContextMenuRef = getContextMenuRef;
  }

  initialize() {
    this.updateCanvasContext();
    this.updater.initGame();
    this.gameLoop();
  }

  private updateCanvasContext() {
    const canvas = this.getCanvasRef().nativeElement;
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

  private gameLoop = () => {
    this.updateCanvasContext();
    this.updater.update();
    this.updater.draw();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
}
