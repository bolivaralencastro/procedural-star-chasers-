import { Projectile } from '../../models/game-entities';

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[]
): void {
  projectiles.forEach(p => {
    for (let i = 0; i < p.tail.length; i++) {
      const pos = p.tail[i];
      const opacity = (i / p.tail.length) * 0.5;
      ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2 * (i / p.tail.length), 0, Math.PI * 2);
      ctx.fill();
    }

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
