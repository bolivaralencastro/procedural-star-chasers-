import { Vector2D } from '../entities/vector2d';
import { Ship } from '../entities/ship';
import { RadioContext } from '../services/radio-chatter.service';

/**
 * Ship-to-ship relationships.
 *
 * Every pair carries an affinity in [-1, 1] (persisted in the logbook) that
 * shifts with shared history — a rescue warms it, a collision sours it. That
 * affinity then colours how the pair behaves and talks: friends drift into a
 * loose formation and banter; rivals keep their distance and trade jabs.
 *
 * The threshold/steering maths are static and side-effect-light so they can be
 * unit-tested; the persistence lives in the caller (engine + logbook).
 */
export const RelationshipManager = {
  FRIEND_THRESHOLD: 0.3,
  RIVAL_THRESHOLD: -0.3,

  RESCUE_BONUS: 0.3,
  COLLISION_PENALTY: 0.1,

  /** Which proximity chatter a pair uses, given their affinity. */
  contextForAffinity(affinity: number): RadioContext {
    if (affinity > this.FRIEND_THRESHOLD) return 'friendly_banter';
    if (affinity < this.RIVAL_THRESHOLD) return 'rivalry';
    return 'proximity';
  },

  /**
   * Nudges a near pair based on affinity: friends settle into a loose formation
   * gap; rivals ease apart. Gentle enough not to override hunting. Mutates the
   * ships' acceleration. Call only for ships in free-moving states.
   */
  applyProximitySteering(
    shipA: Ship,
    shipB: Ship,
    distance: number,
    combinedRadius: number,
    affinity: number
  ): void {
    if (distance <= 0) return;
    const aToB = shipB.position.clone().subtract(shipA.position).normalize();

    if (affinity > this.FRIEND_THRESHOLD) {
      const formationGap = combinedRadius * 2.2;
      if (distance > formationGap && distance < 260) {
        const s = 0.012; // draw together
        shipA.acceleration.add(aToB.clone().multiply(s));
        shipB.acceleration.add(aToB.clone().multiply(-s));
      } else if (distance < combinedRadius * 1.4) {
        const s = 0.02; // too tight — hold the gap
        shipA.acceleration.add(aToB.clone().multiply(-s));
        shipB.acceleration.add(aToB.clone().multiply(s));
      }
    } else if (affinity < this.RIVAL_THRESHOLD) {
      if (distance < 240) {
        const s = 0.016; // keep rivals apart
        shipA.acceleration.add(aToB.clone().multiply(-s));
        shipB.acceleration.add(aToB.clone().multiply(s));
      }
    }
  },

  /** Clamp helper mirroring the logbook's own clamp, for callers computing deltas. */
  clampAffinity(value: number): number {
    return Math.max(-1, Math.min(1, value));
  },
};

// Re-exported for tests that want to construct throwaway ships cheaply.
export type { Vector2D };
