import { Vector2D } from './vector2d';
import { RadioContext } from '../services/radio-chatter.service';

export type ControlKey = 'up' | 'down' | 'left' | 'right' | 'space' | 'reload';

export interface Asteroid {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  size: 'large' | 'medium' | 'small';
  shape: Vector2D[]; // offsets from center
  rotation: number;
  rotationSpeed: number;
  justTeleported?: number;
}

export interface Projectile {
  position: Vector2D;
  velocity: Vector2D;
  life: number;
  color: string;
  ownerId: number;
  tail: Vector2D[];
  justTeleported?: number;
}

export interface BackgroundStar {
  pos: Vector2D;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  color: string;
}

export interface TargetStar {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  exists: boolean;
  isDespawning: boolean;
  pulseAngle: number;
  opacity: number;
  spawnTime: number;
  lifetime: number;
}

export interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ScoreTooltip {
  shipId: number;
  text: string;
  position: Vector2D;
  life: number;
  maxLife: number;
}

export interface RadioBubble {
  shipId: number;
  textLines: string[];
  position: Vector2D;
  life: number;
  maxLife: number;
  color: string;
  context: RadioContext;
}

export interface Nebula {
  position: Vector2D;
  radius: number;
  life: number;
  maxLife: number;
}

export interface WormholePair {
  entry: {
    position: Vector2D;
    radius: number;
    pulseAngle: number;
  };
  exit: {
    position: Vector2D;
    radius: number;
    pulseAngle: number;
  };
  life: number;
  maxLife: number;
}
