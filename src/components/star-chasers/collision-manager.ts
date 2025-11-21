import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { Projectile, Asteroid } from '../../models/game-entities';

/**
 * Helper class for managing collisions between game entities
 */
export class CollisionManager {
  /**
   * Updates all ship-to-ship collisions with elastic collision physics
   */
  static updateShipCollisions(
    ships: Ship[],
    onProximityChatter?: (shipA: Ship, shipB: Ship, distance: number, combinedRadius: number) => void
  ): void {
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        const shipA = ships[i];
        const shipB = ships[j];

        // Ignore collisions for ships in special states
        if (
          shipA.state === 'orbiting' || shipA.state === 'celebrating' || shipA.state === 'paralyzed' ||
          shipB.state === 'orbiting' || shipB.state === 'celebrating' || shipB.state === 'paralyzed'
        ) {
          continue;
        }

        const radiusA = shipA.radius * (1 + shipA.z * 0.4);
        const radiusB = shipB.radius * (1 + shipB.z * 0.4);
        const combinedRadius = radiusA + radiusB;
        const dist = Vector2D.distance(shipA.position, shipB.position);

        // Trigger proximity chatter if callback is provided
        if (onProximityChatter) {
          onProximityChatter(shipA, shipB, dist, combinedRadius);
        }

        if (dist < combinedRadius) {
          this.resolveCollision(shipA, shipB, dist, combinedRadius, radiusA, radiusB);
        }
      }
    }
  }

  /**
   * Resolves a collision between two ships using elastic collision physics
   */
  private static resolveCollision(
    shipA: Ship,
    shipB: Ship,
    dist: number,
    combinedRadius: number,
    radiusA: number,
    radiusB: number
  ): void {
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
      return;
    }

    const restitution = 0.9; // Slight energy loss to avoid jitter
    const massA = Math.max(1, radiusA * radiusA);
    const massB = Math.max(1, radiusB * radiusB);
    const impulseScalar = (-(1 + restitution) * normalSpeed) / (1 / massA + 1 / massB);
    const impulse = normal.clone().multiply(impulseScalar);

    shipA.velocity.add(impulse.clone().divide(massA));
    shipB.velocity.subtract(impulse.clone().divide(massB));
  }

  /**
   * Updates projectile-to-asteroid collisions and removes destroyed asteroids
   * Implements continuous collision detection (CCD) to prevent tunneling
   */
  static updateProjectileAsteroidCollisions(
    projectiles: Projectile[],
    asteroids: Asteroid[],
    onAsteroidDestroyed: (asteroid: Asteroid, projectilePosition: Vector2D) => void,
    onProjectileHit: (projectileIndex: number) => void
  ): void {
    // Store previous positions for CCD
    const previousPositions = new Map<Projectile, Vector2D>();

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      const previousPos = previousPositions.get(projectile);

      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j];

        // Use improved collision detection with CCD
        if (this.checkProjectileAsteroidCollision(projectile, asteroid, previousPos)) {
          // Collision detected
          onAsteroidDestroyed(asteroid, projectile.position);
          onProjectileHit(i);

          // Remove asteroid
          asteroids.splice(j, 1);
          break; // Move to next projectile after destroying asteroid
        }
      }

      // Store current position for next frame's CCD
      previousPositions.set(projectile, projectile.position.clone());
    }
  }

  /**
   * Checks collision between projectile and asteroid with improved detection
   * Includes discrete and continuous (raycast) collision checks
   */
  private static checkProjectileAsteroidCollision(
    projectile: Projectile,
    asteroid: Asteroid,
    previousProjectilePosition?: Vector2D
  ): boolean {
    const PROJECTILE_RADIUS = 5;
    const COLLISION_EPSILON = 0.5;
    const radiusMultipliers: Record<string, number> = {
      large: 1.0,
      medium: 1.0,
      small: 1.4, // 40% increase for small asteroids
    };
    const radiusMultiplier = radiusMultipliers[asteroid.size] || 1.0;
    const effectiveAsteroidRadius = asteroid.radius * radiusMultiplier;
    const collisionDistance = effectiveAsteroidRadius + PROJECTILE_RADIUS + COLLISION_EPSILON;

    // Discrete collision check
    const currentDistance = Vector2D.distance(projectile.position, asteroid.position);
    if (currentDistance <= collisionDistance) {
      return true;
    }

    // Continuous collision detection (raycast)
    if (previousProjectilePosition) {
      const closestPoint = this.closestPointOnRayToPoint(
        previousProjectilePosition,
        projectile.position,
        asteroid.position
      );
      const distanceToRay = Vector2D.distance(closestPoint, asteroid.position);
      if (distanceToRay <= collisionDistance) {
        return true;
      }
    }

    return false;
  }

  /**
   * Finds closest point on a line segment to a given point (for CCD raycast)
   */
  private static closestPointOnRayToPoint(
    rayStart: Vector2D,
    rayEnd: Vector2D,
    point: Vector2D
  ): Vector2D {
    const dx = rayEnd.x - rayStart.x;
    const dy = rayEnd.y - rayStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return rayStart.clone();
    }

    let t = ((point.x - rayStart.x) * dx + (point.y - rayStart.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    return new Vector2D(rayStart.x + t * dx, rayStart.y + t * dy);
  }
}
