export class Vector2D {
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
