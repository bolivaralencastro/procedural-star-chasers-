import { Vector2D } from '../../models/vector2d';
import { BackgroundStar } from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';

export interface CanvasSetup {
  renderScale: number;
  worldWidth: number;
  worldHeight: number;
  isMobile: boolean;
}

export class CanvasManager {
  static setupCanvas(canvas: HTMLCanvasElement): CanvasSetup {
    // Mobile check for scaling
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (window.innerWidth < 800 && 'ontouchstart' in window);
    const renderScale = isMobile ? 0.6 : 1.0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const worldWidth = window.innerWidth / renderScale;
    const worldHeight = window.innerHeight / renderScale;

    return {
      renderScale,
      worldWidth,
      worldHeight,
      isMobile,
    };
  }

  static createBackgroundStars(count: number, worldWidth: number, worldHeight: number): BackgroundStar[] {
    const stars: BackgroundStar[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        pos: new Vector2D(Math.random() * worldWidth, Math.random() * worldHeight),
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.1,
        twinkleSpeed: Math.random() * 0.02,
        color:
          Math.random() > 0.9
            ? Math.random() > 0.5
              ? 'rgba(173, 216, 230, 0.8)'
              : 'rgba(255, 255, 224, 0.8)'
            : 'rgba(255, 255, 255, 0.7)',
      });
    }
    return stars;
  }

  static scaleMousePosition(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    renderScale: number
  ): Vector2D {
    return new Vector2D(
      (clientX - canvasRect.left) / renderScale,
      (clientY - canvasRect.top) / renderScale
    );
  }
}
