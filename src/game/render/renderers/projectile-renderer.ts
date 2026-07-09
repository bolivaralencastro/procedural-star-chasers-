import { Projectile } from '../../entities/game-entities';
import { GAME_CONSTANTS } from '../../core/game-constants';

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[]
): void {
  projectiles.forEach(p => {
    const lifeRatio = p.life / p.maxLife;
    const fadeThreshold = 0.45;
    const opacityMultiplier = lifeRatio < fadeThreshold ? lifeRatio / fadeThreshold : 1;

    for (let i = 0; i < p.tail.length; i++) {
      const pos = p.tail[i];
      const progress = (i + 1) / p.tail.length;
      const opacity = progress * 0.28 * opacityMultiplier;
      ctx.fillStyle = `${p.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.1 + progress * 1.1 * opacityMultiplier, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = 0.95 * opacityMultiplier;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10 * opacityMultiplier;
    ctx.beginPath();
    const size = GAME_CONSTANTS.PROJECTILE_RENDER_RADIUS * (0.95 + 0.2 * opacityMultiplier);
    ctx.arc(p.position.x, p.position.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 250, 214, 0.95)';
    ctx.beginPath();
    ctx.arc(p.position.x, p.position.y, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
