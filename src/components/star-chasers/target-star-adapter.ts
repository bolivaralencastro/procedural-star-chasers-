import { GameStateManager } from './game-state-manager';
import { StarEventManager } from './star-event-manager';
import type { StarChasersEngine } from './star-chasers.engine';

export function updateTargetStar(engine: StarChasersEngine) {
  if (!engine.targetStar.exists && Date.now() >= engine.nextStarSpawnTime) {
    spawnTargetStar(engine);
  }

  if (!engine.targetStar.exists) {
    return;
  }

  StarEventManager.updateTargetStar(engine.targetStar);

  const shipHunting = engine.ships.find(ship => ship.state === 'hunting');
  if (shipHunting && Math.random() < 0.01) {
    engine.enqueueRadioMessage(shipHunting, 'hunting');
  }

  if (Date.now() > engine.targetStar.spawnTime + engine.targetStar.lifetime) {
    despawnTargetStar(engine);
  }
}

export function despawnTargetStar(engine: StarChasersEngine) {
  if (!engine.targetStar.exists || engine.targetStar.isDespawning) {
    return;
  }

  engine.targetStar.isDespawning = true;
  setTimeout(() => {
    engine.targetStar.exists = false;
    engine.targetStar.isDespawning = false;
    scheduleNextStar(engine);
  }, 1000);
}

export function spawnTargetStar(engine: StarChasersEngine) {
  const { position, velocity, acceleration, radius, lifetime } = GameStateManager.spawnTargetStar(
    engine.worldWidth,
    engine.worldHeight
  );

  engine.targetStar = {
    position,
    velocity,
    acceleration,
    radius,
    exists: true,
    isDespawning: false,
    pulseAngle: 0,
    opacity: 0,
    spawnTime: Date.now(),
    lifetime,
  };

  notifyStarSpawn(engine);
}

export function scheduleNextStar(engine: StarChasersEngine) {
  const shipScores = engine.ships.map(s => s.score);
  const minScore = Math.min(...shipScores);
  const maxScore = Math.max(...shipScores);
  engine.nextStarSpawnTime = GameStateManager.scheduleNextStar(minScore, maxScore, engine.targetStar.exists);
}

export function notifyStarSpawn(engine: StarChasersEngine) {
  const huntingShip = engine.getRandomActiveShip();
  if (huntingShip) {
    engine.enqueueRadioMessage(huntingShip, 'star_spawn');
  }
  engine.deps.audioService.playSound('star_spawn');
}
