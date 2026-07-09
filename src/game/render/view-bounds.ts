/**
 * Viewport bounds in world coordinates, used to skip drawing entities that
 * fall outside the visible camera rectangle. The world is larger than the
 * viewport, so culling removes a large fraction of per-frame draw work.
 */
export interface ViewBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeViewBounds(
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number,
): ViewBounds {
  return {
    minX: cameraX,
    minY: cameraY,
    maxX: cameraX + viewportWidth,
    maxY: cameraY + viewportHeight,
  };
}

/**
 * True if a circle of the given world radius overlaps the view rectangle.
 * `radius` should include the entity's glow/visual extent so nothing pops
 * in at the screen edge. Pure arithmetic — no allocation.
 */
export function isInView(x: number, y: number, radius: number, view: ViewBounds): boolean {
  return (
    x + radius >= view.minX &&
    x - radius <= view.maxX &&
    y + radius >= view.minY &&
    y - radius <= view.maxY
  );
}
