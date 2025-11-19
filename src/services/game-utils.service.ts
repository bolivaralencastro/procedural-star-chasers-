import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameUtilsService {
  
  lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
  }

  // Helper function to keep an angle between -PI and PI
  normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  
  // Helper function to smoothly interpolate between two angles
  lerpAngle(a: number, b: number, t: number): number {
    const da = this.normalizeAngle(b - a);
    return this.normalizeAngle(a + da * t);
  }
}
