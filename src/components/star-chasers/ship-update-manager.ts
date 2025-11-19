import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { Asteroid, TargetStar, Nebula, WormholePair } from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';
import { ShipBehaviorManager } from './ship-behavior-manager';
import { ParticleEffectsManager } from './particle-effects-manager';
import { InputManager, MouseState } from './input-manager';
import { AudioService } from '../../services/audio.service';

/**
 * Manages the update cycle for individual ships including physics, AI, and state management
 */
export class ShipUpdateManager {
  /**
   * Main update method for a ship - handles all ship physics, AI, and state transitions
   */
  static updateShip(
    ship: Ship,
    context: {
      ships: Ship[];
      asteroids: Asteroid[];
      targetStar: TargetStar;
      nebulas: Nebula[];
      mouse: MouseState;
      mouseInteractionEnabled: boolean;
      gameMode: 'normal' | 'asteroid_event';
      worldWidth: number;
      worldHeight: number;
      formationAssignments: Map<number, Vector2D>;
      controlledShipId: number | null;
      explosionParticles: any[];
      activeControlKeys: Set<string>;
    },
    callbacks: {
      switchPersonality: (ship: Ship) => void;
      applyPersonalityBehaviors: (ship: Ship) => void;
      performBlink: (ship: Ship) => void;
      performCelebration: (ship: Ship) => void;
      isShipCurrentlyControlled: (ship: Ship) => boolean;
      fireProjectile: (ship: Ship) => void;
      createAfterburnerParticle: (ship: Ship) => void;
      createStarExplosion: (position: Vector2D, count?: number) => void;
      enqueueRadioMessage: (ship: Ship, context: string) => boolean;
      applyManualControls: (ship: Ship, deltaTime: number) => void;
      startManualReload: () => void;
    },
    utils: {
      lerp: (start: number, end: number, amt: number) => number;
      normalizeAngle: (angle: number) => number;
      lerpAngle: (a: number, b: number, t: number) => number;
    },
    audioService: AudioService
  ): void {
    const deltaTime = 16.67;
    const TAIL_LENGTH = GAME_CONSTANTS.TAIL_LENGTH;

    // Personality timer
    ship.personalityTimer -= deltaTime;
    if (ship.personalityTimer <= 0 && ship.state === 'idle') {
      callbacks.switchPersonality(ship);
    }

    // Z-axis movement (depth effect)
    ship.zMoveTimer -= deltaTime;
    if (ship.zMoveTimer <= 0) {
      ship.zVelocity = (Math.random() - 0.5) * 0.03;
      ship.zMoveTimer = 7000 + Math.random() * 8000;
    }
    ship.z += ship.zVelocity;
    ship.zVelocity *= 0.995;
    if (ship.z > 1) { ship.z = 1; ship.zVelocity *= -1; }
    if (ship.z < -1) { ship.z = -1; ship.zVelocity *= -1; }

    // Blink and fire cooldowns
    if (ship.isBlinking > 0) ship.isBlinking--;
    if (ship.fireCooldown > 0) ship.fireCooldown -= deltaTime;

    this.updateReloadTimer(ship, deltaTime, audioService);

    // Blue ship blink ability
    if (ship.color === 'Blue') {
      ship.blinkTimer -= deltaTime;
      if (ship.blinkTimer <= 0 && (ship.state === 'idle' || ship.state === 'hunting')) {
        callbacks.performBlink(ship);
      }
    }

    // Red ship afterburner
    if (ship.color === 'Red' && ship.afterburnerTimer > 0) {
      ship.afterburnerTimer--;
      const afterburnerThrust = ship.velocity.clone().normalize().multiply(0.3);
      ship.acceleration.add(afterburnerThrust);
      if (Math.random() < 0.8) callbacks.createAfterburnerParticle(ship);
    }

    let asteroidTarget: Asteroid | null = null;
    let predictedAsteroidPosition: Vector2D | null = null;

    // State-specific logic
    if (ship.state === 'controlled') {
      callbacks.applyManualControls(ship, deltaTime);
    } else if (context.gameMode === 'asteroid_event') {
      this.handleAsteroidEventMode(
        ship,
        context,
        callbacks,
        utils,
        audioService,
        deltaTime
      );
      // Get the targets calculated in handleAsteroidEventMode
      const targets = this.calculateAsteroidTargets(ship, context.asteroids);
      asteroidTarget = targets.asteroidTarget;
      predictedAsteroidPosition = targets.predictedPosition;
    } else {
      // Normal mode logic
      this.handleNormalMode(ship, context, callbacks, deltaTime);
    }

    // Shared state logic (orbiting, launched, forming)
    this.handleSharedStates(ship, context, callbacks);

    // Mouse interaction (attracting/repelling when not in special states)
    this.handleMouseInteraction(ship, context);

    // Apply velocity and acceleration (for non-orbiting, non-celebrating, non-paralyzed ships)
    if (ship.state !== 'orbiting' && ship.state !== 'celebrating' && ship.state !== 'paralyzed') {
      ship.velocity.add(ship.acceleration);
      
      // Nebula slowdown
      context.nebulas.forEach(nebula => {
        if (Vector2D.distance(ship.position, nebula.position) < nebula.radius) {
          ship.velocity.multiply(0.96);
        }
      });

      // Speed limiting
      if (ship.state !== 'launched') {
        let personalitySpeedMod = 1.0;
        if (ship.personality === 'aggressive') personalitySpeedMod = 1.15;
        if (ship.personality === 'timid') personalitySpeedMod = 0.9;
        const baseMaxSpeed = (context.gameMode === 'normal' && ship.state === 'hunting') ? 2.5 : 1.5;
        const maxSpeed = (baseMaxSpeed + ship.speedBonus) * personalitySpeedMod;
        if (ship.velocity.magnitude() > maxSpeed) {
          ship.velocity.normalize().multiply(maxSpeed);
        }
      }
      ship.position.add(ship.velocity);
      ship.acceleration.multiply(0);
    }

    // Rotation logic
    if (ship.state !== 'orbiting' && ship.state !== 'celebrating' && ship.state !== 'paralyzed') {
      if (context.gameMode === 'asteroid_event' && asteroidTarget && predictedAsteroidPosition) {
        const targetAngle = Math.atan2(
          predictedAsteroidPosition.y - ship.position.y,
          predictedAsteroidPosition.x - ship.position.x
        );
        ship.rotation = utils.lerpAngle(ship.rotation, targetAngle, ship.rotationSpeed);
      } else if (ship.velocity.magnitude() > 0.1) {
        const targetAngle = Math.atan2(ship.velocity.y, ship.velocity.x);
        ship.rotation = utils.lerpAngle(ship.rotation, targetAngle, 0.15);
      }
    }

    // World wrapping and tail management
    this.handleWorldWrapping(ship, context.worldWidth, context.worldHeight, TAIL_LENGTH);
  }

