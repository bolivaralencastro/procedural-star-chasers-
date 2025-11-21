import { Ship } from '../../../models/ship';
import { Vector2D } from '../../../models/vector2d';
import {
  Particle,
  RadioBubble,
  TargetStar,
  WormholePair,
} from '../../../models/game-entities';

export function drawParticles(
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

export function drawExplosionParticles(
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

export function drawRadioBubbles(
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

export function drawWormhole(ctx: CanvasRenderingContext2D, wormhole: WormholePair): void {
  const { entry, exit, life, maxLife } = wormhole;
  drawWormholeEnd(ctx, entry.position, entry.radius, entry.pulseAngle, life, maxLife);
  drawWormholeEnd(ctx, exit.position, exit.radius, exit.pulseAngle, life, maxLife);
}

function drawWormholeEnd(
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
  
  if (baseRadius <= 0) {
    return;
  }

  ctx.save();
  ctx.translate(position.x, position.y);

  // Slow pulse calculation
  const pulse = Math.sin(pulseAngle * 0.5); // Slow down the visual pulse
  const pulseScale = 1 + pulse * 0.1; // +/- 10% size

  // 1. Outer Glow (Dark Gray)
  const glowRadius = baseRadius * 2.5 * pulseScale;
  const glowGradient = ctx.createRadialGradient(0, 0, baseRadius * 0.5, 0, 0, glowRadius);
  glowGradient.addColorStop(0, 'rgba(75, 85, 99, 0.4)'); // Gray-600
  glowGradient.addColorStop(0.5, 'rgba(55, 65, 81, 0.2)'); // Gray-700
  glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Core (Black)
  ctx.fillStyle = '#000000'; // Pure Black
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * pulseScale, 0, Math.PI * 2);
  ctx.fill();

  // 3. Inner Ring / Event Horizon Edge (Almost Black)
  ctx.strokeStyle = '#0a0a0a'; // Almost Black
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * pulseScale, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Subtle outer ring
  ctx.strokeStyle = 'rgba(75, 85, 99, 0.2)'; // Gray-600
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * pulseScale * 1.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  mousePos: Vector2D,
  mouseOrbitRadius: number,
  isMouseDown: boolean,
  mouseInteractionEnabled: boolean,
  controlledShipId: number | null,
  ships: Ship[]
): void {
  try {
    ctx.save();

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

      const glowGradient = ctx.createRadialGradient(
        cursorX,
        cursorY,
        coreRadius,
        cursorX,
        cursorY,
        glowRadius
      );
      glowGradient.addColorStop(0, 'rgba(75, 85, 99, 0.6)'); // Gray-600
      glowGradient.addColorStop(0.5, 'rgba(55, 65, 81, 0.3)'); // Gray-700
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.fillStyle = glowGradient;
      ctx.arc(cursorX, cursorY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = '#18181b'; // Zinc-900
      ctx.arc(cursorX, cursorY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(113, 113, 122, 0.5)'; // Zinc-500
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, coreRadius + 1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } catch (e) {
    console.error('Error drawing cursor:', e);
    try {
      ctx.restore();
    } catch {}
  }
}
