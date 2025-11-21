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
  GameStateManager.spawnTargetStar(
    engine.targetStar,
    engine.ships,
    engine.worldWidth,
    engine.worldHeight
  );

  notifyStarSpawn(engine);
}

export function scheduleNextStar(engine: StarChasersEngine) {
  engine.nextStarSpawnTime = GameStateManager.scheduleNextStar();
}

export function notifyStarSpawn(engine: StarChasersEngine) {
  const huntingShip = engine.getRandomActiveShip();
  if (huntingShip) {
    engine.enqueueRadioMessage(huntingShip, 'star_spawn');
  }
  engine.deps.audioService.playSound('star_spawn');
}
