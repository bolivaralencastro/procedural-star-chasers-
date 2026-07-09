import { describe, expect, it } from 'vitest';
import { Vector2D } from './vector2d';

describe('Vector2D', () => {
  it('adds and subtracts in place', () => {
    const v = new Vector2D(1, 2).add(new Vector2D(3, 4));
    expect([v.x, v.y]).toEqual([4, 6]);
    v.subtract(new Vector2D(1, 1));
    expect([v.x, v.y]).toEqual([3, 5]);
  });

  it('multiplies and divides by a scalar', () => {
    const v = new Vector2D(2, -3).multiply(2);
    expect([v.x, v.y]).toEqual([4, -6]);
    v.divide(4);
    expect([v.x, v.y]).toEqual([1, -1.5]);
  });

  it('computes magnitude', () => {
    expect(new Vector2D(3, 4).magnitude()).toBe(5);
  });

  it('normalizes to unit length and leaves the zero vector untouched', () => {
    const v = new Vector2D(0, 10).normalize();
    expect([v.x, v.y]).toEqual([0, 1]);
    const zero = new Vector2D(0, 0).normalize();
    expect([zero.x, zero.y]).toEqual([0, 0]);
  });

  it('computes distance between points', () => {
    expect(Vector2D.distance(new Vector2D(0, 0), new Vector2D(6, 8))).toBe(10);
  });

  it('clone() is independent of the original', () => {
    const original = new Vector2D(1, 1);
    const copy = original.clone();
    copy.add(new Vector2D(1, 1));
    expect([original.x, original.y]).toEqual([1, 1]);
    expect([copy.x, copy.y]).toEqual([2, 2]);
  });
});
