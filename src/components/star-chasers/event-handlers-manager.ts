import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { MouseState, ContextMenuState } from './input-manager';
import { ControlKey } from '../../models/game-entities';

/**
 * Manages UI event handlers and related state
 */
export class EventHandlersManager {
  /**
   * Handles ship control toggle (P key)
   */
  static toggleShipControl(
    ships: Ship[],
    controlledShipId: number | null,
    mouseInteractionBeforeControl: boolean,
    mouseInteractionEnabled: boolean,
    callbacks: {
      setControlledShipId: (id: number | null) => void;
      setMouseInteractionBeforeControl: (value: boolean) => void;
      setMouseInteraction: (value: boolean) => void;
      updateCursorVisibility: () => void;
      triggerLaunchChatter: (ship: Ship) => void;
    }
  ): void {
    if (controlledShipId === null) {
      // Start controlling the first ship
      const targetShip = ships.find(s => s.id === 0);
      if (targetShip) {
        callbacks.setControlledShipId(targetShip.id);
        callbacks.setMouseInteractionBeforeControl(mouseInteractionEnabled);
        callbacks.setMouseInteraction(false);
        
        // Set ship state to controlled
        targetShip.state = 'controlled';
        targetShip.velocity = new Vector2D();
        targetShip.acceleration = new Vector2D();
        
        callbacks.updateCursorVisibility();
      }
    } else {
      // Stop controlling
      const controlledShip = ships.find(s => s.id === controlledShipId);
      if (controlledShip) {
        controlledShip.state = 'launched';
        callbacks.triggerLaunchChatter(controlledShip);
      }
      
      callbacks.setControlledShipId(null);
      callbacks.setMouseInteraction(mouseInteractionBeforeControl);
      callbacks.updateCursorVisibility();
    }
  }

  /**
   * Updates cursor visibility based on game state
   */
  static updateCursorVisibility(
    canvasElement: HTMLCanvasElement,
    controlledShipId: number | null
  ): void {
    if (controlledShipId !== null) {
      canvasElement.style.cursor = 'none';
    } else {
      canvasElement.style.cursor = 'default';
    }
  }

  /**
   * Handles context menu display
   */
  static showContextMenu(
    clientX: number,
    clientY: number,
    contextMenu: ContextMenuState,
    renderScale: number,
    worldWidth: number,
    worldHeight: number,
    CONTEXT_MENU_WIDTH: number,
    CONTEXT_MENU_HEIGHT: number
  ): ContextMenuState {
    let x = clientX;
    let y = clientY;
    
    // Ensure menu stays within bounds
    if (x + CONTEXT_MENU_WIDTH > worldWidth * renderScale) {
      x = worldWidth * renderScale - CONTEXT_MENU_WIDTH;
    }
    if (y + CONTEXT_MENU_HEIGHT > worldHeight * renderScale) {
      y = worldHeight * renderScale - CONTEXT_MENU_HEIGHT;
    }
    
    return { visible: true, x, y };
  }

  /**
   * Handles ship tap for mobile
   */
  static handleShipTap(
    mousePos: Vector2D,
    ships: Ship[],
    renderScale: number,
    onTapEffect: (position: Vector2D) => void
  ): void {
    // Check if the tap is on any ship
    for (const ship of ships) {
      const distance = Vector2D.distance(mousePos, ship.position);
      if (distance < ship.radius * 2 / renderScale) {
        onTapEffect(ship.position);
        break;
      }
    }
  }

  /**
   * Handles long press timer setup for mobile
   */
  static setupLongPress(
    touch: Touch,
    rect: DOMRect,
    renderScale: number,
    duration: number,
    onLongPress: (x: number, y: number) => void
  ): { timer: any; startPosition: Vector2D } {
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const touchPos = new Vector2D(touchX / renderScale, touchY / renderScale);
    
    const timer = setTimeout(() => {
      onLongPress(touch.clientX, touch.clientY);
    }, duration);
    
    return { timer, startPosition: touchPos };
  }

  /**
   * Checks if long press should be cancelled due to movement
   */
  static shouldCancelLongPress(
    touchStartPosition: Vector2D | null,
    currentPosition: Vector2D,
    renderScale: number,
    threshold: number = 10
  ): boolean {
    if (!touchStartPosition) return false;
    const dist = Vector2D.distance(touchStartPosition, currentPosition);
    return dist > threshold / renderScale;
  }
}
