import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { MouseState } from './input-manager';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Manages ship launching mechanics
 */
export class ShipLaunchManager {
  /**
   * Launches all orbiting ships when mouse/touch is released
   */
  static launchOrbitingShips(
    ships: Ship[],
    mouse: MouseState,
    callbacks: {
      playLaunchSound: () => void;
      triggerLaunchChatter: (ship: Ship) => void;
    }
  ): void {
    ships.forEach(ship => {
      if (ship.state === 'orbiting') {
        ship.state = 'launched';
        callbacks.playLaunchSound();
        
        let launchSpeed = ship.orbitalSpeed * 80;
        if (ship.color === 'Red') {
          launchSpeed *= GAME_CONSTANTS.RED_LAUNCH_SPEED_MULTIPLIER;
          ship.afterburnerTimer = GAME_CONSTANTS.RED_AFTERBURNER_DURATION;
        }
        
        const tangent = new Vector2D(
          mouse.pos.y - ship.position.y,
          ship.position.x - mouse.pos.x
        ).normalize();
        
        ship.velocity = tangent.multiply(launchSpeed);
        callbacks.triggerLaunchChatter(ship);
      }
    });
  }
}