  private static updateReloadTimer(ship: Ship, deltaTime: number, audioService: AudioService): void {
    if (ship.reloadTimer > 0) {
      ship.reloadTimer -= deltaTime;
      if (ship.reloadTimer <= 0) {
        ship.ammo = ship.maxAmmo;
        ship.reloadTimer = 0;
        audioService.playSound('reload');
      }
    }
  }

  private static handleAsteroidEventMode(
    ship: Ship,
    context: any,
    callbacks: any,
    utils: any,
    audioService: AudioService,
    deltaTime: number
  ): void {
    if (ship.state === 'paralyzed') {
      ship.paralyzeTimer -= deltaTime;
      if (ship.paralyzeTimer <= 0) {
        ship.state = callbacks.isShipCurrentlyControlled(ship) ? 'controlled' : 'idle';
      }
    } else if (ship.state !== 'orbiting' && ship.state !== 'launched') {
      let target: Vector2D | null = null;
      let isRescuing = false;
      
      if (ship.reloadTimer <= 0 && ship.ammo <= 0) {
        ship.reloadTimer = ship.reloadDuration;
      }

      // Priority 1: Rescue paralyzed allies
      const paralyzedAlly = context.ships.find((s: Ship) => s.id !== ship.id && s.state === 'paralyzed');
      if (paralyzedAlly) {
        target = paralyzedAlly.position;
        isRescuing = true;
        const dist = Vector2D.distance(ship.position, paralyzedAlly.position);
        if (dist < ship.radius + paralyzedAlly.radius) {
          if (ship.score > 0) {
            ship.score--;
            paralyzedAlly.state = callbacks.isShipCurrentlyControlled(paralyzedAlly) ? 'controlled' : 'idle';
            paralyzedAlly.paralyzeTimer = 0;
            callbacks.createStarExplosion(ship.position, 20);
            audioService.playSound('rescue');
            callbacks.enqueueRadioMessage(paralyzedAlly, 'rescue');
          }
        }
      } else if (context.asteroids.length > 0) {
        // Priority 2: Engage asteroids
        const asteroidTarget = context.asteroids.reduce((prev: Asteroid, curr: Asteroid) => {
          return Vector2D.distance(ship.position, curr.position) < 
                 Vector2D.distance(ship.position, prev.position) ? curr : prev;
        });

        if (asteroidTarget) {
          const predictedPosition = this.calculateInterceptionPoint(ship, asteroidTarget);
          
          // Calculate strategic strafing position
          const safeDistance = 200;
          const predictionTime = 30;
          const futureAsteroidPos = asteroidTarget.position.clone()
            .add(asteroidTarget.velocity.clone().multiply(predictionTime));
          const perpendicular = new Vector2D(-asteroidTarget.velocity.y, asteroidTarget.velocity.x).normalize();
          
          const pos1 = futureAsteroidPos.clone().add(perpendicular.clone().multiply(safeDistance));
          const pos2 = futureAsteroidPos.clone().subtract(perpendicular.clone().multiply(safeDistance));
          
          target = Vector2D.distance(ship.position, pos1) < Vector2D.distance(ship.position, pos2) ? pos1 : pos2;

          // Firing logic
          if (!isRescuing && ship.fireCooldown <= 0 && predictedPosition) {
            const distanceToTarget = Vector2D.distance(ship.position, asteroidTarget.position);
            const angleToTarget = Math.atan2(
              predictedPosition.y - ship.position.y,
              predictedPosition.x - ship.position.x
            );
            const angleDifference = Math.abs(utils.normalizeAngle(ship.rotation - angleToTarget));
            const firingArc = Math.PI / 12; // 15 degrees

            if (distanceToTarget < 400 && angleDifference < firingArc) {
              if (ship.ammo > 0 && ship.reloadTimer <= 0) {
                callbacks.fireProjectile(ship);
              } else if (ship.ammo <= 0) {
                audioService.playSound('empty');
                ship.fireCooldown = 500;
              }
            }
          }
        }
      }

      // Apply seeking force towards target
      if (target) {
        const direction = target.clone().subtract(ship.position).normalize();
        ship.acceleration.add(direction.multiply(0.08));
      }

      // Apply avoidance force for all nearby asteroids
      const avoidanceRadius = 150;
      context.asteroids.forEach((asteroid: Asteroid) => {
        const dist = Vector2D.distance(ship.position, asteroid.position);
        if (dist > 0 && dist < avoidanceRadius) {
          const repulsion = ship.position.clone().subtract(asteroid.position);
          const strength = (1 - dist / avoidanceRadius) * 0.4;
          repulsion.normalize().multiply(strength);
          ship.acceleration.add(repulsion);
        }
      });
    }
  }

