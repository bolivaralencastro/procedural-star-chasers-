import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  HostListener,
  Output,
  EventEmitter,
  inject,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Helper Vector2D class
class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}
  add(v: Vector2D) { this.x += v.x; this.y += v.y; return this; }
  subtract(v: Vector2D) { this.x -= v.x; this.y -= v.y; return this; }
  multiply(s: number) { this.x *= s; this.y *= s; return this; }
  divide(s: number) { this.x /= s; this.y /= s; return this; }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() { const mag = this.magnitude(); if (mag > 0) { this.divide(mag); } return this; }
  static distance(v1: Vector2D, v2: Vector2D) { return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2)); }
  clone() { return new Vector2D(this.x, this.y); }
}

type CometState = 'idle' | 'hunting' | 'orbiting' | 'celebrating' | 'launched';
type CometColor = 'Red' | 'Green' | 'Blue';

interface Comet {
  id: number;
  color: CometColor;
  hexColor: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  state: CometState;
  score: number;
  speedBonus: number;
  orbitAngle: number;
  orbitalSpeed: number;
  celebrationTimer: number;
  celebrationDuration: number;
  zigZagDir: number;
  tail: Vector2D[];
}

interface BackgroundStar {
  pos: Vector2D;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  color: string;
}

interface TargetStar {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  radius: number;
  exists: boolean;
  isDespawning: boolean;
  pulseAngle: number;
  opacity: number;
  spawnTime: number;
  lifetime: number;
}

interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ScoreTooltip {
  cometId: number;
  text: string;
  position: Vector2D;
  life: number;
  maxLife: number;
}

