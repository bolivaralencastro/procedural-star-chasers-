import { Vector2D } from '../entities/vector2d';
import { Ship } from '../entities/ship';
import { PERSONALITIES, ShipPersonality } from '../entities/ship-personas';
import { GAME_CONSTANTS } from '../core/game-constants';
import { MouseState } from '../input/input-manager';
import { IntentManager } from './intent-manager';
import { Nebula } from '../entities/game-entities';

/**
 * Helper class for managing ship behaviors and personalities
 */
export class ShipBehaviorManager {
  /**
   * Applies a specific personality/intent to a ship, wiring up any state the
   * behaviour needs (e.g. a patrol target).
   */
  static setPersonality(ship: Ship, personality: ShipPersonality, worldWidth: number, worldHeight: number): void {
    ship.personality = personality;
    if (personality === 'patroller') {
      ship.patrolTarget = new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight);
    } else {
      ship.patrolTarget = undefined;
    }
  }

  /**
   * Switches a ship to a new random personality (kept for callers that want a
   * pure shuffle; the intent engine drives normal selection).
   */
  static switchPersonality(ship: Ship, worldWidth: number, worldHeight: number): void {
    let next = ship.personality;
    while (next === ship.personality) {
      next = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    }
    ship.personalityTimer = 15000 + Math.random() * 15000;
    this.setPersonality(ship, next, worldWidth, worldHeight);
  }

  /**
   * Intent engine tick: evolves the ship's drives and, on its own cadence,
   * re-picks an intent (personality) weighted by those drives and its persona.
   * Runs every frame; internally gated by `intentTimer`.
   */
  static updateIntent(ship: Ship, ships: Ship[], worldWidth: number, worldHeight: number, deltaTime: number): void {
    ship.intentTimer -= deltaTime;
    if (ship.intentTimer > 0) {
      return;
    }
    ship.intentTimer = IntentManager.nextIntentDelay();

    const active =
      ship.state === 'hunting' ||
      ship.state === 'celebrating' ||
      ship.state === 'launched' ||
      ship.state === 'orbiting';

    let nearest = Infinity;
    for (const other of ships) {
      if (other.id === ship.id) continue;
      const d = Vector2D.distance(ship.position, other.position);
      if (d < nearest) nearest = d;
    }
    const isolated = nearest > 400;

    ship.drives = IntentManager.stepDrives(ship.drives, active, isolated);
    const scores = IntentManager.scoreIntents(ship.drives, ship.color);
    const next = IntentManager.pickIntent(scores, ship.personality);
    this.setPersonality(ship, next, worldWidth, worldHeight);
  }

  /**
   * Applies personality-based behaviors to a ship
   */
  static applyPersonalityBehaviors(ship: Ship, ships: Ship[], worldWidth: number, worldHeight: number): void {
    switch (ship.personality) {
      case 'aggressive':
        this.applyAggressiveBehavior(ship, ships);
        break;
      case 'timid':
        this.applyTimidBehavior(ship, ships);
        break;
      case 'loner':
        this.applyLonerBehavior(ship, ships, worldWidth, worldHeight);
        break;
      case 'patroller':
        this.applyPatrollerBehavior(ship, worldWidth, worldHeight);
        break;
      default: // explorer
        this.applyExplorerBehavior(ship);
        break;
    }
  }

  /**
   * Per-persona idle "ritual": a small, characterful flourish that makes each
   * ship read as an individual even when nothing is happening. Reuses existing
   * systems so it costs almost nothing:
   *   - Faísca (Red)   → occasional afterburner speed-lap
   *   - Folhagem (Green) → drifts over to tend the nearest nebula
   *   - Cobalto (Blue) → pauses to scan, sweeping its heading
   */
  static performIdleRitual(ship: Ship, nebulas: Nebula[]): void {
    switch (ship.color) {
      case 'Red':
        if (ship.afterburnerTimer <= 0 && Math.random() < 0.004) {
          ship.afterburnerTimer = 30; // ~0.5s burst; existing logic draws the trail
        }
        break;
      case 'Green': {
        if (nebulas.length === 0) break;
        let nearest = nebulas[0];
        let best = Infinity;
        for (const n of nebulas) {
          const d = Vector2D.distance(ship.position, n.position);
          if (d < best) {
            best = d;
            nearest = n;
          }
        }
        if (best > nearest.radius) {
          const dir = nearest.position.clone().subtract(ship.position).normalize();
          ship.acceleration.add(dir.multiply(0.02));
        }
        break;
      }
      case 'Blue':
        if (Math.random() < 0.004) {
          ship.velocity.multiply(0.4); // brief pause…
        }
        if (ship.velocity.magnitude() < 0.3) {
          ship.rotation += 0.03; // …then sweep its heading like a scanner
        }
        break;
    }
  }

  private static applyAggressiveBehavior(ship: Ship, ships: Ship[]): void {
    let nearestShip: Ship | null = null;
    let minDist = Infinity;
    ships.forEach(other => {
      if (ship.id === other.id) return;
      const d = Vector2D.distance(ship.position, other.position);
      if (d < minDist) {
        minDist = d;
        nearestShip = other;
      }
    });
    if (nearestShip) {
      const direction = nearestShip.position.clone().subtract(ship.position).normalize();
      ship.acceleration.add(direction.multiply(0.04));
    }
  }

  private static applyTimidBehavior(ship: Ship, ships: Ship[]): void {
    const fleeRadius = 250;
    ships.forEach(other => {
      if (ship.id === other.id) return;
      const dist = Vector2D.distance(ship.position, other.position);
      if (dist > 0 && dist < fleeRadius) {
        const repulsion = ship.position.clone().subtract(other.position);
        const strength = (1 - dist / fleeRadius) * 0.1;
        repulsion.normalize().multiply(strength);
        ship.acceleration.add(repulsion);
      }
    });
  }

  private static applyLonerBehavior(ship: Ship, ships: Ship[], worldWidth: number, worldHeight: number): void {
    const w = worldWidth;
    const h = worldHeight;
    const quadrants = [
      { x: 0, y: 0, count: 0 }, { x: w / 2, y: 0, count: 0 },
      { x: 0, y: h / 2, count: 0 }, { x: w / 2, y: h / 2, count: 0 }
    ];
    ships.forEach(c => {
      if (c.position.x < w / 2 && c.position.y < h / 2) quadrants[0].count++;
      else if (c.position.x >= w / 2 && c.position.y < h / 2) quadrants[1].count++;
      else if (c.position.x < w / 2 && c.position.y >= h / 2) quadrants[2].count++;
      else quadrants[3].count++;
    });
    quadrants.sort((a, b) => a.count - b.count);
    const targetQuadrant = quadrants[0];
    const targetPos = new Vector2D(targetQuadrant.x + w / 4, targetQuadrant.y + h / 4);
    const direction = targetPos.subtract(ship.position).normalize();
    ship.acceleration.add(direction.multiply(0.03));
  }

  private static applyPatrollerBehavior(ship: Ship, worldWidth: number, worldHeight: number): void {
    if (!ship.patrolTarget || Vector2D.distance(ship.position, ship.patrolTarget) < 100) {
      ship.patrolTarget = new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight);
    }
    const direction = ship.patrolTarget.clone().subtract(ship.position).normalize();
    ship.acceleration.add(direction.multiply(0.05));
  }

  private static applyExplorerBehavior(ship: Ship): void {
    const randomAngle = (Math.random() - 0.5) * 0.1;
    const newVelX = Math.cos(randomAngle) * ship.velocity.x - Math.sin(randomAngle) * ship.velocity.y;
    const newVelY = Math.sin(randomAngle) * ship.velocity.x + Math.cos(randomAngle) * ship.velocity.y;
    ship.velocity.x = newVelX;
    ship.velocity.y = newVelY;
    let idleSpeed = 0.8 + ship.speedBonus * 0.5;
    if (ship.color === 'Blue') idleSpeed *= 1.25; // Blue ships are faster
    ship.velocity.normalize().multiply(idleSpeed);
  }

  /**
   * Personality-flavoured ambient reaction to the visitor's cursor.
   *
   * The existing mouse logic already owns close range (orbit at ~60px, strong
   * pull/repel out to ~240px). This adds a gentle drift in the *medium* band
   * [240, 600] so the ships visibly acknowledge the visitor's presence without
   * overriding star-hunting:
   *   - aggressive personality → investigates (drifts toward the cursor)
   *   - timid personality      → shies away
   *   - loner personality      → keeps a mild distance
   *   - Folhagem (Green)       → curious: hovers at a respectful standoff
   *
   * Returns true when the ship is "noticing" the cursor (for sparse chatter).
   * No-op on mobile (no persistent pointer) or before the pointer is on-canvas.
   */
  static applyCursorPerception(ship: Ship, mouse: MouseState, isMobile: boolean): boolean {
    if (isMobile || mouse.screenPos.x < 0 || mouse.screenPos.y < 0) {
      return false;
    }

    const inner = GAME_CONSTANTS.MOUSE_ORBIT_RADIUS * 4; // 240 — existing pull owns closer
    const outer = GAME_CONSTANTS.MOUSE_ORBIT_RADIUS * 10; // 600 — edge of awareness
    const dist = Vector2D.distance(ship.position, mouse.pos);
    if (dist <= 0 || dist > outer) {
      return false;
    }

    if (dist > inner) {
      const toCursor = mouse.pos.clone().subtract(ship.position).normalize();
      let strength = 0;
      switch (ship.personality) {
        case 'aggressive':
          strength = 0.018;
          break;
        case 'timid':
          strength = -0.016;
          break;
        case 'loner':
          strength = -0.008;
          break;
        default:
          if (ship.color === 'Green') {
            // Curiosity: approach from afar, but hold a gap once close.
            strength = dist > 320 ? 0.012 : -0.01;
          }
          break;
      }
      if (strength !== 0) {
        ship.acceleration.add(toCursor.multiply(strength));
      }
    }

    return dist < outer * 0.8;
  }

  /**
   * Performs celebration animation based on ship color
   */
  static performCelebration(ship: Ship): void {
    const progress = 1 - (ship.celebrationTimer / ship.celebrationDuration);
    const easeMultiplier = Math.sin(progress * Math.PI);
    
    switch (ship.color) {
      case 'Red': { // Zig-zag
        ship.velocity.multiply(0.9);
        const perp = new Vector2D(-ship.velocity.y, ship.velocity.x).normalize();
        if (Math.random() < 0.1) ship.zigZagDir *= -1;
        ship.acceleration.add(perp.multiply(0.5 * ship.zigZagDir * easeMultiplier));
        break;
      }
      case 'Green': { // Spiral
        const angle = (Date.now() / 200);
        const radius = 2 + 30 * easeMultiplier;
        ship.position.x += Math.cos(angle) * radius * 0.1;
        ship.position.y += Math.sin(angle) * radius * 0.1;
        ship.velocity.multiply(0.9);
        break;
      }
      case 'Blue': { // Loop
        const turn = new Vector2D(-ship.velocity.y, ship.velocity.x).normalize().multiply(0.3 * easeMultiplier);
        ship.acceleration.add(turn);
        break;
      }
    }
    ship.velocity.add(ship.acceleration);
    ship.velocity.normalize().multiply(3);
    ship.position.add(ship.velocity);
    ship.acceleration.multiply(0);
  }

  /**
   * Performs a blink/teleport for Blue ships
   */
  static performBlink(
    ship: Ship,
    targetStarExists: boolean,
    targetStarPosition: Vector2D,
    worldWidth: number,
    worldHeight: number
  ): Vector2D[] {
    const BLINK_DISTANCE = 150;
    const startPos = ship.position.clone();
    let direction: Vector2D;
    
    if (ship.state === 'hunting' && targetStarExists) {
      direction = targetStarPosition.clone().subtract(ship.position).normalize();
    } else {
      direction = ship.velocity.magnitude() > 0 
        ? ship.velocity.clone().normalize() 
        : new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    }
    
    const endPos = startPos.clone().add(direction.multiply(BLINK_DISTANCE));
    endPos.x = (endPos.x + worldWidth) % worldWidth;
    endPos.y = (endPos.y + worldHeight) % worldHeight;

    ship.position = endPos;
    ship.tail = [];
    ship.isBlinking = 15;
    ship.blinkTimer = ship.blinkCooldown + (Math.random() - 0.5) * 4000;
    
    // Return positions for particle effects
    return [startPos, endPos];
  }
}
