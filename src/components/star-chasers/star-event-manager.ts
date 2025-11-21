import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { TargetStar, Nebula, ScoreTooltip, Particle, Asteroid } from '../../models/game-entities';
import { RadioContext } from '../../services/radio-chatter.service';
import { AudioService } from '../../services/audio.service';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Manages star capture, events, and related game state
 */
export class StarEventManager {
  /**
   * Handles star capture by a ship
   */
  static captureStar(
    winner: Ship,
    targetStar: TargetStar,
    ships: Ship[],
    context: {
      starParticles: Particle[];
      scoreTooltips: ScoreTooltip[];
      nebulas: Nebula[];
      SPEED_INCREMENT_PER_STAR: number;
      MAX_SPEED_BONUS: number;
    },
    callbacks: {
      createStarExplosion: (position: Vector2D, count?: number) => void;
      createNebula: (position: Vector2D) => void;
      createScoreTooltip: (ship: Ship) => void;
      enqueueRadioMessage: (ship: Ship, context: RadioContext) => boolean;
      scheduleNextStar: () => void;
      isShipCurrentlyControlled: (ship: Ship) => boolean;
    },
    audioService: AudioService
  ): void {
    winner.score++;
    winner.speedBonus = Math.min(
      winner.speedBonus + context.SPEED_INCREMENT_PER_STAR,
      context.MAX_SPEED_BONUS
    );
    
    callbacks.createStarExplosion(targetStar.position.clone());
    audioService.playSound('blink');

    if (winner.color === 'Green') {
      callbacks.createNebula(targetStar.position.clone());
    }

    targetStar.exists = false;
    context.starParticles.length = 0; // Clear particles
    
    if (!callbacks.isShipCurrentlyControlled(winner)) {
      winner.state = 'celebrating';
      winner.celebrationTimer = winner.celebrationDuration;
    }
    
    audioService.playSound('celebrate');
    callbacks.createScoreTooltip(winner);
    callbacks.enqueueRadioMessage(winner, 'star_capture');
    
    ships.forEach(c => {
      if (c.id !== winner.id && !callbacks.isShipCurrentlyControlled(c)) {
        c.state = 'idle';
      }
    });
    
    callbacks.scheduleNextStar();
  }

  /**
   * Creates a score tooltip for a ship
   */
  static createScoreTooltip(ship: Ship, scoreTooltips: ScoreTooltip[]): void {
    scoreTooltips.push({
      shipId: ship.id,
      text: `${ship.score}`,
      position: ship.position.clone(),
      life: 180,
      maxLife: 180
    });
  }

  /**
   * Updates all score tooltips
   */
  static updateScoreTooltips(scoreTooltips: ScoreTooltip[], ships: Ship[]): void {
    for (let i = scoreTooltips.length - 1; i >= 0; i--) {
      const tooltip = scoreTooltips[i];
      tooltip.life--;
      
      if (tooltip.life <= 0) {
        scoreTooltips.splice(i, 1);
        continue;
      }
      
      const ship = ships.find(c => c.id === tooltip.shipId);
      if (ship) {
        tooltip.position.x = ship.position.x;
        tooltip.position.y = ship.position.y - ship.radius - 25;
      }
    }
  }

  /**
   * Starts an asteroid event
   */
  static startAsteroidEvent(
    ships: Ship[],
    callbacks: {
      spawnAsteroid: (size: 'small' | 'medium' | 'large') => void;
      enqueueRadioMessage: (ship: Ship, context: RadioContext) => boolean;
      getRandomActiveShip: () => Ship | null;
      isShipCurrentlyControlled: (ship: Ship) => boolean;
    }
  ): void {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      callbacks.spawnAsteroid('large');
    }
    
    ships.forEach(s => {
      if (callbacks.isShipCurrentlyControlled(s)) {
        return;
      }
      s.state = 'idle';
    });
    
    const announcer = callbacks.getRandomActiveShip();
    if (announcer) {
      callbacks.enqueueRadioMessage(announcer, 'meteor_event');
    }
  }

  /**
   * Checks if star capture should occur for any ship
   */
  static checkStarCapture(
    ships: Ship[],
    targetStar: TargetStar,
    gameMode: 'normal' | 'asteroid_event',
    captureCallback: (winner: Ship) => void
  ): void {
    if (gameMode !== 'normal' || !targetStar.exists || targetStar.isDespawning) {
      return;
    }

    for (const ship of ships) {
      if (ship.state !== 'orbiting' && 
          Vector2D.distance(ship.position, targetStar.position) < ship.radius + targetStar.radius) {
        captureCallback(ship);
        break; // Only one ship can capture per frame
      }
    }
  }

  /**
   * Updates target star animation
   */
  static updateTargetStar(targetStar: TargetStar): void {
    targetStar.pulseAngle += 0.05;
    
    if (targetStar.isDespawning) {
      targetStar.opacity -= 0.02;
      if (targetStar.opacity <= 0) {
        targetStar.exists = false;
      }
    } else if (targetStar.opacity < 1) {
      targetStar.opacity += 0.02;
    }
    
    if (!targetStar.isDespawning && Date.now() > targetStar.spawnTime + targetStar.lifetime) {
      targetStar.isDespawning = true;
    }
  }

  /**
   * Draws star despawning effect
   */
  static drawStarDespawning(
    ctx: CanvasRenderingContext2D,
    targetStar: TargetStar
  ): void {
    if (!targetStar.isDespawning) return;
    
    ctx.save();
    ctx.globalAlpha = targetStar.opacity;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetStar.position.x, targetStar.position.y, targetStar.radius * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
