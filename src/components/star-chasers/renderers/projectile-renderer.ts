import { Projectile } from '../../../models/game-entities';

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[]
): void {
  projectiles.forEach(p => {
    const lifeRatio = p.life / p.maxLife;
    // Start fading when life is below 30%
    const fadeThreshold = 0.3;
    const opacityMultiplier = lifeRatio < fadeThreshold ? lifeRatio / fadeThreshold : 1;

    for (let i = 0; i < p.tail.length; i++) {
      const pos = p.tail[i];
      const opacity = (i / p.tail.length) * 0.5 * opacityMultiplier;
      ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2 * (i / p.tail.length) * opacityMultiplier, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = opacityMultiplier;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10 * opacityMultiplier;
    ctx.beginPath();
    const size = 3 * (0.7 + 0.3 * opacityMultiplier); // Slight shrink
    ctx.arc(p.position.x, p.position.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
