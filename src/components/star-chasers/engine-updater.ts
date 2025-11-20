import { Vector2D } from '../../models/vector2d';
import { Ship, ShipState } from '../../models/ship';
import { Asteroid } from '../../models/game-entities';
import { RadioContext } from '../../services/radio-chatter.service';
import { AsteroidManager } from './asteroid-manager';
import { CanvasManager } from './canvas-manager';
import { CollisionManager } from './collision-manager';
import { GAME_CONSTANTS } from './game-constants';
import { GameInitializationManager } from './game-initialization-manager';
import { GameStateManager } from './game-state-manager';
import { InputManager, MouseState } from './input-manager';
import { ParticleEffectsManager } from './particle-effects-manager';
import { ProjectileManager } from './projectile-manager';
import { RadioManager } from './radio-manager';
import { ShipBehaviorManager } from './ship-behavior-manager';
import { ShipUpdateManager } from './ship-update-manager';
import { StarEventManager } from './star-event-manager';
import type { StarChasersEngine } from './star-chasers.engine';
import { WormholeManager } from './wormhole-manager';
import { renderGame } from './rendering-adapter';
import { scheduleNextStar, updateTargetStar } from './target-star-adapter';

export class EngineUpdater {
  private timeSinceLastEventCheck = 0;

  constructor(private readonly engine: StarChasersEngine) {}

  update() {
    const deltaTime = 16.67;
    this.timeSinceLastEventCheck += deltaTime;
    if (this.timeSinceLastEventCheck > this.engine.EVENT_CHECK_INTERVAL) {
      this.checkForAsteroidEvent();
      this.timeSinceLastEventCheck = 0;
    }

    if (this.engine.gameMode === 'normal') {
      updateTargetStar(this.engine);
    } else {
      this.engine.targetStar.exists = false;
    }

    this.updateGameSounds();
    this.updateWormhole();
    this.updateProjectiles();
    this.updateAsteroids();
    this.maybeEndAsteroidEvent();
    this.updateParticles();
    this.updateExplosionParticles();
    this.updateScoreTooltips();
    this.updateNebulas();
    this.updatePhilosophicalChatter();
    this.updateRadioBubbles();
    this.engine.ships.forEach(ship => this.updateShip(ship));
    this.updateShipCollisions();
  }

  draw() {
    renderGame(this.engine);
  }

