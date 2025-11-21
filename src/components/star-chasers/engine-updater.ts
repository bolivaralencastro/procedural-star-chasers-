import { Vector2D } from '../../models/vector2d';
import { Ship, ShipState } from '../../models/ship';
import { Asteroid } from '../../models/game-entities';
import { RadioContext } from '../../services/radio-chatter.service';
import { CanvasManager } from './canvas-manager';
import { GAME_CONSTANTS } from './game-constants';
import { GameInitializationManager } from './game-initialization-manager';
import { GameStateManager } from './game-state-manager';
import { InputManager, MouseState } from './input-manager';
import { ParticleEffectsManager } from './particle-effects-manager';
import { ProjectileManager } from './projectile-manager';
import { RadioManager } from './radio-manager';
import { ShipBehaviorManager } from './ship-behavior-manager';
import { StarEventManager } from './star-event-manager';
import type { StarChasersEngine } from './star-chasers.engine';
import { WormholeManager } from './wormhole-manager';
import { renderGame } from './rendering-adapter';
import { scheduleNextStar } from './target-star-adapter';
import { AudioLoopCoordinator } from './audio-loop-coordinator';
import { EventLoopCoordinator } from './event-loop-coordinator';
import { EntityUpdateCoordinator } from './entity-update-coordinator';

export class EngineUpdater {
  private readonly audioCoordinator: AudioLoopCoordinator;
  private readonly eventCoordinator: EventLoopCoordinator;
  private readonly entityCoordinator: EntityUpdateCoordinator;

  constructor(private readonly engine: StarChasersEngine) {
    this.audioCoordinator = new AudioLoopCoordinator(engine);
    this.eventCoordinator = new EventLoopCoordinator(engine, {
      enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
      getRandomActiveShip: this.getRandomActiveShip.bind(this),
    });
    this.entityCoordinator = new EntityUpdateCoordinator(engine, {
      createStarExplosion: this.createStarExplosion.bind(this),
      spawnStarParticle: this.spawnStarParticle.bind(this),
      enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
      getRandomActiveShip: this.getRandomActiveShip.bind(this),
      applyManualControls: this.applyManualControls.bind(this),
      startManualReload: this.startManualReload.bind(this),
      handleShipUpdate: this.handleShipUpdate.bind(this),
      lerp: this.lerp.bind(this),
      normalizeAngle: this.normalizeAngle.bind(this),
      lerpAngle: this.lerpAngle.bind(this),
      maybeTriggerProximityChatter: this.maybeTriggerProximityChatter.bind(this),
      switchPersonality: this.switchPersonality.bind(this),
      applyPersonalityBehaviors: this.applyPersonalityBehaviors.bind(this),
      performBlink: this.performBlink.bind(this),
      performCelebration: this.performCelebration.bind(this),
      isShipCurrentlyControlled: this.isShipCurrentlyControlled.bind(this),
      fireProjectile: this.fireProjectile.bind(this),
      createAfterburnerParticle: this.createAfterburnerParticle.bind(this),
      spawnAsteroid: this.spawnAsteroid.bind(this),
    });
  }

  update() {
    const deltaTime = 16.67;
    this.eventCoordinator.handleEvents(deltaTime);
    this.updateGameSounds();
    this.updateRescueAttempts(); // Process rescue attempts before other updates
    this.updateWormhole();
    this.updateProjectiles();
    this.updateAsteroids();
    this.updateProjectileAsteroidCollisions();
    this.maybeEndAsteroidEvent();
    this.updateParticles();
    this.updateExplosionParticles();
    this.updateNebulas();
    this.updatePhilosophicalChatter();
    this.updateRadioBubbles();
    this.engine.ships.forEach(ship => this.updateShip(ship));
    this.updateShipCollisions();
    this.checkStarCapture(); // Add star capture detection
  }

  draw() {
    renderGame(this.engine);
  }

  setupCanvas() {
    const setup = CanvasManager.setupCanvas(this.engine.getCanvasRef().nativeElement);
    this.engine.isMobile.set(setup.isMobile);
    this.engine.renderScale = setup.renderScale;
    this.engine.worldWidth = setup.worldWidth;
    this.engine.worldHeight = setup.worldHeight;
  }

  initGame() {
    this.createBackgroundStars(200);
    this.createShips();
    scheduleNextStar(this.engine);
  }

  createBackgroundStars(count: number) {
    this.engine.backgroundStars = CanvasManager.createBackgroundStars(count, this.engine.worldWidth, this.engine.worldHeight);
  }

  createShips() {
    this.engine.ships = GameInitializationManager.createShips(this.engine.worldWidth, this.engine.worldHeight);
  }

  createStarExplosion(position: Vector2D, count = GAME_CONSTANTS.STAR_EXPLOSION_PARTICLE_COUNT) {
    ParticleEffectsManager.createStarExplosion(this.engine.explosionParticles, position, count);
  }

  createAfterburnerParticle(ship: Ship) {
    ParticleEffectsManager.createAfterburnerParticle(this.engine.explosionParticles, ship.position, ship.velocity);
  }

  createNebula(position: Vector2D) {
    GameStateManager.createNebula(this.engine.nebulas, position);
  }

