import { Vector2D } from '../../models/vector2d';
import { CollisionManager } from './collision-manager';
import { ProjectileManager } from './projectile-manager';
import { AsteroidManager } from './asteroid-manager';
import { ParticleEffectsManager } from './particle-effects-manager';
import { StarEventManager } from './star-event-manager';
import { GameStateManager } from './game-state-manager';
import { RadioManager } from './radio-manager';
import { ShipUpdateManager } from './ship-update-manager';
import { WormholeManager } from './wormhole-manager';
import type { RadioContext } from '../../services/radio-chatter.service';
import type { Ship, ShipState } from '../../models/ship';
import type { StarChasersEngine } from './star-chasers.engine';

interface EntityUpdateDependencies {
  createStarExplosion: (position: Vector2D, count?: number) => void;
  spawnStarParticle: () => void;
  enqueueRadioMessage: (ship: Ship, context: RadioContext) => boolean;
  getRandomActiveShip: () => Ship;
  createScoreTooltip: (ship: Ship) => void;
  applyManualControls: (ship: Ship, deltaTime: number) => void;
  startManualReload: () => void;
  handleShipUpdate: (ship: Ship, state: ShipState) => void;
  lerp: (a: number, b: number, t: number) => number;
  normalizeAngle: (angle: number) => number;
  lerpAngle: (a: number, b: number, t: number) => number;
  maybeTriggerProximityChatter: (shipA: Ship, shipB: Ship, distance: number, combinedRadius: number) => void;
}

export class EntityUpdateCoordinator {
  constructor(
    private readonly engine: StarChasersEngine,
    private readonly dependencies: EntityUpdateDependencies
  ) {}

  updateWormhole(): void {
    const result = WormholeManager.updateWormhole(
      this.engine.wormhole,
      this.engine.worldWidth,
      this.engine.worldHeight,
      this.engine.ships
    );
    this.engine.wormhole = result.wormhole;

    if (result.wormhole && result.shuffled) {
      this.dependencies.enqueueRadioMessage(result.shuffled, 'wormhole_shuffle');
      this.engine.deps.audioService.playSound('warp');
    }
  }

  updateProjectiles(): void {
    ProjectileManager.updateProjectiles(
      this.engine.projectiles,
      this.engine.worldWidth,
      this.engine.worldHeight,
      this.engine.targetStar,
      this.engine.ships,
      this.dependencies.createStarExplosion,
      this.dependencies.spawnStarParticle
    );
  }

  updateAsteroids(): void {
    const { updatedAsteroids, collectedParticles, collectedTooltips } = AsteroidManager.updateAsteroids(
      this.engine.asteroids,
      this.engine.worldWidth,
      this.engine.worldHeight,
      this.engine.projectiles,
      this.engine.ships,
      this.engine.mouse,
      this.engine.wormhole,
      this.engine.renderScale,
      this.dependencies.createStarExplosion
    );

    this.engine.asteroids = updatedAsteroids;
    this.engine.explosionParticles.push(...collectedParticles);
    this.engine.scoreTooltips.push(...collectedTooltips);
  }

  updateParticles(): void {
    ParticleEffectsManager.updateParticles(this.engine.starParticles);
  }

  updateExplosionParticles(): void {
    ParticleEffectsManager.updateExplosionParticles(this.engine.explosionParticles);
  }

  updateScoreTooltips(): void {
    StarEventManager.updateScoreTooltips(this.engine.scoreTooltips, this.engine.ships);
  }

  updateNebulas(): void {
    GameStateManager.updateNebulas(this.engine.nebulas, this.engine.worldWidth, this.engine.worldHeight);
  }

  updatePhilosophicalChatter(): void {
    this.engine.philosophicalChatterNextTime = RadioManager.maybePhilosophicalChatter(
      this.engine.ships,
      this.engine.philosophicalChatterNextTime,
      this.dependencies.enqueueRadioMessage,
      this.dependencies.getRandomActiveShip
    );
  }

  updateRadioBubbles(): void {
    RadioManager.updateRadioBubbles(this.engine.radioBubbles, this.engine.ships);
  }

  updateShip(ship: Ship): void {
    if (ship.state === 'paralyzed') {
      return;
    }

    const distanceToStar = this.engine.targetStar.exists
      ? Vector2D.distance(ship.position, this.engine.targetStar.position)
      : Infinity;

    const helpers = {
      getRandomActiveShip: this.dependencies.getRandomActiveShip,
      createScoreTooltip: this.dependencies.createScoreTooltip,
      getStarExists: () => this.engine.targetStar.exists,
      spawnStarParticle: this.dependencies.spawnStarParticle,
      createStarExplosion: this.dependencies.createStarExplosion,
      enqueueRadioMessage: this.dependencies.enqueueRadioMessage,
      applyManualControls: this.dependencies.applyManualControls,
      startManualReload: this.dependencies.startManualReload,
    };
    const lerpHelpers = {
      lerp: this.dependencies.lerp,
      normalizeAngle: this.dependencies.normalizeAngle,
      lerpAngle: this.dependencies.lerpAngle,
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
      this.dependencies.handleShipUpdate(ship, updated);
    }
  }

  updateShipCollisions(): void {
    CollisionManager.updateShipCollisions(this.engine.ships, this.dependencies.maybeTriggerProximityChatter);
  }
}
