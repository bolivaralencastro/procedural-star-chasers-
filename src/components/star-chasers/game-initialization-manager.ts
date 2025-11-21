import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { ShipColor, SHIP_PERSONAS } from '../../models/ship-personas';

/**
 * Manages game initialization including ship creation
 */
export class GameInitializationManager {
  /**
   * Creates initial ships for the game
   */
  static createShips(worldWidth: number, worldHeight: number): Ship[] {
    const colors: { name: ShipColor; hex: string }[] = [
      { name: 'Red', hex: '#ef4444' },
      { name: 'Green', hex: '#22c55e' },
      { name: 'Blue', hex: '#3b82f6' },
    ];
    
    return colors.map((c, i) => ({
      id: i,
      color: c.name,
      codename: SHIP_PERSONAS[c.name].codename,
      hexColor: c.hex,
      position: new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight),
      velocity: new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(0.5),
      acceleration: new Vector2D(),
      radius: 10,
      state: 'idle' as const,
      score: 0,
      speedBonus: 0,
      orbitAngle: 0,
      orbitalSpeed: 0.05,
      celebrationTimer: 0,
      celebrationDuration: 2500, // 2.5 seconds
      zigZagDir: 1,
      tail: [],
      z: 0,
      zVelocity: 0,
      zMoveTimer: 7000 + Math.random() * 8000,
      afterburnerTimer: 0,
      blinkCooldown: 15000 + Math.random() * 5000,
      blinkTimer: 5000 + Math.random() * 5000,
      isBlinking: 0,
      personality: 'explorer' as const,
      personalityTimer: 10000 + Math.random() * 10000,
      patrolTarget: undefined,
      fireCooldown: 0,
      paralyzeTimer: 0,
      asteroidsDestroyed: 0,
      maxAmmo: 5,
      ammo: 5,
      reloadDuration: 3000,
      reloadTimer: 0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.08 + (Math.random() - 0.5) * 0.02,
      opacity: 1,
    }));
  }
}
