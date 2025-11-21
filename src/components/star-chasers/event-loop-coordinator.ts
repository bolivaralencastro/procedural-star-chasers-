import { Vector2D } from '../../models/vector2d';
import { Asteroid } from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';
import { scheduleNextStar, updateTargetStar } from './target-star-adapter';
import { AsteroidManager } from './asteroid-manager';
import type { RadioContext } from '../../services/radio-chatter.service';
import type { Ship } from '../../models/ship';
import type { StarChasersEngine } from './star-chasers.engine';

interface EventMessaging {
  enqueueRadioMessage: (ship: Ship, context: RadioContext) => boolean;
  getRandomActiveShip: () => Ship;
}

export class EventLoopCoordinator {
  private timeSinceLastEventCheck = 0;

  constructor(
    private readonly engine: StarChasersEngine,
    private readonly messaging: EventMessaging
  ) {}

  handleEvents(deltaTime: number): void {
    this.timeSinceLastEventCheck += deltaTime;
    if (this.timeSinceLastEventCheck > this.engine.EVENT_CHECK_INTERVAL) {
      this.checkForAsteroidEvent();
      this.timeSinceLastEventCheck = 0;
    }

    if (this.engine.gameMode === 'normal') {
      updateTargetStar(this.engine);
    } else {
      this.engine.targetStar.exists = false;
    }
  }

  checkForAsteroidEvent(): void {
    if (this.engine.gameMode !== 'normal' || this.engine.asteroids.length > 0) {
      return;
    }

    const allHaveEnoughStars = this.engine.ships.every(s => s.score >= this.engine.eventTriggerScore);
    if (allHaveEnoughStars && Math.random() < GAME_CONSTANTS.EVENT_TRIGGER_CHANCE) {
      this.triggerAsteroidEvent();
    }
  }

  triggerAsteroidEvent(): void {
    this.engine.gameMode = 'asteroid_event';
    this.engine.targetStar.exists = false;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.spawnAsteroid('large');
    }
    this.engine.ships.forEach(s => {
      if (this.messaging.getRandomActiveShip() === s) {
        return;
      }
      s.state = 'idle';
    });
    this.messaging.enqueueRadioMessage(this.messaging.getRandomActiveShip(), 'meteor_event');
  }

  spawnAsteroid(size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D): void {
    AsteroidManager.spawnAsteroid(size, this.engine.worldWidth, this.engine.worldHeight, this.engine.asteroids);
  }

  maybeEndAsteroidEvent(): void {
    if (this.engine.gameMode === 'asteroid_event' && this.engine.asteroids.length === 0) {
      this.engine.gameMode = 'normal';
      scheduleNextStar(this.engine);
    }
  }
}
