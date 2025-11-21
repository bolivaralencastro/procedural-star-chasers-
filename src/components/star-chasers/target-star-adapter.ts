import { Vector2D } from '../../models/vector2d';
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

  // Update star animation and physics
  GameStateManager.updateTargetStar(
    engine.targetStar,
    engine.ships,
    engine.worldWidth,
    engine.worldHeight
  );

  // Spawn star particles occasionally
  if (!engine.targetStar.isDespawning && Math.random() < 0.5) {
    spawnStarParticle(engine);
  }

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
  
  // Set hunting ships back to idle when star despawns
  engine.ships.forEach(ship => {
    if (ship.state === 'hunting') {
      ship.state = 'idle';
    }
  });

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

  // Set all ships to hunting state (except controlled ones)
  engine.ships.forEach(ship => {
    if (ship.state !== 'orbiting' && ship.state !== 'controlled' && ship.state !== 'paralyzed') {
      ship.state = 'hunting';
    }
  });

  // Clear star particles when new star spawns
  engine.starParticles = [];

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

function spawnStarParticle(engine: StarChasersEngine) {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 0.5 + 0.2;
  const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
  engine.starParticles.push({
    position: engine.targetStar.position.clone(),
    velocity,
    radius: Math.random() * 1.5 + 0.5,
    life: 40 + Math.random() * 40,
    maxLife: 80,
    color: 'rgba(255, 223, 0, 1)'
  });
}
