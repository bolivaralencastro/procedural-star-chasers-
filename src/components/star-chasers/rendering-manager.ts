import { Ship } from '../../models/ship';
import {
  Asteroid,
  BackgroundStar,
  Nebula,
  Particle,
  Projectile,
  RadioBubble,
  ScoreTooltip,
  TargetStar,
  WormholePair,
} from '../../models/game-entities';
import { MouseState } from './input-manager';
import {
  drawAsteroids,
  drawBackgroundStars,
  drawNebulas,
  drawTargetStar,
} from './renderers/background-renderer';
import {
  drawCursor,
  drawExplosionParticles,
  drawParticles,
  drawRadioBubbles,
  drawScoreTooltips,
  drawWormhole,
} from './renderers/effects-renderer';
import { drawProjectiles } from './renderers/projectile-renderer';
import { drawShip, drawShipTail } from './renderers/ship-renderer';

interface RenderDependencies {
  drawConstellation?: (ctx: CanvasRenderingContext2D, ships: Ship[]) => void;
  drawStarDespawning?: (ctx: CanvasRenderingContext2D, targetStar: TargetStar) => void;
}

interface RenderData {
  backgroundStars: BackgroundStar[];
  targetStar: TargetStar;
  ships: Ship[];
  projectiles: Projectile[];
  particles: Particle[];
  explosionParticles: Particle[];
  scoreTooltips: ScoreTooltip[];
  mouse: MouseState;
  wormhole: WormholePair | null;
  mobileMenuVisible: boolean;
  contextMenuVisible: boolean;
  isMobile: boolean;
  renderScale: number;
  worldWidth: number;
  worldHeight: number;
  nebulas: Nebula[];
  asteroids: Asteroid[];
  radioBubbles: RadioBubble[];
  constellationMode: boolean;
  controlledShipId: number | null;
  mouseInteractionEnabled: boolean;
  inputDisabled: boolean;
  gameMode: 'normal' | 'asteroid_event';
}

export class RenderingManager {
  static drawScene(
    ctx: CanvasRenderingContext2D,
    data: RenderData,
    dependencies: RenderDependencies
  ): void {
    const {
      renderScale,
      worldWidth,
      worldHeight,
      backgroundStars,
      nebulas,
      targetStar,
      particles,
      explosionParticles,
      wormhole,
      asteroids,
      projectiles,
      ships,
      scoreTooltips,
      radioBubbles,
      mouse,
      mobileMenuVisible,
      contextMenuVisible,
      isMobile,
      constellationMode,
      controlledShipId,
      mouseInteractionEnabled,
      inputDisabled,
      gameMode,
    } = data;

    ctx.save();
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.clearRect(0, 0, worldWidth, worldHeight);

    RenderingManager.drawBackgroundStars(ctx, backgroundStars);
    RenderingManager.drawNebulas(ctx, nebulas);

    if (targetStar.exists) {
      RenderingManager.drawTargetStar(ctx, targetStar);
    } else if (targetStar.isDespawning && dependencies.drawStarDespawning) {
      dependencies.drawStarDespawning(ctx, targetStar);
    }

    RenderingManager.drawParticles(ctx, particles, targetStar);
    RenderingManager.drawExplosionParticles(ctx, explosionParticles);

    if (wormhole) {
      RenderingManager.drawWormhole(ctx, wormhole);
    }

    RenderingManager.drawAsteroids(ctx, asteroids);
    RenderingManager.drawProjectiles(ctx, projectiles);

    ships.forEach(ship => {
      RenderingManager.drawShipTail(ctx, ship);
      RenderingManager.drawShip(ctx, ship, gameMode);
    });

    // if (constellationMode && dependencies.drawConstellation) {
    //   dependencies.drawConstellation(ctx, ships);
    // }

    RenderingManager.drawScoreTooltips(ctx, scoreTooltips);
    RenderingManager.drawRadioBubbles(ctx, radioBubbles, isMobile);

    if (!inputDisabled) {
      const allowMouseInteraction = mouseInteractionEnabled && !mobileMenuVisible && !contextMenuVisible;
      RenderingManager.drawCursor(
        ctx,
        mouse.pos,
        mouse.orbitRadius,
        mouse.isDown,
        allowMouseInteraction,
        controlledShipId,
        ships
      );
    }

    ctx.restore();
  }

  static drawBackgroundStars(ctx: CanvasRenderingContext2D, stars: BackgroundStar[]): void {
    drawBackgroundStars(ctx, stars);
  }

  static drawNebulas(ctx: CanvasRenderingContext2D, nebulas: Nebula[]): void {
    drawNebulas(ctx, nebulas);
  }

  static drawTargetStar(ctx: CanvasRenderingContext2D, targetStar: TargetStar): void {
    drawTargetStar(ctx, targetStar);
  }

  static drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    targetStar: TargetStar
  ): void {
    drawParticles(ctx, particles, targetStar);
  }

  static drawExplosionParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    drawExplosionParticles(ctx, particles);
  }

  static drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[]): void {
    drawAsteroids(ctx, asteroids);
  }

  static drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
    drawProjectiles(ctx, projectiles);
  }

  static drawShipTail(ctx: CanvasRenderingContext2D, ship: Ship): void {
    drawShipTail(ctx, ship);
  }

  static drawShip(
    ctx: CanvasRenderingContext2D,
    ship: Ship,
    gameMode: 'normal' | 'asteroid_event'
  ): void {
    drawShip(ctx, ship, gameMode);
  }

  static drawRadioBubbles(ctx: CanvasRenderingContext2D, bubbles: RadioBubble[], isMobile: boolean): void {
    drawRadioBubbles(ctx, bubbles, isMobile);
  }

  static drawScoreTooltips(ctx: CanvasRenderingContext2D, tooltips: ScoreTooltip[]): void {
    drawScoreTooltips(ctx, tooltips);
  }

  static drawWormhole(ctx: CanvasRenderingContext2D, wormhole: WormholePair): void {
    drawWormhole(ctx, wormhole);
  }

  static drawCursor(
    ctx: CanvasRenderingContext2D,
    mousePos: MouseState['pos'],
    mouseOrbitRadius: number,
    isMouseDown: boolean,
    mouseInteractionEnabled: boolean,
    controlledShipId: number | null,
    ships: Ship[]
  ): void {
    drawCursor(
      ctx,
      mousePos,
      mouseOrbitRadius,
      isMouseDown,
      mouseInteractionEnabled,
      controlledShipId,
      ships
    );
  }
}
