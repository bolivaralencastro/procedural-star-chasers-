import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import { MouseState, ContextMenuState } from './input-manager';
import { ControlKey, WormholePair } from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Manages UI event handlers and related state
 */
export class EventHandlersManager {
  /**
   * Updates mouse position during movement events and triggers the first interaction callback if needed.
   */
  static handleMouseMove(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    renderScale: number,
    mouse: MouseState,
    firstInteractionHandled: boolean,
    onFirstInteraction: () => void,
  ): boolean {
    const rect = canvas.getBoundingClientRect();
    mouse.pos.x = (event.clientX - rect.left) / renderScale;
    mouse.pos.y = (event.clientY - rect.top) / renderScale;

    if (!firstInteractionHandled) {
      onFirstInteraction();
      return true;
    }

    return firstInteractionHandled;
  }

  /**
   * Handles touch move interactions, keeping the long press timer in sync.
   */
  static handleTouchMove(
    event: TouchEvent,
    canvas: HTMLCanvasElement,
    renderScale: number,
    mouse: MouseState,
    touchStartPosition: Vector2D | null,
    longPressTimer: ReturnType<typeof setTimeout> | null,
    onCancelLongPress: () => void,
  ): ReturnType<typeof setTimeout> | null {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    mouse.pos.x = touchX / renderScale;
    mouse.pos.y = touchY / renderScale;

    if (
      longPressTimer &&
      this.shouldCancelLongPress(touchStartPosition, mouse.pos, renderScale)
    ) {
      onCancelLongPress();
      return null;
    }

    return longPressTimer;
  }

  /**
   * Handles mouse down interactions, including context menu logic and wormhole creation.
   */
  static handleMouseDown(
    event: MouseEvent,
    params: {
      contextMenu: ContextMenuState;
      contextMenuElement?: HTMLDivElement;
      mouseInteractionEnabled: boolean;
      wormhole: WormholePair | null;
      mouse: MouseState;
      onFirstInteraction: () => void;
      onShowContextMenu: (x: number, y: number) => ContextMenuState;
      onCloseContextMenu: () => void;
      onCreateWormhole: () => void;
    },
  ): { contextMenu: ContextMenuState; mouseIsDown: boolean } {
    if (event.button === 2) {
      event.preventDefault();
      return { contextMenu: params.onShowContextMenu(event.clientX, event.clientY), mouseIsDown: false };
    }

    if (params.contextMenu.visible) {
      const menuElement = params.contextMenuElement;
      const eventTarget = event.target as Node | null;
      if (!(menuElement && eventTarget && menuElement.contains(eventTarget))) {
        params.onCloseContextMenu();
      } else {
        return { contextMenu: params.contextMenu, mouseIsDown: false };
      }
    }

    params.onFirstInteraction();

    if (event.button === 0) {
      if (params.mouseInteractionEnabled) {
        return { contextMenu: params.contextMenu, mouseIsDown: true };
      }
      if (!params.wormhole) {
        params.onCreateWormhole();
      }
    }

    return { contextMenu: params.contextMenu, mouseIsDown: false };
  }

  /**
   * Handles touch start logic for mobile interactions.
   */
  static handleTouchStart(
    event: TouchEvent,
    params: {
      canvas: HTMLCanvasElement;
      renderScale: number;
      isMobile: boolean;
      mobileMenuVisible: boolean;
      contextMenu: ContextMenuState;
      mouseInteractionEnabled: boolean;
      mouse: MouseState;
      wormhole: WormholePair | null;
      onFirstInteraction: () => void;
      onCloseContextMenu: () => void;
      onCloseMobileMenu: () => void;
      onShowContextMenu: (x: number, y: number) => ContextMenuState;
      onCreateWormhole: () => void;
      onShipTap: () => void;
    },
  ): {
    contextMenu: ContextMenuState;
    mobileMenuVisible: boolean;
    mouseIsDown: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    touchStartPosition: Vector2D | null;
  } {
    if (!params.isMobile) {
      return {
        contextMenu: params.contextMenu,
        mobileMenuVisible: params.mobileMenuVisible,
        mouseIsDown: params.mouse.isDown,
        longPressTimer: null,
        touchStartPosition: null,
      };
    }

    params.onFirstInteraction();

    const rect = params.canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    params.mouse.pos.x = touchX / params.renderScale;
    params.mouse.pos.y = touchY / params.renderScale;

    if (params.mobileMenuVisible) {
      const menuElement = document.elementFromPoint(touch.clientX, touch.clientY);
      if (menuElement && (menuElement.closest('.mobile-menu') || menuElement.classList.contains('mobile-menu'))) {
        event.preventDefault();
        return {
          contextMenu: params.contextMenu,
          mobileMenuVisible: params.mobileMenuVisible,
          mouseIsDown: params.mouse.isDown,
          longPressTimer: null,
          touchStartPosition: null,
        };
      }

      params.onCloseMobileMenu();
      params.onShipTap();
      return {
        contextMenu: params.contextMenu,
        mobileMenuVisible: false,
        mouseIsDown: params.mouse.isDown,
        longPressTimer: null,
        touchStartPosition: null,
      };
    }

    if (!params.contextMenu.visible) {
      params.onShipTap();
    }

    if (params.mouseInteractionEnabled) {
      const { timer, startPosition } = this.setupLongPress(
        touch,
        rect,
        params.renderScale,
        GAME_CONSTANTS.LONG_PRESS_DURATION,
        (x, y) => {
          event.preventDefault();
          return params.onShowContextMenu(x, y);
        },
      );

      return {
        contextMenu: params.contextMenu,
        mobileMenuVisible: params.mobileMenuVisible,
        mouseIsDown: true,
        longPressTimer: timer,
        touchStartPosition: startPosition,
      };
    }

    if (!params.wormhole) {
      params.onCreateWormhole();
    }

    return {
      contextMenu: params.contextMenu,
      mobileMenuVisible: params.mobileMenuVisible,
      mouseIsDown: params.mouse.isDown,
      longPressTimer: null,
      touchStartPosition: null,
    };
  }
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