  updateParticles() {
    this.entityCoordinator.updateParticles();
  }

  updateExplosionParticles() {
    this.entityCoordinator.updateExplosionParticles();
  }

  updateNebulas() {
    this.entityCoordinator.updateNebulas();
  }

  updateProjectiles() {
    this.entityCoordinator.updateProjectiles();
  }

  updateAsteroids() {
    this.entityCoordinator.updateAsteroids();
  }

  updateProjectileAsteroidCollisions() {
    this.entityCoordinator.updateProjectileAsteroidCollisions();
  }

  updatePhilosophicalChatter() {
    this.entityCoordinator.updatePhilosophicalChatter();
  }

  updateRadioBubbles() {
    this.entityCoordinator.updateRadioBubbles();
  }

  updateShipCollisions() {
    this.entityCoordinator.updateShipCollisions();
  }

  triggerLaunchChatter(ship: Ship) {
    this.enqueueRadioMessage(ship, 'launch');
  }

  /**
   * Process rescue attempts by all non-paralyzed ships for paralyzed allies
   * This ensures paralyzed ships can be rescued even if they're skipped in main updates
   */
  updateRescueAttempts(): void {
    const paralyzedShips = this.engine.ships.filter(s => s.state === 'paralyzed');
    if (paralyzedShips.length === 0) return;

    const rescueShips = this.engine.ships.filter(s => s.state !== 'paralyzed' && s.score > 0);
    if (rescueShips.length === 0) return;

    for (const rescueShip of rescueShips) {
      for (const paralyzedShip of paralyzedShips) {
        const distance = Vector2D.distance(rescueShip.position, paralyzedShip.position);
        if (distance < rescueShip.radius + paralyzedShip.radius) {
          // Rescue successful
          rescueShip.score--;
          paralyzedShip.state = this.isShipCurrentlyControlled(paralyzedShip) ? 'controlled' : 'idle';
          paralyzedShip.paralyzeTimer = 0;
          this.createStarExplosion(rescueShip.position, 20);
          this.engine.deps.audioService.playSound('rescue');
          this.enqueueRadioMessage(paralyzedShip, 'rescue');
          break; // This paralyzed ship is rescued, move to next one
        }
      }
    }
  }

  updateWormhole() {
    this.entityCoordinator.updateWormhole();
  }

  updateGameSounds() {
    this.audioCoordinator.updateAudio();
  }

  updateShip(ship: Ship) {
    this.entityCoordinator.updateShip(ship);
  }

  handleShipUpdate(ship: Ship, state: ShipState) {
    switch (state) {
      case 'orbiting':
        this.createAfterburnerParticle(ship);
        break;
      case 'chasing':
        this.spawnStarParticle();
        break;
      case 'hunting':
        this.spawnStarParticle();
        this.createAfterburnerParticle(ship);
        break;
    }
  }

  applyManualControls(ship: Ship, deltaTime: number) {
    InputManager.applyManualControls(ship, this.engine.activeControlKeys, deltaTime);

    InputManager.handleManualFiring(
      this.engine.activeControlKeys,
      ship,
      () => this.fireProjectile(ship),
      () => this.startManualReload()
    );
  }

  spawnStarParticle() {
    ParticleEffectsManager.spawnStarParticle(this.engine.starParticles, this.engine.targetStar.position);
  }

  fireProjectile(ship: Ship) {
    const projectile = ProjectileManager.fireProjectile(ship, this.engine.renderScale, { x: this.engine.mouse.pos.x, y: this.engine.mouse.pos.y });
    if (projectile) {
      this.engine.projectiles.push(projectile);
      this.engine.deps.audioService.playPooledSound('fire');
    }
  }

  fireSupernova(ship: Ship) {
    const supernova = ProjectileManager.fireSupernova(ship, this.engine.renderScale, { x: this.engine.mouse.pos.x, y: this.engine.mouse.pos.y });
    if (!supernova) {
      return;
    }

    this.engine.projectiles.push(supernova);
    this.engine.deps.audioService.playSound('supernova');
    this.enqueueRadioMessage(ship, 'supernova');
  }

  performBlink(ship: Ship) {
    const positions = ShipBehaviorManager.performBlink(
      ship,
      this.engine.targetStar.exists,
      this.engine.targetStar.position,
      this.engine.worldWidth,
      this.engine.worldHeight
    );

    ParticleEffectsManager.createBlinkParticles(this.engine.explosionParticles, positions[0], ship.hexColor);
    ParticleEffectsManager.createBlinkParticles(this.engine.explosionParticles, positions[1], ship.hexColor);
  }

  performCelebration(ship: Ship) {
    ShipBehaviorManager.performCelebration(ship);
  }

  switchPersonality(ship: Ship) {
    ShipBehaviorManager.switchPersonality(ship, this.engine.worldWidth, this.engine.worldHeight);
  }

  applyPersonalityBehaviors(ship: Ship) {
    ShipBehaviorManager.applyPersonalityBehaviors(ship, this.engine.ships, this.engine.worldWidth, this.engine.worldHeight);
  }

