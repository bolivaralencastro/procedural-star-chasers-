import { describe, expect, it } from 'vitest';
import { ConstellationService } from './constellation.service';
import { Vector2D } from '../entities/vector2d';
import type { Ship } from '../entities/ship';

function shipAt(id: number, x: number, y: number): Ship {
  return { id, position: new Vector2D(x, y) } as Ship;
}

describe('ConstellationService', () => {
  it('generates a non-empty heart pattern', () => {
    const service = new ConstellationService();
    const pattern = service.getPattern('heart');
    expect(pattern.length).toBeGreaterThan(0);
    expect(pattern[0]).toBeInstanceOf(Vector2D);
  });

  it('returns an empty array for patterns without points', () => {
    const service = new ConstellationService();
    expect(service.getPattern('spiral')).toEqual([]);
  });

  it('assigns each ship to at most one pattern point', () => {
    const service = new ConstellationService();
    const ships = [shipAt(1, 0, 0), shipAt(2, 100, 100), shipAt(3, -50, 30)];
    const assignments = service.assignShipsToPattern(ships, service.getPattern('heart'));

    expect(assignments.size).toBe(ships.length);
    const points = [...assignments.values()];
    const uniquePoints = new Set(points);
    expect(uniquePoints.size).toBe(points.length);
  });

  it('handles empty inputs gracefully', () => {
    const service = new ConstellationService();
    expect(service.assignShipsToPattern([], service.getPattern('heart')).size).toBe(0);
    expect(service.assignShipsToPattern([shipAt(1, 0, 0)], []).size).toBe(0);
  });
});
