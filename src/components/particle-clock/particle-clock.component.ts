import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

@Component({
  selector: 'app-particle-clock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas 
      class="pointer-events-auto cursor-none"
      (contextmenu)="$event.preventDefault()"
      (mouseenter)="onMouseEnter()" 
      (mouseleave)="onMouseLeave()"
      (mousemove)="onMouseMove($event)">
    </canvas>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  `]
})
export class ParticleClockComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() time: string = '';
  @Input() date: string = '';

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private isHovered = false;
  private mouseX = 0;
  private mouseY = 0;
  private width = 1200;
  private height = 600;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.width = this.width;
    canvas.height = this.height;
    
    this.initParticles();
    this.startAnimation();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['time'] || changes['date']) && this.ctx) {
      // Only re-init particles if we are NOT hovering. 
      // If hovering, we want to keep the particles exploding, 
      // but we need to update their "origin" (target) for when they return.
      this.updateParticleTargets();
    }
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }

  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
  }

  private updateParticleTargets() {
    // 1. Render new text to an offscreen canvas or just clear and draw to get data
    // We'll use a temporary canvas to get pixel data for the new text
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    this.drawText(tempCtx);

    const imageData = tempCtx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    
    const newTargets: {x: number, y: number, color: string}[] = [];
    const gap = 1; 

    for (let y = 0; y < this.height; y += gap) {
      for (let x = 0; x < this.width; x += gap) {
        const index = (y * this.width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 20) { 
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          newTargets.push({
            x,
            y,
            color: `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
          });
        }
      }
    }

    // Create a map of new targets for O(1) lookup to find stable pixels
    // Key: "x,y"
    const targetMap = new Map<string, {x: number, y: number, color: string}>();
    newTargets.forEach(t => {
      targetMap.set(`${t.x},${t.y}`, t);
    });

    const particlesToReuse: Particle[] = [];
    const nextParticles: Particle[] = [];

    // 1. Identify particles that can stay in place (stable) vs those that need to move
    this.particles.forEach(p => {
      const key = `${p.originX},${p.originY}`;
      if (targetMap.has(key)) {
        // Stable particle! Keep it exactly where it is.
        const target = targetMap.get(key)!;
        p.color = target.color; // Update color just in case
        nextParticles.push(p);
        targetMap.delete(key); // Mark this target as filled
      } else {
        // This particle's origin is no longer valid (e.g. part of a changed digit)
        particlesToReuse.push(p);
      }
    });

    // 2. The remaining targets in the map are "new" spots that need particles
    const emptyTargets = Array.from(targetMap.values());

    // 3. Sort reuse list and empty targets to minimize travel distance (simple heuristic)
    // Sort by Y then X to keep vertical/horizontal structure somewhat coherent
    const sortFn = (a: {x: number, y: number} | Particle, b: {x: number, y: number} | Particle) => {
       const ay = 'originY' in a ? a.originY : a.y;
       const ax = 'originX' in a ? a.originX : a.x;
       const by = 'originY' in b ? b.originY : b.y;
       const bx = 'originX' in b ? b.originX : b.x;
       if (Math.abs(ay - by) < 2) return ax - bx;
       return ay - by;
    };
    
    particlesToReuse.sort((a, b) => {
        if (Math.abs(a.originY - b.originY) < 2) return a.originX - b.originX;
        return a.originY - b.originY;
    });
    
    emptyTargets.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 2) return a.x - b.x;
        return a.y - b.y;
    });

    // 4. Assign reused particles to empty targets
    const count = Math.min(particlesToReuse.length, emptyTargets.length);
    for (let i = 0; i < count; i++) {
      const p = particlesToReuse[i];
      const t = emptyTargets[i];
      p.originX = t.x;
      p.originY = t.y;
      p.color = t.color;
      nextParticles.push(p);
    }

    // 5. Create new particles if we have more targets than reusable particles
    if (emptyTargets.length > particlesToReuse.length) {
      for (let i = count; i < emptyTargets.length; i++) {
        const t = emptyTargets[i];
        nextParticles.push({
          x: t.x, 
          y: t.y,
          originX: t.x,
          originY: t.y,
          vx: 0,
          vy: 0,
          color: t.color,
          size: 1.5
        });
      }
    }
    
    // (Excess particles in particlesToReuse are simply dropped/garbage collected)

    this.particles = nextParticles;
  }

  private initParticles() {
    this.updateParticleTargets();
    // Start particles at their origins
    this.particles.forEach(p => {
      p.x = p.originX;
      p.y = p.originY;
    });
  }

  private drawText(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Time
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = 'rgba(156, 163, 175, 1)'; // gray-500
    ctx.shadowColor = 'rgba(156, 163, 175, 0.4)';
    ctx.shadowBlur = 8;
    ctx.fillText(this.time, this.width / 2, this.height / 2 - 10);

    // Date
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(75, 85, 99, 1)'; // gray-600
    ctx.shadowColor = 'rgba(156, 163, 175, 0.3)';
    ctx.shadowBlur = 6;
    ctx.fillText(this.date, this.width / 2, this.height / 2 + 20);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }

  private startAnimation() {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.update();
        this.draw();
        this.animationFrameId = requestAnimationFrame(loop);
      };
      loop();
    });
  }

  private update() {
    const returnSpeed = 0.2; // Fast, non-elastic return
    const repulsionRadius = 100; 
    const repulsionForce = 50; // Max pixels to push away

    this.particles.forEach(p => {
      let targetX = p.originX;
      let targetY = p.originY;

      if (this.isHovered) {
        // Calculate repulsion based on ORIGIN to ensure stability (no jitter)
        const dx = p.originX - this.mouseX;
        const dy = p.originY - this.mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < repulsionRadius) {
          const angle = Math.atan2(dy, dx);
          // Non-linear falloff for smoother edge
          const force = Math.pow((repulsionRadius - distance) / repulsionRadius, 2);
          
          targetX += Math.cos(angle) * force * repulsionForce;
          targetY += Math.sin(angle) * force * repulsionForce;
        }
      }

      // Direct Linear Interpolation (Lerp) - No Velocity/Elasticity
      p.x += (targetX - p.x) * returnSpeed;
      p.y += (targetY - p.y) * returnSpeed;

      // Hard snap when close to avoid micro-movements
      if (Math.abs(p.x - targetX) < 0.1) p.x = targetX;
      if (Math.abs(p.y - targetY) < 0.1) p.y = targetY;
    });
  }

  private draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
    });
  }
}
