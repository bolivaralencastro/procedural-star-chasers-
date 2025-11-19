import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';

/**
 * Helper class for managing ship-to-ship collisions
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
}
