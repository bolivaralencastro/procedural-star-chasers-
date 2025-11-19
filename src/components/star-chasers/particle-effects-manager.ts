import { Vector2D } from '../../models/vector2d';
import { Particle } from '../../models/game-entities';
import { GAME_CONSTANTS } from './game-constants';

/**
 * Helper class for creating and managing particle effects
 */
export class ParticleEffectsManager {
  /**
   * Updates particle positions and removes expired particles
   */
  static updateParticles(particles: Particle[]): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.position.add(p.velocity);
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /**
   * Updates explosion particles with velocity dampening
   */
  static updateExplosionParticles(particles: Particle[]): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.position.add(p.velocity);
      p.velocity.multiply(0.97);
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /**
   * Spawns a single star particle
   */
  static spawnStarParticle(particles: Particle[], starPosition: Vector2D): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.5 + 0.2;
    const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
    particles.push({
      position: starPosition.clone(),
      velocity,
      radius: Math.random() * 1.5 + 0.5,
      life: 40 + Math.random() * 40,
      maxLife: 80,
      color: 'rgba(255, 223, 0, 1)'
    });
  }

  /**
   * Creates a star explosion effect with multiple particles
   */
  static createStarExplosion(
    particles: Particle[],
    position: Vector2D,
    count = GAME_CONSTANTS.STAR_EXPLOSION_PARTICLE_COUNT
  ): void {
    const colors = ['#FFD700', '#FFA500', '#FFFFE0', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
      const life = 50 + Math.random() * 40;
      particles.push({
        position: position.clone(),
        velocity,
        radius: Math.random() * 2.5 + 1,
        life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  /**
   * Creates blink/teleport particles
   */
  static createBlinkParticles(
    particles: Particle[],
    position: Vector2D,
    color: string,
    count = 20
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
      const life = 20 + Math.random() * 20;
      particles.push({
        position: position.clone(),
        velocity,
        life,
        radius: Math.random() * 2 + 1,
        maxLife: life,
        color
      });
    }
  }

  /**
   * Creates afterburner particles for Red ships
   */
  static createAfterburnerParticle(
    particles: Particle[],
    shipPosition: Vector2D,
    shipVelocity: Vector2D
  ): void {
    const angle = Math.atan2(shipVelocity.y, shipVelocity.x) + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = shipVelocity.magnitude() * 0.5 + Math.random() * 2;
    const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
    const life = 20 + Math.random() * 20;
    const colors = ['#ffc107', '#ff9800', '#f44336'];
    particles.push({
      position: shipPosition.clone(),
      velocity,
      life,
      radius: Math.random() * 1.5 + 0.5,
      maxLife: life,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}