  private static calculateInterceptionPoint(ship: Ship, asteroidTarget: Asteroid): Vector2D | null {
    // Analytical solution for interception point
    const projectileBaseSpeed = 8;
    const S_rel = asteroidTarget.position.clone().subtract(ship.position);
    const V_rel = asteroidTarget.velocity.clone().subtract(ship.velocity.clone().multiply(0.5));
    
    const a = (V_rel.x * V_rel.x + V_rel.y * V_rel.y) - (projectileBaseSpeed * projectileBaseSpeed);
    const b = 2 * (V_rel.x * S_rel.x + V_rel.y * S_rel.y);
    const c = S_rel.x * S_rel.x + S_rel.y * S_rel.y;
    
    const discriminant = b * b - 4 * a * c;
    
    let timeToIntercept = -1;
    if (discriminant >= 0) {
      const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      
      if (t1 > 0 && t2 > 0) {
        timeToIntercept = Math.min(t1, t2);
      } else {
        timeToIntercept = Math.max(t1, t2);
      }
    }
    
    if (timeToIntercept > 0) {
      return asteroidTarget.position.clone().add(asteroidTarget.velocity.clone().multiply(timeToIntercept));
    } else {
      return asteroidTarget.position.clone();
    }
  }

  private static calculateAsteroidTargets(ship: Ship, asteroids: Asteroid[]): {
    asteroidTarget: Asteroid | null;
    predictedPosition: Vector2D | null;
  } {
    if (asteroids.length === 0) {
      return { asteroidTarget: null, predictedPosition: null };
    }

    const asteroidTarget = asteroids.reduce((prev, curr) => {
      return Vector2D.distance(ship.position, curr.position) < 
             Vector2D.distance(ship.position, prev.position) ? curr : prev;
    });

    const predictedPosition = this.calculateInterceptionPoint(ship, asteroidTarget);
    
    return { asteroidTarget, predictedPosition };
  }

