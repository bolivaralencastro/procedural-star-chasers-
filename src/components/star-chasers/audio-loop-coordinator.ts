import type { Ship } from '../../models/ship';
import type { StarChasersEngine } from './star-chasers.engine';

export class AudioLoopCoordinator {
  constructor(private readonly engine: StarChasersEngine) {}

  updateAudio(): void {
    const isOrbiting = this.engine.ships.some((ship: Ship) => ship.state === 'orbiting');
    const orbitingShip = this.engine.ships.find((ship: Ship) => ship.state === 'orbiting');
    const orbitingSpeed = orbitingShip ? orbitingShip.orbitalSpeed : undefined;

    const isHunting = this.engine.gameMode === 'normal' && this.engine.ships.some((ship: Ship) => ship.state === 'hunting');
    const isCoop =
      this.engine.gameMode === 'asteroid_event' &&
      this.engine.ships.some((ship: Ship) => ship.state !== 'paralyzed' && ship.state !== 'orbiting');
    const anyShipCelebrating = this.engine.ships.some((ship: Ship) => ship.state === 'celebrating');

    this.engine.deps.audioService.updateGameSounds(isOrbiting, isHunting, isCoop, orbitingSpeed);
    this.engine.deps.audioService.updateBackgroundMusic(isHunting, isCoop, anyShipCelebrating);
  }
}
