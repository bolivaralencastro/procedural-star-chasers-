import type { StarChasersEngine } from '../core/star-chasers.engine';
import { renderGame } from './rendering-adapter';

/**
 * Rendering seam: the engine only knows this interface. Swapping Canvas 2D
 * for WebGL/PixiJS later means adding a new implementation here — the game
 * logic never changes.
 */
export interface Renderer {
  render(engine: StarChasersEngine): void;
}

export class Canvas2DRenderer implements Renderer {
  render(engine: StarChasersEngine): void {
    renderGame(engine);
  }
}
