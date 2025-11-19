import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  HostListener,
  Output,
  EventEmitter,
  inject,
  ChangeDetectorRef,
  Input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../services/audio.service';
import { ScreenWakeLockService } from '../../services/screen-wake-lock.service';
import { RadioChatterService, RadioContext } from '../../services/radio-chatter.service';
import { PERSONALITIES, SHIP_PERSONAS, ShipColor, ShipPersonality } from '../../models/ship-personas';
import { Vector2D } from '../../models/vector2d';
import { ConstellationService } from '../../services/constellation.service';
import { Ship, ShipState } from '../../models/ship';
import { GameUtilsService } from '../../services/game-utils.service';
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
  WormholePair
} from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';
import { TextUtils } from './text-utils';
import { AsteroidManager } from './asteroid-manager';
import { ProjectileManager } from './projectile-manager';
import { ParticleEffectsManager } from './particle-effects-manager';
import { WormholeManager } from './wormhole-manager';
import { ShipBehaviorManager } from './ship-behavior-manager';
import { GameStateManager } from './game-state-manager';
import { RadioManager } from './radio-manager';
import { CollisionManager } from './collision-manager';
import { RenderingManager } from './rendering-manager';
import { InputManager, MouseState, ContextMenuState } from './input-manager';
import { CanvasManager } from './canvas-manager';
import { ShipUpdateManager } from './ship-update-manager';
import { StarEventManager } from './star-event-manager';
import { EventHandlersManager } from './event-handlers-manager';

