import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { ConstellationService } from '../../services/constellation.service';

/**
 * Manages constellation formation mode
 */
export class ConstellationManager {
  /**
   * Toggles constellation mode on/off
   */
  static toggleConstellationMode(
    currentMode: boolean,
    ships: Ship[],
    formationAssignments: Map<number, Vector2D>,
    worldWidth: number,
    worldHeight: number,
    constellationService: ConstellationService
  ): {
    newMode: boolean;
    formationAssignments: Map<number, Vector2D>;
  } {
    const newMode = !currentMode;
    
    if (newMode) {
      // Assign ships to formation
      const pattern = constellationService.getPattern('heart');
      // Center the pattern on screen
      const center = new Vector2D(worldWidth / 2, worldHeight / 2);
      const centeredPattern = pattern.map(p => p.clone().add(center));
      
      const newAssignments = constellationService.assignShipsToPattern(ships, centeredPattern);
      
      // Set ships to forming state
      ships.forEach(ship => {
        if (newAssignments.has(ship.id)) {
          ship.state = 'forming';
        }
      });
      
      return {
        newMode,
        formationAssignments: newAssignments,
      };
    } else {
      // Release ships
      ships.forEach(ship => {
        if (ship.state === 'forming') {
          ship.state = 'idle';
        }
      });
      
      return {
        newMode,
        formationAssignments: new Map<number, Vector2D>(),
      };
    }
  }

  /**
   * Assigns constellation formation to ships
   */
  static assignConstellationFormation(
    ships: Ship[],
    targetStar: { exists: boolean; position: Vector2D },
    formationAssignments: Map<number, Vector2D>,
    worldWidth: number,
    worldHeight: number,
    mouse: { x: number; y: number },
    constellationService: ConstellationService
  ): void {
    const pattern = constellationService.getPattern('heart');
    const center = new Vector2D(worldWidth / 2, worldHeight / 2);
    const centeredPattern = pattern.map(p => p.clone().add(center));
    
    const newAssignments = constellationService.assignShipsToPattern(ships, centeredPattern);
    
    formationAssignments.clear();
    newAssignments.forEach((value, key) => {
      formationAssignments.set(key, value);
    });
    
    ships.forEach(ship => {
      if (newAssignments.has(ship.id)) {
        ship.state = 'forming';
      }
    });
  }

  /**
   * Draws constellation lines between ships
   */
  static drawConstellation(
    ctx: CanvasRenderingContext2D,
    ships: Ship[],
    formationAssignments: Map<number, Vector2D>
  ): void {
    if (formationAssignments.size === 0) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    
    const positions: Vector2D[] = [];
    ships.forEach(ship => {
      if (formationAssignments.has(ship.id)) {
        positions.push(ship.position);
      }
    });
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[j].x, positions[j].y);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
}
