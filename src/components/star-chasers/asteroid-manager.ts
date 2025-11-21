import { Vector2D } from '../../models/vector2d';
import { Asteroid } from '../../models/game-entities';
import { Ship } from '../../models/ship';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for managing asteroids in the game
 */
export class AsteroidManager {
  /**
   * Spawns a new asteroid at the edge of the screen or at a specific position
   */
  static spawn(
    asteroids: Asteroid[],
    size: Asteroid['size'],
    worldWidth: number,
    worldHeight: number,
    position?: Vector2D,
    velocity?: Vector2D
  ): void {
    const edge = Math.floor(Math.random() * 4);
    let pos: Vector2D;
    
    if (position) {
      pos = position;
    } else {
      if (edge === 0) pos = new Vector2D(Math.random() * worldWidth, -50); // Top
      else if (edge === 1) pos = new Vector2D(worldWidth + 50, Math.random() * worldHeight); // Right
      else if (edge === 2) pos = new Vector2D(Math.random() * worldWidth, worldHeight + 50); // Bottom
      else pos = new Vector2D(-50, Math.random() * worldHeight); // Left
    }

    const vel = velocity || new Vector2D(
      worldWidth / 2 - pos.x,
      worldHeight / 2 - pos.y
    ).normalize().multiply(Math.random() * 1 + 0.5);
    
    const radius = GAME_CONSTANTS.ASTEROID_RADIUS[size];

    const shape: Vector2D[] = [];
    const segments = GAME_CONSTANTS.ASTEROID_SHAPE_SEGMENTS_MIN + 
                    Math.floor(Math.random() * GAME_CONSTANTS.ASTEROID_SHAPE_SEGMENTS_RANGE);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const dist = radius * (GAME_CONSTANTS.ASTEROID_SHAPE_DIST_MIN + 
                            Math.random() * GAME_CONSTANTS.ASTEROID_SHAPE_DIST_RANGE);
      shape.push(new Vector2D(Math.cos(angle) * dist, Math.sin(angle) * dist));
    }

    asteroids.push({
      position: pos,
      velocity: vel,
      radius,
      size,
      shape,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.02
    });
  }

  /**
   * Updates asteroid positions, applies homing behavior, and handles screen wrapping
   */
  static updateMovement(asteroid: Asteroid, ships: Ship[], worldWidth: number, worldHeight: number): void {
    // Add weak homing behavior towards the nearest ship
    if (ships.length > 0) {
      let nearestShip: Ship | null = null;
      let minDist = Infinity;
      
      ships.forEach(ship => {
        if (ship.state === 'paralyzed') return;
        const d = Vector2D.distance(asteroid.position, ship.position);
        if (d < minDist) {
          minDist = d;
          nearestShip = ship;
        }
      });

      if (nearestShip) {
        const direction = nearestShip.position.clone().subtract(asteroid.position).normalize();
        const trackingStrength = GAME_CONSTANTS.ASTEROID_TRACKING_STRENGTH;
        const acceleration = direction.multiply(trackingStrength);
        asteroid.velocity.add(acceleration);

        const maxAsteroidSpeed = GAME_CONSTANTS.ASTEROID_MAX_SPEED[asteroid.size];
        if (asteroid.velocity.magnitude() > maxAsteroidSpeed) {
          asteroid.velocity.normalize().multiply(maxAsteroidSpeed);
        }
      }
    }

    asteroid.position.add(asteroid.velocity);
    asteroid.rotation += asteroid.rotationSpeed;

    // Screen wrap
    if (asteroid.position.x < -asteroid.radius) asteroid.position.x = worldWidth + asteroid.radius;
    if (asteroid.position.x > worldWidth + asteroid.radius) asteroid.position.x = -asteroid.radius;
    if (asteroid.position.y < -asteroid.radius) asteroid.position.y = worldHeight + asteroid.radius;
    if (asteroid.position.y > worldHeight + asteroid.radius) asteroid.position.y = -asteroid.radius;
  }

  /**
   * Checks collision between an asteroid and a ship
   */
  static checkShipCollision(asteroid: Asteroid, ship: Ship): boolean {
    if (ship.state === 'paralyzed') return false;
    return Vector2D.distance(asteroid.position, ship.position) < asteroid.radius + ship.radius;
  }

  /**
   * Spawns an asteroid (wrapper for spawn method)
   */
  static spawnAsteroid(
    size: Asteroid['size'],
    worldWidth: number,
    worldHeight: number,
    asteroids: Asteroid[]
  ): void {
    this.spawn(asteroids, size, worldWidth, worldHeight);
  }

  /**
   * Checks if an asteroid is gone (off-screen or destroyed)
   */
  static isAsteroidGone(asteroid: Asteroid): boolean {
    // For now, asteroids never naturally leave - they wrap around
    // This method is for checking if asteroid is destroyed or otherwise removed
    return false;
  }

  /**
   * Updates all asteroids
   */
  static updateAsteroids(
    asteroids: Asteroid[],
    ships: Ship[],
    worldWidth: number,
    worldHeight: number
  ): { destroyedAsteroids: Asteroid[]; addedParticles: any[]; collectedTooltips: any[] } {
    const destroyedAsteroids: Asteroid[] = [];

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const asteroid = asteroids[i];
      this.updateMovement(asteroid, ships, worldWidth, worldHeight);

      // Check collision with ships
      for (const ship of ships) {
        if (this.checkShipCollision(asteroid, ship)) {
          ship.state = 'paralyzed';
          ship.paralyzeTimer = GAME_CONSTANTS.SHIP_PARALYZE_DURATION;
          
          destroyedAsteroids.push(asteroid);
          asteroids.splice(i, 1);
          break; // Asteroid is gone, stop checking other ships
        }
      }
    }
    
    return {
      destroyedAsteroids,
      addedParticles: [],
      collectedTooltips: []
    };
  }
}
