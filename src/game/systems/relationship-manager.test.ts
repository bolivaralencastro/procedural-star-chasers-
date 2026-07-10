import { describe, expect, it } from 'vitest';
import { RelationshipManager } from './relationship-manager';
import { Vector2D } from '../entities/vector2d';
import { Ship } from '../entities/ship';

function shipAt(id: number, x: number, y: number): Ship {
  return {
    id,
    position: new Vector2D(x, y),
    acceleration: new Vector2D(0, 0),
    radius: 10,
  } as unknown as Ship;
}

describe('RelationshipManager', () => {
  it('maps affinity to the right chatter context', () => {
    expect(RelationshipManager.contextForAffinity(0.5)).toBe('friendly_banter');
    expect(RelationshipManager.contextForAffinity(-0.5)).toBe('rivalry');
    expect(RelationshipManager.contextForAffinity(0)).toBe('proximity');
  });

  it('friends at a wide gap are drawn toward each other', () => {
    const a = shipAt(0, 0, 0);
    const b = shipAt(1, 200, 0); // beyond formation gap, within 260
    RelationshipManager.applyProximitySteering(a, b, 200, 20, 0.6);
    // A accelerates toward B (+x), B toward A (-x)
    expect(a.acceleration.x).toBeGreaterThan(0);
    expect(b.acceleration.x).toBeLessThan(0);
  });

  it('friends too close ease apart to hold the gap', () => {
    const a = shipAt(0, 0, 0);
    const b = shipAt(1, 20, 0); // within combinedRadius*1.4
    RelationshipManager.applyProximitySteering(a, b, 20, 20, 0.6);
    expect(a.acceleration.x).toBeLessThan(0);
    expect(b.acceleration.x).toBeGreaterThan(0);
  });

  it('rivals within range push apart', () => {
    const a = shipAt(0, 0, 0);
    const b = shipAt(1, 100, 0);
    RelationshipManager.applyProximitySteering(a, b, 100, 20, -0.6);
    expect(a.acceleration.x).toBeLessThan(0);
    expect(b.acceleration.x).toBeGreaterThan(0);
  });

  it('neutral pairs are left alone', () => {
    const a = shipAt(0, 0, 0);
    const b = shipAt(1, 100, 0);
    RelationshipManager.applyProximitySteering(a, b, 100, 20, 0.0);
    expect(a.acceleration.x).toBe(0);
    expect(b.acceleration.x).toBe(0);
  });
});
