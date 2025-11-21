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
    const attractionRadius = 250; // Increased range

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const destination = destinations[i];
      const dist = Vector2D.distance(entity.position, target.position);
      
      if (dist > target.radius && dist < attractionRadius) {
        const pull = target.position.clone().subtract(entity.position).normalize();
        // Inverse square law-ish for more realistic gravity feel
        // Clamped to avoid infinite forces at center
        const normalizedDist = Math.max(dist, target.radius + 10) / attractionRadius;
        const strength = (1 / (normalizedDist * normalizedDist)) * 0.05; 
        
        if ('acceleration' in entity) {
          (entity as Ship).acceleration.add(pull.multiply(strength));
          
          // Fade out effect when entering
          if (target === entry) {
            (entity as Ship).opacity = Math.max(0, (dist - target.radius) / (attractionRadius * 0.5));
          }
        } else {
          entity.velocity.add(pull.multiply(strength * 0.5));
        }
      } else if ('acceleration' in entity && target === entry && dist >= attractionRadius) {
        // Reset opacity if outside range
        (entity as Ship).opacity = Math.min(1, (entity as Ship).opacity + 0.05);
      }

      if (dist < target.radius) {
        // Teleport the entity
        // Removed particle explosion on entry

        entity.position = destination.position.clone();
        const exitDirection = new Vector2D(Math.random() - 0.5, Math.random() - 0.5).normalize();
        const speed = entity.velocity.magnitude();
        entity.velocity = exitDirection.multiply(speed > 1 ? speed : 2);
        entity.justTeleported = GAME_CONSTANTS.WORMHOLE_TELEPORT_COOLDOWN_FRAMES;
        
        if ('opacity' in entity) {
          (entity as Ship).opacity = 0.3; // Start partially visible at exit
        }

        // Removed particle explosion on exit
        
        if ('tail' in entity && Array.isArray(entity.tail)) {
          entity.tail = [];
        }
        break;
      }
    }
    
    // Fade in effect after teleporting (when near exit or just moving normally)
    if ('opacity' in entity && (entity as Ship).opacity < 1) {
       // If we are not being sucked into the entry, we should be fading in
       const distToEntry = Vector2D.distance(entity.position, entry.position);
       if (distToEntry > attractionRadius) {
          (entity as Ship).opacity = Math.min(1, (entity as Ship).opacity + 0.1);
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
