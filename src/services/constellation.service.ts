import { Injectable } from '@angular/core';
import { Ship } from '../models/ship';
import { Vector2D } from '../models/vector2d';

export type ConstellationPattern = 'heart' | 'star' | 'spiral';

@Injectable({
  providedIn: 'root'
})
export class ConstellationService {
  private patterns: Record<ConstellationPattern, Vector2D[]> = {
    heart: [],
    star: [],
    spiral: []
  };

  constructor() {
    this.generateHeartPattern();
  }

  private generateHeartPattern() {
    const points: Vector2D[] = [];
    const scale = 15; // Scale factor for the heart shape
    const steps = 30; // Number of points in the heart shape

    for (let i = 0; i < steps; i++) {
      const t = (i / (steps - 1)) * 2 * Math.PI;
      const x = scale * 16 * Math.pow(Math.sin(t), 3);
      const y = -scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      points.push(new Vector2D(x, y));
    }
    this.patterns.heart = points;
  }

  public getPattern(name: ConstellationPattern): Vector2D[] {
    return this.patterns[name] || [];
  }

  public assignShipsToPattern(ships: Ship[], pattern: Vector2D[]): Map<number, Vector2D> {
    const assignments = new Map<number, Vector2D>();
    if (ships.length === 0 || pattern.length === 0) {
      return assignments;
    }

    const availableShips = [...ships];
    const availablePoints = [...pattern];
    const assignedShipIds = new Set<number>();

    // Assign each point to the nearest available ship
    for (const point of availablePoints) {
      let nearestShip: Ship | null = null;
      let minDistance = Infinity;

      for (const ship of availableShips) {
        if (assignedShipIds.has(ship.id)) continue;

        const distance = Vector2D.distance(ship.position, point);
        if (distance < minDistance) {
          minDistance = distance;
          nearestShip = ship;
        }
      }

      if (nearestShip) {
        assignments.set(nearestShip.id, point);
        assignedShipIds.add(nearestShip.id);
      }
    }

    return assignments;
  }
}