@Component({
  selector: 'app-star-chasers',
  standalone: true,
  templateUrl: './star-chasers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'block w-full h-full'
  }
})
export class StarChasersComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contextMenuEl') contextMenuRef?: ElementRef<HTMLDivElement>;
  @Output() toggleFullscreenRequest = new EventEmitter<void>();
  @Input() isFullscreen = false;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId?: number;

  public ships: Ship[] = [];
  private backgroundStars: BackgroundStar[] = [];
  private starParticles: Particle[] = [];
  private explosionParticles: Particle[] = [];
  private scoreTooltips: ScoreTooltip[] = [];
  private nebulas: Nebula[] = [];
  private asteroids: Asteroid[] = [];
  private projectiles: Projectile[] = [];
  private wormhole: WormholePair | null = null;

  private gameMode: 'normal' | 'asteroid_event' = 'normal';
  private eventTriggerScore = 1;
  private timeSinceLastEventCheck = 0;
  private readonly EVENT_CHECK_INTERVAL = GAME_CONSTANTS.EVENT_CHECK_INTERVAL;

  private targetStar: TargetStar = {
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
  private nextStarSpawnTime: number = 0;
  private readonly TAIL_LENGTH = GAME_CONSTANTS.TAIL_LENGTH;
  private readonly SPEED_INCREMENT_PER_STAR = GAME_CONSTANTS.SPEED_INCREMENT_PER_STAR;
  private readonly MAX_SPEED_BONUS = GAME_CONSTANTS.MAX_SPEED_BONUS;

  private mouse: MouseState = {
    pos: new Vector2D(-100, -100),
    isDown: false,
    orbitRadius: GAME_CONSTANTS.MOUSE_ORBIT_RADIUS,
  };

  public contextMenu: ContextMenuState = { visible: false, x: 0, y: 0 };
  public mobileMenuVisible = signal(false); // Mobile-specific menu
  public mouseInteractionEnabled = signal(true);
  public isMobile = signal(false); // Make it a signal for template access
  private cdr = inject(ChangeDetectorRef);
  public audioService = inject(AudioService);
  public wakeLockService = inject(ScreenWakeLockService);
  private radioService = inject(RadioChatterService);
  private constellationService = inject(ConstellationService);
  private gameUtils = inject(GameUtilsService);
  private firstInteractionHandled = false; // Track if first interaction happened

  private controlledShipId: number | null = null;
  private activeControlKeys = new Set<ControlKey>();
  private mouseInteractionBeforeControl = true;

  private radioBubbles: RadioBubble[] = [];
  private globalChatterCooldownUntil = 0;
  private starCaptureLockUntil = 0;
  private proximityCooldowns = new Map<string, number>();
  private shipChatterAvailableAt = new Map<number, number>();
  private philosophicalChatterNextTime = 0;
  private readonly SHIP_CHATTER_DELAY_RANGE = GAME_CONSTANTS.SHIP_CHATTER_DELAY_RANGE;

  // Constellation mode
  public constellationMode = false;
  private formationAssignments = new Map<number, Vector2D>();

  // Long-press properties for mobile
  private longPressTimer: any = null;
  private touchStartPosition: Vector2D | null = null;
  private readonly LONG_PRESS_DURATION = GAME_CONSTANTS.LONG_PRESS_DURATION;
  private readonly CONTEXT_MENU_WIDTH = GAME_CONSTANTS.CONTEXT_MENU_WIDTH;
  private readonly CONTEXT_MENU_HEIGHT = GAME_CONSTANTS.CONTEXT_MENU_HEIGHT;
  
  // Scaling properties
  private renderScale = 1.0;
  private worldWidth = 0;
  private worldHeight = 0;

  @HostListener('window:resize')
  onResize() {
    this.setupCanvas();
    this.createBackgroundStars(GAME_CONSTANTS.DEFAULT_BACKGROUND_STAR_COUNT);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.pos.x = (event.clientX - rect.left) / this.renderScale;
    this.mouse.pos.y = (event.clientY - rect.top) / this.renderScale;
    
    // Handle first interaction to unlock audio
    if (!this.firstInteractionHandled) {
      this.audioService.handleFirstInteraction();
      this.firstInteractionHandled = true;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    if (key === 'f') {
      event.preventDefault();
      this.toggleFullscreenRequest.emit();
      return;
    }

    if (key === 's') {
      event.preventDefault();
      this.onToggleAudio(event);
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

    if (key === 'c') {
      event.preventDefault();
      this.toggleConstellationMode();
      return;
    }

    if (this.controlledShipId === null) {
      return;
    }

    const controlKey = this.normalizeControlKey(event.key);
    if (!controlKey) {
      return;
    }

    if (controlKey === 'reload') {
      this.startManualReload();
    }

    this.activeControlKeys.add(controlKey);
    event.preventDefault();
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    const key = this.normalizeControlKey(event.key);
    if (key) {
      this.activeControlKeys.delete(key);
    }
  }
  
  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    this.mouse.pos.x = touchX / this.renderScale;
    this.mouse.pos.y = touchY / this.renderScale;
  
    if (this.longPressTimer && this.touchStartPosition) {
      const dist = Vector2D.distance(this.touchStartPosition, this.mouse.pos);
      if (dist > 10 / this.renderScale) { // If finger moves more than 10px (scaled), cancel long press
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.button === 2) {
      event.preventDefault();
      this.showContextMenu(event.clientX, event.clientY);
      return;
    }

    if (this.contextMenu.visible) {
      const menuElement = this.contextMenuRef?.nativeElement;
      const eventTarget = event.target as Node | null;

      if (menuElement && eventTarget && menuElement.contains(eventTarget)) {
        return;
      }

      this.contextMenu.visible = false;
      this.cdr.detectChanges();
    }
    
    // Handle first interaction to unlock audio
    if (!this.firstInteractionHandled) {
      this.audioService.handleFirstInteraction();
      this.firstInteractionHandled = true;
    }
    
    if (event.button === 0) { // Only left click
      if (this.mouseInteractionEnabled()) {
          this.mouse.isDown = true;
      } else if (!this.wormhole) {
          this.createWormhole();
      }
    }
  }

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (!this.isMobile()) return; // Only handle this for mobile devices
    
    // Handle first interaction to unlock audio
    this.audioService.handleFirstInteraction();
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    this.mouse.pos.x = touchX / this.renderScale;
    this.mouse.pos.y = touchY / this.renderScale;
  
    // Check if the touch is on the mobile floating menu
    if (this.mobileMenuVisible()) {
      const menuElement = document.elementFromPoint(touch.clientX, touch.clientY);
      if (menuElement && (menuElement.closest('.mobile-menu') || menuElement.classList.contains('mobile-menu'))) {
        // Don't hide the menu if we're touching it - let the click event handle the menu items
        event.preventDefault();
        return;
      } else {
        // Touch is outside the menu, close it
        this.mobileMenuVisible.set(false);
        this.cdr.detectChanges();
        // Check if it's a tap on a ship to speed it up
        this.handleShipTap();
        return;
      }
    }
    
    // Check if it's a tap on a ship to speed it up
    if (!this.contextMenu.visible) {
      this.handleShipTap();
    }
    
    // Start long-press timer to show context menu only if mouse interaction is enabled
    if (this.mouseInteractionEnabled()) {
      this.touchStartPosition = new Vector2D(this.mouse.pos.x, this.mouse.pos.y);
      this.longPressTimer = setTimeout(() => {
        event.preventDefault(); // Prevent default context menu on some devices
        this.showContextMenu(touch.clientX, touch.clientY);
        this.longPressTimer = null;
      }, this.LONG_PRESS_DURATION);
    }
  
    // Handle regular "click" for orbiting/wormholes (will be handled on touchend)
    if (this.mouseInteractionEnabled()) {
      this.mouse.isDown = true;
    } else if (!this.wormhole) {
      this.createWormhole();
    }
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onMouseUp() {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;

    if (this.mouse.isDown && this.mouseInteractionEnabled()) {
      this.ships.forEach(ship => {
        if (ship.state === 'orbiting') {
          ship.state = 'launched';
          this.audioService.playSound('launch');
          let launchSpeed = ship.orbitalSpeed * 80;
          if (ship.color === 'Red') {
            launchSpeed *= GAME_CONSTANTS.RED_LAUNCH_SPEED_MULTIPLIER;
            ship.afterburnerTimer = GAME_CONSTANTS.RED_AFTERBURNER_DURATION;
          }
          const tangent = new Vector2D(
            this.mouse.pos.y - ship.position.y,
            ship.position.x - this.mouse.pos.x
          ).normalize();
          ship.velocity = tangent.multiply(launchSpeed);
          this.triggerLaunchChatter(ship);
        }
      });
    }
    this.mouse.isDown = false;
  }

  public onContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.showContextMenu(event.clientX, event.clientY);
  }

  private handleShipTap() {
    InputManager.handleShipTap(
      this.mouse.pos,
      this.ships,
      this.renderScale,
      (position: Vector2D) => {
        this.createStarExplosion(position, 5);
        this.audioService.playSound('launch');
      }
    );
  }

  private showContextMenu(clientX: number, clientY: number) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.contextMenu = InputManager.showContextMenu(clientX, clientY, rect, this.contextMenu);
    this.cdr.detectChanges();
  }

  public toggleMouseInteraction(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.mouseInteractionEnabled.update(v => !v);
    this.contextMenu.visible = false;
    this.cdr.detectChanges();
  }
  
  public onToggleAudio(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.audioService.toggleMute();
    this.contextMenu.visible = false;
    this.cdr.detectChanges();
  }

  public onToggleFullscreen(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.toggleFullscreenRequest.emit();
    this.contextMenu.visible = false;
    this.cdr.detectChanges();
  }

  public onToggleWakeLock(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.wakeLockService.toggleWakeLock();
    this.contextMenu.visible = false;
    this.cdr.detectChanges();
  }

  public toggleMobileMenu() {
    this.mobileMenuVisible.update(v => !v);
    this.contextMenu.visible = false; // Close context menu if open
    this.cdr.detectChanges();
  }

  private normalizeControlKey(key: string): ControlKey | null {
    return InputManager.normalizeControlKey(key);
  }

  private toggleShipControl() {
    const result = InputManager.toggleShipControl(
      this.ships,
      this.controlledShipId,
      this.activeControlKeys,
      this.mouseInteractionEnabled,
      this.mouseInteractionBeforeControl
    );
    this.controlledShipId = result.controlledShipId;
    this.mouseInteractionBeforeControl = result.mouseInteractionBeforeControl;
    this.updateCursorVisibility();
  }

  private updateCursorVisibility() {
    if (!this.canvasRef) {
      return;
    }
    InputManager.updateCursorVisibility(this.canvasRef.nativeElement, this.controlledShipId);
  }

  private isShipCurrentlyControlled(ship: Ship): boolean {
    return this.controlledShipId === ship.id;
  }

  private startManualReload() {
    const controlledShip = this.ships.find(ship => ship.id === this.controlledShipId);
    InputManager.startManualReload(controlledShip);
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setupCanvas();
    this.initGame();
    this.gameLoop();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    this.audioService.updateGameSounds(false, false, false, undefined);
    // Note: Don't call wakeLockService.cleanup() here as it's a singleton provided in root
    // The app component will handle cleanup
  }

  private setupCanvas() {
    const setup = CanvasManager.setupCanvas(this.canvasRef.nativeElement);
    this.isMobile.set(setup.isMobile);
    this.renderScale = setup.renderScale;
    this.worldWidth = setup.worldWidth;
    this.worldHeight = setup.worldHeight;
  }

  private initGame() {
    this.createBackgroundStars(200);
    this.createShips();
    this.scheduleNextStar();
  }

  private createBackgroundStars(count: number) {
    this.backgroundStars = CanvasManager.createBackgroundStars(count, this.worldWidth, this.worldHeight);
  }

  private createShips() {
    const colors: { name: ShipColor; hex: string }[] = [
      { name: 'Red', hex: '#ef4444' },
      { name: 'Green', hex: '#22c55e' },
      { name: 'Blue', hex: '#3b82f6' },
    ];
    this.ships = colors.map((c, i) => ({
      id: i,
      color: c.name,
      codename: SHIP_PERSONAS[c.name].codename,
      hexColor: c.hex,
      position: new Vector2D(Math.random() * this.worldWidth, Math.random() * this.worldHeight),
      velocity: new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(0.5),
      acceleration: new Vector2D(),
      radius: 10,
      state: 'idle',
      score: 0,
      speedBonus: 0,
      orbitAngle: 0,
      orbitalSpeed: 0.05,
      celebrationTimer: 0,
      celebrationDuration: 2500, // 2.5 seconds
      zigZagDir: 1,
      tail: [],
      z: 0,
      zVelocity: 0,
      zMoveTimer: 7000 + Math.random() * 8000,
      afterburnerTimer: 0,
      blinkCooldown: 15000 + Math.random() * 5000,
      blinkTimer: 5000 + Math.random() * 5000,
      isBlinking: 0,
      personality: 'explorer',
      personalityTimer: 10000 + Math.random() * 10000,
      patrolTarget: undefined,
      fireCooldown: 0,
      paralyzeTimer: 0,
      asteroidsDestroyed: 0,
      maxAmmo: 5,
      ammo: 5,
      reloadDuration: 3000,
      reloadTimer: 0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.08 + (Math.random() - 0.5) * 0.02,
    }));
  }

  private gameLoop = () => {
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update() {
    const deltaTime = 16.67;
    this.timeSinceLastEventCheck += deltaTime;
    if (this.timeSinceLastEventCheck > this.EVENT_CHECK_INTERVAL) {
        this.checkForAsteroidEvent();
        this.timeSinceLastEventCheck = 0;
    }

    if (this.gameMode === 'normal') {
        this.updateTargetStar();
    } else {
        this.targetStar.exists = false; // Hide star during event
    }

    this.updateGameSounds();
    this.updateWormhole();
    this.updateProjectiles();
    this.updateAsteroids();
    this.updateParticles();
    this.updateExplosionParticles();
    this.updateScoreTooltips();
    this.updateNebulas();
    this.updatePhilosophicalChatter();
    this.updateRadioBubbles();
    this.ships.forEach(ship => this.updateShip(ship));
    this.updateShipCollisions();
  }

  private updateGameSounds() {
    const isOrbiting = this.ships.some(s => s.state === 'orbiting');
    const orbitingShip = this.ships.find(s => s.state === 'orbiting');
    const orbitingSpeed = orbitingShip ? orbitingShip.orbitalSpeed : undefined;

    const isHunting = this.gameMode === 'normal' && this.ships.some(s => s.state === 'hunting');
    const isCoop = this.gameMode === 'asteroid_event' && this.ships.some(s => s.state !== 'paralyzed' && s.state !== 'orbiting');
    const anyShipCelebrating = this.ships.some(s => s.state === 'celebrating');
    
    this.audioService.updateGameSounds(isOrbiting, isHunting, isCoop, orbitingSpeed);
    // Passar os parâmetros para o serviço de áudio gerenciar as transições de música
    // A lógica de música agora está totalmente gerenciada no serviço de áudio
    this.audioService.updateBackgroundMusic(isHunting, isCoop, anyShipCelebrating);
  }

  private updateShipCollisions() {
    CollisionManager.updateShipCollisions(this.ships, this.maybeTriggerProximityChatter.bind(this));
  }

  private maybeTriggerProximityChatter(shipA: Ship, shipB: Ship, distance: number, combinedRadius: number) {
    RadioManager.maybeTriggerProximityChatter(
      shipA,
      shipB,
      distance,
      combinedRadius,
      this.proximityCooldowns,
      this.enqueueRadioMessage.bind(this)
    );
  }

  private triggerLaunchChatter(ship: Ship) {
    this.enqueueRadioMessage(ship, 'launch');
  }

  private enqueueRadioMessage(ship: Ship, context: RadioContext): boolean {
    const result = RadioManager.enqueueRadioMessage(
      ship,
      context,
      this.radioBubbles,
      this.scoreTooltips,
      this.globalChatterCooldownUntil,
      this.starCaptureLockUntil,
      this.shipChatterAvailableAt,
      this.radioService,
      this.wrapRadioText.bind(this)
    );
    
    if (result.success) {
      this.globalChatterCooldownUntil = result.newGlobalCooldown;
      this.starCaptureLockUntil = result.newStarCaptureLock;
      this.shipChatterAvailableAt.set(ship.id, result.newShipDelay);
    }
    
    return result.success;
  }

  private getRandomActiveShip(): Ship | null {
    if (this.ships.length === 0) return null;
    const candidates = this.ships.filter(s => s.state !== 'paralyzed');
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private createWormhole() {
    this.wormhole = WormholeManager.create(this.mouse.pos, this.worldWidth, this.worldHeight);
    this.audioService.playSound('wormhole_open');
  }

  private updateWormhole() {
    if (!this.wormhole) return;

    const isActive = WormholeManager.update(this.wormhole);
    
    if (!isActive) {
      this.audioService.playSound('wormhole_close');
      this.wormhole = null;
      return;
    }

    const onTeleport = (position: Vector2D) => {
      this.createBlinkParticles(position, '#FFFFFF');
      this.audioService.playSound('launch');
    };

    this.ships.forEach(s => WormholeManager.processInteraction(s, this.wormhole!, onTeleport));
    this.asteroids.forEach(a => WormholeManager.processInteraction(a, this.wormhole!, onTeleport));
    this.projectiles.forEach(p => WormholeManager.processInteraction(p, this.wormhole!, onTeleport));
  }

  private processWormholeInteraction(entity: Ship | Asteroid | Projectile) {
    // This method is now handled by WormholeManager
    // Keeping for compatibility if needed elsewhere
  }

  private checkForAsteroidEvent() {
    if (GameStateManager.shouldTriggerAsteroidEvent(this.gameMode, this.asteroids.length, this.ships, this.eventTriggerScore)) {
        this.startAsteroidEvent();
    }
  }

  private startAsteroidEvent() {
    this.gameMode = 'asteroid_event';
    StarEventManager.startAsteroidEvent(
      this.ships,
      {
        spawnAsteroid: this.spawnAsteroid.bind(this),
        enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
        getRandomActiveShip: this.getRandomActiveShip.bind(this),
        isShipCurrentlyControlled: this.isShipCurrentlyControlled.bind(this),
      }
    );
  }

  private endAsteroidEvent() {
      this.gameMode = 'normal';
      this.scheduleNextStar();
  }

  private updateTargetStar() {
    if (!this.targetStar.exists && Date.now() > this.nextStarSpawnTime) {
        this.spawnTargetStar();
    }
    
    if (this.targetStar.exists) {
        GameStateManager.updateTargetStar(this.targetStar, this.ships, this.worldWidth, this.worldHeight);
        
        if (this.targetStar.isDespawning && !this.targetStar.exists) {
            this.scheduleNextStar();
        } else if (!this.targetStar.isDespawning && Date.now() > this.targetStar.spawnTime + this.targetStar.lifetime) {
            this.targetStar.isDespawning = true;
            this.ships.forEach(c => {
              if (this.isShipCurrentlyControlled(c)) {
                return;
              }
              c.state = 'idle';
            });
        }

        if (!this.targetStar.isDespawning && Math.random() < 0.5) {
            this.spawnStarParticle();
        }
    }
  }

  private spawnTargetStar() {
    GameStateManager.spawnTargetStar(this.targetStar, this.ships, this.worldWidth, this.worldHeight);
    this.starParticles = [];
    this.ships.forEach(c => {
      if (this.isShipCurrentlyControlled(c)) {
        return;
      }
      c.state = 'hunting';
    });
  }

  private scheduleNextStar() {
    this.nextStarSpawnTime = GameStateManager.scheduleNextStar();
  }

  private updateNebulas() {
    GameStateManager.updateNebulas(this.nebulas);
  }

  private switchPersonality(ship: Ship) {
    ShipBehaviorManager.switchPersonality(ship, this.worldWidth, this.worldHeight);
  }

  private applyPersonalityBehaviors(ship: Ship) {
    ShipBehaviorManager.applyPersonalityBehaviors(ship, this.ships, this.worldWidth, this.worldHeight);
  }
  
  private updateShip(ship: Ship) {
    ShipUpdateManager.updateShip(
      ship,
      {
        ships: this.ships,
        asteroids: this.asteroids,
        targetStar: this.targetStar,
        nebulas: this.nebulas,
        mouse: this.mouse,
        mouseInteractionEnabled: this.mouseInteractionEnabled(),
        gameMode: this.gameMode,
        worldWidth: this.worldWidth,
        worldHeight: this.worldHeight,
        formationAssignments: this.formationAssignments,
        controlledShipId: this.controlledShipId,
        explosionParticles: this.explosionParticles,
        activeControlKeys: this.activeControlKeys,
      },
      {
        switchPersonality: this.switchPersonality.bind(this),
        applyPersonalityBehaviors: this.applyPersonalityBehaviors.bind(this),
        performBlink: this.performBlink.bind(this),
        performCelebration: this.performCelebration.bind(this),
        isShipCurrentlyControlled: this.isShipCurrentlyControlled.bind(this),
        fireProjectile: this.fireProjectile.bind(this),
        createAfterburnerParticle: this.createAfterburnerParticle.bind(this),
        createStarExplosion: this.createStarExplosion.bind(this),
        enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
        applyManualControls: this.applyManualControls.bind(this),
        startManualReload: this.startManualReload.bind(this),
      },
      {
        lerp: this.lerp.bind(this),
        normalizeAngle: this.normalizeAngle.bind(this),
        lerpAngle: this.lerpAngle.bind(this),
      },
      this.audioService
    );

    // Check for star capture
    if (this.gameMode === 'normal' && this.targetStar.exists && !this.targetStar.isDespawning && 
        ship.state !== 'orbiting' && Vector2D.distance(ship.position, this.targetStar.position) < ship.radius + this.targetStar.radius) {
      this.captureStar(ship);
    }
  }

  private applyManualControls(ship: Ship, deltaTime: number) {
    InputManager.applyManualControls(ship, this.activeControlKeys, deltaTime);

    InputManager.handleManualFiring(
      this.activeControlKeys,
      ship,
      () => this.fireProjectile(ship),
      () => this.startManualReload()
    );
  }

  private performCelebration(ship: Ship) {
    ShipBehaviorManager.performCelebration(ship);
  }

  private captureStar(winner: Ship) {
    StarEventManager.captureStar(
      winner,
      this.targetStar,
      this.ships,
      {
        starParticles: this.starParticles,
        scoreTooltips: this.scoreTooltips,
        nebulas: this.nebulas,
        SPEED_INCREMENT_PER_STAR: this.SPEED_INCREMENT_PER_STAR,
        MAX_SPEED_BONUS: this.MAX_SPEED_BONUS,
      },
      {
        createStarExplosion: this.createStarExplosion.bind(this),
        createNebula: this.createNebula.bind(this),
        createScoreTooltip: this.createScoreTooltip.bind(this),
        enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
        scheduleNextStar: this.scheduleNextStar.bind(this),
        isShipCurrentlyControlled: this.isShipCurrentlyControlled.bind(this),
      },
      this.audioService
    );
  }

  private createNebula(position: Vector2D) {
    GameStateManager.createNebula(this.nebulas, position);
  }
  
  private createScoreTooltip(ship: Ship) {
    StarEventManager.createScoreTooltip(ship, this.scoreTooltips);
  }
  
  private updateScoreTooltips() {
    StarEventManager.updateScoreTooltips(this.scoreTooltips, this.ships);
  }

  private updateRadioBubbles() {
    RadioManager.updateRadioBubbles(this.radioBubbles, this.ships);
  }

  private updatePhilosophicalChatter() {
    this.philosophicalChatterNextTime = RadioManager.maybePhilosophicalChatter(
      this.ships,
      this.philosophicalChatterNextTime,
      this.enqueueRadioMessage.bind(this),
      this.getRandomActiveShip.bind(this)
    );
  }

  private updateParticles() {
    ParticleEffectsManager.updateParticles(this.starParticles);
  }

  private updateExplosionParticles() {
    ParticleEffectsManager.updateExplosionParticles(this.explosionParticles);
  }

  private spawnStarParticle() {
    ParticleEffectsManager.spawnStarParticle(this.starParticles, this.targetStar.position);
  }

  private createStarExplosion(position: Vector2D, count = GAME_CONSTANTS.STAR_EXPLOSION_PARTICLE_COUNT) {
    ParticleEffectsManager.createStarExplosion(this.explosionParticles, position, count);
  }

  private performBlink(ship: Ship) {
    const positions = ShipBehaviorManager.performBlink(
      ship,
      this.targetStar.exists,
      this.targetStar.position,
      this.worldWidth,
      this.worldHeight
    );
    
    ParticleEffectsManager.createBlinkParticles(this.explosionParticles, positions[0], ship.hexColor);
    ParticleEffectsManager.createBlinkParticles(this.explosionParticles, positions[1], ship.hexColor);
  }

  private createBlinkParticles(position: Vector2D, color: string) {
    ParticleEffectsManager.createBlinkParticles(this.explosionParticles, position, color);
  }

  private createAfterburnerParticle(ship: Ship) {
    ParticleEffectsManager.createAfterburnerParticle(this.explosionParticles, ship.position, ship.velocity);
  }

  // Asteroid event methods
  private spawnAsteroid(size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D) {
    AsteroidManager.spawn(this.asteroids, size, this.worldWidth, this.worldHeight, position, velocity);
  }
  
  private updateAsteroids() {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const asteroid = this.asteroids[i];
        
        // Update movement with homing behavior
        AsteroidManager.updateMovement(asteroid, this.ships, this.worldWidth, this.worldHeight);
        
        // Collision with ships
        this.ships.forEach(ship => {
            if (AsteroidManager.checkShipCollision(asteroid, ship)) {
                ship.score = Math.max(0, ship.score - 1);
                const isControlled = this.isShipCurrentlyControlled(ship);
                if (!isControlled) {
                  ship.state = 'paralyzed';
                  ship.paralyzeTimer = GAME_CONSTANTS.SHIP_PARALYZE_DURATION;
                }
                ship.velocity = asteroid.velocity.clone().multiply(0.2);
                this.createStarExplosion(ship.position, 30);
                this.audioService.playPooledSound('explosion');
                this.audioService.playSound('paralyzed');
                this.enqueueRadioMessage(ship, 'paralyzed');
                this.asteroids.splice(i, 1); // Destroy asteroid on impact
            }
        });
    }

    if (this.gameMode === 'asteroid_event' && this.asteroids.length === 0) {
        this.endAsteroidEvent();
    }
  }

  private fireProjectile(ship: Ship) {
      this.audioService.playPooledSound('fire');
      ProjectileManager.fire(this.projectiles, ship);
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        ProjectileManager.updateMovement(p);

        if (ProjectileManager.isExpired(p)) {
            this.projectiles.splice(i, 1);
            continue;
        }

        for (let j = this.asteroids.length - 1; j >= 0; j--) {
            const asteroid = this.asteroids[j];
            if (ProjectileManager.checkAsteroidCollision(p, asteroid)) {
                this.projectiles.splice(i, 1);
                this.createStarExplosion(asteroid.position, 15);
                this.audioService.playPooledSound('explosion');
                
                const ownerShip = this.ships.find(s => s.id === p.ownerId);
                if (ownerShip) {
                  ownerShip.asteroidsDestroyed++;
                }

                ProjectileManager.splitAsteroid(asteroid, this.asteroids, this.spawnAsteroid.bind(this));
                this.asteroids.splice(j, 1);
                break; 
            }
        }
    }
  }

  private lerp(start: number, end: number, amt: number): number {
    return this.gameUtils.lerp(start, end, amt);
  }

  // Helper function to keep an angle between -PI and PI
  private normalizeAngle(angle: number): number {
    return this.gameUtils.normalizeAngle(angle);
  }
  
  // Helper function to smoothly interpolate between two angles
  private lerpAngle(a: number, b: number, t: number): number {
    return this.gameUtils.lerpAngle(a, b, t);
  }

  private draw() {
    this.ctx.save();
    this.ctx.scale(this.renderScale, this.renderScale);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
    
    RenderingManager.drawBackgroundStars(this.ctx, this.backgroundStars);
    RenderingManager.drawNebulas(this.ctx, this.nebulas);
    if (this.wormhole) {
      RenderingManager.drawWormhole(this.ctx, this.wormhole);
    }
    if (this.targetStar.exists) {
      RenderingManager.drawTargetStar(this.ctx, this.targetStar);
    }
    RenderingManager.drawParticles(this.ctx, this.starParticles, this.targetStar);
    RenderingManager.drawAsteroids(this.ctx, this.asteroids);
    RenderingManager.drawProjectiles(this.ctx, this.projectiles);
    RenderingManager.drawExplosionParticles(this.ctx, this.explosionParticles);
    
    const allEntities = [
      ...this.ships.map(s => ({ ...s, type: 'ship', z: s.z })),
      // Can add other entity types here if they need z-sorting
    ].sort((a, b) => a.z - b.z);

    allEntities.forEach(entity => {
      if (entity.type === 'ship') {
        const ship = entity as Ship;
        RenderingManager.drawShipTail(this.ctx, ship);
        RenderingManager.drawShip(this.ctx, ship, this.gameMode);
      }
    });

    RenderingManager.drawScoreTooltips(this.ctx, this.scoreTooltips);
    RenderingManager.drawRadioBubbles(this.ctx, this.radioBubbles, this.isMobile());
    RenderingManager.drawCursor(
      this.ctx,
      this.mouse.pos,
      this.mouse.orbitRadius,
      this.mouse.isDown,
      this.mouseInteractionEnabled(),
      this.controlledShipId,
      this.ships
    );

    this.ctx.restore();
  }

  private wrapRadioText(text: string, maxWidth: number): string[] {
    return TextUtils.wrapText(this.ctx, text, maxWidth);
  }

  private toggleConstellationMode() {
    this.constellationMode = !this.constellationMode;
    
    if (this.constellationMode) {
      // Assign ships to formation
      const pattern = this.constellationService.getPattern('heart');
      // Center the pattern on screen
      const center = new Vector2D(this.worldWidth / 2, this.worldHeight / 2);
      const centeredPattern = pattern.map(p => p.clone().add(center));
      
      this.formationAssignments = this.constellationService.assignShipsToPattern(this.ships, centeredPattern);
      
      // Set ships to forming state
      this.ships.forEach(ship => {
        if (this.formationAssignments.has(ship.id)) {
          ship.state = 'forming';
        }
      });
    } else {
      // Release ships
      this.ships.forEach(ship => {
        if (ship.state === 'forming') {
          ship.state = 'idle';
        }
      });
      this.formationAssignments.clear();
    }
  }
}