  setupCanvas() {
    const setup = CanvasManager.setupCanvas(this.engine.canvasRef.nativeElement);
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

  createScoreTooltip(ship: Ship) {
    StarEventManager.createScoreTooltip(ship, this.engine.scoreTooltips);
  }

  updateParticles() {
    ParticleEffectsManager.updateParticles(this.engine.starParticles);
  }

  updateExplosionParticles() {
    ParticleEffectsManager.updateExplosionParticles(this.engine.explosionParticles);
  }

  updateScoreTooltips() {
    StarEventManager.updateScoreTooltips(this.engine.scoreTooltips, this.engine.ships);
  }

  updateNebulas() {
    GameStateManager.updateNebulas(this.engine.nebulas, this.engine.worldWidth, this.engine.worldHeight);
  }

  updateProjectiles() {
    ProjectileManager.updateProjectiles(
      this.engine.projectiles,
      this.engine.worldWidth,
      this.engine.worldHeight,
      this.engine.targetStar,
      this.engine.ships,
      this.createStarExplosion.bind(this),
      this.spawnStarParticle.bind(this)
    );
  }

  updateAsteroids() {
    const { updatedAsteroids, collectedParticles, collectedTooltips } = AsteroidManager.updateAsteroids(
      this.engine.asteroids,
      this.engine.worldWidth,
      this.engine.worldHeight,
      this.engine.projectiles,
      this.engine.ships,
      this.engine.mouse,
      this.engine.wormhole,
      this.engine.renderScale,
      this.createStarExplosion.bind(this)
    );

    this.engine.asteroids = updatedAsteroids;
    this.engine.explosionParticles.push(...collectedParticles);
    this.engine.scoreTooltips.push(...collectedTooltips);
  }

  updatePhilosophicalChatter() {
    this.engine.philosophicalChatterNextTime = RadioManager.maybePhilosophicalChatter(
      this.engine.ships,
      this.engine.philosophicalChatterNextTime,
      this.enqueueRadioMessage.bind(this),
      this.getRandomActiveShip.bind(this)
    );
  }

  updateRadioBubbles() {
    RadioManager.updateRadioBubbles(this.engine.radioBubbles, this.engine.ships);
  }

  updateShipCollisions() {
    CollisionManager.updateShipCollisions(this.engine.ships, this.maybeTriggerProximityChatter.bind(this));
  }

  triggerLaunchChatter(ship: Ship) {
    this.enqueueRadioMessage(ship, 'launch');
  }

  updateWormhole() {
    const result = WormholeManager.updateWormhole(this.engine.wormhole, this.engine.worldWidth, this.engine.worldHeight, this.engine.ships);
    this.engine.wormhole = result.wormhole;

    if (result.wormhole && result.shuffled) {
      this.enqueueRadioMessage(result.shuffled, 'wormhole_shuffle');
      this.engine.deps.audioService.playSound('warp');
    }
  }

  updateGameSounds() {
    const isOrbiting = this.engine.ships.some(s => s.state === 'orbiting');
    const orbitingShip = this.engine.ships.find(s => s.state === 'orbiting');
    const orbitingSpeed = orbitingShip ? orbitingShip.orbitalSpeed : undefined;

    const isHunting = this.engine.gameMode === 'normal' && this.engine.ships.some(s => s.state === 'hunting');
    const isCoop =
      this.engine.gameMode === 'asteroid_event' &&
      this.engine.ships.some(s => s.state !== 'paralyzed' && s.state !== 'orbiting');
    const anyShipCelebrating = this.engine.ships.some(s => s.state === 'celebrating');

    this.engine.deps.audioService.updateGameSounds(isOrbiting, isHunting, isCoop, orbitingSpeed);
    this.engine.deps.audioService.updateBackgroundMusic(isHunting, isCoop, anyShipCelebrating);
  }

  updateShip(ship: Ship) {
    if (ship.state === 'paralyzed') {
      return;
    }

    const distanceToStar = this.engine.targetStar.exists
      ? Vector2D.distance(ship.position, this.engine.targetStar.position)
      : Infinity;
    const helpers = {
      getRandomActiveShip: this.getRandomActiveShip.bind(this),
      createScoreTooltip: this.createScoreTooltip.bind(this),
      getStarExists: () => this.engine.targetStar.exists,
      spawnStarParticle: this.spawnStarParticle.bind(this),
      createStarExplosion: this.createStarExplosion.bind(this),
      enqueueRadioMessage: this.enqueueRadioMessage.bind(this),
      applyManualControls: this.applyManualControls.bind(this),
      startManualReload: this.startManualReload.bind(this),
    };
    const lerpHelpers = {
      lerp: this.lerp.bind(this),
      normalizeAngle: this.normalizeAngle.bind(this),
      lerpAngle: this.lerpAngle.bind(this),
    };

    const updated = ShipUpdateManager.updateShip(
      ship,
      this.engine.mouse,
      this.engine.worldWidth,
      this.engine.worldHeight,
      this.engine.targetStar,
      distanceToStar,
      this.engine.TAIL_LENGTH,
      this.engine.SPEED_INCREMENT_PER_STAR,
      this.engine.MAX_SPEED_BONUS,
      this.engine.isMobile(),
      this.engine.renderScale,
      this.engine.gameMode,
      this.engine.controlledShipId,
      this.engine.mouseInteractionEnabled(),
      helpers,
      lerpHelpers,
      this.engine.deps.audioService
    );

    if (updated) {
      this.handleShipUpdate(ship, updated);
    }
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
    const projectile = ProjectileManager.fireProjectile(ship, this.engine.renderScale, this.engine.mouse);
    if (projectile) {
      this.engine.projectiles.push(projectile);
      this.engine.deps.audioService.playSound('fire');
    }
  }

  fireSupernova(ship: Ship) {
    const supernova = ProjectileManager.fireSupernova(ship, this.engine.renderScale, this.engine.mouse);
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

  captureStar(winner: Ship) {
    StarEventManager.captureStar(
      winner,
      this.engine.targetStar,
      this.engine.ships,
      {
        starParticles: this.engine.starParticles,
        scoreTooltips: this.engine.scoreTooltips,
        nebulas: this.engine.nebulas,
        SPEED_INCREMENT_PER_STAR: this.engine.SPEED_INCREMENT_PER_STAR,
        MAX_SPEED_BONUS: this.engine.MAX_SPEED_BONUS,
      },
      {
        createStarExplosion: this.createStarExplosion.bind(this),
        createNebula: this.createNebula.bind(this),
        createScoreTooltip: this.createScoreTooltip.bind(this),
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
      this.engine.scoreTooltips,
      this.engine.globalChatterCooldownUntil,
      this.engine.shipChatterAvailableAt,
      this.engine.SHIP_CHATTER_DELAY_RANGE,
      this.getRandomActiveShip.bind(this),
      this.isShipCurrentlyControlled.bind(this),
      this.engine.constellationMode,
      this.engine.mouse,
      this.engine.renderScale,
      this.engine.proximityCooldowns,
      this.engine.mouseInteractionEnabled()
    );
    this.engine.globalChatterCooldownUntil = result.globalChatterCooldownUntil;
    this.engine.shipChatterAvailableAt = result.shipChatterAvailableAt;
    return result.wasEnqueued;
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
    if (this.engine.gameMode !== 'normal') {
      return;
    }

    const totalScore = this.engine.ships.reduce((sum, ship) => sum + ship.score, 0);
    if (totalScore >= this.engine.eventTriggerScore && Math.random() < GAME_CONSTANTS.EVENT_TRIGGER_CHANCE) {
      this.engine.eventTriggerScore += 2;
      this.triggerAsteroidEvent();
    }
  }

  triggerAsteroidEvent() {
    this.engine.gameMode = 'asteroid_event';
    this.engine.targetStar.exists = false;
    this.enqueueRadioMessage(this.getRandomActiveShip(), 'asteroid_warning');
    this.engine.deps.audioService.playSound('alert');
    this.spawnAsteroid('large');
    this.spawnAsteroid('medium');
    this.spawnAsteroid('small');
  }

  spawnAsteroid(size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D) {
    this.engine.asteroids.push(
      AsteroidManager.spawnAsteroid(size, this.engine.worldWidth, this.engine.worldHeight, position, velocity)
    );
  }

  maybeEndAsteroidEvent() {
    const allDestroyedOrExpired = this.engine.asteroids.every(ast => AsteroidManager.isAsteroidGone(ast));
    if (allDestroyedOrExpired) {
      this.engine.eventTriggerScore += 2;
      this.engine.gameMode = 'normal';
      scheduleNextStar(this.engine);
      this.enqueueRadioMessage(this.getRandomActiveShip(), 'asteroid_clear');
    }
  }

  maybePlayStarryEyeChatter(ship: Ship) {
    RadioManager.maybePlayStarryEyeChatter(
      ship,
      this.enqueueRadioMessage.bind(this),
      this.engine.starCaptureLockUntil,
      () => (this.engine.starCaptureLockUntil = Date.now() + GAME_CONSTANTS.STAR_CAPTURE_CHOKE_TIME)
    );
  }

  createWormhole() {
    this.engine.wormhole = WormholeManager.createWormhole(this.engine.mouse, this.engine.worldWidth, this.engine.worldHeight);
    this.engine.deps.audioService.playSound('warp');
  }

  handleShipAction(ship: Ship) {
    const behaviours = {
      celebrate: () => this.performCelebration(ship),
      blink: () => this.performBlink(ship),
      fire: () => this.fireProjectile(ship),
      shootSupernova: () => this.fireSupernova(ship),
      recalcOrbit: () =>
        GameStateManager.recalculateOrbit(ship, this.engine.targetStar.position, this.engine.SPEED_INCREMENT_PER_STAR),
    };

    GameStateManager.handleShipAction(ship, {
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
}
