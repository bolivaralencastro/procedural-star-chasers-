import { WritableSignal } from '@angular/core';
import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { ControlKey } from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';

export interface MouseState {
  pos: Vector2D;
  isDown: boolean;
  orbitRadius: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export class InputManager {
  static normalizeControlKey(key: string): ControlKey | null {
    const normalized = key.toLowerCase();
    switch (normalized) {
      case 'arrowup':
        return 'up';
      case 'arrowdown':
        return 'down';
      case 'arrowleft':
        return 'left';
      case 'arrowright':
        return 'right';
      case ' ': // Space key returns a single space character
      case 'space':
      case 'spacebar':
        return 'space';
      case 'r':
        return 'reload';
      default:
        return null;
    }
  }

  static handleShipTap(
    mousePos: Vector2D,
    ships: Ship[],
    renderScale: number,
    onTapEffect: (position: Vector2D) => void
  ): void {
    // Check if the tap is on any ship
    for (const ship of ships) {
      const distance = Vector2D.distance(mousePos, ship.position);
      const radius = ship.radius * (1 + ship.z * 0.4); // Account for z-index scaling

      if (distance < radius) {
        // Tap is on a ship, increase its speed slightly
        const speedIncrease = 0.3;
        ship.velocity.normalize().multiply(ship.velocity.magnitude() + speedIncrease);

        // Add a visual effect to indicate the speed boost
        onTapEffect(ship.position);
        return; // Tap handled, don't do anything else
      }
    }
  }

  static showContextMenu(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    contextMenu: ContextMenuState
  ): ContextMenuState {
    const relativeX = clientX - canvasRect.left;
    const relativeY = clientY - canvasRect.top;

    const clampedX = Math.min(
      Math.max(0, relativeX),
      canvasRect.width - GAME_CONSTANTS.CONTEXT_MENU_WIDTH
    );
    const clampedY = Math.min(
      Math.max(0, relativeY),
      canvasRect.height - GAME_CONSTANTS.CONTEXT_MENU_HEIGHT
    );

    return {
      visible: true,
      x: clampedX,
      y: clampedY,
    };
  }

  static applyManualControls(
    ship: Ship,
    activeControlKeys: Set<ControlKey>,
    _deltaTime: number
  ): void {
    const thrust = 0.15;
    const manualAcceleration = new Vector2D();

    if (activeControlKeys.has('up')) manualAcceleration.y -= thrust;
    if (activeControlKeys.has('down')) manualAcceleration.y += thrust;
    if (activeControlKeys.has('left')) manualAcceleration.x -= thrust;
    if (activeControlKeys.has('right')) manualAcceleration.x += thrust;

    ship.acceleration.add(manualAcceleration);
    ship.velocity.multiply(0.995);
  }

  static handleManualFiring(
    activeControlKeys: Set<ControlKey>,
    ship: Ship,
    onFire: () => void,
    onStartReload: () => void
  ): void {
    const firingPressed = activeControlKeys.has('space');
    if (firingPressed && ship.fireCooldown <= 0 && ship.reloadTimer <= 0) {
      if (ship.ammo > 0) {
        onFire();
      } else {
        onStartReload();
      }
    }

    if (activeControlKeys.has('reload')) {
      onStartReload();
    }
  }

  static toggleShipControl(
    ships: Ship[],
    controlledShipId: number | null,
    activeControlKeys: Set<ControlKey>,
    mouseInteractionEnabled: WritableSignal<boolean>,
    mouseInteractionBeforeControl: boolean
  ): {
    controlledShipId: number | null;
    mouseInteractionBeforeControl: boolean;
  } {
    if (controlledShipId !== null) {
      const controlledShip = ships.find(ship => ship.id === controlledShipId);
      if (controlledShip && controlledShip.state === 'controlled') {
        controlledShip.state = 'idle';
      }
      activeControlKeys.clear();
      mouseInteractionEnabled.set(mouseInteractionBeforeControl);
      return {
        controlledShipId: null,
        mouseInteractionBeforeControl,
      };
    }

    const orbitingShips = ships.filter(ship => ship.state === 'orbiting');
    if (orbitingShips.length === 1) {
      const targetShip = orbitingShips[0];
      targetShip.state = 'controlled';
      targetShip.velocity.multiply(0);
      targetShip.acceleration.multiply(0);
      const newMouseInteractionBeforeControl = mouseInteractionEnabled();
      mouseInteractionEnabled.set(false);
      return {
        controlledShipId: targetShip.id,
        mouseInteractionBeforeControl: newMouseInteractionBeforeControl,
      };
    }

    return {
      controlledShipId,
      mouseInteractionBeforeControl,
    };
  }

  static startManualReload(ship: Ship | undefined): void {
    if (
      ship &&
      ship.reloadTimer <= 0 &&
      ship.ammo < ship.maxAmmo
    ) {
      ship.reloadTimer = ship.reloadDuration;
    }
  }

  static updateCursorVisibility(
    canvas: HTMLCanvasElement,
    controlledShipId: number | null
  ): void {
    canvas.style.cursor = controlledShipId !== null ? 'none' : 'default';
  }
}

