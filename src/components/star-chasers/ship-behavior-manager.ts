import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { PERSONALITIES, ShipPersonality } from '../../models/ship-personas';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for managing ship behaviors and personalities
 */
export class ShipBehaviorManager {
  /**
   * Switches a ship to a new random personality
   */
  static switchPersonality(ship: Ship, worldWidth: number, worldHeight: number): void {
    const currentPersonality = ship.personality;
    let newPersonality = currentPersonality;
    while (newPersonality === currentPersonality) {
      newPersonality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    }
    ship.personality = newPersonality;
    ship.personalityTimer = 15000 + Math.random() * 15000; // 15-30 seconds for next change

    if (newPersonality === 'patroller') {
      ship.patrolTarget = new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight);
    } else {
      ship.patrolTarget = undefined;
    }
  }

  /**
   * Applies personality-based behaviors to a ship
   */
  static applyPersonalityBehaviors(ship: Ship, ships: Ship[], worldWidth: number, worldHeight: number): void {
    switch (ship.personality) {
      case 'aggressive':
        this.applyAggressiveBehavior(ship, ships);
        break;
      case 'timid':
        this.applyTimidBehavior(ship, ships);
        break;
      case 'loner':
        this.applyLonerBehavior(ship, ships, worldWidth, worldHeight);
        break;
      case 'patroller':
        this.applyPatrollerBehavior(ship, worldWidth, worldHeight);
        break;
      default: // explorer
        this.applyExplorerBehavior(ship);
        break;
    }
  }

  private static applyAggressiveBehavior(ship: Ship, ships: Ship[]): void {
    let nearestShip: Ship | null = null;
    let minDist = Infinity;
    ships.forEach(other => {
      if (ship.id === other.id) return;
      const d = Vector2D.distance(ship.position, other.position);
      if (d < minDist) {
        minDist = d;
        nearestShip = other;
      }
    });
    if (nearestShip) {
      const direction = nearestShip.position.clone().subtract(ship.position).normalize();
      ship.acceleration.add(direction.multiply(0.04));
    }
  }

  private static applyTimidBehavior(ship: Ship, ships: Ship[]): void {
    const fleeRadius = 250;
    ships.forEach(other => {
      if (ship.id === other.id) return;
      const dist = Vector2D.distance(ship.position, other.position);
      if (dist > 0 && dist < fleeRadius) {
        const repulsion = ship.position.clone().subtract(other.position);
        const strength = (1 - dist / fleeRadius) * 0.1;
        repulsion.normalize().multiply(strength);
        ship.acceleration.add(repulsion);
      }
    });
  }

  private static applyLonerBehavior(ship: Ship, ships: Ship[], worldWidth: number, worldHeight: number): void {
    const w = worldWidth;
    const h = worldHeight;
    const quadrants = [
      { x: 0, y: 0, count: 0 }, { x: w / 2, y: 0, count: 0 },
      { x: 0, y: h / 2, count: 0 }, { x: w / 2, y: h / 2, count: 0 }
    ];
    ships.forEach(c => {
      if (c.position.x < w / 2 && c.position.y < h / 2) quadrants[0].count++;
      else if (c.position.x >= w / 2 && c.position.y < h / 2) quadrants[1].count++;
      else if (c.position.x < w / 2 && c.position.y >= h / 2) quadrants[2].count++;
      else quadrants[3].count++;
    });
    quadrants.sort((a, b) => a.count - b.count);
    const targetQuadrant = quadrants[0];
    const targetPos = new Vector2D(targetQuadrant.x + w / 4, targetQuadrant.y + h / 4);
    const direction = targetPos.subtract(ship.position).normalize();
    ship.acceleration.add(direction.multiply(0.03));
  }

  private static applyPatrollerBehavior(ship: Ship, worldWidth: number, worldHeight: number): void {
    if (!ship.patrolTarget || Vector2D.distance(ship.position, ship.patrolTarget) < 100) {
      ship.patrolTarget = new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight);
    }
    const direction = ship.patrolTarget.clone().subtract(ship.position).normalize();
    ship.acceleration.add(direction.multiply(0.05));
  }

  private static applyExplorerBehavior(ship: Ship): void {
    const randomAngle = (Math.random() - 0.5) * 0.1;
    const newVelX = Math.cos(randomAngle) * ship.velocity.x - Math.sin(randomAngle) * ship.velocity.y;
    const newVelY = Math.sin(randomAngle) * ship.velocity.x + Math.cos(randomAngle) * ship.velocity.y;
    ship.velocity.x = newVelX;
    ship.velocity.y = newVelY;
    let idleSpeed = 0.8 + ship.speedBonus * 0.5;
    if (ship.color === 'Blue') idleSpeed *= 1.25;
    ship.velocity.normalize().multiply(idleSpeed);
  }

  /**
   * Performs celebration animation based on ship color
   */
  static performCelebration(ship: Ship): void {
    const progress = 1 - (ship.celebrationTimer / ship.celebrationDuration);
    const easeMultiplier = Math.sin(progress * Math.PI);
    
    switch (ship.color) {
      case 'Red': // Zig-zag
        ship.velocity.multiply(0.9);
        const perp = new Vector2D(-ship.velocity.y, ship.velocity.x).normalize();
        if (Math.random() < 0.1) ship.zigZagDir *= -1;
        ship.acceleration.add(perp.multiply(0.5 * ship.zigZagDir * easeMultiplier));
        break;
      case 'Green': // Spiral
        const angle = (Date.now() / 200);
        const radius = 2 + 30 * easeMultiplier;
        ship.position.x += Math.cos(angle) * radius * 0.1;
        ship.position.y += Math.sin(angle) * radius * 0.1;
        ship.velocity.multiply(0.9);
        break;
      case 'Blue': // Loop
        const turn = new Vector2D(-ship.velocity.y, ship.velocity.x).normalize().multiply(0.3 * easeMultiplier);
        ship.acceleration.add(turn);
        break;
    }
    ship.velocity.add(ship.acceleration);
    ship.velocity.normalize().multiply(3);
    ship.position.add(ship.velocity);
    ship.acceleration.multiply(0);
  }

  /**
   * Performs a blink/teleport for Blue ships
   */
  static performBlink(
    ship: Ship,
    targetStarExists: boolean,
    targetStarPosition: Vector2D,
    worldWidth: number,
    worldHeight: number
  ): Vector2D[] {
    const BLINK_DISTANCE = 150;
    const startPos = ship.position.clone();
    let direction: Vector2D;
    
    if (ship.state === 'hunting' && targetStarExists) {
      direction = targetStarPosition.clone().subtract(ship.position).normalize();
    } else {
      direction = ship.velocity.magnitude() > 0 
        ? ship.velocity.clone().normalize() 
        : new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    }
    
    const endPos = startPos.clone().add(direction.multiply(BLINK_DISTANCE));
    endPos.x = (endPos.x + worldWidth) % worldWidth;
    endPos.y = (endPos.y + worldHeight) % worldHeight;

    ship.position = endPos;
    ship.tail = [];
    ship.isBlinking = 15;
    ship.blinkTimer = ship.blinkCooldown + (Math.random() - 0.5) * 4000;
    
    // Return positions for particle effects
    return [startPos, endPos];
  }
}
