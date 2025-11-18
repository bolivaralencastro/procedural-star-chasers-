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
import { PERSONALITIES, ShipColor, ShipPersonality } from '../../models/ship-personas';

// Helper Vector2D class
class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}
  add(v: Vector2D) { this.x += v.x; this.y += v.y; return this; }
  subtract(v: Vector2D) { this.x -= v.x; this.y -= v.y; return this; }
  multiply(s: number) { this.x *= s; this.y *= s; return this; }
  divide(s: number) { this.x /= s; this.y /= s; return this; }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() { const mag = this.magnitude(); if (mag > 0) { this.divide(mag); } return this; }
  static distance(v1: Vector2D, v2: Vector2D) { return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2)); }
  clone() { return new Vector2D(this.x, this.y); }
}

type ShipState = 'idle' | 'hunting' | 'orbiting' | 'celebrating' | 'launched' | 'paralyzed' | 'controlled';

type ControlKey = 'up' | 'down' | 'left' | 'right' | 'space' | 'reload';

interface Ship {
  id: number;
  color: ShipColor;
  hexColor: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  state: ShipState;
  score: number;
  speedBonus: number;
  orbitAngle: number;
  orbitalSpeed: number;
  celebrationTimer: number;
  celebrationDuration: number;
  zigZagDir: number;
  tail: Vector2D[];
  // 3D simulation properties
  z: number;
  zVelocity: number;
  zMoveTimer: number;
  // Abilities
  afterburnerTimer: number; // Red
  blinkCooldown: number; // Blue
  blinkTimer: number; // Blue
  isBlinking: number; // Blue
  // Personality Engine
  personality: ShipPersonality;
  personalityTimer: number;
  patrolTarget?: Vector2D;
  // Asteroid Event
  fireCooldown: number;
  paralyzeTimer: number;
  asteroidsDestroyed: number;
  ammo: number;
  maxAmmo: number;
  reloadTimer: number;
  reloadDuration: number;
  // Aiming
  rotation: number;
  rotationSpeed: number;
  justTeleported?: number;
}

interface Asteroid {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  size: 'large' | 'medium' | 'small';
  shape: Vector2D[]; // offsets from center
  rotation: number;
  rotationSpeed: number;
  justTeleported?: number;
}

interface Projectile {
  position: Vector2D;
  velocity: Vector2D;
  life: number;
  color: string;
  ownerId: number;
  tail: Vector2D[];
  justTeleported?: number;
}

interface BackgroundStar {
  pos: Vector2D;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  color: string;
}

interface TargetStar {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  exists: boolean;
  isDespawning: boolean;
  pulseAngle: number;
  opacity: number;
  spawnTime: number;
  lifetime: number;
}

interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ScoreTooltip {
  shipId: number;
  text: string;
  position: Vector2D;
  life: number;
  maxLife: number;
}

interface RadioMessage {
  id: number;
  text: string;
  color: string;
  expiresAt: number;
}

interface Nebula {
  position: Vector2D;
  radius: number;
  life: number;
  maxLife: number;
}

