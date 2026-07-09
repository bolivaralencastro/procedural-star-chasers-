import { describe, expect, it } from 'vitest';
import { CollisionManager } from './collision-manager';
import { Vector2D } from '../entities/vector2d';
import type { Ship, ShipState } from '../entities/ship';

function makeShip(id: number, x: number, y: number, state: ShipState = 'idle'): Ship {
  return {
    id,
    position: new Vector2D(x, y),
    velocity: new Vector2D(0, 0),
    radius: 10,
    state,
    z: 0,
  } as Ship;
}

describe('CollisionManager.updateShipCollisions', () => {
  it('separates overlapping ships', () => {
    const a = makeShip(1, 0, 0);
    const b = makeShip(2, 5, 0); // overlapping: distance 5 < combined radius 20

    CollisionManager.updateShipCollisions([a, b]);

    const distanceAfter = Vector2D.distance(a.position, b.position);
    expect(distanceAfter).toBeGreaterThan(5);
  });

  it('leaves distant ships untouched', () => {
    const a = makeShip(1, 0, 0);
    const b = makeShip(2, 500, 0);

    CollisionManager.updateShipCollisions([a, b]);

    expect([a.position.x, a.position.y]).toEqual([0, 0]);
    expect([b.position.x, b.position.y]).toEqual([500, 0]);
  });

  it('ignores ships in protected states (orbiting/celebrating/paralyzed)', () => {
    const a = makeShip(1, 0, 0, 'orbiting');
    const b = makeShip(2, 5, 0);

    CollisionManager.updateShipCollisions([a, b]);

    expect([a.position.x, a.position.y]).toEqual([0, 0]);
    expect([b.position.x, b.position.y]).toEqual([5, 0]);
  });

  it('reports proximity through the callback', () => {
    const a = makeShip(1, 0, 0);
    const b = makeShip(2, 100, 0);
    let reported: { distance: number; combinedRadius: number } | null = null;

    CollisionManager.updateShipCollisions([a, b], (_shipA, _shipB, distance, combinedRadius) => {
      reported = { distance, combinedRadius };
    });

    expect(reported).not.toBeNull();
    expect(reported!.distance).toBe(100);
    expect(reported!.combinedRadius).toBe(20);
  });
});