  captureStar(winner: Ship) {
    StarEventManager.captureStar(
      winner,
      this.engine.targetStar,
      this.engine.ships,
      {
        starParticles: this.engine.starParticles,
        nebulas: this.engine.nebulas,
        SPEED_INCREMENT_PER_STAR: this.engine.SPEED_INCREMENT_PER_STAR,
        MAX_SPEED_BONUS: this.engine.MAX_SPEED_BONUS,
      },
      {
        createStarExplosion: this.createStarExplosion.bind(this),
        createNebula: this.createNebula.bind(this),
        enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
        scheduleNextStar: () => scheduleNextStar(this.engine),
        isShipCurrentlyControlled: this.isShipCurrentlyControlled.bind(this),
      },
      this.engine.deps.audioService
    );
  }

  enqueueRadioMessage(ship: Ship, context: RadioContext): boolean {
    const result = RadioManager.enqueueRadioMessage(
      ship,
      context,
      this.engine.radioBubbles,
      this.engine.globalChatterCooldownUntil,
      this.engine.starCaptureLockUntil,
      this.engine.shipChatterAvailableAt,
      this.engine.deps.radioService,
      this.wrapText.bind(this)
    );
    this.engine.globalChatterCooldownUntil = result.newGlobalCooldown;
    this.engine.starCaptureLockUntil = result.newStarCaptureLock;
    this.engine.shipChatterAvailableAt.set(ship.id, result.newShipDelay);
    return result.success;
  }

  getRandomActiveShip(): Ship {
    const activeShips = this.engine.ships.filter(s => s.state !== 'paralyzed');
    return activeShips[Math.floor(Math.random() * activeShips.length)];
  }

  startManualReload() {
    const controlledShip = this.engine.ships.find(ship => ship.id === this.engine.controlledShipId);
    InputManager.startManualReload(controlledShip);
  }

  checkForAsteroidEvent() {
    this.eventCoordinator.checkForAsteroidEvent();
  }

  triggerAsteroidEvent() {
    this.eventCoordinator.triggerAsteroidEvent();
  }

  spawnAsteroid(size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D) {
    this.eventCoordinator.spawnAsteroid(size, position, velocity);
  }

  maybeEndAsteroidEvent() {
    this.eventCoordinator.maybeEndAsteroidEvent();
  }

  maybeTriggerProximityChatter(shipA: Ship, shipB: Ship, distance: number, combinedRadius: number) {
    RadioManager.maybeTriggerProximityChatter(
      shipA,
      shipB,
      distance,
      combinedRadius,
      this.engine.proximityCooldowns,
      this.enqueueRadioMessage.bind(this)
    );
  }

  maybePlayStarryEyeChatter(ship: Ship) {
    RadioManager.maybePlayStarryEyeChatter(
      ship,
      this.engine.targetStar,
      this.enqueueRadioMessage.bind(this)
    );
  }

  createWormhole() {
    this.engine.wormhole = WormholeManager.createWormhole(
      { x: this.engine.mouse.pos.x, y: this.engine.mouse.pos.y },
      this.engine.worldWidth,
      this.engine.worldHeight
    );
    this.engine.deps.audioService.playSound('warp');
  }

  handleShipAction(ship: Ship) {
    const behaviours = {
      celebrate: () => this.performCelebration(ship),
      blink: () => this.performBlink(ship),
      fire: () => this.fireProjectile(ship),
      shootSupernova: () => this.fireSupernova(ship),
      recalcOrbit: () => GameStateManager.recalculateOrbit(ship, this.engine.targetStar.position),
    };

    GameStateManager.handleShipAction(ship, {
      type: 'idle',
      mouse: this.engine.mouse,
      targetStar: this.engine.targetStar,
      worldWidth: this.engine.worldWidth,
      worldHeight: this.engine.worldHeight,
      wormhole: this.engine.wormhole,
      renderScale: this.engine.renderScale,
      isMobile: this.engine.isMobile(),
      mouseInteractionEnabled: this.engine.mouseInteractionEnabled(),
      controlledShipId: this.engine.controlledShipId,
      audioService: this.engine.deps.audioService,
      enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
      behaviours,
    });
  }

  getMouse(): MouseState {
    return this.engine.mouse;
  }

  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  normalizeAngle(angle: number): number {
    return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }

  lerpAngle(a: number, b: number, t: number): number {
    const diff = this.normalizeAngle(b - a);
    const shortest = diff > Math.PI ? diff - 2 * Math.PI : diff;
    return this.normalizeAngle(a + shortest * t);
  }

  isShipCurrentlyControlled(ship: Ship): boolean {
    return this.engine.controlledShipId === ship.id;
  }

  wrapText(text: string, maxWidth: number): string[] {
    const ctx = this.engine.getCanvasRef().nativeElement.getContext('2d');
    if (!ctx) return [text];
    
    ctx.save();
    ctx.font = 'bold 14px "Courier New", monospace';

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    ctx.restore();
    return lines;
  }

  checkStarCapture(): void {
    StarEventManager.checkStarCapture(
      this.engine.ships,
      this.engine.targetStar,
      this.engine.gameMode,
      (winner) => this.captureStar(winner)
    );
  }
}