interface WormholePair {
  entry: {
    position: Vector2D;
    radius: number;
    pulseAngle: number;
  };
  exit: {
    position: Vector2D;
    radius: number;
    pulseAngle: number;
  };
  life: number;
  maxLife: number;
}

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
  @ViewChild('contextMenu') contextMenuRef?: ElementRef<HTMLDivElement>;
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
  private readonly EVENT_CHECK_INTERVAL = 5000;

  private targetStar: TargetStar = {
    position: new Vector2D(),
    velocity: new Vector2D(),
    acceleration: new Vector2D(),
    radius: 15,
    exists: false,
    isDespawning: false,
    pulseAngle: 0,
    opacity: 0,
    spawnTime: 0,
    lifetime: 0,
  };
  private nextStarSpawnTime: number = 0;
  private readonly TAIL_LENGTH = 20;
  private readonly SPEED_INCREMENT_PER_STAR = 0.1;
  private readonly MAX_SPEED_BONUS = 2.0;

  private mouse = {
    pos: new Vector2D(-100, -100),
    isDown: false,
    orbitRadius: 60,
  };

  public contextMenu = { visible: false, x: 0, y: 0 };
  public mobileMenuVisible = signal(false); // Mobile-specific menu
  public mouseInteractionEnabled = signal(true);
  public isMobile = signal(false); // Make it a signal for template access
  private cdr = inject(ChangeDetectorRef);
  public audioService = inject(AudioService);
  public wakeLockService = inject(ScreenWakeLockService);
  private radioService = inject(RadioChatterService);
  private firstInteractionHandled = false; // Track if first interaction happened

  private controlledShipId: number | null = null;
  private activeControlKeys = new Set<ControlKey>();
  private mouseInteractionBeforeControl = true;

  public radioMessages = signal<RadioMessage[]>([]);
  private nextRadioMessageId = 1;
  private globalChatterCooldownUntil = 0;
  private proximityCooldowns = new Map<string, number>();

  // Long-press properties for mobile
  private longPressTimer: any = null;
  private touchStartPosition: Vector2D | null = null;
  private readonly LONG_PRESS_DURATION = 500; // 500ms
  private readonly CONTEXT_MENU_WIDTH = 208; // matches w-52 (4px * 52)
  private readonly CONTEXT_MENU_HEIGHT = 260;
  
  // Scaling properties
  private renderScale = 1.0;
  private worldWidth = 0;
  private worldHeight = 0;

  @HostListener('window:resize')
  onResize() {
    this.setupCanvas();
    this.createBackgroundStars(200);
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
    if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.toggleShipControl();
      return;
    }

    if (this.controlledShipId === null) {
      return;
    }

    const key = this.normalizeControlKey(event.key);
    if (!key) {
      return;
    }

    if (key === 'reload') {
      this.startManualReload();
    }

    this.activeControlKeys.add(key);
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
            launchSpeed *= 1.2; // A bit more initial oomph
            ship.afterburnerTimer = 60; // 1 second duration
          }
          const tangent = new Vector2D(
            this.mouse.pos.y - ship.position.y,
            ship.position.x - this.mouse.pos.x
          ).normalize();
          ship.velocity = tangent.multiply(launchSpeed);
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
    // Check if the tap is on any ship
    for (const ship of this.ships) {
      const distance = Vector2D.distance(this.mouse.pos, ship.position);
      const radius = ship.radius * (1 + ship.z * 0.4); // Account for z-index scaling
      
      if (distance < radius) {
        // Tap is on a ship, increase its speed slightly
        const speedIncrease = 0.3;
        ship.velocity.normalize().multiply(ship.velocity.magnitude() + speedIncrease);
        
        // Add a visual effect to indicate the speed boost
        this.createStarExplosion(ship.position, 5);
        this.audioService.playSound('launch');
        return; // Tap handled, don't do anything else
      }
    }
  }

  private showContextMenu(clientX: number, clientY: number) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    const clampedX = Math.min(
      Math.max(0, relativeX),
      rect.width - this.CONTEXT_MENU_WIDTH
    );
    const clampedY = Math.min(
      Math.max(0, relativeY),
      rect.height - this.CONTEXT_MENU_HEIGHT
    );

    this.contextMenu.visible = true;
    this.contextMenu.x = clampedX;
    this.contextMenu.y = clampedY;
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
    const normalized = key.toLowerCase();
    switch (normalized) {
      case 'arrowup':
        return 'up';
      case 'arrowdown':
        return 'down';
      case 'arrowleft':
        return 'left';
      case 'arrowright':
        return 'right';
      case ' ': // Space key returns a single space character
      case 'space':
      case 'spacebar':
        return 'space';
      case 'r':
        return 'reload';
      default:
        return null;
    }
  }

  private toggleShipControl() {
    if (this.controlledShipId !== null) {
      const controlledShip = this.ships.find(ship => ship.id === this.controlledShipId);
      if (controlledShip && controlledShip.state === 'controlled') {
        controlledShip.state = 'idle';
      }
      this.controlledShipId = null;
      this.activeControlKeys.clear();
      this.mouseInteractionEnabled.set(this.mouseInteractionBeforeControl);
      this.updateCursorVisibility();
      return;
    }

    const orbitingShips = this.ships.filter(ship => ship.state === 'orbiting');
    if (orbitingShips.length === 1) {
      const targetShip = orbitingShips[0];
      this.controlledShipId = targetShip.id;
      targetShip.state = 'controlled';
      targetShip.velocity.multiply(0);
      targetShip.acceleration.multiply(0);
      this.mouseInteractionBeforeControl = this.mouseInteractionEnabled();
      this.mouseInteractionEnabled.set(false);
      this.updateCursorVisibility();
    }
  }

  private updateCursorVisibility() {
    if (!this.canvasRef) {
      return;
    }
    this.canvasRef.nativeElement.style.cursor = this.controlledShipId !== null ? 'none' : 'default';
  }

  private startManualReload() {
    if (this.controlledShipId === null) {
      return;
    }
    const controlledShip = this.ships.find(ship => ship.id === this.controlledShipId);
    if (controlledShip && controlledShip.reloadTimer <= 0 && controlledShip.ammo < controlledShip.maxAmmo) {
      controlledShip.reloadTimer = controlledShip.reloadDuration;
    }
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
    // Mobile check for scaling
    const detectedIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth < 800 && 'ontouchstart' in window);
    this.isMobile.set(detectedIsMobile);
    this.renderScale = detectedIsMobile ? 0.6 : 1.0;

    this.canvasRef.nativeElement.width = window.innerWidth;
    this.canvasRef.nativeElement.height = window.innerHeight;

    this.worldWidth = window.innerWidth / this.renderScale;
    this.worldHeight = window.innerHeight / this.renderScale;
  }

  private initGame() {
    this.createBackgroundStars(200);
    this.createShips();
    this.scheduleNextStar();
  }

  private createBackgroundStars(count: number) {
    this.backgroundStars = [];
    for (let i = 0; i < count; i++) {
      this.backgroundStars.push({
        pos: new Vector2D(Math.random() * this.worldWidth, Math.random() * this.worldHeight),
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.1,
        twinkleSpeed: Math.random() * 0.02,
        color: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'rgba(173, 216, 230, 0.8)' : 'rgba(255, 255, 224, 0.8)') : 'rgba(255, 255, 255, 0.7)'
      });
    }
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
    this.updateRadioMessages();
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

  private updateRadioMessages() {
    const now = Date.now();
    const filtered = this.radioMessages().filter(message => message.expiresAt > now);
    if (filtered.length !== this.radioMessages().length) {
      this.radioMessages.set(filtered);
    }
  }

  private updateShipCollisions() {
    for (let i = 0; i < this.ships.length; i++) {
        for (let j = i + 1; j < this.ships.length; j++) {
            const shipA = this.ships[i];
            const shipB = this.ships[j];

            // Ignore collisions for ships in special states
            if (shipA.state === 'orbiting' || shipA.state === 'celebrating' || shipA.state === 'paralyzed' ||
                shipB.state === 'orbiting' || shipB.state === 'celebrating' || shipB.state === 'paralyzed') {
                continue;
            }

            const radiusA = shipA.radius * (1 + shipA.z * 0.4);
            const radiusB = shipB.radius * (1 + shipB.z * 0.4);
            const combinedRadius = radiusA + radiusB;
            const dist = Vector2D.distance(shipA.position, shipB.position);

            this.maybeTriggerProximityChatter(shipA, shipB, dist, combinedRadius);

            if (dist < combinedRadius) {
                // Collision detected
                const overlap = combinedRadius - dist;
                const normal = dist === 0
                    ? new Vector2D(1, 0)
                    : shipA.position.clone().subtract(shipB.position).normalize();

                // 1. Static resolution: Separate them to prevent sticking
                shipA.position.add(normal.clone().multiply(overlap / 2));
                shipB.position.subtract(normal.clone().multiply(overlap / 2));

                // 2. Dynamic resolution: Billiard-style elastic collision
                const relativeVelocity = shipA.velocity.clone().subtract(shipB.velocity);
                const normalSpeed = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

                // Skip if ships are already moving apart
                if (normalSpeed > 0) {
                  continue;
                }

                const restitution = 0.9; // Slight energy loss to avoid jitter
                const massA = Math.max(1, radiusA * radiusA);
                const massB = Math.max(1, radiusB * radiusB);
                const impulseScalar = (-(1 + restitution) * normalSpeed) / (1 / massA + 1 / massB);
                const impulse = normal.clone().multiply(impulseScalar);

                shipA.velocity.add(impulse.clone().divide(massA));
                shipB.velocity.subtract(impulse.clone().divide(massB));
            }
        }
    }
  }

  private maybeTriggerProximityChatter(shipA: Ship, shipB: Ship, distance: number, combinedRadius: number) {
    const proximityRadius = combinedRadius + 80;
    if (distance > proximityRadius) return;

    const pairKey = shipA.id < shipB.id ? `${shipA.id}-${shipB.id}` : `${shipB.id}-${shipA.id}`;
    const now = Date.now();
    const availableAt = this.proximityCooldowns.get(pairKey) ?? 0;
    if (now < availableAt) return;

    const speaker = Math.random() > 0.5 ? shipA : shipB;
    const emitted = this.enqueueRadioMessage(speaker, 'proximity');
    if (emitted) {
      this.proximityCooldowns.set(pairKey, now + 8000 + Math.random() * 7000);
    }
  }

  private enqueueRadioMessage(ship: Ship, context: RadioContext): boolean {
    const now = Date.now();
    if (now < this.globalChatterCooldownUntil) {
      return false;
    }

    const line = this.radioService.takeLine(ship.color, context);
    if (!line) {
      return false;
    }

    const expiresAt = now + this.radioService.getMessageDuration();
    const message: RadioMessage = {
      id: this.nextRadioMessageId++,
      text: line,
      color: ship.hexColor,
      expiresAt,
    };

    const existing = this.radioMessages().filter(m => m.expiresAt > now);
    this.radioMessages.set([...existing, message]);
    this.globalChatterCooldownUntil = now + this.radioService.getGlobalCooldown();
    return true;
  }

  private getRandomActiveShip(): Ship | null {
    if (this.ships.length === 0) return null;
    const candidates = this.ships.filter(s => s.state !== 'paralyzed');
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private createWormhole() {
    const w = this.worldWidth;
    const h = this.worldHeight;
    let exitPosition: Vector2D;
    
    // Ensure exit isn't too close to entry
    do {
      exitPosition = new Vector2D(Math.random() * w, Math.random() * h);
    } while (Vector2D.distance(this.mouse.pos, exitPosition) < 300);

    this.wormhole = {
      entry: {
        position: this.mouse.pos.clone(),
        radius: 30,
        pulseAngle: Math.random() * Math.PI * 2,
      },
      exit: {
        position: exitPosition,
        radius: 30,
        pulseAngle: Math.random() * Math.PI * 2,
      },
      life: 12000, // 12 seconds
      maxLife: 12000,
    };
    this.audioService.playSound('wormhole_open');
  }

  private updateWormhole() {
    if (!this.wormhole) return;

    this.wormhole.life -= 16.67; // Approx deltaTime
    if (this.wormhole.life <= 0) {
      this.audioService.playSound('wormhole_close');
      this.wormhole = null;
      return;
    }

    this.wormhole.entry.pulseAngle += 0.08;
    this.wormhole.exit.pulseAngle += 0.08;

    this.ships.forEach(s => this.processWormholeInteraction(s));
    this.asteroids.forEach(a => this.processWormholeInteraction(a));
    this.projectiles.forEach(p => this.processWormholeInteraction(p));
  }

  private processWormholeInteraction(entity: Ship | Asteroid | Projectile) {
    if (!this.wormhole) return;

    if (entity.justTeleported && entity.justTeleported > 0) {
      entity.justTeleported--;
      return;
    }
    entity.justTeleported = 0;

    const { entry, exit } = this.wormhole;
    const targets = [entry, exit];
    const destinations = [exit, entry];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const destination = destinations[i];
      const dist = Vector2D.distance(entity.position, target.position);
      
      const attractionRadius = 150;
      if (dist > target.radius && dist < attractionRadius) {
        const pull = target.position.clone().subtract(entity.position).normalize();
        const strength = (1 - dist / attractionRadius) * 0.4;
        if ('acceleration' in entity) {
          (entity as Ship).acceleration.add(pull.multiply(strength));
        } else {
          entity.velocity.add(pull.multiply(strength * 0.3));
        }
      }

      if (dist < target.radius) {
        this.audioService.playSound('launch');
        this.createBlinkParticles(entity.position, '#FFFFFF');

        entity.position = destination.position.clone();
        const exitDirection = new Vector2D(Math.random() - 0.5, Math.random() - 0.5).normalize();
        const speed = entity.velocity.magnitude();
        entity.velocity = exitDirection.multiply(speed > 1 ? speed : 2);
        entity.justTeleported = 180; // 3 seconds immunity

        this.createBlinkParticles(entity.position, '#FFFFFF');
        
        if ('tail' in entity && Array.isArray(entity.tail)) {
          entity.tail = [];
        }
        break;
      }
    }
  }

  private checkForAsteroidEvent() {
    if (this.gameMode !== 'normal' || this.asteroids.length > 0) return;
    const allHaveEnoughStars = this.ships.every(s => s.score >= this.eventTriggerScore);
    if (allHaveEnoughStars && Math.random() < 0.25) {
        this.startAsteroidEvent();
    }
  }

  private startAsteroidEvent() {
      this.gameMode = 'asteroid_event';
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
          this.spawnAsteroid('large');
      }
      this.ships.forEach(s => s.state = 'idle'); // Reset state for cooperative mode
      const announcer = this.getRandomActiveShip();
      if (announcer) {
        this.enqueueRadioMessage(announcer, 'meteor_event');
      }
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
        this.targetStar.pulseAngle += 0.05;
        if (this.targetStar.isDespawning) {
            this.targetStar.opacity -= 0.02;
            if (this.targetStar.opacity <= 0) {
                this.targetStar.exists = false;
                this.scheduleNextStar();
            }
        } else if (this.targetStar.opacity < 1) {
            this.targetStar.opacity += 0.02;
        }
        if (!this.targetStar.isDespawning && Date.now() > this.targetStar.spawnTime + this.targetStar.lifetime) {
            this.targetStar.isDespawning = true;
            this.ships.forEach(c => c.state = 'idle');
        }

        const totalRepulsion = new Vector2D();
        const fleeRadius = 300;
        this.ships.forEach(ship => {
            const dist = Vector2D.distance(this.targetStar.position, ship.position);
            if (dist > 0 && dist < fleeRadius) {
                const repulsion = this.targetStar.position.clone().subtract(ship.position);
                const strength = (1 - dist / fleeRadius) * 0.2;
                repulsion.normalize().multiply(strength);
                totalRepulsion.add(repulsion);
            }
        });
        this.targetStar.acceleration.add(totalRepulsion);

        const STAR_MAX_SPEED = 0.6;
        this.targetStar.velocity.add(this.targetStar.acceleration);
        this.targetStar.velocity.multiply(0.98);
        if (this.targetStar.velocity.magnitude() > STAR_MAX_SPEED) {
            this.targetStar.velocity.normalize().multiply(STAR_MAX_SPEED);
        }
        this.targetStar.position.add(this.targetStar.velocity);
        this.targetStar.acceleration.multiply(0);
        
        const w = this.worldWidth;
        const h = this.worldHeight;
        if (this.targetStar.position.x < 0) this.targetStar.position.x = w;
        if (this.targetStar.position.x > w) this.targetStar.position.x = 0;
        if (this.targetStar.position.y < 0) this.targetStar.position.y = h;
        if (this.targetStar.position.y > h) this.targetStar.position.y = 0;

        if (!this.targetStar.isDespawning && Math.random() < 0.5) {
            this.spawnStarParticle();
        }
    }
  }

  private spawnTargetStar() {
    const w = this.worldWidth;
    const h = this.worldHeight;
    let validPosition = false;
    while(!validPosition) {
        this.targetStar.position = new Vector2D(w * 0.1 + Math.random() * w * 0.8, h * 0.1 + Math.random() * h * 0.8);
        const tooClose = this.ships.some(c => Vector2D.distance(this.targetStar.position, c.position) < 150);
        if (!tooClose) {
            validPosition = true;
        }
    }
    this.targetStar.exists = true;
    this.targetStar.isDespawning = false;
    this.targetStar.opacity = 0;
    this.targetStar.pulseAngle = 0;
    this.targetStar.velocity = new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(0.3);
    this.targetStar.spawnTime = Date.now();
    this.targetStar.lifetime = 12000 + Math.random() * 6000;
    this.starParticles = [];
    this.ships.forEach(c => c.state = 'hunting');
  }

  private scheduleNextStar() {
    const delay = 5000 + Math.random() * 10000;
    this.nextStarSpawnTime = Date.now() + delay;
  }

  private updateNebulas() {
    for (let i = this.nebulas.length - 1; i >= 0; i--) {
      const nebula = this.nebulas[i];
      nebula.life--;
      if (nebula.life <= 0) {
        this.nebulas.splice(i, 1);
      }
    }
  }

  private switchPersonality(ship: Ship) {
    const currentPersonality = ship.personality;
    let newPersonality = currentPersonality;
    while (newPersonality === currentPersonality) {
      newPersonality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    }
    ship.personality = newPersonality;
    ship.personalityTimer = 15000 + Math.random() * 15000; // 15-30 seconds for next change

    if (newPersonality === 'patroller') {
      ship.patrolTarget = new Vector2D(Math.random() * this.worldWidth, Math.random() * this.worldHeight);
    } else {
      ship.patrolTarget = undefined;
    }
  }

  private applyPersonalityBehaviors(ship: Ship) {
    const w = this.worldWidth;
    const h = this.worldHeight;

    switch (ship.personality) {
      case 'aggressive': {
        let nearestShip: Ship | null = null;
        let minDist = Infinity;
        this.ships.forEach(other => {
          if (ship.id === other.id) return;
          const d = Vector2D.distance(ship.position, other.position);
          if (d < minDist) {
            minDist = d;
            nearestShip = other;
          }
        });
        if (nearestShip) {
          const direction = nearestShip.position.clone().subtract(ship.position).normalize();
          ship.acceleration.add(direction.multiply(0.04));
        }
        break;
      }
      case 'timid': {
        const fleeRadius = 250;
        this.ships.forEach(other => {
          if (ship.id === other.id) return;
          const dist = Vector2D.distance(ship.position, other.position);
          if (dist > 0 && dist < fleeRadius) {
            const repulsion = ship.position.clone().subtract(other.position);
            const strength = (1 - dist / fleeRadius) * 0.1;
            repulsion.normalize().multiply(strength);
            ship.acceleration.add(repulsion);
          }
        });
        break;
      }
      case 'loner': {
        const quadrants = [
          { x: 0, y: 0, count: 0 }, { x: w / 2, y: 0, count: 0 },
          { x: 0, y: h / 2, count: 0 }, { x: w / 2, y: h / 2, count: 0 }
        ];
        this.ships.forEach(c => {
          if (c.position.x < w / 2 && c.position.y < h / 2) quadrants[0].count++;
          else if (c.position.x >= w / 2 && c.position.y < h / 2) quadrants[1].count++;
          else if (c.position.x < w / 2 && c.position.y >= h / 2) quadrants[2].count++;
          else quadrants[3].count++;
        });
        quadrants.sort((a, b) => a.count - b.count);
        const targetQuadrant = quadrants[0];
        const targetPos = new Vector2D(targetQuadrant.x + w / 4, targetQuadrant.y + h / 4);
        const direction = targetPos.subtract(ship.position).normalize();
        ship.acceleration.add(direction.multiply(0.03));
        break;
      }
      case 'patroller': {
        if (!ship.patrolTarget || Vector2D.distance(ship.position, ship.patrolTarget) < 100) {
          ship.patrolTarget = new Vector2D(Math.random() * w, Math.random() * h);
        }
        const direction = ship.patrolTarget.clone().subtract(ship.position).normalize();
        ship.acceleration.add(direction.multiply(0.05));
        break;
      }
      default: { // explorer
        const randomAngle = (Math.random() - 0.5) * 0.1;
        const newVelX = Math.cos(randomAngle) * ship.velocity.x - Math.sin(randomAngle) * ship.velocity.y;
        const newVelY = Math.sin(randomAngle) * ship.velocity.x + Math.cos(randomAngle) * ship.velocity.y;
        ship.velocity.x = newVelX;
        ship.velocity.y = newVelY;
        let idleSpeed = 0.8 + ship.speedBonus * 0.5;
        if (ship.color === 'Blue') idleSpeed *= 1.25;
        ship.velocity.normalize().multiply(idleSpeed);
        break;
      }
    }
  }
  
  private updateShip(ship: Ship) {
    const deltaTime = 16.67;
    ship.personalityTimer -= deltaTime;
    if (ship.personalityTimer <= 0 && ship.state === 'idle') {
      this.switchPersonality(ship);
    }

    ship.zMoveTimer -= deltaTime;
    if (ship.zMoveTimer <= 0) {
        ship.zVelocity = (Math.random() - 0.5) * 0.03;
        ship.zMoveTimer = 7000 + Math.random() * 8000;
    }
    ship.z += ship.zVelocity;
    ship.zVelocity *= 0.995;
    if (ship.z > 1) { ship.z = 1; ship.zVelocity *= -1; }
    if (ship.z < -1) { ship.z = -1; ship.zVelocity *= -1; }

    if (ship.isBlinking > 0) ship.isBlinking--;
    if (ship.fireCooldown > 0) ship.fireCooldown -= deltaTime;

    this.updateReloadTimer(ship, deltaTime);

    if (ship.color === 'Blue') {
      ship.blinkTimer -= deltaTime;
      if (ship.blinkTimer <= 0 && (ship.state === 'idle' || ship.state === 'hunting')) {
        this.performBlink(ship);
      }
    }
    if (ship.color === 'Red' && ship.afterburnerTimer > 0) {
      ship.afterburnerTimer--;
      const afterburnerThrust = ship.velocity.clone().normalize().multiply(0.3);
      ship.acceleration.add(afterburnerThrust);
      if (Math.random() < 0.8) this.createAfterburnerParticle(ship);
    }
    
    let asteroidTarget: Asteroid | null = null;
    let predictedAsteroidPosition: Vector2D | null = null;
    // Cooperative Mode Logic
    if (ship.state === 'controlled') {
      this.applyManualControls(ship, deltaTime);
    } else if (this.gameMode === 'asteroid_event') {
      if (ship.state === 'paralyzed') {
        ship.paralyzeTimer -= deltaTime;
        if (ship.paralyzeTimer <= 0) {
          ship.state = 'idle';
        }
      } else if (ship.state !== 'orbiting' && ship.state !== 'launched') {
        let target: Vector2D | null = null;
        let isRescuing = false;
        if (ship.reloadTimer <= 0 && ship.ammo <= 0) {
          ship.reloadTimer = ship.reloadDuration;
        }
  
        // Priority 1: Rescue paralyzed allies
        const paralyzedAlly = this.ships.find(s => s.id !== ship.id && s.state === 'paralyzed');
        if (paralyzedAlly) {
          target = paralyzedAlly.position;
          isRescuing = true;
          const dist = Vector2D.distance(ship.position, paralyzedAlly.position);
          if (dist < ship.radius + paralyzedAlly.radius) {
            if (ship.score > 0) {
              ship.score--;
              paralyzedAlly.state = 'idle';
              paralyzedAlly.paralyzeTimer = 0;
              this.createStarExplosion(ship.position, 20);
              this.audioService.playSound('rescue');
              this.enqueueRadioMessage(paralyzedAlly, 'rescue');
            }
          }
        } else if (this.asteroids.length > 0) {
          // Priority 2: Engage asteroids
          asteroidTarget = this.asteroids.reduce((prev, curr) => {
            return Vector2D.distance(ship.position, curr.position) < Vector2D.distance(ship.position, prev.position) ? curr : prev;
          });
          
          if (asteroidTarget) {
            // Analytical solution for interception point
            const projectileBaseSpeed = 8;
            const S_rel = asteroidTarget.position.clone().subtract(ship.position);
            const V_rel = asteroidTarget.velocity.clone().subtract(ship.velocity.clone().multiply(0.5));
            
            const a = (V_rel.x * V_rel.x + V_rel.y * V_rel.y) - (projectileBaseSpeed * projectileBaseSpeed);
            const b = 2 * (V_rel.x * S_rel.x + V_rel.y * S_rel.y);
            const c = S_rel.x * S_rel.x + S_rel.y * S_rel.y;
          
            const discriminant = b * b - 4 * a * c;
          
            let timeToIntercept = -1;
            if (discriminant >= 0) {
              const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
              const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
              
              if (t1 > 0 && t2 > 0) {
                timeToIntercept = Math.min(t1, t2);
              } else {
                timeToIntercept = Math.max(t1, t2);
              }
            }
          
            if (timeToIntercept > 0) {
              predictedAsteroidPosition = asteroidTarget.position.clone().add(asteroidTarget.velocity.clone().multiply(timeToIntercept));
            } else {
              predictedAsteroidPosition = asteroidTarget.position.clone();
            }
          }
  
          // Calculate strategic position (strafing)
          if(asteroidTarget) {
            const safeDistance = 200;
            const predictionTime = 30; // frames
            const futureAsteroidPos = asteroidTarget.position.clone().add(asteroidTarget.velocity.clone().multiply(predictionTime));
            const perpendicular = new Vector2D(-asteroidTarget.velocity.y, asteroidTarget.velocity.x).normalize();
            
            const pos1 = futureAsteroidPos.clone().add(perpendicular.clone().multiply(safeDistance));
            const pos2 = futureAsteroidPos.clone().subtract(perpendicular.clone().multiply(safeDistance));
            
            target = Vector2D.distance(ship.position, pos1) < Vector2D.distance(ship.position, pos2) ? pos1 : pos2;
          }
        }
  
        // Apply seeking force towards the calculated target
        if (target) {
          const direction = target.clone().subtract(ship.position).normalize();
          ship.acceleration.add(direction.multiply(0.08));
        }
  
        // Apply avoidance force for all nearby asteroids
        const avoidanceRadius = 150;
        this.asteroids.forEach(asteroid => {
          const dist = Vector2D.distance(ship.position, asteroid.position);
          if (dist > 0 && dist < avoidanceRadius) {
            const repulsion = ship.position.clone().subtract(asteroid.position);
            const strength = (1 - dist / avoidanceRadius) * 0.4;
            repulsion.normalize().multiply(strength);
            ship.acceleration.add(repulsion);
          }
        });
  
        // Firing logic
        if (!isRescuing && ship.fireCooldown <= 0 && asteroidTarget && predictedAsteroidPosition) {
          const distanceToTarget = Vector2D.distance(ship.position, asteroidTarget.position);
          const angleToTarget = Math.atan2(predictedAsteroidPosition.y - ship.position.y, predictedAsteroidPosition.x - ship.position.x);
          const angleDifference = Math.abs(this.normalizeAngle(ship.rotation - angleToTarget));
          const firingArc = Math.PI / 12; // 15 degrees

          if (distanceToTarget < 400 && angleDifference < firingArc) { // Only fire when in range and aimed
              if (ship.ammo > 0 && ship.reloadTimer <= 0) {
                this.fireProjectile(ship);
              } else if (ship.ammo <= 0) {
                  this.audioService.playSound('empty');
                  ship.fireCooldown = 500;
              }
          }
        }
      }
    } else { // Normal Mode Logic
      switch (ship.state) {
          case 'idle': this.applyPersonalityBehaviors(ship); break;
          case 'hunting':
              if (this.targetStar.exists && !this.targetStar.isDespawning) {
                  const direction = this.targetStar.position.clone().subtract(ship.position).normalize();
                  let huntStrength = 0.05;
                  if (ship.color === 'Red') huntStrength = 0.07;
                  ship.acceleration.add(direction.multiply(huntStrength));
              }
              break;
          case 'celebrating':
              this.performCelebration(ship);
              ship.celebrationTimer -= deltaTime;
              if(ship.celebrationTimer <= 0) ship.state = 'idle';
              break;
      }
    }

    // Shared State Logic (Orbiting, Launched, Interaction)
    if (ship.state === 'orbiting') {
        if (this.mouse.isDown && this.mouseInteractionEnabled()) {
            ship.orbitalSpeed = Math.min(0.3, ship.orbitalSpeed + 0.003);
        } else {
            ship.orbitalSpeed = Math.max(0.05, ship.orbitalSpeed - 0.005);
        }
        ship.orbitAngle += ship.orbitalSpeed;
        ship.position.x = this.mouse.pos.x + this.mouse.orbitRadius * Math.cos(ship.orbitAngle);
        ship.position.y = this.mouse.pos.y + this.mouse.orbitRadius * Math.sin(ship.orbitAngle);
        ship.velocity = new Vector2D();
    } else if (ship.state === 'launched') {
        ship.velocity.multiply(0.98); // Friction
        const returnSpeed = this.gameMode === 'normal' && this.targetStar.exists ? 1.5 : 0.8;
        if (ship.velocity.magnitude() < returnSpeed) {
            ship.state = (this.gameMode === 'normal' && this.targetStar.exists) ? 'hunting' : 'idle';
        }
    }

    if (ship.state !== 'orbiting' && ship.state !== 'celebrating' && ship.state !== 'paralyzed' && ship.state !== 'controlled') {
      if (this.mouseInteractionEnabled() && ship.state !== 'launched') {
        const distToMouse = Vector2D.distance(ship.position, this.mouse.pos);
        if (distToMouse < this.mouse.orbitRadius) {
          ship.state = 'orbiting';
          ship.orbitAngle = Math.atan2(ship.position.y - this.mouse.pos.y, ship.position.x - this.mouse.pos.x);
        } else if (distToMouse < this.mouse.orbitRadius * 4) {
          const pull = this.mouse.pos.clone().subtract(ship.position).normalize().multiply(200 / (distToMouse * distToMouse));
          ship.acceleration.add(pull);
        }
      } else if (!this.mouseInteractionEnabled()) {
        const distToMouse = Vector2D.distance(ship.position, this.mouse.pos);
        const repulsionRadius = this.mouse.orbitRadius * 4;
        if (distToMouse > 0 && distToMouse < repulsionRadius) {
          const push = ship.position.clone().subtract(this.mouse.pos).normalize().multiply((1 - distToMouse / repulsionRadius) * 0.4);
          ship.acceleration.add(push);
        }
      }
    }

    if (ship.state !== 'orbiting' && ship.state !== 'celebrating' && ship.state !== 'paralyzed') {
        ship.velocity.add(ship.acceleration);
        this.nebulas.forEach(nebula => {
          if (Vector2D.distance(ship.position, nebula.position) < nebula.radius) ship.velocity.multiply(0.96);
        });
        if (ship.state !== 'launched') {
            let personalitySpeedMod = 1.0;
            if (ship.personality === 'aggressive') personalitySpeedMod = 1.15;
            if (ship.personality === 'timid') personalitySpeedMod = 0.9;
            const baseMaxSpeed = (this.gameMode === 'normal' && ship.state === 'hunting') ? 2.5 : 1.5;
            const maxSpeed = (baseMaxSpeed + ship.speedBonus) * personalitySpeedMod;
            if (ship.velocity.magnitude() > maxSpeed) ship.velocity.normalize().multiply(maxSpeed);
        }
        ship.position.add(ship.velocity);
        ship.acceleration.multiply(0);
    }
    
    // Rotation logic
    if (ship.state !== 'orbiting' && ship.state !== 'celebrating' && ship.state !== 'paralyzed') {
      if (this.gameMode === 'asteroid_event' && asteroidTarget && predictedAsteroidPosition) {
        const targetAngle = Math.atan2(predictedAsteroidPosition.y - ship.position.y, predictedAsteroidPosition.x - ship.position.x);
        ship.rotation = this.lerpAngle(ship.rotation, targetAngle, ship.rotationSpeed);
      } else if (ship.velocity.magnitude() > 0.1) {
        const targetAngle = Math.atan2(ship.velocity.y, ship.velocity.x);
        ship.rotation = this.lerpAngle(ship.rotation, targetAngle, 0.15);
      }
    }


    if (this.gameMode === 'normal' && this.targetStar.exists && !this.targetStar.isDespawning && ship.state !== 'orbiting' && Vector2D.distance(ship.position, this.targetStar.position) < ship.radius + this.targetStar.radius) {
        this.captureStar(ship);
    }
    
    const w = this.worldWidth;
    const h = this.worldHeight;
    let wrapped = false;
    if (ship.position.x < 0) { ship.position.x = w; wrapped = true; }
    if (ship.position.x > w) { ship.position.x = 0; wrapped = true; }
    if (ship.position.y < 0) { ship.position.y = h; wrapped = true; }
    if (ship.position.y > h) { ship.position.y = 0; wrapped = true; }
    
    if (wrapped) ship.tail = [];
    else {
      ship.tail.push(ship.position.clone());
      if (ship.tail.length > this.TAIL_LENGTH) ship.tail.shift();
    }
  }

  private updateReloadTimer(ship: Ship, deltaTime: number) {
    if (ship.reloadTimer > 0) {
      ship.reloadTimer -= deltaTime;
      if (ship.reloadTimer <= 0) {
        ship.ammo = ship.maxAmmo;
        ship.reloadTimer = 0;
        this.audioService.playSound('reload');
      }
    }
  }

  private applyManualControls(ship: Ship, _deltaTime: number) {
    const thrust = 0.15;
    const manualAcceleration = new Vector2D();

    if (this.activeControlKeys.has('up')) manualAcceleration.y -= thrust;
    if (this.activeControlKeys.has('down')) manualAcceleration.y += thrust;
    if (this.activeControlKeys.has('left')) manualAcceleration.x -= thrust;
    if (this.activeControlKeys.has('right')) manualAcceleration.x += thrust;

    ship.acceleration.add(manualAcceleration);
    ship.velocity.multiply(0.995);

    const firingPressed = this.activeControlKeys.has('space');
    if (firingPressed && ship.fireCooldown <= 0 && ship.reloadTimer <= 0) {
      if (ship.ammo > 0) {
        this.fireProjectile(ship);
      } else {
        this.startManualReload();
      }
    }

    if (this.activeControlKeys.has('reload')) {
      this.startManualReload();
    }
  }

  private performCelebration(ship: Ship) {
    const progress = 1 - (ship.celebrationTimer / ship.celebrationDuration);
    const easeMultiplier = Math.sin(progress * Math.PI);
    switch (ship.color) {
        case 'Red': // Zig-zag
            ship.velocity.multiply(0.9);
            const perp = new Vector2D(-ship.velocity.y, ship.velocity.x).normalize();
            if (Math.random() < 0.1) ship.zigZagDir *= -1;
            ship.acceleration.add(perp.multiply(0.5 * ship.zigZagDir * easeMultiplier));
            break;
        case 'Green': // Spiral
            const angle = (Date.now() / 200);
            const radius = 2 + 30 * easeMultiplier;
            ship.position.x += Math.cos(angle) * radius * 0.1;
            ship.position.y += Math.sin(angle) * radius * 0.1;
            ship.velocity.multiply(0.9);
            break;
        case 'Blue': // Loop
            const turn = new Vector2D(-ship.velocity.y, ship.velocity.x).normalize().multiply(0.3 * easeMultiplier);
            ship.acceleration.add(turn);
            break;
    }
    ship.velocity.add(ship.acceleration);
    ship.velocity.normalize().multiply(3);
    ship.position.add(ship.velocity);
    ship.acceleration.multiply(0);
  }

  private captureStar(winner: Ship) {
    winner.score++;
    winner.speedBonus = Math.min(winner.speedBonus + this.SPEED_INCREMENT_PER_STAR, this.MAX_SPEED_BONUS);
    
    this.createStarExplosion(this.targetStar.position.clone());
    this.audioService.playSound('capture');

    if (winner.color === 'Green') {
      this.createNebula(this.targetStar.position.clone());
    }

    this.targetStar.exists = false;
    this.starParticles = [];
    winner.state = 'celebrating';
    this.audioService.playSound('celebrate');
    this.enqueueRadioMessage(winner, 'star_capture');
    // FIX: The celebration duration is a property of the ship, not the component.
    winner.celebrationTimer = winner.celebrationDuration;
    this.ships.forEach(c => {
        if (c.id !== winner.id) c.state = 'idle';
    });
    this.createScoreTooltip(winner);
    this.scheduleNextStar();
  }

  private createNebula(position: Vector2D) {
    this.nebulas.push({ position, radius: 120, life: 600, maxLife: 600 });
  }
  
  private createScoreTooltip(ship: Ship) {
    this.scoreTooltips.push({ shipId: ship.id, text: `${ship.score}`, position: ship.position.clone(), life: 180, maxLife: 180 });
  }
  
  private updateScoreTooltips() {
    for (let i = this.scoreTooltips.length - 1; i >= 0; i--) {
      const tooltip = this.scoreTooltips[i];
      tooltip.life--;
      if (tooltip.life <= 0) {
        this.scoreTooltips.splice(i, 1);
        continue;
      }
      const ship = this.ships.find(c => c.id === tooltip.shipId);
      if (ship) {
        tooltip.position.x = ship.position.x;
        tooltip.position.y = ship.position.y - ship.radius - 25;
      }
    }
  }

  private updateParticles() {
    for (let i = this.starParticles.length - 1; i >= 0; i--) {
        const p = this.starParticles[i];
        p.position.add(p.velocity);
        p.life--;
        if (p.life <= 0) this.starParticles.splice(i, 1);
    }
  }

  private updateExplosionParticles() {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
        const p = this.explosionParticles[i];
        p.position.add(p.velocity);
        p.velocity.multiply(0.97);
        p.life--;
        if (p.life <= 0) this.explosionParticles.splice(i, 1);
    }
  }

  private spawnStarParticle() {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5 + 0.2;
      const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.starParticles.push({ position: this.targetStar.position.clone(), velocity, radius: Math.random() * 1.5 + 0.5, life: 40 + Math.random() * 40, maxLife: 80, color: 'rgba(255, 223, 0, 1)' });
  }

  private createStarExplosion(position: Vector2D, count = 60) {
    const colors = ['#FFD700', '#FFA500', '#FFFFE0', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
        const life = 50 + Math.random() * 40;
        this.explosionParticles.push({ position: position.clone(), velocity, radius: Math.random() * 2.5 + 1, life, maxLife: life, color: colors[Math.floor(Math.random() * colors.length)] });
    }
  }

  private performBlink(ship: Ship) {
    this.audioService.playSound('blink');
    const BLINK_DISTANCE = 150;
    const startPos = ship.position.clone();
    let direction: Vector2D;
    if (ship.state === 'hunting' && this.targetStar.exists) {
      direction = this.targetStar.position.clone().subtract(ship.position).normalize();
    } else {
      direction = ship.velocity.magnitude() > 0 ? ship.velocity.clone().normalize() : new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    }
    const endPos = startPos.clone().add(direction.multiply(BLINK_DISTANCE));
    const w = this.worldWidth;
    const h = this.worldHeight;
    endPos.x = (endPos.x + w) % w;
    endPos.y = (endPos.y + h) % h;

    this.createBlinkParticles(startPos, ship.hexColor);
    ship.position = endPos;
    ship.tail = [];
    ship.isBlinking = 15;
    this.createBlinkParticles(endPos, ship.hexColor);
    ship.blinkTimer = ship.blinkCooldown + (Math.random() - 0.5) * 4000;
  }

  private createBlinkParticles(position: Vector2D, color: string) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
      const life = 20 + Math.random() * 20;
      this.explosionParticles.push({ position: position.clone(), velocity, life, radius: Math.random() * 2 + 1, maxLife: life, color });
    }
  }

  private createAfterburnerParticle(ship: Ship) {
    const angle = Math.atan2(ship.velocity.y, ship.velocity.x) + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = ship.velocity.magnitude() * 0.5 + Math.random() * 2;
    const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
    const life = 20 + Math.random() * 20;
    this.explosionParticles.push({ position: ship.position.clone(), velocity, life, radius: Math.random() * 1.5 + 0.5, maxLife: life, color: ['#ffc107', '#ff9800', '#f44336'][Math.floor(Math.random() * 3)] });
  }

  // Asteroid event methods
  private spawnAsteroid(size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D) {
    const w = this.worldWidth;
    const h = this.worldHeight;
    const edge = Math.floor(Math.random() * 4);
    let pos: Vector2D;
    if (position) {
      pos = position;
    } else {
      if (edge === 0) pos = new Vector2D(Math.random() * w, -50); // Top
      else if (edge === 1) pos = new Vector2D(w + 50, Math.random() * h); // Right
      else if (edge === 2) pos = new Vector2D(Math.random() * w, h + 50); // Bottom
      else pos = new Vector2D(-50, Math.random() * h); // Left
    }

    const vel = velocity || new Vector2D(w / 2 - pos.x, h / 2 - pos.y).normalize().multiply(Math.random() * 1 + 0.5);
    const radius = size === 'large' ? 40 : size === 'medium' ? 20 : 10;

    const shape: Vector2D[] = [];
    const segments = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const dist = radius * (0.8 + Math.random() * 0.4);
        shape.push(new Vector2D(Math.cos(angle) * dist, Math.sin(angle) * dist));
    }

    this.asteroids.push({ position: pos, velocity: vel, radius, size, shape, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.02 });
  }
  
  private updateAsteroids() {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const asteroid = this.asteroids[i];
        
        // Add weak homing behavior towards the nearest ship
        if (this.ships.length > 0) {
            let nearestShip: Ship | null = null;
            let minDist = Infinity;
            this.ships.forEach(ship => {
                if (ship.state === 'paralyzed') return;
                const d = Vector2D.distance(asteroid.position, ship.position);
                if (d < minDist) {
                    minDist = d;
                    nearestShip = ship;
                }
            });

            if (nearestShip) {
                const direction = nearestShip.position.clone().subtract(asteroid.position).normalize();
                const trackingStrength = 0.002;
                const acceleration = direction.multiply(trackingStrength);
                asteroid.velocity.add(acceleration);

                const maxAsteroidSpeed = asteroid.size === 'large' ? 1.5 : asteroid.size === 'medium' ? 2.0 : 2.5;
                if (asteroid.velocity.magnitude() > maxAsteroidSpeed) {
                    asteroid.velocity.normalize().multiply(maxAsteroidSpeed);
                }
            }
        }

        asteroid.position.add(asteroid.velocity);
        asteroid.rotation += asteroid.rotationSpeed;

        // Screen wrap
        const w = this.worldWidth;
        const h = this.worldHeight;
        if (asteroid.position.x < -asteroid.radius) asteroid.position.x = w + asteroid.radius;
        if (asteroid.position.x > w + asteroid.radius) asteroid.position.x = -asteroid.radius;
        if (asteroid.position.y < -asteroid.radius) asteroid.position.y = h + asteroid.radius;
        if (asteroid.position.y > h + asteroid.radius) asteroid.position.y = -asteroid.radius;
        
        // Collision with ships
        this.ships.forEach(ship => {
            if (ship.state !== 'paralyzed' && Vector2D.distance(asteroid.position, ship.position) < asteroid.radius + ship.radius) {
                ship.score = Math.max(0, ship.score - 1);
                ship.state = 'paralyzed';
                ship.paralyzeTimer = 5000;
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
      const projectileAngle = ship.rotation;
      const direction = new Vector2D(Math.cos(projectileAngle), Math.sin(projectileAngle));
      const startPos = ship.position.clone().add(direction.multiply(ship.radius));
      const velocity = direction.multiply(8).add(ship.velocity.clone().multiply(0.5));
      
      this.projectiles.push({
          position: startPos,
          velocity: velocity,
          life: 60,
          color: '#FFD700', // Gold
          ownerId: ship.id,
          tail: [],
      });

      ship.ammo--;
      ship.fireCooldown = 500; // 0.5 second cooldown
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.position.add(p.velocity);
        p.life--;
        
        p.tail.push(p.position.clone());
        if (p.tail.length > 10) {
            p.tail.shift();
        }

        if (p.life <= 0) {
            this.projectiles.splice(i, 1);
            continue;
        }

        for (let j = this.asteroids.length - 1; j >= 0; j--) {
            const asteroid = this.asteroids[j];
            if (Vector2D.distance(p.position, asteroid.position) < asteroid.radius + 3) { // FIX: Account for projectile radius
                this.projectiles.splice(i, 1);
                this.createStarExplosion(asteroid.position, 15);
                this.audioService.playPooledSound('explosion');
                
                const ownerShip = this.ships.find(s => s.id === p.ownerId);
                if (ownerShip) {
                  ownerShip.asteroidsDestroyed++;
                }

                if (asteroid.size === 'large') {
                    for(let k = 0; k < 2; k++) this.spawnAsteroid('medium', asteroid.position.clone(), new Vector2D(Math.random()*2-1, Math.random()*2-1).normalize().multiply(1.5));
                } else if (asteroid.size === 'medium') {
                    for(let k = 0; k < 2; k++) this.spawnAsteroid('small', asteroid.position.clone(), new Vector2D(Math.random()*2-1, Math.random()*2-1).normalize().multiply(2));
                }
                this.asteroids.splice(j, 1);
                break; 
            }
        }
    }
  }

  private lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
  }

  // Helper function to keep an angle between -PI and PI
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  
  // Helper function to smoothly interpolate between two angles
  private lerpAngle(a: number, b: number, t: number): number {
    const da = this.normalizeAngle(b - a);
    return this.normalizeAngle(a + da * t);
  }

  private draw() {
    this.ctx.save();
    this.ctx.scale(this.renderScale, this.renderScale);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
    
    this.drawBackgroundStars();
    this.drawNebulas();
    this.drawWormhole();
    if (this.targetStar.exists) this.drawTargetStar();
    this.drawParticles();
    this.drawAsteroids();
    this.drawProjectiles();
    this.drawExplosionParticles();
    
    const allEntities = [
      ...this.ships.map(s => ({ ...s, type: 'ship', z: s.z })),
      // Can add other entity types here if they need z-sorting
    ].sort((a, b) => a.z - b.z);

    allEntities.forEach(entity => {
      if (entity.type === 'ship') {
        // Draw tail first (unrotated)
        const ship = entity as Ship;
        this.ctx.save();
        let finalAlpha = 1 - (ship.z * -1) * 0.4;
        if (ship.color === 'Blue' && ship.isBlinking > 0) {
          finalAlpha *= 1 - (ship.isBlinking / 15);
        }
        this.ctx.globalAlpha = finalAlpha;
        for (let i = 0; i < ship.tail.length; i++) {
          const pos = ship.tail[i];
          if (i > 0 && Vector2D.distance(pos, ship.tail[i - 1]) > 100) continue;
          const r = parseInt(ship.hexColor.slice(1, 3), 16);
          const g = parseInt(ship.hexColor.slice(3, 5), 16);
          const b = parseInt(ship.hexColor.slice(5, 7), 16);
          const currentRadius = ship.radius * (1 + ship.z * 0.4);
          this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${i / ship.tail.length * 0.5})`;
          this.ctx.beginPath();
          this.ctx.arc(pos.x, pos.y, currentRadius * (i / ship.tail.length) * 0.7, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.restore();

        // Draw the ship itself
        this.drawShip(ship);
      }
    });


    this.drawScoreTooltips();
    this.drawCursor();

    this.ctx.restore();
  }

  private drawWormhole() {
    if (!this.wormhole) return;
    const { entry, exit, life, maxLife } = this.wormhole;
    this.drawWormholeEnd(entry.position, entry.radius, entry.pulseAngle, life, maxLife);
    this.drawWormholeEnd(exit.position, exit.radius, exit.pulseAngle, life, maxLife);
  }

  private drawWormholeEnd(position: Vector2D, radius: number, pulseAngle: number, life: number, maxLife: number) {
    const fadeDuration = 500;
    let scale = 1;
    if (life < fadeDuration) {
      scale = life / fadeDuration;
    } else if (maxLife - life < fadeDuration) {
      scale = (maxLife - life) / fadeDuration;
    }

    const baseRadius = radius * scale;
    const pulseEffect = Math.sin(pulseAngle) * 2;
    const currentRadius = baseRadius + pulseEffect;

    if (currentRadius <= 0) {
      return;
    }

    this.ctx.save();
    this.ctx.translate(position.x, position.y);
    
    // Inner void
    this.ctx.globalAlpha = scale * 0.7;
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Pulsating outer ring
    this.ctx.globalAlpha = scale;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Subtle glow
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius + 1, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawBackgroundStars() {
    const now = Date.now();
    this.backgroundStars.forEach(star => {
      this.ctx.beginPath();
      const opacity = star.opacity + Math.sin(now * star.twinkleSpeed) * 0.1;
      this.ctx.fillStyle = star.color.replace(/[\d\.]+\)$/g, `${opacity})`);
      this.ctx.arc(star.pos.x, star.pos.y, star.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawNebulas() {
    this.nebulas.forEach(nebula => {
      const opacity = (nebula.life / nebula.maxLife) * 0.3;
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.globalAlpha = opacity;
      const grad = this.ctx.createRadialGradient(nebula.position.x, nebula.position.y, 0, nebula.position.x, nebula.position.y, nebula.radius);
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
      grad.addColorStop(0.7, 'rgba(21, 128, 61, 0.3)');
      grad.addColorStop(1, 'rgba(22, 101, 52, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(nebula.position.x, nebula.position.y, nebula.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private drawTargetStar() {
    const pulse = Math.sin(this.targetStar.pulseAngle) * 3;
    const radius = this.targetStar.radius + pulse;
    const coreRadius = this.targetStar.radius * 0.6 + pulse * 0.8;

    this.ctx.save();
    this.ctx.globalAlpha = this.targetStar.opacity;

    this.ctx.beginPath();
    const grad = this.ctx.createRadialGradient(this.targetStar.position.x, this.targetStar.position.y, 0, this.targetStar.position.x, this.targetStar.position.y, radius * 2.5);
    grad.addColorStop(0, 'rgba(255, 223, 0, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
    grad.addColorStop(1, 'rgba(255, 165, 0, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.arc(this.targetStar.position.x, this.targetStar.position.y, radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255, 255, 224, 1)';
    this.ctx.arc(this.targetStar.position.x, this.targetStar.position.y, coreRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
  
  private drawParticles() {
      this.starParticles.forEach(p => {
          this.ctx.beginPath();
          const opacity = (p.life / p.maxLife) * 0.8 * this.targetStar.opacity;
          this.ctx.fillStyle = p.color.replace(/[\d\.]+\)$/g, `${opacity})`);
          this.ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
          this.ctx.fill();
      });
  }

  private drawExplosionParticles() {
    this.explosionParticles.forEach(p => {
        this.ctx.save();
        this.ctx.globalAlpha = p.life / p.maxLife;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        const currentRadius = p.radius * (p.life / p.maxLife);
        this.ctx.arc(p.position.x, p.position.y, currentRadius > 0 ? currentRadius : 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    });
  }

  private drawAsteroids() {
    this.asteroids.forEach(asteroid => {
      this.ctx.save();
      this.ctx.translate(asteroid.position.x, asteroid.position.y);
      this.ctx.rotate(asteroid.rotation);
      this.ctx.beginPath();
      this.ctx.moveTo(asteroid.shape[0].x, asteroid.shape[0].y);
      for (let i = 1; i < asteroid.shape.length; i++) {
        this.ctx.lineTo(asteroid.shape[i].x, asteroid.shape[i].y);
      }
      this.ctx.closePath();
      this.ctx.strokeStyle = '#a1a1aa';
      this.ctx.fillStyle = '#3f3f46';
      this.ctx.lineWidth = 2;
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  private drawProjectiles() {
    this.projectiles.forEach(p => {
      // Draw tail
      for (let i = 0; i < p.tail.length; i++) {
        const pos = p.tail[i];
        const opacity = (i / p.tail.length) * 0.5;
        this.ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`; // Gold with opacity
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 2 * (i / p.tail.length), 0, Math.PI * 2); // Shrinking radius
        this.ctx.fill();
      }
  
      // Draw core with glow
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(p.position.x, p.position.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private drawShip(ship: Ship) {
    const scale = 1 + ship.z * 0.4;
    const currentRadius = ship.radius * scale;
    let finalAlpha = 1 - (ship.z * -1) * 0.4;
  
    // Shadow (unrotated)
    if (ship.z > 0.1) {
      const shadowAlpha = ship.z * 0.3;
      const shadowRadiusX = currentRadius * 1.2;
      const shadowRadiusY = currentRadius * 0.6;
      const shadowOffsetX = ship.z * currentRadius * 0.8;
      const shadowOffsetY = ship.z * currentRadius * 0.8;
      this.ctx.save();
      this.ctx.globalAlpha = shadowAlpha;
      this.ctx.fillStyle = 'black';
      this.ctx.filter = `blur(${ship.z * 10}px)`;
      this.ctx.beginPath();
      this.ctx.ellipse(ship.position.x + shadowOffsetX, ship.position.y + shadowOffsetY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  
    // Main ship body (rotated)
    this.ctx.save();
    if (ship.color === 'Blue' && ship.isBlinking > 0) {
      finalAlpha *= 1 - (ship.isBlinking / 15);
    }
    this.ctx.globalAlpha = finalAlpha;
  
    this.ctx.translate(ship.position.x, ship.position.y);
    this.ctx.rotate(ship.rotation);
  
    // Glow
    let glowMultiplier = (ship.color === 'Red' && ship.afterburnerTimer > 0) ? 1.5 : 1;
    const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 2.5 * glowMultiplier);
    grad.addColorStop(0, `${ship.hexColor}FF`);
    grad.addColorStop(0.5, `${ship.hexColor}80`);
    grad.addColorStop(1, `${ship.hexColor}00`);
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius * 2.5 * glowMultiplier, 0, Math.PI * 2);
    this.ctx.fill();
  
    // Core
    this.ctx.fillStyle = ship.hexColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  
    // Front Indicator (cockpit)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.beginPath();
    this.ctx.moveTo(currentRadius * 0.9, 0);
    this.ctx.lineTo(currentRadius * 0.5, -currentRadius * 0.4);
    this.ctx.lineTo(currentRadius * 0.5, currentRadius * 0.4);
    this.ctx.closePath();
    this.ctx.fill();
  
    this.ctx.restore(); // Restore from translation and rotation
  
    // Ammo/Reload Indicator (unrotated)
    if (this.gameMode === 'asteroid_event' && ship.state !== 'paralyzed') {
      const indicatorY = ship.position.y + currentRadius + 10;
      if (ship.reloadTimer > 0) {
        // Draw reload bar
        const reloadProgress = 1 - (ship.reloadTimer / ship.reloadDuration);
        const barWidth = 20;
        const barHeight = 4;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(ship.position.x - barWidth / 2, indicatorY - barHeight/2, barWidth, barHeight);
        this.ctx.fillStyle = '#4ade80'; // Green
        this.ctx.fillRect(ship.position.x - barWidth / 2, indicatorY - barHeight/2, barWidth * reloadProgress, barHeight);
      } else {
        // Draw ammo dots
        const dotRadius = 1.5;
        const spacing = 5;
        const totalWidth = ship.maxAmmo * spacing - spacing;
        const startX = ship.position.x - totalWidth / 2;
  
        for (let i = 0; i < ship.maxAmmo; i++) {
          this.ctx.fillStyle = i < ship.ammo ? ship.hexColor : 'rgba(255, 255, 255, 0.2)';
          this.ctx.beginPath();
          this.ctx.arc(startX + i * spacing, indicatorY, dotRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  
    // Paralyzed effect (unrotated)
    if (ship.state === 'paralyzed') {
      this.ctx.save();
      this.ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 50) * 0.2;
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.4})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      const arcCount = 3;
      for (let i = 0; i < arcCount; i++) {
        const startAngle = Math.random() * Math.PI * 2;
        const endAngle = startAngle + Math.PI * 0.5;
        this.ctx.arc(ship.position.x, ship.position.y, currentRadius * (1.2 + Math.random() * 0.4), startAngle, endAngle);
      }
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawScoreTooltips() {
    this.scoreTooltips.forEach(tooltip => {
        const fadeDuration = 30;
        let opacity = 1;
        if (tooltip.life < fadeDuration) opacity = tooltip.life / fadeDuration;
        else if (tooltip.maxLife - tooltip.life < fadeDuration) opacity = (tooltip.maxLife - tooltip.life) / fadeDuration;
        
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        const text = `★ ${tooltip.text}`;
        this.ctx.font = 'bold 16px "Courier New", monospace';
        const textMetrics = this.ctx.measureText(text);
        const padding = 10;
        const boxWidth = textMetrics.width + padding * 2;
        const boxHeight = 30;
        const boxX = tooltip.position.x - boxWidth / 2;
        const boxY = tooltip.position.y - boxHeight;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, tooltip.position.x, boxY + boxHeight / 2);
        this.ctx.restore();
    });
  }

  private drawCursor() {
    this.ctx.save();
    if (this.controlledShipId !== null) {
      this.ctx.restore();
      return;
    }
    if (this.mouseInteractionEnabled()) {
      const isCharging = this.mouse.isDown && this.ships.some(c => c.state === 'orbiting');
      const pulse = Math.sin(Date.now() / 150) * 1.5;
      const coreRadius = 6 + pulse;
      
      const glowRadius = 25 + pulse * 2;
      const glowGrad = this.ctx.createRadialGradient(this.mouse.pos.x, this.mouse.pos.y, coreRadius, this.mouse.pos.x, this.mouse.pos.y, glowRadius);
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = glowGrad;
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.pos.x, this.mouse.pos.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.setLineDash([8, 8]);
      this.ctx.strokeStyle = isCharging ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = isCharging ? 2 : 1.5;
      this.ctx.arc(this.mouse.pos.x, this.mouse.pos.y, this.mouse.orbitRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.beginPath();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.arc(this.mouse.pos.x, this.mouse.pos.y, coreRadius, 0, Math.PI * 2);
      this.ctx.fill();

    } else {
      const cursorX = this.mouse.pos.x;
      const cursorY = this.mouse.pos.y;
      const coreRadius = 8;
      const glowRadius = 32;
      const glowGradient = this.ctx.createRadialGradient(cursorX, cursorY, coreRadius, cursorX, cursorY, glowRadius);
      glowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      glowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.beginPath();
      this.ctx.fillStyle = glowGradient;
      this.ctx.arc(cursorX, cursorY, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = '#050505';
      this.ctx.arc(cursorX, cursorY, coreRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cursorX, cursorY, coreRadius + 2, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}
