/**
 * Frame-time sampler for the game loop. Framework-free and allocation-free
 * in steady state: frame deltas go into a fixed ring buffer. Reading a
 * snapshot is the only place that allocates, and only the dev overlay does it.
 *
 * Always recording is effectively free (one subtraction + one array write per
 * frame); the cost is opt-in on the read side.
 */
export interface PerfSnapshot {
  fps: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  /** Frames slower than 20 ms (perceptible jank) in the window. */
  jankFrames: number;
  sampleCount: number;
}

const WINDOW = 300; // ~3-5 s of frames

export class PerfMonitor {
  private readonly deltas = new Float32Array(WINDOW);
  private readonly sorted = new Float32Array(WINDOW);
  private writeIndex = 0;
  private filled = 0;
  private lastFrame = 0;
  private hasLast = false;

  /** Call once per rendered frame with the rAF timestamp. */
  frame(now: number): void {
    if (this.hasLast) {
      this.deltas[this.writeIndex] = now - this.lastFrame;
      this.writeIndex = (this.writeIndex + 1) % WINDOW;
      if (this.filled < WINDOW) this.filled++;
    }
    this.lastFrame = now;
    this.hasLast = true;
  }

  snapshot(): PerfSnapshot {
    const n = this.filled;
    if (n === 0) {
      return { fps: 0, p50: 0, p95: 0, p99: 0, max: 0, jankFrames: 0, sampleCount: 0 };
    }

    let sum = 0;
    let jank = 0;
    for (let i = 0; i < n; i++) {
      const d = this.deltas[i];
      this.sorted[i] = d;
      sum += d;
      if (d > 20) jank++;
    }
    const view = this.sorted.subarray(0, n).sort();
    const pct = (q: number) => view[Math.min(n - 1, Math.floor(n * q))];
    const avg = sum / n;

    return {
      fps: avg > 0 ? 1000 / avg : 0,
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
      max: view[n - 1],
      jankFrames: jank,
      sampleCount: n,
    };
  }
}
