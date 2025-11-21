import { Vector2D } from '../../../models/vector2d';
import { Ship } from '../../../models/ship';

export function drawShipTail(ctx: CanvasRenderingContext2D, ship: Ship): void {
  ctx.save();
  let finalAlpha = (1 - ship.z * -1 * 0.4) * ship.opacity;
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

export function drawShip(
  ctx: CanvasRenderingContext2D,
  ship: Ship,
  gameMode: 'normal' | 'asteroid_event'
): void {
  const scale = 1 + ship.z * 0.4;
  const currentRadius = ship.radius * scale;
  let finalAlpha = (1 - ship.z * -1 * 0.4) * ship.opacity;

  // Shadow (unrotated)
  if (ship.z > 0.1) {
    const shadowAlpha = ship.z * 0.3 * ship.opacity;
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
