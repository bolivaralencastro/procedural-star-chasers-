/**
 * Strips the alpha channel from an `rgba(r, g, b, a)` string, returning the
 * opaque `rgb(r, g, b)` form. Used with ctx.globalAlpha so that per-frame
 * opacity changes don't require rebuilding a color string (which allocates).
 *
 * Results are memoized: the entity palette is tiny, so after warm-up this is
 * a single Map lookup with zero allocation.
 */
const cache = new Map<string, string>();

export function toOpaqueColor(rgba: string): string {
  let base = cache.get(rgba);
  if (base === undefined) {
    const nums = rgba.match(/[\d.]+/g);
    base = nums && nums.length >= 3 ? `rgb(${nums[0]}, ${nums[1]}, ${nums[2]})` : rgba;
    cache.set(rgba, base);
  }
  return base;
}
