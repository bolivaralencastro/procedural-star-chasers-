import { Asteroid, BackgroundStar, Nebula, TargetStar } from '../../models/game-entities';

export function drawBackgroundStars(
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

export function drawNebulas(ctx: CanvasRenderingContext2D, nebulas: Nebula[]): void {
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

export function drawTargetStar(
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

export function drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[]): void {
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
