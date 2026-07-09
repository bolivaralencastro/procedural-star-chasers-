import { Ship } from '../entities/ship';
import {
  Asteroid,
  BackgroundStar,
  Nebula,
  Particle,
  Projectile,
  RadioBubble,
  TargetStar,
  WormholePair,
} from '../entities/game-entities';
import { Vector2D } from '../entities/vector2d';
import { MouseState } from '../input/input-manager';
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
  drawWormhole,
} from './renderers/effects-renderer';
import { drawProjectiles } from './renderers/projectile-renderer';
import { drawShip, drawShipTail } from './renderers/ship-renderer';
import { computeViewBounds, isInView, ViewBounds } from './view-bounds';

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
  mouse: MouseState;
  wormhole: WormholePair | null;
  mobileMenuVisible: boolean;
  contextMenuVisible: boolean;
  isMobile: boolean;
  renderScale: number;
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  cameraPosition: Vector2D;
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
  /** Returns the number of entities actually drawn (after culling). */
  static drawScene(
    ctx: CanvasRenderingContext2D,
    data: RenderData,
    dependencies: RenderDependencies
  ): number {
    const {
      renderScale,
      worldWidth,
      worldHeight,
      viewportWidth,
      viewportHeight,
      cameraPosition,
      backgroundStars,
      nebulas,
      targetStar,
      particles,
      explosionParticles,
      wormhole,
      asteroids,
      projectiles,
      ships,
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
    ctx.setTransform(
      renderScale,
      0,
      0,
      renderScale,
      -cameraPosition.x * renderScale,
      -cameraPosition.y * renderScale
    );
    ctx.clearRect(cameraPosition.x, cameraPosition.y, viewportWidth, viewportHeight);

    const view = computeViewBounds(cameraPosition.x, cameraPosition.y, viewportWidth, viewportHeight);
    let drawn = 0;

    drawn += RenderingManager.drawBackgroundStars(ctx, backgroundStars, view);
    drawn += RenderingManager.drawNebulas(ctx, nebulas, view);

    if (targetStar.exists) {
      RenderingManager.drawTargetStar(ctx, targetStar);
    } else if (targetStar.isDespawning && dependencies.drawStarDespawning) {
      dependencies.drawStarDespawning(ctx, targetStar);
    }

    drawn += RenderingManager.drawParticles(ctx, particles, targetStar, view);
    drawn += RenderingManager.drawExplosionParticles(ctx, explosionParticles, view);

    if (wormhole) {
      RenderingManager.drawWormhole(ctx, wormhole);
    }

    drawn += RenderingManager.drawAsteroids(ctx, asteroids, view);
    drawn += RenderingManager.drawProjectiles(ctx, projectiles, view);

    // Ships (and their tails) are few; cull by the glow extent (~2.5x radius).
    ships.forEach(ship => {
      if (!isInView(ship.position.x, ship.position.y, ship.radius * 4, view)) return;
      drawn++;
      RenderingManager.drawShipTail(ctx, ship);
      RenderingManager.drawShip(ctx, ship, gameMode);
    });

    // if (constellationMode && dependencies.drawConstellation) {
    //   dependencies.drawConstellation(ctx, ships);
    // }

    RenderingManager.drawRadioBubbles(ctx, radioBubbles, isMobile);

    if (!inputDisabled && !isMobile) {
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
    return drawn;
  }

  static drawBackgroundStars(ctx: CanvasRenderingContext2D, stars: BackgroundStar[], view: ViewBounds): number {
    return drawBackgroundStars(ctx, stars, view);
  }

  static drawNebulas(ctx: CanvasRenderingContext2D, nebulas: Nebula[], view: ViewBounds): number {
    return drawNebulas(ctx, nebulas, view);
  }

  static drawTargetStar(ctx: CanvasRenderingContext2D, targetStar: TargetStar): void {
    drawTargetStar(ctx, targetStar);
  }

  static drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    targetStar: TargetStar,
    view: ViewBounds
  ): number {
    return drawParticles(ctx, particles, targetStar, view);
  }

  static drawExplosionParticles(ctx: CanvasRenderingContext2D, particles: Particle[], view: ViewBounds): number {
    return drawExplosionParticles(ctx, particles, view);
  }

  static drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[], view: ViewBounds): number {
    return drawAsteroids(ctx, asteroids, view);
  }

  static drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[], view: ViewBounds): number {
    return drawProjectiles(ctx, projectiles, view);
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
