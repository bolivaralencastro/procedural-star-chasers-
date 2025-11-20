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
    if (this.engine.gameMode !== 'normal') {
      return;
    }

    const totalScore = this.engine.ships.reduce((sum, ship) => sum + ship.score, 0);
    if (totalScore >= this.engine.eventTriggerScore && Math.random() < GAME_CONSTANTS.EVENT_TRIGGER_CHANCE) {
      this.engine.eventTriggerScore += 2;
      this.triggerAsteroidEvent();
    }
  }

  triggerAsteroidEvent(): void {
    this.engine.gameMode = 'asteroid_event';
    this.engine.targetStar.exists = false;
    this.messaging.enqueueRadioMessage(this.messaging.getRandomActiveShip(), 'asteroid_warning');
    this.engine.deps.audioService.playSound('alert');
    this.spawnAsteroid('large');
    this.spawnAsteroid('medium');
    this.spawnAsteroid('small');
  }

  spawnAsteroid(size: Asteroid['size'], position?: Vector2D, velocity?: Vector2D): void {
    this.engine.asteroids.push(
      AsteroidManager.spawnAsteroid(size, this.engine.worldWidth, this.engine.worldHeight, position, velocity)
    );
  }

  maybeEndAsteroidEvent(): void {
    const allDestroyedOrExpired = this.engine.asteroids.every(asteroid => AsteroidManager.isAsteroidGone(asteroid));
    if (allDestroyedOrExpired) {
      this.engine.eventTriggerScore += 2;
      this.engine.gameMode = 'normal';
      scheduleNextStar(this.engine);
      this.messaging.enqueueRadioMessage(this.messaging.getRandomActiveShip(), 'asteroid_clear');
    }
  }
}
