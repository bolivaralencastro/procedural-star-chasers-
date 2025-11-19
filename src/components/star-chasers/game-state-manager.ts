import { Vector2D } from '../../models/vector2d';
import { TargetStar, Particle, Nebula } from '../../models/game-entities';
import { Ship } from '../../models/ship';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for managing game state, modes, and events
 */
export class GameStateManager {
  /**
   * Schedules the next star spawn
   */
  static scheduleNextStar(): number {
    const delay = 5000 + Math.random() * 10000;
    return Date.now() + delay;
  }

  /**
   * Spawns a new target star at a valid position
   */
  static spawnTargetStar(
    targetStar: TargetStar,
    ships: Ship[],
    worldWidth: number,
    worldHeight: number
  ): void {
    const w = worldWidth;
    const h = worldHeight;
    let validPosition = false;
    
    while (!validPosition) {
      targetStar.position = new Vector2D(
        w * 0.1 + Math.random() * w * 0.8,
        h * 0.1 + Math.random() * h * 0.8
      );
      const tooClose = ships.some(c => Vector2D.distance(targetStar.position, c.position) < 150);
      if (!tooClose) {
        validPosition = true;
      }
    }
    
    targetStar.exists = true;
    targetStar.isDespawning = false;
    targetStar.opacity = 0;
    targetStar.pulseAngle = 0;
    targetStar.velocity = new Vector2D(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize().multiply(0.3);
    targetStar.spawnTime = Date.now();
    targetStar.lifetime = 12000 + Math.random() * 6000;
  }

  /**
   * Updates target star animation and physics
   */
  static updateTargetStar(
    targetStar: TargetStar,
    ships: Ship[],
    worldWidth: number,
    worldHeight: number
  ): void {
    targetStar.pulseAngle += 0.05;
    
    if (targetStar.isDespawning) {
      targetStar.opacity -= 0.02;
      if (targetStar.opacity <= 0) {
        targetStar.exists = false;
      }
    } else if (targetStar.opacity < 1) {
      targetStar.opacity += 0.02;
    }
    
    if (!targetStar.isDespawning && Date.now() > targetStar.spawnTime + targetStar.lifetime) {
      targetStar.isDespawning = true;
    }

    // Flee from ships
    const totalRepulsion = new Vector2D();
    const fleeRadius = 300;
    ships.forEach(ship => {
      const dist = Vector2D.distance(targetStar.position, ship.position);
      if (dist > 0 && dist < fleeRadius) {
        const repulsion = targetStar.position.clone().subtract(ship.position);
        const strength = (1 - dist / fleeRadius) * 0.2;
        repulsion.normalize().multiply(strength);
        totalRepulsion.add(repulsion);
      }
    });
    targetStar.acceleration.add(totalRepulsion);

    // Update velocity and position
    const STAR_MAX_SPEED = 0.6;
    targetStar.velocity.add(targetStar.acceleration);
    targetStar.velocity.multiply(0.98);
    if (targetStar.velocity.magnitude() > STAR_MAX_SPEED) {
      targetStar.velocity.normalize().multiply(STAR_MAX_SPEED);
    }
    targetStar.position.add(targetStar.velocity);
    targetStar.acceleration.multiply(0);
    
    // Wrap around screen
    const w = worldWidth;
    const h = worldHeight;
    if (targetStar.position.x < 0) targetStar.position.x = w;
    if (targetStar.position.x > w) targetStar.position.x = 0;
    if (targetStar.position.y < 0) targetStar.position.y = h;
    if (targetStar.position.y > h) targetStar.position.y = 0;
  }

  /**
   * Checks if conditions are met for asteroid event
   */
  static shouldTriggerAsteroidEvent(
    gameMode: 'normal' | 'asteroid_event',
    asteroidCount: number,
    ships: Ship[],
    eventTriggerScore: number
  ): boolean {
    if (gameMode !== 'normal' || asteroidCount > 0) return false;
    const allHaveEnoughStars = ships.every(s => s.score >= eventTriggerScore);
    return allHaveEnoughStars && Math.random() < 0.25;
  }

  /**
   * Creates a nebula at a position
   */
  static createNebula(nebulas: Nebula[], position: Vector2D): void {
    nebulas.push({
      position,
      radius: 120,
      life: 600,
      maxLife: 600
    });
  }

  /**
   * Updates all nebulas in the game
   */
  static updateNebulas(nebulas: Nebula[]): void {
    for (let i = nebulas.length - 1; i >= 0; i--) {
      const nebula = nebulas[i];
      nebula.life--;
      if (nebula.life <= 0) {
        nebulas.splice(i, 1);
      }
    }
  }
}