  private static handleNormalMode(
    ship: Ship,
    context: any,
    callbacks: any,
    deltaTime: number
  ): void {
    switch (ship.state) {
      case 'idle':
        callbacks.applyPersonalityBehaviors(ship);
        break;
      case 'hunting':
        if (context.targetStar.exists && !context.targetStar.isDespawning) {
          const direction = context.targetStar.position.clone().subtract(ship.position).normalize();
          let huntStrength = 0.05;
          if (ship.color === 'Red') huntStrength = 0.07;
          ship.acceleration.add(direction.multiply(huntStrength));
        }
        break;
      case 'celebrating':
        callbacks.performCelebration(ship);
        ship.celebrationTimer -= deltaTime;
        if (ship.celebrationTimer <= 0 && !callbacks.isShipCurrentlyControlled(ship)) {
          ship.state = 'idle';
        }
        break;
    }
  }

  private static handleSharedStates(
    ship: Ship,
    context: any,
    callbacks: any
  ): void {
    if (ship.state === 'orbiting') {
      if (context.mouse.isDown && context.mouseInteractionEnabled) {
        ship.orbitalSpeed = Math.min(0.3, ship.orbitalSpeed + 0.003);
      } else {
        ship.orbitalSpeed = Math.max(0.05, ship.orbitalSpeed - 0.005);
      }
      ship.orbitAngle += ship.orbitalSpeed;
      ship.position.x = context.mouse.pos.x + context.mouse.orbitRadius * Math.cos(ship.orbitAngle);
      ship.position.y = context.mouse.pos.y + context.mouse.orbitRadius * Math.sin(ship.orbitAngle);
      ship.velocity = new Vector2D();
    } else if (ship.state === 'launched') {
      ship.velocity.multiply(0.98); // Friction
      const returnSpeed = context.gameMode === 'normal' && context.targetStar.exists ? 1.5 : 0.8;
      if (ship.velocity.magnitude() < returnSpeed) {
        ship.state = (context.gameMode === 'normal' && context.targetStar.exists) ? 'hunting' : 'idle';
      }
    } else if (ship.state === 'forming') {
      const target = context.formationAssignments.get(ship.id);
      if (target) {
        const dir = target.clone().subtract(ship.position);
        const dist = dir.magnitude();
        
        if (dist > 5) {
          dir.normalize().multiply(0.5); // Move speed
          ship.velocity.add(dir);
          ship.velocity.multiply(0.9); // Damping
        } else {
          ship.velocity.multiply(0.5); // Slow down when close
          ship.position.x = target.x;
          ship.position.y = target.y;
        }
      }
    }
  }

  private static handleMouseInteraction(ship: Ship, context: any): void {
    if (ship.state !== 'orbiting' && ship.state !== 'celebrating' && ship.state !== 'paralyzed' && ship.state !== 'controlled') {
      if (context.mouseInteractionEnabled && ship.state !== 'launched') {
        const distToMouse = Vector2D.distance(ship.position, context.mouse.pos);
        if (distToMouse < context.mouse.orbitRadius) {
          ship.state = 'orbiting';
          ship.orbitAngle = Math.atan2(
            ship.position.y - context.mouse.pos.y,
            ship.position.x - context.mouse.pos.x
          );
        } else if (distToMouse < context.mouse.orbitRadius * 4) {
          const pull = context.mouse.pos.clone().subtract(ship.position)
            .normalize().multiply(200 / (distToMouse * distToMouse));
          ship.acceleration.add(pull);
        }
      } else if (!context.mouseInteractionEnabled) {
        const distToMouse = Vector2D.distance(ship.position, context.mouse.pos);
        const repulsionRadius = context.mouse.orbitRadius * 4;
        if (distToMouse > 0 && distToMouse < repulsionRadius) {
          const push = ship.position.clone().subtract(context.mouse.pos)
            .normalize().multiply((1 - distToMouse / repulsionRadius) * 0.4);
          ship.acceleration.add(push);
        }
      }
    }
  }

  private static handleWorldWrapping(ship: Ship, worldWidth: number, worldHeight: number, tailLength: number): void {
    const w = worldWidth;
    const h = worldHeight;
    let wrapped = false;
    
    if (ship.position.x < 0) { ship.position.x = w; wrapped = true; }
    if (ship.position.x > w) { ship.position.x = 0; wrapped = true; }
    if (ship.position.y < 0) { ship.position.y = h; wrapped = true; }
    if (ship.position.y > h) { ship.position.y = 0; wrapped = true; }
    
    if (wrapped) {
      ship.tail = [];
    } else {
      ship.tail.push(ship.position.clone());
      if (ship.tail.length > tailLength) ship.tail.shift();
    }
  }
}
