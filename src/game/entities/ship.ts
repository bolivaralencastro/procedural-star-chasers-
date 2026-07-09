import { ShipColor, ShipPersonality } from './ship-personas';
import { Vector2D } from './vector2d';

export type ShipState = 'idle' | 'hunting' | 'orbiting' | 'celebrating' | 'launched' | 'paralyzed' | 'controlled' | 'forming' | 'chasing';

export interface Ship {
  id: number;
  color: ShipColor;
  codename: string;
  hexColor: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  state: ShipState;
  score: number;
  speedBonus: number;
  orbitAngle: number;
  orbitalSpeed: number;
  celebrationTimer: number;
  celebrationDuration: number;
  zigZagDir: number;
  tail: Vector2D[];
  // 3D simulation properties
  z: number;
  zVelocity: number;
  zMoveTimer: number;
  // Abilities
  afterburnerTimer: number; // Red
  blinkCooldown: number; // Blue
  blinkTimer: number; // Blue
  isBlinking: number; // Blue
  // Personality Engine
  personality: ShipPersonality;
  personalityTimer: number;
  patrolTarget?: Vector2D;
  // Asteroid Event
  fireCooldown: number;
  paralyzeTimer: number;
  asteroidsDestroyed: number;
  ammo: number;
  maxAmmo: number;
  reloadTimer: number;
  reloadDuration: number;
  // Aiming
  rotation: number;
  rotationSpeed: number;
  justTeleported?: number;
  opacity: number;
}