@Component({
  selector: 'app-star-chasers',
  templateUrl: './star-chasers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class StarChasersComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() toggleFullscreenRequest = new EventEmitter<void>();
  @Output() toggleAudioRequest = new EventEmitter<void>();
  @Input() isFullscreen = false;
  @Input() isAudioMuted = true;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId?: number;

  private comets: Comet[] = [];
  private backgroundStars: BackgroundStar[] = [];
  private starParticles: Particle[] = [];
  private explosionParticles: Particle[] = [];
  private scoreTooltips: ScoreTooltip[] = [];
  private targetStar: TargetStar = {
    position: new Vector2D(),
    velocity: new Vector2D(),
    acceleration: new Vector2D(),
    radius: 15,
    exists: false,
    isDespawning: false,
    pulseAngle: 0,
    opacity: 0,
    spawnTime: 0,
    lifetime: 0,
  };
  private nextStarSpawnTime: number = 0;
  private readonly TAIL_LENGTH = 20;
  private readonly SPEED_INCREMENT_PER_STAR = 0.1;
  private readonly MAX_SPEED_BONUS = 2.0;

  private mouse = {
    pos: new Vector2D(-100, -100),
    isDown: false,
    orbitRadius: 60,
  };

  public contextMenu = { visible: false, x: 0, y: 0 };
  public mouseInteractionEnabled = true;
  private cdr = inject(ChangeDetectorRef);

  @HostListener('window:resize')
  onResize() {
    this.setupCanvas();
    this.createBackgroundStars(200);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.pos.x = event.clientX - rect.left;
    this.mouse.pos.y = event.clientY - rect.top;
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (this.contextMenu.visible) {
      this.contextMenu.visible = false;
      this.cdr.detectChanges();
    }
    if (event.button === 0) { // Only left click
        this.mouse.isDown = true;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.mouse.isDown && this.mouseInteractionEnabled) {
      this.comets.forEach(comet => {
        if (comet.state === 'orbiting') {
          comet.state = 'launched';
          const launchSpeed = comet.orbitalSpeed * 80;
          const tangent = new Vector2D(
            this.mouse.pos.y - comet.position.y,
            comet.position.x - this.mouse.pos.x
          ).normalize();
          comet.velocity = tangent.multiply(launchSpeed);
        }
      });
    }
    this.mouse.isDown = false;
  }

  public onContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.contextMenu.visible = true;
    this.contextMenu.x = event.clientX;
    this.contextMenu.y = event.clientY;
    this.cdr.detectChanges();
  }

  public toggleMouseInteraction(event: MouseEvent) {
    event.stopPropagation();
    this.mouseInteractionEnabled = !this.mouseInteractionEnabled;
    this.contextMenu.visible = false;
  }
  
  public onToggleAudio(event: MouseEvent) {
    event.stopPropagation();
    this.toggleAudioRequest.emit();
    this.contextMenu.visible = false;
  }

  public onToggleFullscreen(event: MouseEvent) {
    event.stopPropagation();
    this.toggleFullscreenRequest.emit();
    this.contextMenu.visible = false;
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setupCanvas();
    this.initGame();
    this.gameLoop();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private setupCanvas() {
    this.canvasRef.nativeElement.width = window.innerWidth;
    this.canvasRef.nativeElement.height = window.innerHeight;
  }

  private initGame() {
    this.createBackgroundStars(200);
    this.createComets();
    this.scheduleNextStar();
  }

  private createBackgroundStars(count: number) {
    this.backgroundStars = [];
    for (let i = 0; i < count; i++) {
      this.backgroundStars.push({
        pos: new Vector2D(Math.random() * window.innerWidth, Math.random() * window.innerHeight),
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.1,
        twinkleSpeed: Math.random() * 0.02,
        color: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'rgba(173, 216, 230, 0.8)' : 'rgba(255, 255, 224, 0.8)') : 'rgba(255, 255, 255, 0.7)'
      });
    }
  }

  private createComets() {
    const colors: { name: CometColor; hex: string }[] = [
      { name: 'Red', hex: '#ef4444' },
      { name: 'Green', hex: '#22c55e' },
      { name: 'Blue', hex: '#3b82f6' },
    ];
    this.comets = colors.map((c, i) => ({
      id: i,
      color: c.name,
      hexColor: c.hex,
      position: new Vector2D(Math.random() * window.innerWidth, Math.random() * window.innerHeight),
      velocity: new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(0.5),
      acceleration: new Vector2D(),
      radius: 10,
      state: 'idle',
      score: 0,
      speedBonus: 0,
      orbitAngle: 0,
      orbitalSpeed: 0.05,
      celebrationTimer: 0,
      celebrationDuration: 2500, // 2.5 seconds
      zigZagDir: 1,
      tail: []
    }));
  }

  private gameLoop = () => {
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update() {
    this.updateTargetStar();
    this.updateParticles();
    this.updateExplosionParticles();
    this.updateScoreTooltips();
    this.comets.forEach(comet => this.updateComet(comet));
  }

  private updateTargetStar() {
    if (!this.targetStar.exists && Date.now() > this.nextStarSpawnTime) {
        this.spawnTargetStar();
    }
    
    if (this.targetStar.exists) {
        this.targetStar.pulseAngle += 0.05;

        // Fading logic
        if (this.targetStar.isDespawning) {
            this.targetStar.opacity -= 0.02;
            if (this.targetStar.opacity <= 0) {
                this.targetStar.exists = false;
                this.scheduleNextStar();
            }
        } else if (this.targetStar.opacity < 1) {
            this.targetStar.opacity += 0.02;
        }

        // Lifetime check
        if (!this.targetStar.isDespawning && Date.now() > this.targetStar.spawnTime + this.targetStar.lifetime) {
            this.targetStar.isDespawning = true;
            this.comets.forEach(c => c.state = 'idle');
        }

        // Fleeing behavior
        const totalRepulsion = new Vector2D();
        const fleeRadius = 300;
        this.comets.forEach(comet => {
            const dist = Vector2D.distance(this.targetStar.position, comet.position);
            if (dist > 0 && dist < fleeRadius) {
                const repulsion = this.targetStar.position.clone().subtract(comet.position);
                // Use a linear falloff for a more controllable force
                const strength = (1 - dist / fleeRadius) * 0.2; // Max acceleration of 0.2
                repulsion.normalize().multiply(strength);
                totalRepulsion.add(repulsion);
            }
        });
        this.targetStar.acceleration.add(totalRepulsion);

        // Physics
        const STAR_MAX_SPEED = 0.6;
        this.targetStar.velocity.add(this.targetStar.acceleration);
        this.targetStar.velocity.multiply(0.98); // Damping
        if (this.targetStar.velocity.magnitude() > STAR_MAX_SPEED) {
            this.targetStar.velocity.normalize().multiply(STAR_MAX_SPEED);
        }
        this.targetStar.position.add(this.targetStar.velocity);
        this.targetStar.acceleration.multiply(0);
        
        // Screen wrap
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (this.targetStar.position.x < 0) this.targetStar.position.x = w;
        if (this.targetStar.position.x > w) this.targetStar.position.x = 0;
        if (this.targetStar.position.y < 0) this.targetStar.position.y = h;
        if (this.targetStar.position.y > h) this.targetStar.position.y = 0;

        // Particle emission
        if (!this.targetStar.isDespawning && Math.random() < 0.5) {
            this.spawnStarParticle();
        }
    }
  }

  private spawnTargetStar() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let validPosition = false;
    while(!validPosition) {
        this.targetStar.position = new Vector2D(w * 0.1 + Math.random() * w * 0.8, h * 0.1 + Math.random() * h * 0.8);
        const tooClose = this.comets.some(c => Vector2D.distance(this.targetStar.position, c.position) < 150);
        if (!tooClose) {
            validPosition = true;
        }
    }
    this.targetStar.exists = true;
    this.targetStar.isDespawning = false;
    this.targetStar.opacity = 0;
    this.targetStar.pulseAngle = 0;
    this.targetStar.velocity = new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiply(0.3);
    this.targetStar.spawnTime = Date.now();
    this.targetStar.lifetime = 12000 + Math.random() * 6000; // 12-18 seconds
    this.starParticles = [];
    this.comets.forEach(c => c.state = 'hunting');
  }

  private scheduleNextStar() {
    const delay = 5000 + Math.random() * 10000;
    this.nextStarSpawnTime = Date.now() + delay;
  }
  
  private updateComet(comet: Comet) {
    // State logic
    switch (comet.state) {
        case 'idle':
            const randomAngle = (Math.random() - 0.5) * 0.1;
            comet.velocity.x = Math.cos(randomAngle) * comet.velocity.x - Math.sin(randomAngle) * comet.velocity.y;
            comet.velocity.y = Math.sin(randomAngle) * comet.velocity.x + Math.cos(randomAngle) * comet.velocity.y;
            const idleSpeed = 0.8 + comet.speedBonus * 0.5;
            comet.velocity.normalize().multiply(idleSpeed);
            break;
        case 'hunting':
            if (this.targetStar.exists && !this.targetStar.isDespawning) {
                const direction = this.targetStar.position.clone().subtract(comet.position).normalize();
                comet.acceleration.add(direction.multiply(0.05));
            }
            break;
        case 'orbiting':
            if (this.mouse.isDown && this.mouseInteractionEnabled) {
                comet.orbitalSpeed = Math.min(0.3, comet.orbitalSpeed + 0.003);
            } else {
                comet.orbitalSpeed = Math.max(0.05, comet.orbitalSpeed - 0.005);
            }
            comet.orbitAngle += comet.orbitalSpeed;
            comet.position.x = this.mouse.pos.x + this.mouse.orbitRadius * Math.cos(comet.orbitAngle);
            comet.position.y = this.mouse.pos.y + this.mouse.orbitRadius * Math.sin(comet.orbitAngle);
            comet.velocity = new Vector2D();
            break;
        case 'launched':
            comet.velocity.multiply(0.98); // Friction
            if (comet.velocity.magnitude() < (this.targetStar.exists ? 1.5 : 0.8)) {
                comet.state = this.targetStar.exists ? 'hunting' : 'idle';
            }
            break;
        case 'celebrating':
            this.performCelebration(comet);
            comet.celebrationTimer -= 16.67; // approx 1 frame at 60fps
            if(comet.celebrationTimer <= 0) {
                comet.state = 'idle';
            }
            break;
    }
    
    // User interaction
    if (comet.state !== 'orbiting' && comet.state !== 'celebrating') {
      if (this.mouseInteractionEnabled && comet.state !== 'launched') {
        const distToMouse = Vector2D.distance(comet.position, this.mouse.pos);
        if (distToMouse < this.mouse.orbitRadius) {
          comet.state = 'orbiting';
          comet.orbitAngle = Math.atan2(comet.position.y - this.mouse.pos.y, comet.position.x - this.mouse.pos.x);
        } else if (distToMouse < this.mouse.orbitRadius * 4) {
          const pull = this.mouse.pos.clone().subtract(comet.position);
          const strength = 1 / (distToMouse * distToMouse) * 200;
          pull.normalize().multiply(strength);
          comet.acceleration.add(pull);
        }
      } else if (!this.mouseInteractionEnabled) { // Mouse disabled, so repel
        const distToMouse = Vector2D.distance(comet.position, this.mouse.pos);
        const repulsionRadius = this.mouse.orbitRadius * 4;
        if (distToMouse > 0 && distToMouse < repulsionRadius) {
          const push = comet.position.clone().subtract(this.mouse.pos); // Vector away from mouse
          const strength = (1 - distToMouse / repulsionRadius) * 0.4; // Linear falloff for a gentle push
          push.normalize().multiply(strength);
          comet.acceleration.add(push);
        }
      }
    }
    
    if (comet.state !== 'orbiting' && comet.state !== 'celebrating') {
        // Apply physics
        comet.velocity.add(comet.acceleration);
        if (comet.state !== 'launched') {
            const baseMaxSpeed = comet.state === 'hunting' ? 2.5 : 1.5;
            const maxSpeed = baseMaxSpeed + comet.speedBonus;
            if (comet.velocity.magnitude() > maxSpeed) {
                comet.velocity.normalize().multiply(maxSpeed);
            }
        }
        comet.position.add(comet.velocity);
        comet.acceleration.multiply(0);
    }

    // Collision with target star
    if (this.targetStar.exists && !this.targetStar.isDespawning && comet.state !== 'orbiting' && Vector2D.distance(comet.position, this.targetStar.position) < comet.radius + this.targetStar.radius) {
        this.captureStar(comet);
    }
    
    // Toroidal space wrapping & tail management
    const w = window.innerWidth;
    const h = window.innerHeight;
    let wrapped = false;
    if (comet.position.x < 0) { comet.position.x = w; wrapped = true; }
    if (comet.position.x > w) { comet.position.x = 0; wrapped = true; }
    if (comet.position.y < 0) { comet.position.y = h; wrapped = true; }
    if (comet.position.y > h) { comet.position.y = 0; wrapped = true; }
    
    if (wrapped) {
      comet.tail = [];
    } else {
      comet.tail.push(comet.position.clone());
      if (comet.tail.length > this.TAIL_LENGTH) {
        comet.tail.shift();
      }
    }
  }

  private performCelebration(comet: Comet) {
    const progress = 1 - (comet.celebrationTimer / comet.celebrationDuration);
    const easeMultiplier = Math.sin(progress * Math.PI);

    switch (comet.color) {
        case 'Red': // Zig-zag
            comet.velocity.multiply(0.9);
            const perp = new Vector2D(-comet.velocity.y, comet.velocity.x).normalize();
            if (Math.random() < 0.1) comet.zigZagDir *= -1;
            comet.acceleration.add(perp.multiply(0.5 * comet.zigZagDir * easeMultiplier));
            break;
        case 'Green': // Spiral
            const angle = (Date.now() / 200);
            const radius = 2 + 30 * easeMultiplier;
            comet.position.x += Math.cos(angle) * radius * 0.1;
            comet.position.y += Math.sin(angle) * radius * 0.1;
            comet.velocity.multiply(0.9);
            break;
        case 'Blue': // Loop
            const turn = new Vector2D(-comet.velocity.y, comet.velocity.x).normalize().multiply(0.3 * easeMultiplier);
            comet.acceleration.add(turn);
            break;
    }
    comet.velocity.add(comet.acceleration);
    comet.velocity.normalize().multiply(3);
    comet.position.add(comet.velocity);
    comet.acceleration.multiply(0);
  }

  private captureStar(winner: Comet) {
    winner.score++;
    winner.speedBonus = Math.min(winner.speedBonus + this.SPEED_INCREMENT_PER_STAR, this.MAX_SPEED_BONUS);
    
    this.createStarExplosion(this.targetStar.position.clone());
    
    this.targetStar.exists = false;
    this.starParticles = [];

    winner.state = 'celebrating';
    winner.celebrationTimer = winner.celebrationDuration;
    this.comets.forEach(c => {
        if (c.id !== winner.id) {
            c.state = 'idle';
        }
    });
    this.createScoreTooltip(winner);
    this.scheduleNextStar();
  }
  
  private createScoreTooltip(comet: Comet) {
    this.scoreTooltips.push({
      cometId: comet.id,
      text: `${comet.score}`,
      position: comet.position.clone(),
      life: 180, // 3 seconds at 60fps
      maxLife: 180,
    });
  }
  
  private updateScoreTooltips() {
    for (let i = this.scoreTooltips.length - 1; i >= 0; i--) {
      const tooltip = this.scoreTooltips[i];
      tooltip.life--;

      if (tooltip.life <= 0) {
        this.scoreTooltips.splice(i, 1);
        continue;
      }

      const comet = this.comets.find(c => c.id === tooltip.cometId);
      if (comet) {
        // Position it above the comet
        tooltip.position.x = comet.position.x;
        tooltip.position.y = comet.position.y - comet.radius - 25;
      }
    }
  }

  private updateParticles() {
    for (let i = this.starParticles.length - 1; i >= 0; i--) {
        const p = this.starParticles[i];
        p.position.add(p.velocity);
        p.life--;
        if (p.life <= 0) {
            this.starParticles.splice(i, 1);
        }
    }
  }

  private updateExplosionParticles() {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
        const p = this.explosionParticles[i];
        p.position.add(p.velocity);
        p.velocity.multiply(0.97); // Friction
        p.life--;
        if (p.life <= 0) {
            this.explosionParticles.splice(i, 1);
        }
    }
  }

  private spawnStarParticle() {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5 + 0.2;
      const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.starParticles.push({
          position: this.targetStar.position.clone(),
          velocity: velocity,
          radius: Math.random() * 1.5 + 0.5,
          life: 40 + Math.random() * 40,
          maxLife: 80,
          color: 'rgba(255, 223, 0, 1)'
      });
  }

  private createStarExplosion(position: Vector2D) {
    const particleCount = 60;
    const colors = ['#FFD700', '#FFA500', '#FFFFE0', '#FFFFFF'];
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2; // Explosion speed
        const velocity = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
        const life = 50 + Math.random() * 40;
        this.explosionParticles.push({
            position: position.clone(),
            velocity: velocity,
            radius: Math.random() * 2.5 + 1,
            life: life,
            maxLife: life,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
  }

  private draw() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    this.drawBackgroundStars();
    if (this.targetStar.exists) this.drawTargetStar();
    this.drawParticles();
    this.drawExplosionParticles();
    this.comets.forEach(comet => this.drawComet(comet));
    this.drawScoreTooltips();
    this.drawCursor();
  }

  private drawBackgroundStars() {
    const now = Date.now();
    this.backgroundStars.forEach(star => {
      this.ctx.beginPath();
      const opacity = star.opacity + Math.sin(now * star.twinkleSpeed) * 0.1;
      this.ctx.fillStyle = star.color.replace(/[\d\.]+\)$/g, `${opacity})`);
      this.ctx.arc(star.pos.x, star.pos.y, star.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawTargetStar() {
    const pulse = Math.sin(this.targetStar.pulseAngle) * 3;
    const radius = this.targetStar.radius + pulse;
    const coreRadius = this.targetStar.radius * 0.6 + pulse * 0.8;

    this.ctx.save();
    this.ctx.globalAlpha = this.targetStar.opacity;

    // Glow
    this.ctx.beginPath();
    const grad = this.ctx.createRadialGradient(this.targetStar.position.x, this.targetStar.position.y, 0, this.targetStar.position.x, this.targetStar.position.y, radius * 2.5);
    grad.addColorStop(0, 'rgba(255, 223, 0, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
    grad.addColorStop(1, 'rgba(255, 165, 0, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.arc(this.targetStar.position.x, this.targetStar.position.y, radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Solid Core
    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255, 255, 224, 1)';
    this.ctx.arc(this.targetStar.position.x, this.targetStar.position.y, coreRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
  
  private drawParticles() {
      this.starParticles.forEach(p => {
          this.ctx.beginPath();
          const opacity = (p.life / p.maxLife) * 0.8 * this.targetStar.opacity;
          this.ctx.fillStyle = p.color.replace(/[\d\.]+\)$/g, `${opacity})`);
          this.ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
          this.ctx.fill();
      });
  }

  private drawExplosionParticles() {
    this.explosionParticles.forEach(p => {
        this.ctx.save();
        this.ctx.globalAlpha = p.life / p.maxLife;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        const currentRadius = p.radius * (p.life / p.maxLife);
        this.ctx.arc(p.position.x, p.position.y, currentRadius > 0 ? currentRadius : 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    });
  }

  private drawComet(comet: Comet) {
    // 1. Draw Tail
    for (let i = 0; i < comet.tail.length; i++) {
        const pos = comet.tail[i];
        const ratio = i / comet.tail.length;
        
        if (i > 0 && Vector2D.distance(pos, comet.tail[i - 1]) > 100) continue;

        const radius = comet.radius * ratio * 0.7;
        const opacity = ratio * 0.5;

        this.ctx.beginPath();
        const r = parseInt(comet.hexColor.slice(1, 3), 16);
        const g = parseInt(comet.hexColor.slice(3, 5), 16);
        const b = parseInt(comet.hexColor.slice(5, 7), 16);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // 2. Draw Glow (Head)
    this.ctx.save();
    this.ctx.beginPath();
    const grad = this.ctx.createRadialGradient(comet.position.x, comet.position.y, 0, comet.position.x, comet.position.y, comet.radius * 2.5);
    grad.addColorStop(0, `${comet.hexColor}FF`);
    grad.addColorStop(0.5, `${comet.hexColor}80`);
    grad.addColorStop(1, `${comet.hexColor}00`);

    this.ctx.fillStyle = grad;
    this.ctx.arc(comet.position.x, comet.position.y, comet.radius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 3. Draw Solid Core
    this.ctx.beginPath();
    this.ctx.fillStyle = comet.hexColor;
    this.ctx.arc(comet.position.x, comet.position.y, comet.radius * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawScoreTooltips() {
    this.scoreTooltips.forEach(tooltip => {
        const fadeDuration = 30; // frames for fade in/out
        let opacity = 1;

        if (tooltip.life < fadeDuration) {
            opacity = tooltip.life / fadeDuration;
        } else if (tooltip.maxLife - tooltip.life < fadeDuration) {
            opacity = (tooltip.maxLife - tooltip.life) / fadeDuration;
        }

        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        const text = `★ ${tooltip.text}`;
        this.ctx.font = 'bold 16px "Courier New", monospace';
        const textMetrics = this.ctx.measureText(text);
        
        const padding = 10;
        const boxWidth = textMetrics.width + padding * 2;
        const boxHeight = 30;
        const boxX = tooltip.position.x - boxWidth / 2;
        const boxY = tooltip.position.y - boxHeight;

        // Glassmorphism effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1.5;
        
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw the text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, tooltip.position.x, boxY + boxHeight / 2);

        this.ctx.restore();
    });
  }

  private drawCursor() {
    this.ctx.save();
    
    if (this.mouseInteractionEnabled) {
      const isCharging = this.mouse.isDown && this.comets.some(c => c.state === 'orbiting');
      const pulse = Math.sin(Date.now() / 150) * 1.5;
      const baseCoreRadius = 6;
      const coreRadius = baseCoreRadius + pulse;
      
      // 1. Glow
      const glowRadius = 25 + pulse * 2;
      const glowGrad = this.ctx.createRadialGradient(this.mouse.pos.x, this.mouse.pos.y, coreRadius, this.mouse.pos.x, this.mouse.pos.y, glowRadius);
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = glowGrad;
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.pos.x, this.mouse.pos.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 2. Dashed Orbit ring
      this.ctx.beginPath();
      this.ctx.setLineDash([8, 8]);
      this.ctx.strokeStyle = isCharging ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = isCharging ? 2 : 1.5;
      this.ctx.arc(this.mouse.pos.x, this.mouse.pos.y, this.mouse.orbitRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]); // Reset for other drawings

      // 3. Solid Core
      this.ctx.beginPath();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.arc(this.mouse.pos.x, this.mouse.pos.y, coreRadius, 0, Math.PI * 2);
      this.ctx.fill();

    } else {
      // Draw the "Dead Planet" cursor
      const planetX = this.mouse.pos.x;
      const planetY = this.mouse.pos.y;
      const planetRadius = 10;

      // Faint, dark glow
      const glowGrad = this.ctx.createRadialGradient(planetX, planetY, planetRadius, planetX, planetY, planetRadius * 2.5);
      glowGrad.addColorStop(0, 'rgba(50, 50, 50, 0.2)');
      glowGrad.addColorStop(1, 'rgba(50, 50, 50, 0)');
      this.ctx.fillStyle = glowGrad;
      this.ctx.beginPath();
      this.ctx.arc(planetX, planetY, planetRadius * 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Planet Body
      this.ctx.fillStyle = '#4a4a4a';
      this.ctx.beginPath();
      this.ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#333333';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Craters
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(planetX + planetRadius * 0.4, planetY - planetRadius * 0.3, planetRadius * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.arc(planetX - planetRadius * 0.5, planetY - planetRadius * 0.5, planetRadius * 0.2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(planetX - planetRadius * 0.2, planetY + planetRadius * 0.6, planetRadius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
}