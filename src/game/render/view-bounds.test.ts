import { describe, expect, it } from 'vitest';
import { computeViewBounds, isInView } from './view-bounds';

describe('view-bounds', () => {
  const view = computeViewBounds(100, 100, 800, 600); // world rect 100..900 x 100..700

  it('computes the world-space rectangle from camera + viewport', () => {
    expect(view).toEqual({ minX: 100, minY: 100, maxX: 900, maxY: 700 });
  });

  it('keeps entities inside the rectangle', () => {
    expect(isInView(500, 400, 0, view)).toBe(true);
  });

  it('culls entities fully outside the rectangle', () => {
    expect(isInView(50, 400, 0, view)).toBe(false); // left of minX
    expect(isInView(950, 400, 0, view)).toBe(false); // right of maxX
    expect(isInView(500, 40, 0, view)).toBe(false); // above minY
    expect(isInView(500, 760, 0, view)).toBe(false); // below maxY
  });

  it('keeps entities whose radius overlaps the edge', () => {
    // center 20px left of the edge, but radius 30 reaches in
    expect(isInView(80, 400, 30, view)).toBe(true);
    // radius too small to reach
    expect(isInView(80, 400, 10, view)).toBe(false);
  });
});
