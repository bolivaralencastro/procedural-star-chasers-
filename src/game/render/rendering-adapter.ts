import { RenderingManager } from './rendering-manager';
import { ConstellationManager } from '../systems/constellation-manager';
import { StarEventManager } from '../systems/star-event-manager';
import type { StarChasersEngine } from '../core/star-chasers.engine';
import type { Ship } from '../entities/ship';

export function renderGame(engine: StarChasersEngine) {
  const ctx = engine.ctx;
  if (!ctx) {
    return;
  }

  // Entity accounting for the perf overlay. Without culling (P0) drawn == total;
  // P1 will subtract off-screen entities from `drawn`.
  const total =
    engine.ships.length +
    engine.asteroids.length +
    engine.projectiles.length +
    engine.starParticles.length +
    engine.explosionParticles.length +
    engine.backgroundStars.length +
    engine.nebulas.length +
    engine.radioBubbles.length;
  engine.renderStats.total = total;
  engine.renderStats.drawn = total;

  RenderingManager.drawScene(
    ctx,
    {
      backgroundStars: engine.backgroundStars,
      targetStar: engine.targetStar,
      ships: engine.ships,
      projectiles: engine.projectiles,
      particles: engine.starParticles,
      explosionParticles: engine.explosionParticles,
      mouse: engine.mouse,
      wormhole: engine.wormhole,
      mobileMenuVisible: engine.mobileMenuVisible(),
      contextMenuVisible: engine.contextMenu.visible,
      isMobile: engine.isMobile(),
      renderScale: engine.renderScale,
      worldWidth: engine.worldWidth,
      worldHeight: engine.worldHeight,
      viewportWidth: engine.viewportWidth,
      viewportHeight: engine.viewportHeight,
      cameraPosition: engine.cameraPosition,
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
