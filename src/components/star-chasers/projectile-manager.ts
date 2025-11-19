import { Vector2D } from '../../models/vector2d';
import { Projectile, Asteroid } from '../../models/game-entities';
import { Ship } from '../../models/ship';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for managing projectiles in the game
 */
export class ProjectileManager {
  /**
   * Creates and fires a projectile from a ship
   */
  static fire(
    projectiles: Projectile[],
    ship: Ship
  ): void {
    const projectileAngle = ship.rotation;
    const direction = new Vector2D(Math.cos(projectileAngle), Math.sin(projectileAngle));
    const startPos = ship.position.clone().add(direction.multiply(ship.radius));
    const velocity = direction.multiply(GAME_CONSTANTS.PROJECTILE_SPEED)
      .add(ship.velocity.clone().multiply(GAME_CONSTANTS.PROJECTILE_SHIP_VELOCITY_FACTOR));
    
    projectiles.push({
      position: startPos,
      velocity: velocity,
      life: GAME_CONSTANTS.PROJECTILE_LIFE,
      color: '#FFD700', // Gold
      ownerId: ship.id,
      tail: [],
    });

    ship.ammo--;
    ship.fireCooldown = 500; // 0.5 second cooldown
  }

  /**
   * Updates projectile positions and tails
   */
  static updateMovement(projectile: Projectile): void {
    projectile.position.add(projectile.velocity);
    projectile.life--;
    
    projectile.tail.push(projectile.position.clone());
    if (projectile.tail.length > 10) {
      projectile.tail.shift();
    }
  }

  /**
   * Checks if projectile has expired
   */
  static isExpired(projectile: Projectile): boolean {
    return projectile.life <= 0;
  }

  /**
   * Checks collision between a projectile and an asteroid
   */
  static checkAsteroidCollision(projectile: Projectile, asteroid: Asteroid): boolean {
    return Vector2D.distance(projectile.position, asteroid.position) < asteroid.radius + 3;
  }

  /**
   * Splits an asteroid into smaller pieces
   */
  static splitAsteroid(
    asteroid: Asteroid,
    asteroids: Asteroid[],
    spawnCallback: (size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D) => void
  ): void {
    if (asteroid.size === 'large') {
      for (let k = 0; k < 2; k++) {
        spawnCallback('medium', asteroid.position.clone(), 
          new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(1.5));
      }
    } else if (asteroid.size === 'medium') {
      for (let k = 0; k < 2; k++) {
        spawnCallback('small', asteroid.position.clone(), 
          new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(2));
      }
    }
  }
}
