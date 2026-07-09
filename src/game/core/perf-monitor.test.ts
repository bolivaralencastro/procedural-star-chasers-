import { describe, expect, it } from 'vitest';
import { PerfMonitor } from './perf-monitor';

describe('PerfMonitor', () => {
  it('reports an empty snapshot before any frames', () => {
    const snap = new PerfMonitor().snapshot();
    expect(snap.sampleCount).toBe(0);
    expect(snap.fps).toBe(0);
  });

  it('ignores the first frame (no delta yet)', () => {
    const m = new PerfMonitor();
    m.frame(1000);
    expect(m.snapshot().sampleCount).toBe(0);
  });

  it('computes fps from steady 16 ms frames', () => {
    const m = new PerfMonitor();
    for (let i = 0; i <= 100; i++) m.frame(i * 16);
    const snap = m.snapshot();
    expect(snap.sampleCount).toBe(100);
    expect(snap.fps).toBeCloseTo(62.5, 0);
    expect(snap.p50).toBeCloseTo(16, 5);
  });

  it('counts jank frames over 20 ms', () => {
    const m = new PerfMonitor();
    let t = 0;
    // 10 fast frames, 3 slow (50 ms) ones
    for (let i = 0; i < 10; i++) { t += 10; m.frame(t); }
    for (let i = 0; i < 3; i++) { t += 50; m.frame(t); }
    const snap = m.snapshot();
    expect(snap.jankFrames).toBe(3);
    expect(snap.max).toBeCloseTo(50, 5);
  });

  it('bounds the window to the last 300 frames', () => {
    const m = new PerfMonitor();
    for (let i = 0; i <= 500; i++) m.frame(i * 16);
    expect(m.snapshot().sampleCount).toBe(300);
  });
});
