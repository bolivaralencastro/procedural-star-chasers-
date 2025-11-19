import { Vector2D } from '../../models/vector2d';
import { Ship } from '../../models/ship';
import {
  BackgroundStar,
  TargetStar,
  Particle,
  ScoreTooltip,
  RadioBubble,
  Nebula,
  Asteroid,
  Projectile,
  WormholePair
} from '../../models/game-entities';

export class RenderingManager {
  static drawBackgroundStars(
    ctx: CanvasRenderingContext2D,
    stars: BackgroundStar[]
  ): void {
    const now = Date.now();
    stars.forEach(star => {
      ctx.beginPath();
      const opacity = star.opacity + Math.sin(now * star.twinkleSpeed) * 0.1;
      ctx.fillStyle = star.color.replace(/[\d\.]+\)$/g, `${opacity})`);
      ctx.arc(star.pos.x, star.pos.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  static drawNebulas(ctx: CanvasRenderingContext2D, nebulas: Nebula[]): void {
    nebulas.forEach(nebula => {
      const opacity = (nebula.life / nebula.maxLife) * 0.3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = opacity;
      const grad = ctx.createRadialGradient(
        nebula.position.x,
        nebula.position.y,
        0,
        nebula.position.x,
        nebula.position.y,
        nebula.radius
      );
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
      grad.addColorStop(0.7, 'rgba(21, 128, 61, 0.3)');
      grad.addColorStop(1, 'rgba(22, 101, 52, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(nebula.position.x, nebula.position.y, nebula.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  static drawTargetStar(
    ctx: CanvasRenderingContext2D,
    targetStar: TargetStar
  ): void {
    const pulse = Math.sin(targetStar.pulseAngle) * 3;
    const radius = targetStar.radius + pulse;
    const coreRadius = targetStar.radius * 0.6 + pulse * 0.8;

    ctx.save();
    ctx.globalAlpha = targetStar.opacity;

    ctx.beginPath();
    const grad = ctx.createRadialGradient(
      targetStar.position.x,
      targetStar.position.y,
      0,
      targetStar.position.x,
      targetStar.position.y,
      radius * 2.5
    );
    grad.addColorStop(0, 'rgba(255, 223, 0, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
    grad.addColorStop(1, 'rgba(255, 165, 0, 0)');
    ctx.fillStyle = grad;
    ctx.arc(targetStar.position.x, targetStar.position.y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 224, 1)';
    ctx.arc(targetStar.position.x, targetStar.position.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  static drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    targetStar: TargetStar
  ): void {
    particles.forEach(p => {
      ctx.beginPath();
      const opacity = (p.life / p.maxLife) * 0.8 * targetStar.opacity;
      ctx.fillStyle = p.color.replace(/[\d\.]+\)$/g, `${opacity})`);
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  static drawExplosionParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[]
  ): void {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const currentRadius = p.radius * (p.life / p.maxLife);
      ctx.arc(p.position.x, p.position.y, currentRadius > 0 ? currentRadius : 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  static drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[]): void {
    asteroids.forEach(asteroid => {
      ctx.save();
      ctx.translate(asteroid.position.x, asteroid.position.y);
      ctx.rotate(asteroid.rotation);
      ctx.beginPath();
      ctx.moveTo(asteroid.shape[0].x, asteroid.shape[0].y);
      for (let i = 1; i < asteroid.shape.length; i++) {
        ctx.lineTo(asteroid.shape[i].x, asteroid.shape[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#a1a1aa';
      ctx.fillStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  static drawProjectiles(
    ctx: CanvasRenderingContext2D,
    projectiles: Projectile[]
  ): void {
    projectiles.forEach(p => {
      // Draw tail
      for (let i = 0; i < p.tail.length; i++) {
        const pos = p.tail[i];
        const opacity = (i / p.tail.length) * 0.5;
        ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`; // Gold with opacity
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2 * (i / p.tail.length), 0, Math.PI * 2); // Shrinking radius
        ctx.fill();
      }

      // Draw core with glow
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  static drawShipTail(ctx: CanvasRenderingContext2D, ship: Ship): void {
    ctx.save();
    let finalAlpha = 1 - ship.z * -1 * 0.4;
    if (ship.color === 'Blue' && ship.isBlinking > 0) {
      finalAlpha *= 1 - ship.isBlinking / 15;
    }
    ctx.globalAlpha = finalAlpha;
    for (let i = 0; i < ship.tail.length; i++) {
      const pos = ship.tail[i];
      if (i > 0 && Vector2D.distance(pos, ship.tail[i - 1]) > 100) continue;
      const r = parseInt(ship.hexColor.slice(1, 3), 16);
      const g = parseInt(ship.hexColor.slice(3, 5), 16);
      const b = parseInt(ship.hexColor.slice(5, 7), 16);
      const currentRadius = ship.radius * (1 + ship.z * 0.4);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(i / ship.tail.length) * 0.5})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, currentRadius * (i / ship.tail.length) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  static drawShip(
    ctx: CanvasRenderingContext2D,
    ship: Ship,
    gameMode: 'normal' | 'asteroid_event'
  ): void {
    const scale = 1 + ship.z * 0.4;
    const currentRadius = ship.radius * scale;
    let finalAlpha = 1 - ship.z * -1 * 0.4;

    // Shadow (unrotated)
    if (ship.z > 0.1) {
      const shadowAlpha = ship.z * 0.3;
      const shadowRadiusX = currentRadius * 1.2;
      const shadowRadiusY = currentRadius * 0.6;
      const shadowOffsetX = ship.z * currentRadius * 0.8;
      const shadowOffsetY = ship.z * currentRadius * 0.8;
      ctx.save();
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = 'black';
      ctx.filter = `blur(${ship.z * 10}px)`;
      ctx.beginPath();
      ctx.ellipse(
        ship.position.x + shadowOffsetX,
        ship.position.y + shadowOffsetY,
        shadowRadiusX,
        shadowRadiusY,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // Main ship body (rotated)
    ctx.save();
    if (ship.color === 'Blue' && ship.isBlinking > 0) {
      finalAlpha *= 1 - ship.isBlinking / 15;
    }
    ctx.globalAlpha = finalAlpha;

    ctx.translate(ship.position.x, ship.position.y);
    ctx.rotate(ship.rotation);

    // Glow
    let glowMultiplier =
      ship.color === 'Red' && ship.afterburnerTimer > 0 ? 1.5 : 1;
    const grad = ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      currentRadius * 2.5 * glowMultiplier
    );
    grad.addColorStop(0, `${ship.hexColor}FF`);
    grad.addColorStop(0.5, `${ship.hexColor}80`);
    grad.addColorStop(1, `${ship.hexColor}00`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 2.5 * glowMultiplier, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = ship.hexColor;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Front Indicator (cockpit)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(currentRadius * 0.9, 0);
    ctx.lineTo(currentRadius * 0.5, -currentRadius * 0.4);
    ctx.lineTo(currentRadius * 0.5, currentRadius * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // Restore from translation and rotation

    // Ammo/Reload Indicator (unrotated)
    if (gameMode === 'asteroid_event' && ship.state !== 'paralyzed') {
      const indicatorY = ship.position.y + currentRadius + 10;
      if (ship.reloadTimer > 0) {
        // Draw reload bar
        const reloadProgress = 1 - ship.reloadTimer / ship.reloadDuration;
        const barWidth = 20;
        const barHeight = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(
          ship.position.x - barWidth / 2,
          indicatorY - barHeight / 2,
          barWidth,
          barHeight
        );
        ctx.fillStyle = '#4ade80'; // Green
        ctx.fillRect(
          ship.position.x - barWidth / 2,
          indicatorY - barHeight / 2,
          barWidth * reloadProgress,
          barHeight
        );
      } else {
        // Draw ammo dots
        const dotRadius = 1.5;
        const spacing = 5;
        const totalWidth = ship.maxAmmo * spacing - spacing;
        const startX = ship.position.x - totalWidth / 2;

        for (let i = 0; i < ship.maxAmmo; i++) {
          ctx.fillStyle =
            i < ship.ammo ? ship.hexColor : 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(startX + i * spacing, indicatorY, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Paralyzed effect (unrotated)
    if (ship.state === 'paralyzed') {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 50) * 0.2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const arcCount = 3;
      for (let i = 0; i < arcCount; i++) {
        const startAngle = Math.random() * Math.PI * 2;
        const endAngle = startAngle + Math.PI * 0.5;
        ctx.arc(
          ship.position.x,
          ship.position.y,
          currentRadius * (1.2 + Math.random() * 0.4),
          startAngle,
          endAngle
        );
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  static drawRadioBubbles(
    ctx: CanvasRenderingContext2D,
    bubbles: RadioBubble[],
    isMobile: boolean
  ): void {
    const fadeDuration = 30;
    bubbles.forEach(bubble => {
      let opacity = 1;
      if (bubble.life < fadeDuration) {
        opacity = bubble.life / fadeDuration;
      } else if (bubble.maxLife - bubble.life < fadeDuration) {
        opacity = (bubble.maxLife - bubble.life) / fadeDuration;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      const fontSize = isMobile ? 16 : 14;
      const font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lineHeight = isMobile ? 22 : 18;
      const padding = isMobile ? 14 : 12;
      const lines = bubble.textLines.length > 0 ? bubble.textLines : [''];
      const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const boxWidth = textWidth + padding * 2;
      const boxHeight = lines.length * lineHeight + padding * 2;
      const boxX = bubble.position.x - boxWidth / 2;
      const boxY = bubble.position.y - boxHeight;

      ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
      ctx.strokeStyle = `${bubble.color}CC`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bubble.position.x - 8, boxY + boxHeight);
      ctx.lineTo(bubble.position.x, boxY + boxHeight + 10);
      ctx.lineTo(bubble.position.x + 8, boxY + boxHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F9FAFB';
      lines.forEach((line, index) => {
        const textY = boxY + padding + lineHeight * index + lineHeight / 2;
        ctx.fillText(line, bubble.position.x, textY);
      });

      ctx.restore();
    });
  }

  static drawScoreTooltips(
    ctx: CanvasRenderingContext2D,
    tooltips: ScoreTooltip[]
  ): void {
    tooltips.forEach(tooltip => {
      const fadeDuration = 30;
      let opacity = 1;
      if (tooltip.life < fadeDuration) opacity = tooltip.life / fadeDuration;
      else if (tooltip.maxLife - tooltip.life < fadeDuration)
        opacity = (tooltip.maxLife - tooltip.life) / fadeDuration;

      ctx.save();
      ctx.globalAlpha = opacity;
      const text = `★ ${tooltip.text}`;
      ctx.font = 'bold 16px "Courier New", monospace';
      const textMetrics = ctx.measureText(text);
      const padding = 10;
      const boxWidth = textMetrics.width + padding * 2;
      const boxHeight = 30;
      const boxX = tooltip.position.x - boxWidth / 2;
      const boxY = tooltip.position.y - boxHeight;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tooltip.position.x, boxY + boxHeight / 2);
      ctx.restore();
    });
  }

  static drawWormhole(ctx: CanvasRenderingContext2D, wormhole: WormholePair): void {
    const { entry, exit, life, maxLife } = wormhole;
    RenderingManager.drawWormholeEnd(ctx, entry.position, entry.radius, entry.pulseAngle, life, maxLife);
    RenderingManager.drawWormholeEnd(ctx, exit.position, exit.radius, exit.pulseAngle, life, maxLife);
  }

  private static drawWormholeEnd(
    ctx: CanvasRenderingContext2D,
    position: Vector2D,
    radius: number,
    pulseAngle: number,
    life: number,
    maxLife: number
  ): void {
    const fadeDuration = 500;
    let scale = 1;
    if (life < fadeDuration) {
      scale = life / fadeDuration;
    } else if (maxLife - life < fadeDuration) {
      scale = (maxLife - life) / fadeDuration;
    }

    const baseRadius = radius * scale;
    const pulseEffect = Math.sin(pulseAngle) * 2;
    const currentRadius = baseRadius + pulseEffect;

    if (currentRadius <= 0) {
      return;
    }

    ctx.save();
    ctx.translate(position.x, position.y);

    // Inner void
    ctx.globalAlpha = scale * 0.7;
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pulsating outer ring
    ctx.globalAlpha = scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius + 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  static drawCursor(
    ctx: CanvasRenderingContext2D,
    mousePos: Vector2D,
    mouseOrbitRadius: number,
    isMouseDown: boolean,
    mouseInteractionEnabled: boolean,
    controlledShipId: number | null,
    ships: Ship[]
  ): void {
    // DOCUMENTATION: This method is wrapped in a try-catch block because 'createRadialGradient'
    // and other canvas methods throw a 'NotSupportedError' if any coordinate is non-finite (NaN or Infinity).
    // This can happen during initialization or if the mouse position hasn't been set yet.
    // If this method throws, it breaks the entire game loop (draw() stops executing), causing
    // all entities (ships, stars) to disappear from the screen.
    try {
      ctx.save();

      // Safety check: Ensure mouse coordinates are valid numbers before attempting to draw
      if (!Number.isFinite(mousePos.x) || !Number.isFinite(mousePos.y)) {
        ctx.restore();
        return;
      }

      if (controlledShipId !== null) {
        ctx.restore();
        return;
      }

      if (mouseInteractionEnabled) {
        const isCharging = isMouseDown && ships.some(c => c.state === 'orbiting');
        const pulse = Math.sin(Date.now() / 150) * 1.5;
        const coreRadius = 6 + pulse;

        const glowRadius = 25 + pulse * 2;
        const glowGrad = ctx.createRadialGradient(
          mousePos.x,
          mousePos.y,
          coreRadius,
          mousePos.x,
          mousePos.y,
          glowRadius
        );
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = isCharging
          ? 'rgba(255, 255, 255, 0.9)'
          : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = isCharging ? 2 : 1.5;
        ctx.arc(mousePos.x, mousePos.y, mouseOrbitRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.arc(mousePos.x, mousePos.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const cursorX = mousePos.x;
        const cursorY = mousePos.y;

        const coreRadius = 8;
        const glowRadius = 25;

        // Accretion disk glow (purple/white) to make it visible on black background
        const glowGradient = ctx.createRadialGradient(
          cursorX,
          cursorY,
          coreRadius,
          cursorX,
          cursorY,
          glowRadius
        );
        glowGradient.addColorStop(0, 'rgba(147, 51, 234, 0.6)'); // Purple-600
        glowGradient.addColorStop(0.5, 'rgba(192, 132, 252, 0.3)'); // Purple-400
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.fillStyle = glowGradient;
        ctx.arc(cursorX, cursorY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon (Black core)
        ctx.beginPath();
        ctx.fillStyle = '#000000';
        ctx.arc(cursorX, cursorY, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Thin accretion ring
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'; // Purple-500
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cursorX, cursorY, coreRadius + 1, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } catch (e) {
      console.error('Error drawing cursor:', e);
      // Ensure context is restored even if drawing fails
      try {
        ctx.restore();
      } catch {}
    }
  }
}
