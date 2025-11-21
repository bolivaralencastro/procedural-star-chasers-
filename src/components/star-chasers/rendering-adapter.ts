import { RenderingManager } from './rendering-manager';
import { ConstellationManager } from './constellation-manager';
import { StarEventManager } from './star-event-manager';
import type { StarChasersEngine } from './star-chasers.engine';
import type { Ship } from '../../models/ship';

export function renderGame(engine: StarChasersEngine) {
  const ctx = engine.ctx;
  if (!ctx) {
    return;
  }

  RenderingManager.drawScene(
    ctx,
    {
      backgroundStars: engine.backgroundStars,
      targetStar: engine.targetStar,
      ships: engine.ships,
      projectiles: engine.projectiles,
      particles: engine.starParticles,
      explosionParticles: engine.explosionParticles,
      scoreTooltips: engine.scoreTooltips,
      mouse: engine.mouse,
      wormhole: engine.wormhole,
      mobileMenuVisible: engine.mobileMenuVisible(),
      contextMenuVisible: engine.contextMenu.visible,
      isMobile: engine.isMobile(),
      renderScale: engine.renderScale,
      worldWidth: engine.worldWidth,
      worldHeight: engine.worldHeight,
      nebulas: engine.nebulas,
      asteroids: engine.asteroids,
      radioBubbles: engine.radioBubbles,
      constellationMode: engine.constellationMode,
      controlledShipId: engine.controlledShipId,
      mouseInteractionEnabled: engine.mouseInteractionEnabled(),
      inputDisabled: engine.inputDisabled(),
      gameMode: engine.gameMode,
    },
    {
      drawConstellation: (ctx: CanvasRenderingContext2D, ships: Ship[]) => 
        ConstellationManager.drawConstellation(ctx, ships, engine.formationAssignments),
      drawStarDespawning: StarEventManager.drawStarDespawning,
    }
  );
}
