import { Vector2D } from '../../models/vector2d';
import { RadioBubble, ScoreTooltip } from '../../models/game-entities';
import { Ship } from '../../models/ship';
import { RadioChatterService, RadioContext } from '../../services/radio-chatter.service';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for managing radio chatter and communication between ships
 */
export class RadioManager {
  /**
   * Attempts to enqueue a radio message for a ship
   */
  static enqueueRadioMessage(
    ship: Ship,
    context: RadioContext,
    radioBubbles: RadioBubble[],
    scoreTooltips: ScoreTooltip[],
    globalChatterCooldownUntil: number,
    starCaptureLockUntil: number,
    shipChatterAvailableAt: Map<number, number>,
    radioService: RadioChatterService,
    wrapTextFn: (text: string, maxWidth: number) => string[]
  ): { success: boolean; newGlobalCooldown: number; newStarCaptureLock: number; newShipDelay: number } {
    const now = Date.now();
    const isStarCapture = context === 'star_capture';
    
    if (scoreTooltips.length > 0) {
      return {
        success: false,
        newGlobalCooldown: globalChatterCooldownUntil,
        newStarCaptureLock: starCaptureLockUntil,
        newShipDelay: shipChatterAvailableAt.get(ship.id) ?? 0
      };
    }
    
    if (!isStarCapture && now < starCaptureLockUntil) {
      return {
        success: false,
        newGlobalCooldown: globalChatterCooldownUntil,
        newStarCaptureLock: starCaptureLockUntil,
        newShipDelay: shipChatterAvailableAt.get(ship.id) ?? 0
      };
    }
    
    if (!isStarCapture && now < globalChatterCooldownUntil) {
      return {
        success: false,
        newGlobalCooldown: globalChatterCooldownUntil,
        newStarCaptureLock: starCaptureLockUntil,
        newShipDelay: shipChatterAvailableAt.get(ship.id) ?? 0
      };
    }

    const shipAvailableAt = shipChatterAvailableAt.get(ship.id) ?? 0;
    if (!isStarCapture && now < shipAvailableAt) {
      return {
        success: false,
        newGlobalCooldown: globalChatterCooldownUntil,
        newStarCaptureLock: starCaptureLockUntil,
        newShipDelay: shipAvailableAt
      };
    }

    const line = radioService.takeLine(ship.color, context);
    if (!line) {
      return {
        success: false,
        newGlobalCooldown: globalChatterCooldownUntil,
        newStarCaptureLock: starCaptureLockUntil,
        newShipDelay: shipAvailableAt
      };
    }

    const bubbleLife = Math.round(radioService.getMessageDuration() / 16.67);
    radioBubbles.push({
      shipId: ship.id,
      textLines: wrapTextFn(line, 240),
      position: ship.position.clone(),
      life: bubbleLife,
      maxLife: bubbleLife,
      color: ship.hexColor,
      context,
    });

    const newGlobalCooldown = now + radioService.getGlobalCooldown();
    const newShipDelay = now + this.getShipChatterDelay();
    let newStarCaptureLock = starCaptureLockUntil;
    
    if (isStarCapture) {
      newStarCaptureLock = now + radioService.getMessageDuration();
      // Filter bubbles to only keep star_capture ones
      radioBubbles.length = 0;
      radioBubbles.push({
        shipId: ship.id,
        textLines: wrapTextFn(line, 240),
        position: ship.position.clone(),
        life: bubbleLife,
        maxLife: bubbleLife,
        color: ship.hexColor,
        context,
      });
    }
    
    return {
      success: true,
      newGlobalCooldown,
      newStarCaptureLock,
      newShipDelay
    };
  }

  /**
   * Updates radio bubble positions and lifetimes
   */
  static updateRadioBubbles(radioBubbles: RadioBubble[], ships: Ship[]): void {
    for (let i = radioBubbles.length - 1; i >= 0; i--) {
      const bubble = radioBubbles[i];
      bubble.life--;
      if (bubble.life <= 0) {
        radioBubbles.splice(i, 1);
        continue;
      }

      const ship = ships.find(c => c.id === bubble.shipId);
      if (ship) {
        bubble.position.x = ship.position.x;
        bubble.position.y = ship.position.y - ship.radius - 55;
      }
    }
  }

  /**
   * Checks if proximity chatter should be triggered between two ships
   */
  static maybeTriggerProximityChatter(
    shipA: Ship,
    shipB: Ship,
    distance: number,
    combinedRadius: number,
    proximityCooldowns: Map<string, number>,
    enqueueFn: (ship: Ship, context: RadioContext) => boolean
  ): void {
    const proximityRadius = combinedRadius + 80;
    if (distance > proximityRadius) return;

    const pairKey = shipA.id < shipB.id ? `${shipA.id}-${shipB.id}` : `${shipB.id}-${shipA.id}`;
    const now = Date.now();
    const availableAt = proximityCooldowns.get(pairKey) ?? 0;
    if (now < availableAt) return;

    const speaker = Math.random() > 0.5 ? shipA : shipB;
    const emitted = enqueueFn(speaker, 'proximity');
    if (emitted) {
      proximityCooldowns.set(pairKey, now + 8000 + Math.random() * 7000);
    }
  }

  /**
   * Checks if philosophical chatter should be triggered
   */
  static maybePhilosophicalChatter(
    ships: Ship[],
    philosophicalChatterNextTime: number,
    enqueueFn: (ship: Ship, context: RadioContext) => boolean,
    getRandomShipFn: () => Ship | null
  ): number {
    const now = Date.now();
    if (now < philosophicalChatterNextTime) {
      return philosophicalChatterNextTime;
    }

    // Only trigger philosophical chatter when ships are mostly idle
    const activeShips = ships.filter(s => s.state === 'idle' || s.state === 'hunting');
    if (activeShips.length < ships.length * 0.7) {
      return philosophicalChatterNextTime;
    }

    const randomShip = getRandomShipFn();
    if (!randomShip) {
      return philosophicalChatterNextTime;
    }

    const emitted = enqueueFn(randomShip, 'philosophical');
    if (emitted) {
      // Set next philosophical chatter time (random between 15-25 minutes)
      return now + 900000 + Math.random() * 600000;
    }
    
    return philosophicalChatterNextTime;
  }

  private static getShipChatterDelay(): number {
    const [min, max] = GAME_CONSTANTS.SHIP_CHATTER_DELAY_RANGE;
    return min + Math.random() * (max - min);
  }
}
