import { Vector2D } from '../../models/vector2d';
import { WormholePair, Asteroid, Projectile } from '../../models/game-entities';
import { Ship } from '../../models/ship';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for managing wormholes in the game
 */
export class WormholeManager {
  /**
   * Creates a new wormhole pair
   */
  static create(
    entryPosition: Vector2D,
    worldWidth: number,
    worldHeight: number
  ): WormholePair {
    let exitPosition: Vector2D;
    
    // Ensure exit isn't too close to entry
    do {
      exitPosition = new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight);
    } while (Vector2D.distance(entryPosition, exitPosition) < 300);

    return {
      entry: {
        position: entryPosition.clone(),
        radius: GAME_CONSTANTS.WORMHOLE_RADIUS_MIN,
        pulseAngle: Math.random() * Math.PI * 2,
      },
      exit: {
        position: exitPosition,
        radius: GAME_CONSTANTS.WORMHOLE_RADIUS_MIN,
        pulseAngle: Math.random() * Math.PI * 2,
      },
      life: GAME_CONSTANTS.WORMHOLE_LIFETIME,
      maxLife: GAME_CONSTANTS.WORMHOLE_LIFETIME,
    };
  }

  /**
   * Updates wormhole animation and lifetime
   */
  static update(wormhole: WormholePair): boolean {
    wormhole.life -= 16.67; // Approx deltaTime
    
    if (wormhole.life <= 0) {
      return false; // Wormhole expired
    }

    wormhole.entry.pulseAngle += 0.08;
    wormhole.exit.pulseAngle += 0.08;

    return true; // Wormhole still active
  }

  /**
   * Process interaction between an entity and the wormhole
   */
  static processInteraction(
    entity: Ship | Asteroid | Projectile,
    wormhole: WormholePair,
    onTeleport: (position: Vector2D) => void
  ): void {
    if (entity.justTeleported && entity.justTeleported > 0) {
      entity.justTeleported--;
      return;
    }
    entity.justTeleported = 0;

    const { entry, exit } = wormhole;
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
        // Teleport the entity
        onTeleport(entity.position); // Call callback for particle effects at entry point

        entity.position = destination.position.clone();
        const exitDirection = new Vector2D(Math.random() - 0.5, Math.random() - 0.5).normalize();
        const speed = entity.velocity.magnitude();
        entity.velocity = exitDirection.multiply(speed > 1 ? speed : 2);
        entity.justTeleported = GAME_CONSTANTS.WORMHOLE_TELEPORT_COOLDOWN_FRAMES;

        onTeleport(entity.position); // Call callback for particle effects at exit point
        
        if ('tail' in entity && Array.isArray(entity.tail)) {
          entity.tail = [];
        }
        break;
      }
    }
  }

  /**
   * Creates a wormhole (wrapper for create method)
   */
  static createWormhole(
    mouse: { x: number; y: number },
    worldWidth: number,
    worldHeight: number
  ): WormholePair {
    return this.create(new Vector2D(mouse.x, mouse.y), worldWidth, worldHeight);
  }

  /**
   * Updates a wormhole and handles entity shuffling
   */
  static updateWormhole(
    wormhole: WormholePair,
    ships: Ship[],
    onTeleport: (position: Vector2D) => void
  ): { active: boolean; shuffled: Ship[] } {
    const active = this.update(wormhole);
    const shuffled: Ship[] = [];
    
    if (active) {
      ships.forEach(ship => {
        const beforePos = ship.position.clone();
        this.processInteraction(ship, wormhole, onTeleport);
        const afterPos = ship.position.clone();
        
        if (Vector2D.distance(beforePos, afterPos) > 100) {
          shuffled.push(ship);
        }
      });
    }
    
    return { active, shuffled };
  }
}
