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
  switchPersonality: (ship: Ship) => void;
  applyPersonalityBehaviors: (ship: Ship) => void;
  performBlink: (ship: Ship) => void;
  performCelebration: (ship: Ship) => void;
  isShipCurrentlyControlled: (ship: Ship) => boolean;
  fireProjectile: (ship: Ship) => void;
  createAfterburnerParticle: (ship: Ship) => void;
}

export class EntityUpdateCoordinator {
  constructor(
    private readonly engine: StarChasersEngine,
    private readonly dependencies: EntityUpdateDependencies
  ) {}

  updateWormhole(): void {
    if (!this.engine.wormhole) return;
    
    const result = WormholeManager.updateWormhole(
      this.engine.wormhole,
      this.engine.ships,
      (position) => this.dependencies.createStarExplosion(position)
    );
    
    if (!result.active) {
      this.engine.wormhole = null;
    }

    if (result.shuffled.length > 0) {
      this.dependencies.enqueueRadioMessage(result.shuffled[0], 'wormhole_shuffle');
      this.engine.deps.audioService.playSound('warp');
    }
  }

  updateProjectiles(): void {
    ProjectileManager.updateProjectiles(
      this.engine.projectiles,
      this.engine.worldWidth,
      this.engine.worldHeight
    );
  }

  updateAsteroids(): void {
    const { destroyedAsteroids, addedParticles, collectedTooltips } = AsteroidManager.updateAsteroids(
      this.engine.asteroids,
      this.engine.ships,
      this.engine.worldWidth,
      this.engine.worldHeight
    );
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
    GameStateManager.updateNebulas(this.engine.nebulas);
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

    const context = {
      ships: this.engine.ships,
      asteroids: this.engine.asteroids,
      targetStar: this.engine.targetStar,
      nebulas: this.engine.nebulas,
      mouse: this.engine.mouse,
      mouseInteractionEnabled: this.engine.mouseInteractionEnabled(),
      gameMode: this.engine.gameMode,
      worldWidth: this.engine.worldWidth,
      worldHeight: this.engine.worldHeight,
      formationAssignments: this.engine.formationAssignments,
      controlledShipId: this.engine.controlledShipId,
      explosionParticles: this.engine.explosionParticles,
      activeControlKeys: this.engine.activeControlKeys,
    };

    const callbacks = {
      switchPersonality: this.dependencies.switchPersonality,
      applyPersonalityBehaviors: this.dependencies.applyPersonalityBehaviors,
      performBlink: this.dependencies.performBlink,
      performCelebration: this.dependencies.performCelebration,
      isShipCurrentlyControlled: this.dependencies.isShipCurrentlyControlled,
      fireProjectile: this.dependencies.fireProjectile,
      createAfterburnerParticle: this.dependencies.createAfterburnerParticle,
      createStarExplosion: this.dependencies.createStarExplosion,
      enqueueRadioMessage: this.dependencies.enqueueRadioMessage,
      applyManualControls: this.dependencies.applyManualControls,
      startManualReload: this.dependencies.startManualReload,
    };

    const utils = {
      lerp: this.dependencies.lerp,
      normalizeAngle: this.dependencies.normalizeAngle,
      lerpAngle: this.dependencies.lerpAngle,
    };

    ShipUpdateManager.updateShip(
      ship,
      context,
      callbacks,
      utils,
      this.engine.deps.audioService
    );
  }

  updateShipCollisions(): void {
    CollisionManager.updateShipCollisions(this.engine.ships, this.dependencies.maybeTriggerProximityChatter);
  }
}
