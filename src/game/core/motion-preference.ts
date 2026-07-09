/**
 * Reads the user's OS-level "reduce motion" accessibility setting.
 * When enabled we thin out the starfield and freeze the twinkle so the
 * ambient scene is calmer for motion-sensitive viewers.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
