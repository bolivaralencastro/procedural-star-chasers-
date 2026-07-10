import { Vector2D } from '../entities/vector2d';
import { Ship, ShipState } from '../entities/ship';
import { Asteroid } from '../entities/game-entities';
import { RadioContext } from '../services/radio-chatter.service';
import { CanvasManager } from '../render/canvas-manager';
import { GAME_CONSTANTS } from './game-constants';
import { GameInitializationManager } from './game-initialization-manager';
import { GameStateManager } from './game-state-manager';
import { InputManager, MouseState } from '../input/input-manager';
import { ParticleEffectsManager } from '../systems/particle-effects-manager';
import { ProjectileManager } from '../systems/projectile-manager';
import { RadioManager } from '../systems/radio-manager';
import { ShipBehaviorManager } from '../systems/ship-behavior-manager';
import { RelationshipManager } from '../systems/relationship-manager';
import { StarEventManager } from '../systems/star-event-manager';
import type { StarChasersEngine } from './star-chasers.engine';
import { WormholeManager } from '../systems/wormhole-manager';
import { Canvas2DRenderer, Renderer } from '../render/renderer';
import { GameSystem } from './game-system';
import { prefersReducedMotion } from './motion-preference';
import { scheduleNextStar } from '../systems/target-star-adapter';
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
      onShipCollision: (a, b) => this.adjustAffinity(a.id, b.id, -RelationshipManager.COLLISION_PENALTY),
      switchPersonality: this.switchPersonality.bind(this),
      updateIntent: this.updateIntent.bind(this),
      applyPersonalityBehaviors: this.applyPersonalityBehaviors.bind(this),
      performBlink: this.performBlink.bind(this),
      performCelebration: this.performCelebration.bind(this),
      isShipCurrentlyControlled: this.isShipCurrentlyControlled.bind(this),
      fireProjectile: this.fireProjectile.bind(this),
      createAfterburnerParticle: this.createAfterburnerParticle.bind(this),
      spawnAsteroid: this.spawnAsteroid.bind(this),
    });
  }

  /**
   * The ordered update pipeline. Each entry runs once per fixed 60 Hz tick.
   * To add a feature, append (or insert) a system here — see GameSystem.
   */
  private readonly systems: GameSystem[] = [
    { name: 'events', update: dt => this.eventCoordinator.handleEvents(dt) },
    { name: 'game-sounds', update: () => this.updateGameSounds() },
    { name: 'rescues', update: () => this.updateRescueAttempts() }, // before other updates
    { name: 'wormhole', update: () => this.updateWormhole() },
    { name: 'projectiles', update: () => this.updateProjectiles() },
    { name: 'asteroids', update: () => this.updateAsteroids() },
    { name: 'projectile-asteroid-collisions', update: () => this.updateProjectileAsteroidCollisions() },
    { name: 'asteroid-event-end', update: () => this.maybeEndAsteroidEvent() },
    { name: 'particles', update: () => this.updateParticles() },
    { name: 'explosion-particles', update: () => this.updateExplosionParticles() },
    { name: 'nebulas', update: () => this.updateNebulas() },
    { name: 'philosophical-chatter', update: () => this.updatePhilosophicalChatter() },
    { name: 'radio-bubbles', update: () => this.updateRadioBubbles() },
    { name: 'ships', update: () => this.engine.ships.forEach(ship => this.updateShip(ship)) },
    { name: 'ship-collisions', update: () => this.updateShipCollisions() },
    { name: 'star-capture', update: () => this.checkStarCapture() },
    { name: 'camera', update: () => this.updateCamera() },
    { name: 'cursor-reproject', update: () => this.reprojectCursor() },
  ];

  /** Swappable rendering backend (Canvas 2D today, PixiJS-ready seam). */
  public renderer: Renderer = new Canvas2DRenderer();

  // The DOM HUD (minimap dots, ship stats, navigator) is refreshed via
  // notifyUi. The canvas already renders every frame; the HUD at 60 Hz is
  // wasted DOM work, so throttle it to ~15 Hz. Imperceptible for a minimap.
  private static readonly UI_NOTIFY_EVERY = 4;
  private uiNotifyCounter = 0;

  update(dt: number = 1000 / 60) {
    for (const system of this.systems) {
      system.update(dt);
    }
    if (++this.uiNotifyCounter >= EngineUpdater.UI_NOTIFY_EVERY) {
      this.uiNotifyCounter = 0;
      this.engine.deps.notifyUi();
    }
  }

  draw() {
    this.renderer.render(this.engine);
  }

  setupCanvas() {
    const setup = CanvasManager.setupCanvas(this.engine.getCanvas());
    this.engine.isMobile.set(setup.isMobile);
    this.engine.mouseInteractionEnabled.set(!setup.isMobile);
    this.engine.renderScale = setup.renderScale;
    this.engine.worldWidth = setup.worldWidth;
    this.engine.worldHeight = setup.worldHeight;
    this.engine.viewportWidth = setup.viewportWidth;
    this.engine.viewportHeight = setup.viewportHeight;
    this.updateCamera(true);
  }

  private welcomeTimer?: ReturnType<typeof setTimeout>;

  initGame() {
    // Thin the starfield under reduced-motion (also less to draw).
    this.createBackgroundStars(prefersReducedMotion() ? 90 : 200);
    this.createShips();
    this.engine.focusedShipId = this.engine.ships[0]?.id ?? 0;
    this.engine.followShipId = null;
    this.engine.moveCameraTo(this.engine.worldWidth / 2, this.engine.worldHeight / 2);
    scheduleNextStar(this.engine);
    this.maybeGreetReturningVisitor();
  }

  /** Clears any pending timers owned by the updater (called on engine destroy). */
  dispose() {
    if (this.welcomeTimer) {
      clearTimeout(this.welcomeTimer);
      this.welcomeTimer = undefined;
    }
  }

  /**
   * If the logbook says this browser has visited before, have a ship greet the
   * returning visitor a couple of seconds after load — using their signature if
   * they left one. This is the emotional payoff of the continuity layer.
   */
  private maybeGreetReturningVisitor() {
    if (!this.engine.deps.logbook.isReturning) {
      return;
    }
    this.welcomeTimer = setTimeout(() => this.triggerWelcomeBack(), 2600);
  }

  private triggerWelcomeBack() {
    const ship = this.pickGreetingShip();
    if (!ship) {
      return;
    }
    // Follow the greeter (not just recentre once) so its speech bubble stays
    // in frame for the whole greeting instead of drifting off as the ship moves.
    this.engine.followShip(ship.id);
    this.updateCamera(true);
    const text = this.buildWelcomeBackLine(ship);
    const duration = this.engine.deps.radioService.getMessageDuration();
    const life = Math.round(duration / 16.67);
    // Replace any bubble already on the greeter so the greeting stands alone.
    RadioManager.removeBubblesForShip(this.engine.radioBubbles, ship.id);
    this.engine.radioBubbles.push({
      shipId: ship.id,
      textLines: this.wrapText(text, 240),
      position: ship.position.clone(),
      life,
      maxLife: life,
      color: ship.hexColor,
      context: 'visitor',
    });
    // Hold other chatter briefly so the greeting stays readable.
    this.engine.globalChatterCooldownUntil = Date.now() + duration;
  }

  /** The active ship nearest the current camera centre (least jarring to greet). */
  private pickGreetingShip(): Ship | null {
    const active = this.engine.ships.filter(s => s.state !== 'paralyzed');
    if (active.length === 0) {
      return null;
    }
    const center = new Vector2D(
      this.engine.cameraPosition.x + this.engine.viewportWidth / 2,
      this.engine.cameraPosition.y + this.engine.viewportHeight / 2
    );
    return active.reduce((best, s) =>
      Vector2D.distance(s.position, center) < Vector2D.distance(best.position, center) ? s : best
    );
  }

  private buildWelcomeBackLine(ship: Ship): string {
    const logbook = this.engine.deps.logbook;
    const sig = logbook.signature;
    const visits = logbook.visitCount;
    const options = sig
      ? [
          `${sig}! Você voltou. Senti falta da plateia.`,
          `Ó quem chegou: ${sig}. Bem-vindo de volta.`,
          `${sig}, de volta pra ${visits}ª visita. Anotado no diário.`,
        ]
      : [
          `Você de novo! Já é sua ${visits}ª passagem por aqui.`,
          `Bem-vindo de volta, visitante. A gente lembra de você.`,
          `Olha quem voltou pra assistir. Que bom te ver.`,
        ];
    return options[Math.floor(Math.random() * options.length)];
  }

  createBackgroundStars(count: number) {
    this.engine.backgroundStars = CanvasManager.createBackgroundStars(
      count,
      this.engine.worldWidth,
      this.engine.worldHeight,
      prefersReducedMotion()
    );
  }

  createShips() {
    this.engine.ships = GameInitializationManager.createShips(this.engine.worldWidth, this.engine.worldHeight);
  }

  private static readonly DIRECTOR_IDLE_MS = 12000;
  private static readonly DIRECTOR_LERP = 0.05;

  updateCamera(forceSnap = false) {
    const followedShip = this.engine.getFollowedShip();
    if (!followedShip) {
      if (this.shouldAutoDirect()) {
        this.updateDirectorCamera();
      } else {
        this.engine.directorActive = false;
        this.updateFreeCamera();
      }
      return;
    }
    this.engine.directorActive = false;

    const targetX = followedShip.position.x - this.engine.viewportWidth / 2;
    const targetY = followedShip.position.y - this.engine.viewportHeight / 2;
    const maxX = Math.max(0, this.engine.worldWidth - this.engine.viewportWidth);
    const maxY = Math.max(0, this.engine.worldHeight - this.engine.viewportHeight);
    const clampedTargetX = Math.max(0, Math.min(maxX, targetX));
    const clampedTargetY = Math.max(0, Math.min(maxY, targetY));

    if (forceSnap) {
      this.engine.cameraPosition.x = clampedTargetX;
      this.engine.cameraPosition.y = clampedTargetY;
      return;
    }

    this.engine.cameraPosition.x += (clampedTargetX - this.engine.cameraPosition.x) * GAME_CONSTANTS.CAMERA_FOLLOW_LERP;
    this.engine.cameraPosition.y += (clampedTargetY - this.engine.cameraPosition.y) * GAME_CONSTANTS.CAMERA_FOLLOW_LERP;
  }

  /**
   * Keeps the cursor's world position anchored to the physical pointer while
   * the camera moves (ship follow, lerp, arrow-key pan). Without this, the
   * orbit point only updates on mousemove and gets dragged along with the
   * camera. Skipped on mobile: there is no persistent pointer, and the last
   * touch position must stay where the finger left it.
   */
  private reprojectCursor() {
    if (this.engine.isMobile()) {
      return;
    }
    const mouse = this.engine.mouse;
    mouse.pos.x = this.engine.cameraPosition.x + mouse.screenPos.x / this.engine.renderScale;
    mouse.pos.y = this.engine.cameraPosition.y + mouse.screenPos.y / this.engine.renderScale;
  }

  /** True when the free camera has been idle long enough to take over as director. */
  private shouldAutoDirect(): boolean {
    return (
      this.engine.controlledShipId === null &&
      this.engine.followShipId === null &&
      this.engine.cameraControlKeys.size === 0 &&
      Date.now() - this.engine.lastInteractionAt > EngineUpdater.DIRECTOR_IDLE_MS
    );
  }

  /** Gently drifts the free camera toward the most interesting ship. */
  private updateDirectorCamera(): void {
    const target = this.pickDirectorTarget();
    if (!target) {
      this.engine.directorActive = false;
      this.updateFreeCamera();
      return;
    }
    this.engine.directorActive = true;

    const maxX = Math.max(0, this.engine.worldWidth - this.engine.viewportWidth);
    const maxY = Math.max(0, this.engine.worldHeight - this.engine.viewportHeight);
    const targetX = Math.max(0, Math.min(maxX, target.position.x - this.engine.viewportWidth / 2));
    const targetY = Math.max(0, Math.min(maxY, target.position.y - this.engine.viewportHeight / 2));
    this.engine.cameraPosition.x += (targetX - this.engine.cameraPosition.x) * EngineUpdater.DIRECTOR_LERP;
    this.engine.cameraPosition.y += (targetY - this.engine.cameraPosition.y) * EngineUpdater.DIRECTOR_LERP;
  }

  /** Holds a director target for a beat before re-choosing, to avoid jitter. */
  private pickDirectorTarget(): Ship | null {
    const ships = this.engine.ships;
    if (ships.length === 0) {
      return null;
    }
    const now = Date.now();
    const held = ships.find(s => s.id === this.engine.directorTargetId);
    if (held && now < this.engine.directorRetargetAt) {
      return held;
    }
    const target = this.computeInterestingShip();
    this.engine.directorTargetId = target?.id ?? null;
    this.engine.directorRetargetAt = now + 2500;
    return target;
  }

  /** The ship "where the action is": near an asteroid, else near the star, else fastest. */
  private computeInterestingShip(): Ship | null {
    const ships = this.engine.ships;
    if (ships.length === 0) {
      return null;
    }
    if (this.engine.gameMode === 'asteroid_event' && this.engine.asteroids.length > 0) {
      const asteroid = this.engine.asteroids[0];
      return ships.reduce((best, s) =>
        Vector2D.distance(s.position, asteroid.position) < Vector2D.distance(best.position, asteroid.position)
          ? s
          : best
      );
    }
    if (this.engine.targetStar.exists) {
      return ships.reduce((best, s) =>
        Vector2D.distance(s.position, this.engine.targetStar.position) <
        Vector2D.distance(best.position, this.engine.targetStar.position)
          ? s
          : best
      );
    }
    return ships.reduce((best, s) => (s.velocity.magnitude() > best.velocity.magnitude() ? s : best));
  }

  private updateFreeCamera() {
    const step = 22;
    if (this.engine.cameraControlKeys.has('up')) {
      this.engine.cameraPosition.y -= step;
    }
    if (this.engine.cameraControlKeys.has('down')) {
      this.engine.cameraPosition.y += step;
    }
    if (this.engine.cameraControlKeys.has('left')) {
      this.engine.cameraPosition.x -= step;
    }
    if (this.engine.cameraControlKeys.has('right')) {
      this.engine.cameraPosition.x += step;
    }

    const maxX = Math.max(0, this.engine.worldWidth - this.engine.viewportWidth);
    const maxY = Math.max(0, this.engine.worldHeight - this.engine.viewportHeight);
    this.engine.cameraPosition.x = Math.max(0, Math.min(maxX, this.engine.cameraPosition.x));
    this.engine.cameraPosition.y = Math.max(0, Math.min(maxY, this.engine.cameraPosition.y));
  }

  createStarExplosion(position: Vector2D, count = GAME_CONSTANTS.STAR_EXPLOSION_PARTICLE_COUNT) {
    ParticleEffectsManager.createStarExplosion(this.engine.explosionParticles, position, count);
  }

  createAfterburnerParticle(ship: Ship) {
    ParticleEffectsManager.createAfterburnerParticle(this.engine.explosionParticles, ship.position, ship.velocity);
  }

  createNebula(position: Vector2D) {
    GameStateManager.createNebula(this.engine.nebulas, position);
    this.bumpWonder(0.35);
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
    // Single choke point for launches (orbit release + pilot-mode release).
    this.engine.deps.logbook.recordShipLaunched();
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
          this.engine.deps.logbook.recordRescueWitnessed();
          this.adjustAffinity(rescueShip.id, paralyzedShip.id, RelationshipManager.RESCUE_BONUS);
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

  updateIntent(ship: Ship, deltaTime: number) {
    ShipBehaviorManager.updateIntent(ship, this.engine.ships, this.engine.worldWidth, this.engine.worldHeight, deltaTime);
  }

  applyPersonalityBehaviors(ship: Ship) {
    ShipBehaviorManager.applyPersonalityBehaviors(ship, this.engine.ships, this.engine.worldWidth, this.engine.worldHeight);
  }

  captureStar(winner: Ship) {
    this.engine.deps.logbook.recordStarWitnessed(winner.color);
    // A capture stokes the losers' rivalry and cools the winner's.
    this.engine.ships.forEach(s => {
      s.drives.rivalry =
        s.id === winner.id ? Math.max(0, s.drives.rivalry - 0.5) : Math.min(1, s.drives.rivalry + 0.4);
    });
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

    if (this.engine.deps.logbook.patronShipColor === winner.color) {
      this.triggerPatronCelebration(winner);
    }
  }

  /** Extra fanfare + a signed shout-out when the visitor's patron ship scores. */
  private triggerPatronCelebration(winner: Ship) {
    this.createStarExplosion(winner.position.clone(), 30);
    const sig = this.engine.deps.logbook.signature;
    const options = sig
      ? [`Essa é pra você, ${sig}!`, `${sig}, mais uma no seu nome!`, `Conta comigo sempre, ${sig}!`]
      : ['Essa vitória é da nossa torcida!', 'Sinto a força de quem me apadrinhou!', 'Dedico essa ao meu padrinho!'];
    const text = options[Math.floor(Math.random() * options.length)];
    const duration = this.engine.deps.radioService.getMessageDuration();
    const life = Math.round(duration / 16.67);
    RadioManager.removeBubblesForShip(this.engine.radioBubbles, winner.id);
    this.engine.radioBubbles.push({
      shipId: winner.id,
      textLines: this.wrapText(text, 240),
      position: winner.position.clone(),
      life,
      maxLife: life,
      color: winner.hexColor,
      context: 'star_capture',
    });
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
    const affinity = this.engine.deps.logbook.getRelationship(shipA.id, shipB.id);

    // Affinity-driven flocking: friends form up, rivals keep apart.
    const free = (s: Ship) => s.state === 'idle' || s.state === 'hunting' || s.state === 'launched';
    if (free(shipA) && free(shipB)) {
      RelationshipManager.applyProximitySteering(shipA, shipB, distance, combinedRadius, affinity);
    }

    RadioManager.maybeTriggerProximityChatter(
      shipA,
      shipB,
      distance,
      combinedRadius,
      this.engine.proximityCooldowns,
      this.enqueueRadioMessage.bind(this),
      RelationshipManager.contextForAffinity(affinity)
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
    this.engine.deps.logbook.recordWormholeCreated();
    this.bumpWonder(0.5);
    this.engine.deps.audioService.playSound('warp');
  }

  /** A novel event in the world raises every ship's curiosity. */
  private bumpWonder(amount: number) {
    this.engine.ships.forEach(s => {
      s.drives.wonder = Math.min(1, s.drives.wonder + amount);
    });
  }

  /** Shifts the persisted affinity between two ships by `delta` (clamped). */
  adjustAffinity(idA: number, idB: number, delta: number) {
    const current = this.engine.deps.logbook.getRelationship(idA, idB);
    this.engine.deps.logbook.setRelationship(idA, idB, current + delta);
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
    const ctx = this.engine.getCanvas().getContext('2d');
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
